import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import Stripe from 'stripe';
import { updateUserTierByStripeId } from '../lib/supabase';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: string | Buffer;
  }
}

export async function webhookRoutes(app: FastifyInstance) {
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
    apiVersion: '2024-06-20',
  });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';

  /**
   * Stripe Webhook Endpoint
   * We need raw body payload so we use Fastify native configuration.
   */
  app.post('/webhooks/stripe', {
    config: {
      rawBody: true
    }
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      return reply.code(400).send({ error: 'Missing Stripe Signature' });
    }

    let event: Stripe.Event;

    try {
      // Assumes we configured Fastify to attach req.rawBody or similar. 
      // For a native Fastify implementation, we verify against the raw un-parsed buffer body
      // We will cast any explicitly to satisfy Stripe constructEvent in this fastify environment.
      event = stripe.webhooks.constructEvent(req.rawBody as any || req.body as any, sig, webhookSecret);
    } catch (err: any) {
      app.log.warn({ msg: 'Webhook signature verification failed', err });
      return reply.code(400).send(`Webhook Error: ${err.message}`);
    }

    // Process the exact Stripe Subscription event logic
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // E.g., Active / Trialing equals PRO Tier.
        // Canceled / Past Due equals FREE Tier.
        const isActive = ['active', 'trialing'].includes(subscription.status);
        const newTier = isActive ? 'pro' : 'free';

        await updateUserTierByStripeId(customerId, newTier);
        
        app.log.info({ customerId, newTier }, 'Stripe Webhook dynamically updated User Tier');
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Hard downgrade back to free unconditionally
        await updateUserTierByStripeId(customerId, 'free');
        app.log.info({ customerId, tier: 'free' }, 'Stripe Webhook downgraded User Tier due to canceled sub');
        break;
      }
      
      default:
        // Ignoring other Stripe payloads safely
        break;
    }

    return reply.status(200).send({ received: true });
  });

}
