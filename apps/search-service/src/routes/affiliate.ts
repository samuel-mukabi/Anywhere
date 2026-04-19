import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';

export async function affiliateRoutes(app: FastifyInstance) {
  
  /**
   * POST /affiliate/click
   * Silently tracks initial conversion intent prior to the handoffs securely natively dropping to Postgres tracking limits.
   */
  app.post<{ Body: { userId: string; destination: string; provider: string; offerPrice: number } }>(
    '/click',
    async (req, reply) => {
      const { userId, destination, provider, offerPrice } = req.body;

      if (!userId || !destination || !provider) {
        return reply.code(400).send({ error: 'Missing standard telemetry fields' });
      }

      const { data, error } = await supabaseAdmin.from('affiliate_clicks').insert([{
        user_id: userId,
        destination_id: destination,
        provider,
        offer_price: offerPrice
      }]).select('id').single();

      if (error) {
         app.log.error({ error }, 'Metrics ingest failed');
         return reply.code(500).send({ status: 'telemetry_failure' });
      }

      return reply.send({ status: 'ok', clickId: data.id });
    }
  );
}
