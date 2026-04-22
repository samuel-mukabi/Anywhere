import { request } from 'undici';
import { z } from 'zod';
import {
  recordApiCall,
  type ApiLogContext,
} from '../observability';

export const DuffelSliceSchema = z.object({
  duration: z.string(), // ISO8601 duration
  segments: z.array(
    z.object({
      operating_carrier: z.object({
        name: z.string(),
      }),
      departing_at: z.string(),
      arriving_at: z.string(),
    })
  ),
});

export const DuffelOfferSchema = z.object({
  id: z.string(),
  total_amount: z.string(),
  total_currency: z.string(),
  expires_at: z.string(),
  slices: z.array(DuffelSliceSchema),
});

export type DuffelOffer = z.infer<typeof DuffelOfferSchema>;

export interface BookingOffer {
  offerId: string;
  totalAmount: number;
  currency: string;
  airline: string;
  durationMins: number;
  stops: number;
  expiresAt: string;
  bookingLink: string;
}

/** Passenger objects forwarded to Duffel orders API (validated upstream). */
export type DuffelPassenger = Record<string, unknown>;

interface DuffelJsonEnvelope<T> {
  data: T;
}

export class DuffelClient {
  private token: string;
  private isLiveMode: boolean;
  private isSandbox: boolean;
  private baseUrl = 'https://api.duffel.com';

  constructor(testToken: string, liveToken: string, isLiveMode?: boolean) {
    this.isLiveMode = isLiveMode ?? process.env.NODE_ENV === 'production';
    this.token = this.isLiveMode ? liveToken : testToken;

    // Safety: In development, block live tokens passed accidentally
    if (!this.isLiveMode && process.env.NODE_ENV === 'development' && this.token && !this.token.startsWith('duffel_test_')) {
        this.token = '';
    }

    this.isSandbox = !this.isLiveMode && !!this.token;

    if (!this.token && process.env.NODE_ENV === 'development') {
        console.warn(`DUFFEL_${this.isLiveMode ? 'LIVE' : 'TEST'}_TOKEN not set or invalid.`);
    }
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Duffel-Version': 'v2',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Helper to parse ISO8601 durations like PT2H30M into minutes
   */
  private parseDurationISOStr(iso: string): number {
    const timeMatch = iso.match(/T(?:(\d+)H)?(?:(\d+)M)?/);
    if (!timeMatch) return 0;
    const hours = parseInt(timeMatch[1] || '0', 10);
    const mins = parseInt(timeMatch[2] || '0', 10);
    return hours * 60 + mins;
  }

  /**
   * Format Duffel API Object to internal `BookingOffer`
   */
  private normalizeOffer(offer: DuffelOffer): BookingOffer {
    const outbound = offer.slices[0]; // Assuming 1-way flights for now based on search parameters
    const durationMins = outbound ? this.parseDurationISOStr(outbound.duration) : 0;
    const stops = outbound ? Math.max(0, outbound.segments.length - 1) : 0;
    const airline = outbound?.segments[0]?.operating_carrier?.name || 'Unknown Airline';

    return {
      offerId: offer.id,
      totalAmount: parseFloat(offer.total_amount),
      currency: offer.total_currency,
      airline,
      durationMins,
      stops,
      expiresAt: offer.expires_at,
      bookingLink: `https://duffel.com/checkout/${offer.id}`, // Generic landing for hand-off currently or custom checkout app URL
    };
  }

  /**
   * POST /air/offer_requests
   */
  public async createOfferRequest(
    origin: string,
    destination: string,
    departureDate: string,
    passengers: number = 1,
    context: ApiLogContext = {},
  ): Promise<string | null> {
    const payload = {
      data: {
        slices: [
          {
            origin,
            destination,
            departure_date: departureDate,
          },
        ],
        passengers: Array.from({ length: passengers }).map(() => ({ type: 'adult' })),
        return_offers: false,
      },
    };

    try {
      const startedAt = Date.now();
      const { statusCode, body } = await request(`${this.baseUrl}/air/offer_requests`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });
      recordApiCall({
        api: 'duffel',
        method: 'POST',
        latencyMs: Date.now() - startedAt,
        status: statusCode,
        cacheHit: false,
        fallbackUsed: false,
        ...context,
      });

      if (statusCode !== 200 && statusCode !== 201) {
         console.error(`Duffel Create Offer Request Failed: ${statusCode}`);
         return null;
      }

      const res = (await body.json()) as DuffelJsonEnvelope<{ id: string }>;
      return res.data.id;
    } catch (err) {
      recordApiCall({
        api: 'duffel',
        method: 'POST',
        latencyMs: 0,
        status: 'error',
        cacheHit: false,
        fallbackUsed: true,
        ...context,
      });
      console.error('Error creating Duffel Offer Request:', err);
      return null;
    }
  }

