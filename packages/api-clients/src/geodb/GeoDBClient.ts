import { request } from 'undici';
import { redisClient } from '@repo/redis/src/client';
import pino from 'pino';

const logger = pino({ level: 'info' });

export interface GeoCityResult {
  name: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  population: number;
  timezone: string;
}

interface GeoDbSearchResponse {
  data: GeoCityResult[];
}

export class GeoDBClient {
  private baseUrl = 'https://wft-geo-db.p.rapidapi.com/v1';
  private rapidApiKey: string;
  
  // 90 days explicitly matching architectural seed-only bounds functionally strictly locally 
  private CACHE_TTL_SECONDS = 90 * 24 * 60 * 60;

  constructor(rapidApiKey: string) {
    this.rapidApiKey = rapidApiKey;
  }

  /**
   * Search City strictly bound via Country limits extracting exactly mapping standard coordinates dynamically safely.
   */
  public async searchCity(name: string, countryCode: string): Promise<GeoCityResult | null> {
      // Normalize aggressively bypassing caching misses dynamically 
      const cleanName = name.trim().toLowerCase();
      const cleanCode = countryCode.trim().toLowerCase();
      
      const redisKey = `geodb:${cleanName}:${cleanCode}`;

      try {
          // 1. Memory Look aside cleanly mapping local state bypassing expensive RapidAPI checks strictly
          const cached = await redisClient.get(redisKey);
          if (cached) return JSON.parse(cached) as GeoCityResult;

          // 2. Transact strictly evaluating thresholds limits strictly bounding memory explicitly
          const url = new URL(`${this.baseUrl}/geo/cities`);
          url.searchParams.set('namePrefix', cleanName);
          url.searchParams.set('countryIds', countryCode.toUpperCase());
          url.searchParams.set('minPopulation', '50000');
          url.searchParams.set('limit', '1');

          const { statusCode, body } = await request(url.toString(), {
              method: 'GET',
              headers: {
                  'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com',
                  'X-RapidAPI-Key': this.rapidApiKey,
                  'Accept': 'application/json'
              }
          });

          if (statusCode === 429) {
             logger.fatal('RapidAPI Limit Structurally Breached. Terminate seed locally actively blocking IP.');
             return null;
          }

          if (statusCode !== 200) {
             logger.error({ statusCode }, 'Unexpected Response entirely explicitly blocking resolution sequence.');
             return null;
          }
          
          const raw = (await body.json()) as GeoDbSearchResponse;

          if (!raw || !raw.data || raw.data.length === 0) {
             logger.warn({ name, countryCode }, 'GeoDB explicitly returned empty matches logically avoiding coordinates');
             return null;
          }

          const target = raw.data[0];

          const mapped: GeoCityResult = {
             name: target.name,
             countryCode: target.countryCode,
             latitude: target.latitude,
             longitude: target.longitude,
             population: target.population,
             timezone: target.timezone
          };

          await redisClient.setex(redisKey, this.CACHE_TTL_SECONDS, JSON.stringify(mapped));
          
          return mapped;

      } catch (err) {
         logger.error({ err, name, countryCode }, 'GeoDBClient mapping sequence collapsed tracking dependencies.');
         return null;
      }
  }
}
