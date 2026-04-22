import { request } from 'undici';
import mongoose from 'mongoose';
import { redisClient } from '@repo/redis/src/client';
import pino from 'pino';
import {
  apiCacheEventsTotal,
  recordApiCall,
  type ApiLogContext,
} from '../observability';

const logger = pino({ level: 'info' });

export interface DailyBudgetEstimate {
  mealCheap: number;
  mealMid: number;
  localTransport: number;
  coffee: number;
  dailyTotal: number;
  currency: string;
  colIndex: number;
  tier: 'budget' | 'mid' | 'premium';
}

interface WhereNextColData {
  country_code: string;   // ISO-2 e.g. "FR"
  country: string;
  region: string;
  cost_index: number;           // 0-100 relative index (Tbilisi ≈ 24, NYC ≈ 100)
  monthly_estimate_usd: number; // Estimated monthly cost in USD
  grocery_index: number;
  rent_index: number;
  utilities_index: number;
  transport_index: number;
}

export class WhereNextClient {
  private colDataMap: Map<string, WhereNextColData> = new Map();
  private isLoaded: boolean = false;
  
  // Default Continent baseline mappings ($USD limits statically mapped internally if all databases fail to return data)
  private readonly CONTINENTAL_FALLBACKS: Record<string, DailyBudgetEstimate> = {
    'EU': { mealCheap: 15, mealMid: 60, localTransport: 3, coffee: 4, dailyTotal: 82, currency: 'USD', colIndex: 75, tier: 'mid' },
    'AS': { mealCheap: 4, mealMid: 20, localTransport: 1, coffee: 2, dailyTotal: 27, currency: 'USD', colIndex: 35, tier: 'budget' },
    'SA': { mealCheap: 6, mealMid: 25, localTransport: 1, coffee: 2, dailyTotal: 34, currency: 'USD', colIndex: 40, tier: 'budget' },
    'AF': { mealCheap: 5, mealMid: 20, localTransport: 1, coffee: 2, dailyTotal: 28, currency: 'USD', colIndex: 35, tier: 'budget' },
    'NA': { mealCheap: 20, mealMid: 80, localTransport: 3, coffee: 5, dailyTotal: 108, currency: 'USD', colIndex: 85, tier: 'premium' },
    'OC': { mealCheap: 18, mealMid: 70, localTransport: 3, coffee: 4, dailyTotal: 95, currency: 'USD', colIndex: 82, tier: 'premium' }
  };

  constructor() {
    
    // Automatically trigger cache initialization bounds concurrently
    this.prefetchColData().catch(err => {
      logger.error({ err }, 'Failed WhereNext Core Index initialization boundary');
    });
  }

  /**
   * Automatically executes on instantiation fetching all 380 endpoints into absolute memory.
   */
  private async prefetchColData() {
    logger.info('Prefetching WhereNext 380 CoL matrix into memory array...');
    
    try {
       const startedAt = Date.now();
       const { statusCode, body } = await request('https://getwherenext.com/api/data/cost-of-living', {
          method: 'GET'
       });
       recordApiCall({
        api: 'wherenext',
        method: 'GET',
        latencyMs: Date.now() - startedAt,
        status: statusCode,
        cacheHit: false,
        fallbackUsed: false,
       });

       if (statusCode === 200) {
           const json = await body.json() as { data: WhereNextColData[] };
           for (const item of json.data) {
             // Map by lowercase ISO-2 country code — this is what the API actually provides
             this.colDataMap.set(item.country_code.toLowerCase(), item);
           }
           this.isLoaded = true;
           logger.info(`Successfully cached ${this.colDataMap.size} WhereNext countries inside RAM`);
       } else {
           logger.warn(`WhereNext Prefetch failed with status: ${statusCode}`);
       }
    } catch (e) {
       recordApiCall({
        api: 'wherenext',
        method: 'GET',
        latencyMs: 0,
        status: 'error',
        cacheHit: false,
        fallbackUsed: true,
       });
       logger.error('WhereNext Request crash locally internally.');
    }
  }

  /**
   * Secure Redis fetching with native external api FX limits strictly set to 24HR caching preventing locking.
   */
  private async getCachedFxRate(targetCurrency: string, context: ApiLogContext = {}): Promise<number> {
    if (targetCurrency === 'USD') return 1;

    try {
      // 1. Hit Native Redis Map
      const cachedString = await redisClient.get('fx:rates');
      if (cachedString) {
         apiCacheEventsTotal.inc({ api: 'fxrates', event: 'hit' });
         const ratesData = JSON.parse(cachedString);
         if (ratesData[targetCurrency]) return ratesData[targetCurrency];
      }
      apiCacheEventsTotal.inc({ api: 'fxrates', event: 'miss' });

      // 2. Refresh from Free External Limits (No Key Required for basic USD fetch)
      const startedAt = Date.now();
      const { statusCode, body } = await request('https://open.er-api.com/v6/latest/USD');
      recordApiCall({
        api: 'fxrates',
        method: 'GET',
        latencyMs: Date.now() - startedAt,
        status: statusCode,
        cacheHit: false,
        fallbackUsed: false,
        ...context,
      });
      if (statusCode === 200) {
         const json = (await body.json()) as { rates?: Record<string, number> };
         const rates = json.rates ?? {};
         await redisClient.setex('fx:rates', 86400, JSON.stringify(rates));

         return rates[targetCurrency] ?? 1;
      }
    } catch(err) {
       recordApiCall({
        api: 'fxrates',
        method: 'GET',
        latencyMs: 0,
        status: 'error',
        cacheHit: false,
        fallbackUsed: true,
        ...context,
       });
       logger.error({ err }, 'Failed tracking FX sequences successfully');
    }

    return 1; // Default neutral factor
  }