  /**
   * GET /air/offers?offer_request_id={id}&sort=total_amount
   */
  public async listOffers(offerRequestId: string, context: ApiLogContext = {}): Promise<BookingOffer[]> {
    try {
      const url = new URL(`${this.baseUrl}/air/offers`);
      url.searchParams.set('offer_request_id', offerRequestId);
      url.searchParams.set('sort', 'total_amount');

      const startedAt = Date.now();
      const { statusCode, body } = await request(url.toString(), {
        method: 'GET',
        headers: this.headers,
      });
      recordApiCall({
        api: 'duffel',
        method: 'GET',
        latencyMs: Date.now() - startedAt,
        status: statusCode,
        cacheHit: false,
        fallbackUsed: false,
        ...context,
      });

      if (statusCode !== 200) {
        console.error(`Duffel List Offers Failed: ${statusCode}`);
        return [];
      }

      const res = (await body.json()) as DuffelJsonEnvelope<unknown[]>;
      const offersRaw = res.data;

      const parsedOffers: BookingOffer[] = [];

      for (const item of offersRaw) {
        const parsed = DuffelOfferSchema.safeParse(item);
        if (parsed.success) {
          parsedOffers.push(this.normalizeOffer(parsed.data));
        }
      }

      return parsedOffers;

    } catch (err) {
      recordApiCall({
        api: 'duffel',
        method: 'GET',
        latencyMs: 0,
        status: 'error',
        cacheHit: false,
        fallbackUsed: true,
        ...context,
      });
      console.error('Error listing Duffel Offers:', err);
      return [];
    }
  }

  /**
   * GET /air/offers/{id}
   */
  public async getOffer(offerId: string, context: ApiLogContext = {}): Promise<BookingOffer | null> {
    try {
      const startedAt = Date.now();
      const { statusCode, body } = await request(`${this.baseUrl}/air/offers/${offerId}`, {
        method: 'GET',
        headers: this.headers,
      });
      recordApiCall({
        api: 'duffel',
        method: 'GET',
        latencyMs: Date.now() - startedAt,
        status: statusCode,
        cacheHit: false,
        fallbackUsed: false,
        ...context,
      });

      if (statusCode !== 200) {
        console.error(`Duffel Get Offer Failed: ${statusCode}`);
        return null;
      }

      const res = (await body.json()) as DuffelJsonEnvelope<unknown>;
      const parsed = DuffelOfferSchema.safeParse(res.data);
      if (parsed.success) {
        return this.normalizeOffer(parsed.data);
      }
      return null;
    } catch (err) {
      recordApiCall({
        api: 'duffel',
        method: 'GET',
        latencyMs: 0,
        status: 'error',
        cacheHit: false,
        fallbackUsed: true,
        ...context,
      });
      console.error('Error getting Duffel Offer:', err);
      return null;
    }
  }

  /**
   * POST /air/orders
   * @param offerId - The exact ID of the verified offer.
   * @param passengers - Array of passengers mirroring Duffel's identity bounds.
   */
  public async createOrder(
    offerId: string,
    passengers: DuffelPassenger[],
    context: ApiLogContext = {},
  ): Promise<string | null> {
    const payload = {
      data: {
        type: 'instant',
        selected_offers: [offerId],
        passengers: passengers
      }
    };

    try {
      const startedAt = Date.now();
      const { statusCode, body } = await request(`${this.baseUrl}/air/orders`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });
      recordApiCall({
        api: 'duffel',
        method: 'POST',
        latencyMs: Date.now() - startedAt,
        status: statusCode,
        cacheHit: false,
        fallbackUsed: statusCode === 422,
        ...context,
      });

      if (statusCode === 422) {
         // Specific explicit handler mapping upstream for "offer_no_longer_available".
         throw new Error('offer_no_longer_available');
      }

      if (statusCode !== 200 && statusCode !== 201) {
        console.error(`Duffel Create Order Failed: ${statusCode}`);
        return null;
      }

      const res = (await body.json()) as DuffelJsonEnvelope<{ id: string }>;
      return res.data.id; // The resultant booking duffel_order_id
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'offer_no_longer_available') throw err;
      
      console.error('Error creating Duffel Order:', err);
      return null;
    }
  }

  public async ping(context: ApiLogContext = {}): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number }> {
    const startedAt = Date.now();
    try {
      const { statusCode, body } = await request(`${this.baseUrl}/air/airlines?limit=1`, {
        method: 'GET',
        headers: this.headers,
      });
      const latencyMs = Date.now() - startedAt;
      recordApiCall({
        api: 'duffel',
        method: 'GET',
        latencyMs,
        status: statusCode,
        cacheHit: false,
        fallbackUsed: false,
        ...context,
      });
      await body.dump(); // consume to avoid socket leak
      if (statusCode >= 500) return { status: 'down', latencyMs };
      if (statusCode >= 400) return { status: 'degraded', latencyMs };
      return { status: 'healthy', latencyMs };
    } catch (_error: unknown) {
      const latencyMs = Date.now() - startedAt;
      recordApiCall({
        api: 'duffel',
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
