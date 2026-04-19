import { request } from 'undici';

export class KiwiAdapter {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.KIWI_TEQUILA_API_KEY || 'mock_kiwi_key';
  }

  /**
   * Search available flight routes to predict flight cost via Tequila.
   */
  public async getEstimatedFlightCost(origin: string, destination: string, departureDate: string): Promise<number | null> {
    
    // MOCK RESPONSE for safety until keys are deployed
    if (this.apiKey === 'mock_kiwi_key') {
       return Math.floor(Math.random() * (800 - 200 + 1) + 200); 
    }

    try {
      const url = new URL('https://api.tequila.kiwi.com/v2/search');
      url.searchParams.set('fly_from', origin);
      url.searchParams.set('fly_to', destination);
      url.searchParams.set('date_from', departureDate);
      url.searchParams.set('date_to', departureDate);
      url.searchParams.set('adults', '1');
      url.searchParams.set('limit', '1');

      const res = await request(url.toString(), {
        headers: { apikey: this.apiKey }
      });

      if (res.statusCode !== 200) return null;

      const data = (await res.body.json()) as { data?: Array<{ price: string | number }> };
      
      if (data && data.data && data.data.length > 0) {
         return parseFloat(String(data.data[0].price));
      }
      return null;

    } catch (error: unknown) {
      return null;
    }
  }
}