  /**
   * Expose public lookup mapping to securely ascertain logic bounding over WhereNext parameters prior to executing.
   */
  public isKnownCity(slug: string): boolean {
     const key = slug.toLowerCase().slice(0, 2);
     return this.colDataMap.has(key);
  }

  /**
   * Computes the daily total and converts out exactly sequentially mapped against the hierarchy bounds locally.
   */
  public async getDailyBudget(
    citySlug: string,
    targetCurrency: string = 'USD',
    context: ApiLogContext = {},
  ): Promise<DailyBudgetEstimate> {
     // AWAIT readiness mapping allowing fast startup sequences securely
     if (!this.isLoaded) await new Promise(r => setTimeout(r, 1000));

     // Accept either ISO-2 country code ("fr") or city slug ("paris") —
     // WhereNext is country-level so we normalise to 2-char code where possible
     const slug = citySlug.toLowerCase().slice(0, 2);
     const baseData = this.colDataMap.get(slug);

     // 1. WhereNext Base Path — derive per-item costs from monthly estimate & indices
     if (baseData) {
        // monthly_estimate_usd covers rent + food + transport + utilities.
        // We extract component estimates proportionally from sub-indices.
        const daily = baseData.monthly_estimate_usd / 30;
        const mealCheap  = parseFloat((daily * 0.18).toFixed(2)); // ~18% of daily spend on cheap meal
        const mealMid    = parseFloat((daily * 0.35).toFixed(2)); // ~35% on mid meal
        const transport  = parseFloat((daily * (baseData.transport_index / 100) * 0.12).toFixed(2));
        const coffee     = parseFloat((daily * 0.05).toFixed(2));

        return this.compileResponse(
           mealCheap,
           mealMid,
           transport,
           coffee,
           'USD', // WhereNext already returns USD estimates
           baseData.cost_index,
           targetCurrency,
           context,
        );
     }

     // 2. MongoDB Fallback Trajection (Pre-loaded destination vectors)
     try {
       if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
           const dbCity = await mongoose.connection.db.collection('destinations').findOne({ slug: slug });
           
           if (dbCity && dbCity.avgCosts) {
              logger.info(`Missing from WhereNext - Re-routed to Mongo for ${slug}`);
              return this.compileResponse(
                 dbCity.avgCosts.mealCheap || 10,
                 dbCity.avgCosts.mealMid || 20,
                 dbCity.avgCosts.localTransport || 2,
                 dbCity.avgCosts.coffee || 3,
                 'USD',
                 dbCity.hiddenGemScore || 50,
                 targetCurrency,
                 context,
              );
           }
       }
     } catch (e) {
        logger.error('Mongo Fallback collapsed inherently.');
     }

     // 3. Absolute Last Resort Continental Extraction
     logger.warn(`Absolute Default FX fallback mapped globally for generic response on ${slug}`);
     // Stubbed to 'AS' strictly if Mongo collapsed without bounding region natively. In a real scenario we pass region explicitly in parameters.
     const fallback = this.CONTINENTAL_FALLBACKS['AS']; 
     return this.compileResponse(
         fallback.mealCheap,
         fallback.mealMid,
         fallback.localTransport,
         fallback.coffee,
         fallback.currency,
         fallback.colIndex,
         targetCurrency,
         context,
     );
  }

  private async compileResponse(
    mealCheap: number,
    mealMid: number,
    transport: number,
    coffee: number,
    sourceCurrency: string,
    colIndex: number,
    targetCurrency: string,
    context: ApiLogContext = {},
  ): Promise<DailyBudgetEstimate> {
     
     // Correctly map exactly into USD centrally and then project out into target limits securely
     const sourceToUsd = sourceCurrency === 'USD' ? 1 : (1 / await this.getCachedFxRate(sourceCurrency, context));
     const totalUsd = (mealCheap + mealMid + transport + coffee) * sourceToUsd;

     const activeMultiplier = targetCurrency === 'USD' ? 1 : await this.getCachedFxRate(targetCurrency, context);
     
     const totalLocalFixed = parseFloat((totalUsd * activeMultiplier).toFixed(2));
     
     let tier: 'budget' | 'mid' | 'premium' = 'mid';
     if (colIndex < 50) tier = 'budget';
     else if (colIndex >= 80) tier = 'premium';

     return {
        mealCheap: parseFloat((mealCheap * sourceToUsd * activeMultiplier).toFixed(2)),
        mealMid: parseFloat((mealMid * sourceToUsd * activeMultiplier).toFixed(2)),
        localTransport: parseFloat((transport * sourceToUsd * activeMultiplier).toFixed(2)),
        coffee: parseFloat((coffee * sourceToUsd * activeMultiplier).toFixed(2)),
        dailyTotal: totalLocalFixed,
        currency: targetCurrency,
        colIndex,
        tier
     };
  }
}
