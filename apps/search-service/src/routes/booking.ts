import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DuffelClient } from '@repo/api-clients';
import { bookingEventsQueue } from '@repo/redis/src/queues';
import { supabaseAdmin } from '../lib/supabase';
import { KiwiAdapter } from '../adapters/KiwiAdapter';

const PassengerSchema = z.object({
  id: z.string(),
  title: z.enum(['mr', 'ms', 'mrs', 'miss']),
  given_name: z.string().min(1),
  family_name: z.string().min(1),
  born_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  email: z.string().email(),
  phone_number: z.string().min(8),
  gender: z.enum(['m', 'f'])
});

type Passenger = z.infer<typeof PassengerSchema>;

export async function bookingRoutes(app: FastifyInstance) {
  const duffel = new DuffelClient(process.env.DUFFEL_ACCESS_TOKEN || '');
  const kiwi = new KiwiAdapter();

  /**
   * POST /booking/confirm-price
   */
  app.post<{ Body: { offerId: string; baselinePrice: number } }>(
    '/confirm-price',
    async (req, reply) => {
      const { offerId, baselinePrice } = req.body;

      if (!offerId || !baselinePrice) {
        return reply.code(400).send({ error: 'Missing offerId or baselinePrice' });
      }

      const offer = await duffel.getOffer(offerId);

      if (!offer) {
        return reply.code(404).send({ error: 'Offer not safely recoverable' });
      }

      const priceChanged = offer.totalAmount !== baselinePrice;
      const priceDelta = offer.totalAmount - baselinePrice;

      return reply.send({
        currentPrice: offer.totalAmount,
        currency: offer.currency,
        expiresAt: offer.expiresAt,
        priceChanged,
        priceDelta
      });
    }
  );

  /**
   * POST /booking/create-order
   */
  app.post<{ 
    Body: { 
      offerId: string; 
      passengers: Passenger[]; 
      userId: string;
      destination: string; 
      origin: string;
      departureDate: string;
    } 
  }>(
    '/create-order',
    async (req, reply) => {
      const { offerId, passengers, userId, destination, origin, departureDate } = req.body;

      // 1. Zod native validation
      const parsedPassengers = z.array(PassengerSchema).safeParse(passengers);

      if (!parsedPassengers.success) {
        return reply.code(400).send({ error: 'Invalid passenger boundaries', issues: parsedPassengers.error.issues });
      }

      try {
        // 2. Transact Order Execution over Duffel SDK safely
        const orderId = await duffel.createOrder(offerId, parsedPassengers.data);

        if (!orderId) {
          throw new Error('System unverified Duffel state natively');
        }

        // 3. Re-verify the price natively locked during transaction
        const offer = await duffel.getOffer(offerId); 

        // 4. Write explicitly to PostgreSQL tracking the conversion internally
        const { error: dbError } = await supabaseAdmin.from('bookings').insert([{
           user_id: userId,
           duffel_order_id: orderId,
           offer_id: offerId,
           destination_id: destination,
           total_cost: offer?.totalAmount || 0,
           currency: offer?.currency || 'USD'
        }]);

        if (dbError) {
          app.log.error({ dbError }, 'Failed logging booking completion internally');
        }

        // 5. Fire BullMQ Sequence updating CRM, Tracking, and Email Workers locally
        await bookingEventsQueue.add('booking.completed', {
          userId,
          orderId,
          destination,
          totalCost: offer?.totalAmount
        });

        return reply.send({ success: true, orderId });

      } catch (err: unknown) {
         // Handle Native Flight Collapse bounds explicitly
         if (err instanceof Error && err.message === 'offer_no_longer_available') {
            app.log.warn({ offerId }, 'Executing Native Fallback for expired Duffel Offer');
            
            // Re-trigger Tequila locally pushing a new flight parameter cost back to the User interface seamlessly
            const newCost = await kiwi.getEstimatedFlightCost(origin, destination, departureDate);
            
            return reply.code(422).send({ 
              error: 'offer_no_longer_available', 
              fallbackPriceEstimate: newCost 
            });
         }

         app.log.error({ err }, 'Order failed entirely');
         return reply.code(500).send({ error: 'Checkout pipeline crashed' });
      }
    }
  );
}
