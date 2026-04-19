import { request } from 'undici';
import { redisClient } from '@repo/redis/src/client';
import pino from 'pino';

const logger = pino({ level: 'info' });

export interface MonthlyClimate {
  /** Calendar month: 1 = January … 12 = December */
  month: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  /** Mean daily temperature in °C ((tMax + tMin) / 2), averaged over the month */
  avgTempC: number;
  /** Mean daily precipitation in mm, averaged over the month */
  avgPrecipMm: number;
  /** Mean daily sunshine in hours, averaged over the month */
  avgSunshineHours: number;
}

/** Daily time-series block from Open-Meteo archive API `daily` param. */
interface OpenMeteoDailySeries {
  time: string[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
  precipitation_sum: (number | null)[];
  sunshine_duration: (number | null)[];
}

interface OpenMeteoArchiveResponse {
  daily?: OpenMeteoDailySeries;
  /** Present on some 400 / empty-coordinate responses */
  error?: boolean;
  reason?: string;
}

// Minimal fallback global index mapping preventing external dependencies exactly when location checks fail statically.
const CAPITAL_FALLBACKS = [
  { city: 'London', lat: 51.5074, lng: -0.1278 },
  { city: 'Paris', lat: 48.8566, lng: 2.3522 },
  { city: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { city: 'New York', lat: 40.7128, lng: -74.0060 }, // Technical hub substitute
  { city: 'Sydney', lat: -33.8688, lng: 151.2093 },
  { city: 'Cape Town', lat: -33.9249, lng: 18.4241 },
  { city: 'Dubai', lat: 25.2048, lng: 55.2708 },
  { city: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { city: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729 },
  { city: 'Cairo', lat: 30.0444, lng: 31.2357 }
];

export class OpenMeteoClient {
  private baseUrl = 'https://archive-api.open-meteo.com/v1/archive';

  /**
   * Calculates Haversine spatial vector naturally mapping distance offline bounds.
   */
  private getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius bounding in KM securely natively
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  }

  /**
   * Snaps mapping cleanly to standard backup globals explicitly protecting tracking constraints.
   */
  private findNearestCapital(lat: number, lng: number) {
     let nearest = CAPITAL_FALLBACKS[0];
     let minDistance = Infinity;

     for (const capital of CAPITAL_FALLBACKS) {
        const distance = this.getHaversineDistance(lat, lng, capital.lat, capital.lng);
        if (distance < minDistance) {
            minDistance = distance;
            nearest = capital;
        }
     }
     
     return nearest;
  }

  /**
   * Queries bounding sequences hitting archive matrices cleanly translating daily bounds into Month aggregated arrays natively.
   */
  public async getMonthlyClimate(lat: number, lng: number, year: number): Promise<MonthlyClimate[]> {
    const redisKey = `climate:${lat.toFixed(2)}:${lng.toFixed(2)}:${year}`;

    try {
        // 1. Transparent Caching Layer locking bounds down perfectly out to 90 Days safely preventing spikes
        const cache = await redisClient.get(redisKey);
        if (cache) return JSON.parse(cache);

        let fetchLat = lat;
        let fetchLng = lng;

        // 2. Primary fetch
        let result = await this.executeFetch(fetchLat, fetchLng, year);

        // 3. Fallback: Open-Meteo returns { error: true, reason: '...' } with HTTP 400
        //    when no historical data exists for the coordinates supplied.
        const isDataUnavailable =
            !result ||
            (result.error === true &&
                typeof result.reason === 'string' &&
                /no data|no observation|not available/i.test(result.reason));

        if (isDataUnavailable) {
            const nearest = this.findNearestCapital(lat, lng);
            logger.warn(
                { originalLat: lat, originalLng: lng, fallback: nearest.city, reason: result?.reason },
                `OpenMeteo: no data for destination [${lat},${lng}] — substituting nearest capital: ${nearest.city}`
            );

            fetchLat = nearest.lat;
            fetchLng = nearest.lng;

            result = await this.executeFetch(fetchLat, fetchLng, year);
        }

        if (!result || !result.daily) {
             logger.error('Total OpenMeteo bounds fetch collapse inherently');
             return this.getEmptyStub();
        }

        const monthlyAggregates = this.aggregateDailyToMonthly(result.daily);

        // Buffer locally targeting exclusively 90 Days explicitly (7776000 seconds)
        await redisClient.setex(redisKey, 7776000, JSON.stringify(monthlyAggregates));
        
        return monthlyAggregates;
    } catch (err) {
        logger.error({ err }, 'Exception executing OpenMeteo sequence seamlessly');
        return this.getEmptyStub();
    }
  }

  private async executeFetch(lat: number, lng: number, year: number): Promise<OpenMeteoArchiveResponse | null> {
      const url = new URL(this.baseUrl);
      url.searchParams.set('latitude', lat.toString());
      url.searchParams.set('longitude', lng.toString());
      url.searchParams.set('start_date', `${year}-01-01`);
      url.searchParams.set('end_date', `${year}-12-31`);
      url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration');
      url.searchParams.set('timezone', 'auto'); // Resolves local epoch buckets

      const { statusCode, body } = await request(url.toString(), { method: 'GET' });

      if (statusCode === 400) {
          // OpenMeteo flags bad coordinates natively mapping across 400 matrices.
          return (await body.json()) as OpenMeteoArchiveResponse;
      }

      if (statusCode !== 200) return null;

      return (await body.json()) as OpenMeteoArchiveResponse;
  }

  private aggregateDailyToMonthly(daily: OpenMeteoDailySeries): MonthlyClimate[] {
     // Prepare accumulation tracking bounds natively
     const buckets: Record<number, { tempMax: number[], tempMin: number[], precip: number[], sunshine: number[] }> = {};
     
     for (let i = 1; i <= 12; i++) {
        buckets[i] = { tempMax: [], tempMin: [], precip: [], sunshine: [] };
     }

     const times = daily.time;
     times.forEach((dateStr, idx) => {
         // dateStr expects format YYYY-MM-DD
         const monthMatch = dateStr.split('-');
         if (monthMatch.length < 2) return;
         const monthIndex = parseInt(monthMatch[1], 10);

         const tMax = daily.temperature_2m_max[idx];
         const tMin = daily.temperature_2m_min[idx];
         const pSum = daily.precipitation_sum[idx];
         const sunDur = daily.sunshine_duration[idx];

         // OpenMeteo utilizes null buffers exactly for missing day parameters safely
         if (tMax !== null) buckets[monthIndex].tempMax.push(tMax);
         if (tMin !== null) buckets[monthIndex].tempMin.push(tMin);
         if (pSum !== null) buckets[monthIndex].precip.push(pSum);
         if (sunDur !== null) buckets[monthIndex].sunshine.push(sunDur);
     });

     const aggregates: MonthlyClimate[] = [];

     for (let m = 1; m <= 12; m++) {
        const b = buckets[m];
        
        const avgMax = this.calculateMean(b.tempMax);
        const avgMin = this.calculateMean(b.tempMin);
        const avgTempC = parseFloat(((avgMax + avgMin) / 2).toFixed(1));

        const avgPrecipMm = parseFloat(this.calculateMean(b.precip).toFixed(1));

        // OpenMeteo provides sunshine in seconds, transform cleanly entirely to hourly rates accurately globally measuring totals per day natively
        const avgSunshineSecsPerDay = this.calculateMean(b.sunshine);
        const avgSunshineHoursPerDay = parseFloat((avgSunshineSecsPerDay / 3600).toFixed(1));

        aggregates.push({
            month: m as MonthlyClimate['month'],
            avgTempC: isNaN(avgTempC) ? 15 : avgTempC,
            avgPrecipMm: isNaN(avgPrecipMm) ? 0 : avgPrecipMm,
            avgSunshineHours: isNaN(avgSunshineHoursPerDay) ? 0 : avgSunshineHoursPerDay
        });
     }

     return aggregates;
  }

  private calculateMean(arr: number[]): number {
      if (!arr || arr.length === 0) return 0;
      return arr.reduce((acc, curr) => acc + curr, 0) / arr.length;
  }

  private getEmptyStub(): MonthlyClimate[] {
      const aggregates: MonthlyClimate[] = [];
      for (let m = 1; m <= 12; m++) {
         aggregates.push({ month: m as MonthlyClimate['month'], avgTempC: 15, avgPrecipMm: 50, avgSunshineHours: 6 });
      }
      return aggregates;
  }
}

/** Pre-instantiated singleton — import and call directly without `new`. */
export const openMeteoClient = new OpenMeteoClient();
