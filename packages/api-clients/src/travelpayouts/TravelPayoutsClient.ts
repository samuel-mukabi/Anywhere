import { request } from 'undici';
import pino from 'pino';
import { z } from 'zod';
import { recordApiCall, type ApiLogContext } from '../observability';
import { ApiError } from '../errors';
import { withRetry } from '../utils/withRetry';
import { createRateLimiter } from '../utils/withRateLimit';

// TravelPayouts: no published burst limit, but ~30 req/min is a safe ceiling
const tpRateLimiter = createRateLimiter({ requestsPerInterval: 30, intervalMs: 60_000 });

const logger = pino({ level: 'info' });

export interface FlightOffer {
  id: string;
  destinationCity: string;
  destinationIATA: string;
  destinationCountry: string;
  coords: [number, number];
  price: number;
  currency: string;
  durationMins: number;
  stops: number;
  deepLink: string;
}

const BaseFlightSchema = z.object({
  price: z.number(),
  airline: z.string(),
  flight_number: z.number().or(z.string()),
  departure_at: z.string(),
  return_at: z.string().optional(),
  transfers: z.number(),
  expires_at: z.string().optional(),
});

const TravelPayoutsV3Schema = z.object({
  success: z.boolean(),
  data: z.array(BaseFlightSchema).optional(),
  error: z.any().optional(),
});

// For V1, the data is a nested record: destination -> flight ID -> flight object
const TravelPayoutsV1Schema = z.object({
  success: z.boolean(),
  data: z.record(z.record(BaseFlightSchema)).optional(),
  error: z.any().optional(),
});

export class TravelPayoutsClient {
  private token: string;
  private basePathV3 = 'https://api.travelpayouts.com/aviasales/v3';
  private basePathV1 = 'https://api.travelpayouts.com/v1';

  constructor(token: string) {
    this.token = token || process.env.TRAVELPAYOUTS_TOKEN || '';
  }

