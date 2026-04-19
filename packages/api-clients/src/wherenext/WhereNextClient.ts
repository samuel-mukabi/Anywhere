import { request } from 'undici';
import mongoose from 'mongoose';
import { redisClient } from '@repo/redis/src/client';
import pino from 'pino';

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
  city: string;
  meal_inexpensive: number;
  meal_for_2_mid_range: number;
  one_way_ticket_local: number;
  cappuccino_regular: number;
  currency: string;
  cost_of_living_index: number;
}

export class WhereNextClient {
  private colDataMap: Map<string, WhereNextColData> = new Map();
  private isLoaded: boolean = false;
  private apiKey: string;
  
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
    this.apiKey = process.env.WHERENEXT_API_KEY || '';
    if (!this.apiKey) logger.warn("WHERENEXT_API_KEY is natively missing from environment parameters.");
    
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
       const { statusCode, body } = await request('https://api.wherenext.com/v1/cost-of-living/global', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${this.apiKey}` }
       });

       if (statusCode === 200) {
           const json = await body.json() as { data: WhereNextColData[] };
           for (const item of json.data) {
             // Create index map natively out of lowered string boundaries
             this.colDataMap.set(item.city.toLowerCase(), item);
           }
           this.isLoaded = true;
           logger.info(`Successfully cached ${this.colDataMap.size} WhereNext Cities inside RAM`);
       } else {
           logger.warn(`WhereNext Prefetch failed with status: ${statusCode}`);
       }
    } catch (e) {
       logger.error('WhereNext Request crash locally internally.');
    }
  }

  /**
   * Secure Redis fetching with native external api FX limits strictly set to 24HR caching preventing locking.
   */
  private async getCachedFxRate(targetCurrency: string): Promise<number> {
    if (targetCurrency === 'USD') return 1;

    try {
      // 1. Hit Native Redis Map
      const cachedString = await redisClient.get('fx:rates');
      if (cachedString) {
         const ratesData = JSON.parse(cachedString);
         if (ratesData[targetCurrency]) return ratesData[targetCurrency];
      }

      // 2. Refresh from Free External Limits (No Key Required for basic USD fetch)
      const { statusCode, body } = await request('https://open.er-api.com/v6/latest/USD');
      if (statusCode === 200) {
         const json = (await body.json()) as { rates?: Record<string, number> };
         const rates = json.rates ?? {};
         await redisClient.setex('fx:rates', 86400, JSON.stringify(rates));

         return rates[targetCurrency] ?? 1;
      }
    } catch(err) {
       logger.error({ err }, 'Failed tracking FX sequences successfully');
    }

    return 1; // Default neutral factor
  }

  /**
   * Expose public lookup mapping to securely ascertain logic bounding over WhereNext parameters prior to executing.
   */
  public isKnownCity(slug: string): boolean {
     return this.colDataMap.has(slug.toLowerCase());
  }

  /**
   * Computes the daily total and converts out exactly sequentially mapped against the hierarchy bounds locally.
   */
  public async getDailyBudget(citySlug: string, targetCurrency: string = 'USD'): Promise<DailyBudgetEstimate> {
     // AWAIT readiness mapping allowing fast startup sequences securely
     if (!this.isLoaded) await new Promise(r => setTimeout(r, 1000));

     const slug = citySlug.toLowerCase();
     let baseData = this.colDataMap.get(slug);

     // 1. WhereNext Base Path
     if (baseData) {
        return this.compileResponse(
           baseData.meal_inexpensive,
           baseData.meal_for_2_mid_range / 2, // We split 2-person meal to single bounds
           baseData.one_way_ticket_local,
           baseData.cappuccino_regular,
           baseData.currency,
           baseData.cost_of_living_index,
           targetCurrency
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
                 targetCurrency
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
         targetCurrency
     );
  }

  private async compileResponse(mealCheap: number, mealMid: number, transport: number, coffee: number, sourceCurrency: string, colIndex: number, targetCurrency: string): Promise<DailyBudgetEstimate> {
     
     // Correctly map exactly into USD centrally and then project out into target limits securely
     const sourceToUsd = sourceCurrency === 'USD' ? 1 : (1 / await this.getCachedFxRate(sourceCurrency));
     const totalUsd = (mealCheap + mealMid + transport + coffee) * sourceToUsd;

     const activeMultiplier = targetCurrency === 'USD' ? 1 : await this.getCachedFxRate(targetCurrency);
     
     const totalLocalFixed = parseFloat((totalUsd * activeMultiplier).toFixed(2));
     
     let tier: 'budget' | 'mid' | 'premium' = 'mid';
     if (totalUsd < 40) tier = 'budget';
     else if (totalUsd > 90) tier = 'premium';

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
