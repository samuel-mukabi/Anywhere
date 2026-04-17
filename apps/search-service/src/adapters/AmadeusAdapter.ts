import { request } from 'undici';

export class AmadeusAdapter {
  private apiKey: string;
  private apiSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.apiKey = process.env.AMADEUS_CLIENT_ID || 'mock_amadeus_key';
    this.apiSecret = process.env.AMADEUS_CLIENT_SECRET || 'mock_amadeus_secret';
  }

  /**
   * Evaluates the Amadeus token to ensure valid calls.
   * Auto-renews if it's dead.
   */
  private async authenticate() {
    if (this.accessToken && Date.now() < this.tokenExpiry) return;

    // Use Mock API logic if API keys aren't officially loaded (To ensure this local microservice runs cleanly)
    if (this.apiKey === 'mock_amadeus_key') {
       this.accessToken = 'mock_token_123';
       this.tokenExpiry = Date.now() + 1000 * 3600;
       return;
    }

    // Call standard OAuth2 amadeus auth logic using Native Undici
    const bodyForm = new URLSearchParams();
    bodyForm.append('grant_type', 'client_credentials');
    bodyForm.append('client_id', this.apiKey);
    bodyForm.append('client_secret', this.apiSecret);

    const { statusCode, body } = await request('https://test.api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyForm.toString()
    });

    if (statusCode !== 200) {
      throw new Error(`Amadeus auth failed: ${statusCode}`);
    }

    const data: any = await body.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 5000;
  }

  /**
   * Search available flight routes to predict flight cost.
   * Includes simple naive retry mechanism if Amadeus rates limit us blindly.
   */
  public async getEstimatedFlightCost(origin: string, destination: string, departureDate: string, maxRetries = 2): Promise<number | null> {
    
    // MOCK RESPONSE for safety since we're un-authenticated natively right now
    if (this.accessToken === 'mock_token_123') {
       return Math.floor(Math.random() * (800 - 200 + 1) + 200); // Cost between 200 - 800
    }

    // Retry Loop handling HTTP 429
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.authenticate();

        const url = new URL('https://test.api.amadeus.com/v2/shopping/flight-offers');
        url.searchParams.set('originLocationCode', origin);
        url.searchParams.set('destinationLocationCode', destination);
        url.searchParams.set('departureDate', departureDate);
        url.searchParams.set('adults', '1');
        url.searchParams.set('max', '1'); // We just need a general estimate

        const res = await request(url.toString(), {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        });

        if (res.statusCode === 429) {
          throw new Error('Rate Limited'); 
        }

        if (res.statusCode !== 200) return null;

        const data: any = await res.body.json();
        
        if (data && data.data && data.data.length > 0) {
           return parseFloat(data.data[0].price.total);
        }
        return null;

      } catch (error: any) {
        if (error.message === 'Rate Limited' && attempt < maxRetries) {
           // Wait exactly 2 seconds and retry
           await new Promise(r => setTimeout(r, 2000));
           continue;
        }
        return null;
      }
    }
    return null;
  }
}