  private normalizeDate(travelMonth: string): string {
    const date = new Date();
    if (travelMonth) {
      date.setMonth(parseInt(travelMonth) - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${yyyy}-${mm}`;
  }

  public async searchToDestination(
    destinationIso: string,
    origin: string = 'NYC',
    travelMonth: string = '',
    context: ApiLogContext = {},
  ): Promise<FlightOffer | null> {
    return withRetry(async () => {
      const url = new URL(`${this.basePathV3}/prices_for_dates`);
      url.searchParams.set('origin', origin);
      url.searchParams.set('destination', destinationIso);
      url.searchParams.set('departure_at', this.normalizeDate(travelMonth));
      url.searchParams.set('currency', 'usd');
      url.searchParams.set('token', this.token);
      url.searchParams.set('limit', '1');

      await tpRateLimiter.throttle();
      const startedAt = Date.now();
      try {
        const res = await request(url.toString(), {
          headers: { 'Accept-Encoding': 'gzip' }
        });
        const latencyMs = Date.now() - startedAt;

        recordApiCall({
          api: 'travelpayouts',
          method: 'GET',
          latencyMs,
          status: res.statusCode,
          cacheHit: false,
          fallbackUsed: false,
          ...context,
        });

        if (res.statusCode === 200) {
          const rawData = await res.body.json();
          const parsed = TravelPayoutsV3Schema.safeParse(rawData);
          
          if (!parsed.success || !parsed.data.success || !parsed.data.data) {
            logger.warn({ issues: !parsed.success ? parsed.error : null }, 'TravelPayouts v3 validation err');
            return null;
          }

          const flights = parsed.data.data;
          if (flights.length === 0) return null;

          const flightData = flights[0];
          
          return {
            id: `${origin}-${destinationIso}-${flightData.flight_number}`,
            destinationCity: destinationIso,
            destinationIATA: destinationIso,
            destinationCountry: 'Unknown',
            coords: [0, 0] as [number, number],
            price: flightData.price,
            currency: 'USD',
            durationMins: 0,
            stops: flightData.transfers,
            deepLink: `https://search.aviasales.com/flights/?origin=${origin}&destination=${destinationIso}`
          };
        }

        if (res.statusCode === 400 || res.statusCode === 404) return null;

        throw new ApiError({
          source: 'travelpayouts',
          statusCode: res.statusCode,
          message: `TravelPayouts API Error: ${res.statusCode}`,
          retryable: res.statusCode === 429 || res.statusCode >= 500,
        });
      } catch (err) {
         if (err instanceof ApiError) throw err;
         throw new ApiError({
            source: 'travelpayouts',
            statusCode: 500,
            message: err instanceof Error ? err.message : String(err),
            retryable: true
         });
      }
    });
  }

  public async searchAnywhere(
    origin: string = 'NYC',
    context: ApiLogContext = {},
  ): Promise<FlightOffer[]> {
    return withRetry(async () => {
      const url = new URL(`${this.basePathV1}/prices/cheap`);
      url.searchParams.set('origin', origin);
      url.searchParams.set('depart_date', this.normalizeDate(''));
      url.searchParams.set('currency', 'usd');
      url.searchParams.set('token', this.token);

      await tpRateLimiter.throttle();
      const startedAt = Date.now();
      try {
        const res = await request(url.toString(), {
          headers: { 'Accept-Encoding': 'gzip' }
        });
        const latencyMs = Date.now() - startedAt;

        recordApiCall({
          api: 'travelpayouts',
          method: 'GET',
          latencyMs,
          status: res.statusCode,
          cacheHit: false,
          fallbackUsed: false,
          ...context,
        });

        if (res.statusCode === 200) {
          const rawData = await res.body.json();
          const parsed = TravelPayoutsV1Schema.safeParse(rawData);
          
          if (!parsed.success || !parsed.data.success || !parsed.data.data) {
            logger.warn({ issues: !parsed.success ? parsed.error : null }, 'TravelPayouts v1 validation err');
            return [];
          }

          const offers: FlightOffer[] = [];
          for (const [destCode, flightVariants] of Object.entries(parsed.data.data)) {
              const flights = Object.values(flightVariants);
              if (flights.length > 0) {
                  const flightData = flights[0];
                  offers.push({
                    id: `${origin}-${destCode}-${flightData.flight_number}`,
                    destinationCity: destCode,
                    destinationIATA: destCode,
                    destinationCountry: 'Unknown',
                    coords: [0, 0] as [number, number],
                    price: flightData.price,
                    currency: 'USD',
                    durationMins: 0,
                    stops: flightData.transfers,
                    deepLink: `https://search.aviasales.com/flights/?origin=${origin}&destination=${destCode}`
                  });
              }
          }

          return offers;
        }

        if (res.statusCode === 400 || res.statusCode === 404) return [];

        throw new ApiError({
          source: 'travelpayouts',
          statusCode: res.statusCode,
          message: `TravelPayouts API Error: ${res.statusCode}`,
          retryable: res.statusCode === 429 || res.statusCode >= 500,
        });
      } catch (err) {
         if (err instanceof ApiError) throw err;
         throw new ApiError({
            source: 'travelpayouts',
            statusCode: 500,
            message: err instanceof Error ? err.message : String(err),
            retryable: true
         });
      }
    });
  }

  public async ping(context: ApiLogContext = {}): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number }> {
    const startedAt = Date.now();
    try {
      // Use the v3 prices_for_dates endpoint; include the mandatory departure_at
      // param so the API validates our token rather than returning a param-error 400.
      const url = new URL(`${this.basePathV3}/prices_for_dates`);
      url.searchParams.set('origin', 'NYC');
      url.searchParams.set('destination', 'LON');
      url.searchParams.set('token', this.token);
      url.searchParams.set('departure_at', this.normalizeDate(''));
      
      const res = await request(url.toString(), {
        headers: { 'Accept-Encoding': 'gzip' }
      });
      
      const latencyMs = Date.now() - startedAt;
      recordApiCall({
        api: 'travelpayouts',
        method: 'GET',
        latencyMs,
        status: res.statusCode,
        cacheHit: false,
        fallbackUsed: false,
        ...context,
      });
      
      // Consume body to avoid socket leak
      await res.body.dump();

      // 200 = data returned, 400 = valid token but no routes found — both indicate the
      // API is reachable and the token is accepted.
      if (res.statusCode >= 500) return { status: 'down', latencyMs };
      if (res.statusCode === 401 || res.statusCode === 403) return { status: 'degraded', latencyMs };
      return { status: 'healthy', latencyMs };
    } catch (_error: unknown) {
      const latencyMs = Date.now() - startedAt;
      recordApiCall({
        api: 'travelpayouts',
        method: 'GET',
        latencyMs,
        status: 'error',
        cacheHit: false,
        fallbackUsed: true,
        ...context,
      });
      return { status: 'down', latencyMs };
    }
  }
}
