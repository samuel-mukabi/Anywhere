import { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { supabaseAdmin } from '../lib/supabase';

// Assuming frontend is running locally on 3000 during dev
const FRONTEND_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export async function billingRoutes(app: FastifyInstance) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
    apiVersion: '2024-06-20',
  });

  /**
   * POST /billing/checkout
   * Expects { priceId: string, userId: string } in body.
   * Returns { sessionId: string }
   */
  app.post<{ Body: { priceId: string; userId: string } }>(
    '/billing/checkout',
    async (req, reply) => {
      const { priceId, userId } = req.body;

      if (!priceId || !userId) {
        return reply.code(400).send({ error: 'Missing priceId or userId' });
      }

      // Check for existing customer ID
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

      let customerId = user?.stripe_customer_id;

      try {
        const session = await stripe.checkout.sessions.create({
          customer: customerId || undefined,
          client_reference_id: userId,
          payment_method_types: ['card'],
          mode: 'subscription',
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          success_url: `${FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${FRONTEND_URL}/pricing`,
        });

        return reply.send({ sessionId: session.id });
      } catch (err: unknown) {
        app.log.error({ err }, 'Stripe Checkout Session creation failed');
        return reply.code(500).send({
          error: err instanceof Error ? err.message : 'Checkout session failed',
        });
      }
    }
  );

  /**
   * POST /billing/portal
   * Expects { userId: string } in body.
   * Returns { url: string }
   */
  app.post<{ Body: { userId: string } }>(
    '/billing/portal',
    async (req, reply) => {
      const { userId } = req.body;

      if (!userId) {
        return reply.code(400).send({ error: 'Missing userId' });
      }

      const { data: user } = await supabaseAdmin
        .from('users')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

      if (!user?.stripe_customer_id) {
        return reply.code(400).send({ error: 'User does not have an active subscription.' });
      }

      try {
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: user.stripe_customer_id,
          return_url: `${FRONTEND_URL}/dashboard`,
        });

        return reply.send({ url: portalSession.url });
      } catch (err: unknown) {
        app.log.error({ err }, 'Stripe Portal Session creation failed');
        return reply.code(500).send({
          error: err instanceof Error ? err.message : 'Portal session failed',
        });
      }
    }
  );
}
