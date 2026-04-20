import { Resend } from 'resend';
import pino from 'pino';
import { recordApiCall, type ApiLogContext } from '../observability';

const logger = pino({ level: 'info' });

export interface BookingDetails {
  orderId: string;
  bookingLink: string;
  airline: string;
  origin: string;
  destination: string;
  totalCost: number;
  currency: string;
  userEmail: string;
}

export interface PriceAlertDetails {
  destination: string;
  budget: number;
  currentCost: number;
  currency: string;
  userEmail: string;
}

export class ResendClient {
  private resend: Resend | null = null;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    const apiKey = process.env.RESEND_API_KEY || '';

    if (!apiKey) {
      if (this.isDevelopment) {
        logger.warn('RESEND_API_KEY is missing. Email routing is mocked securely for local development.');
      } else {
        logger.error('CRITICAL: RESEND_API_KEY missing in production! Emails will not deliver.');
      }
    } else {
      this.resend = new Resend(apiKey);
    }
  }

  public async sendBookingConfirmation(details: BookingDetails, context: ApiLogContext = {}): Promise<boolean> {
    const htmlSnippet = `
      <h2>Booking Confirmed for ${details.destination}</h2>
      <p>Your flight with ${details.airline} from ${details.origin} successfully booked exactly for ${details.totalCost} ${details.currency}.</p>
      <p>Order ID: <strong>${details.orderId}</strong></p>
      <p><a href="${details.bookingLink}">View Full Itinerary</a></p>
    `;

    return this.sendEmail(details.userEmail, `Your Anywhere Booking: ${details.destination}`, htmlSnippet, context);
  }

  public async sendPriceAlert(details: PriceAlertDetails, context: ApiLogContext = {}): Promise<boolean> {
    const htmlSnippet = `
      <h2>Price Drop Matched for ${details.destination}</h2>
      <p>The total cost to travel to ${details.destination} has dropped to ${details.currentCost} ${details.currency}, explicitly landing strictly under your native budget limit of ${details.budget}!</p>
      <p><a href="https://anywhere.travel/destinations/${details.destination}">Book Now</a></p>
    `;

    return this.sendEmail(details.userEmail, `Price Alert Drop: ${details.destination}`, htmlSnippet, context);
  }

  private async sendEmail(to: string, subject: string, html: string, context: ApiLogContext = {}): Promise<boolean> {
    if (!this.resend) {
      if (this.isDevelopment) {
         logger.info({ to, subject, html }, 'MOCK EMAIL ROUTED LATERALLY');
         return true;
      }
      return false;
    }

    try {
      const startedAt = Date.now();
      const { data, error } = await this.resend.emails.send({
        from: 'Anywhere <noreply@anywhere.travel>',
        to: [to],
        subject: subject,
        html: html,
      });

      const latencyMs = Date.now() - startedAt;

      recordApiCall({
        api: 'resend',
        method: 'POST',
        latencyMs,
        status: error ? 400 : 200,
        cacheHit: false,
        fallbackUsed: false,
        ...context,
      });

      if (error) {
        logger.error({ error }, 'Resend Delivery API Rejected Routing Boundaries');
        return false;
      }
      return !!data;
    } catch (err) {
      recordApiCall({
        api: 'resend',
        method: 'POST',
        latencyMs: 0,
        status: 'error',
        cacheHit: false,
        fallbackUsed: true,
        ...context,
      });
      logger.error({ err }, 'Resend Client Execution crashed actively tracking.');
      return false;
    }
  }

  public async ping(context: ApiLogContext = {}): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number }> {
    if (!this.resend && this.isDevelopment) {
      return { status: 'healthy', latencyMs: 0 };
    }
    
    if (!this.resend) {
       return { status: 'down', latencyMs: 0 };
    }

    const startedAt = Date.now();
    try {
      // Lightest generic endpoint for Resend Native checks without sending
      await this.resend.domains.list();
      
      recordApiCall({
        api: 'resend',
        method: 'GET',
        latencyMs: Date.now() - startedAt,
        status: 200,
        cacheHit: false,
        fallbackUsed: false,
        ...context,
      });
      return { status: 'healthy', latencyMs: Date.now() - startedAt };
    } catch (_error: unknown) {
      recordApiCall({
        api: 'resend',
        method: 'GET',
        latencyMs: Date.now() - startedAt,
        status: 'error',
        cacheHit: false,
        fallbackUsed: true,
        ...context,
      });
      return { status: 'down', latencyMs: Date.now() - startedAt };
    }
  }
}
