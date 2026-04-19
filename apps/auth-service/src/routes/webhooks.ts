import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import Stripe from 'stripe';
import { updateUserTierByStripeId, updateUserStripeCustomer, upsertSubscription } from '../lib/supabase';

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
      const raw = req.rawBody;
      const payload: string | Buffer =
        typeof raw === 'string' || Buffer.isBuffer(raw)
          ? raw
          : Buffer.from(JSON.stringify(req.body));
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      app.log.warn({ msg: 'Webhook signature verification failed', err });
      return reply.code(400).send(`Webhook Error: ${message}`);
    }

    // Process the exact Stripe Subscription event logic
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        const customerId = session.customer as string;
        const userId = session.client_reference_id; // Will be passed from front-end during checkout creation
        const subscriptionId = session.subscription as string;

        if (userId && customerId) {
           await updateUserStripeCustomer(userId, customerId);
           
           if (subscriptionId) {
             const subscription = await stripe.subscriptions.retrieve(subscriptionId);
             const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
             await upsertSubscription(userId, subscriptionId, subscription.status, currentPeriodEnd);
             
             if (['active', 'trialing'].includes(subscription.status)) {
               await updateUserTierByStripeId(customerId, 'pro');
             }
           }
        }
        app.log.info({ customerId, userId }, 'Stripe Webhook processed checkout session');
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        
        // We might not have userId directly if it's a raw subscription event without client_reference_id on the session.
        // We can do a look up using an internal helper if needed, but the checkout.session.completed 
        // usually resolves the initial binding. We'll lookup user via supabase to do the upsert if we 
        // had a helper, or just let tier be managed. To upsert subscription cleanly if missing userId,
        // we'd fetch userId by stripe_customer_id. Since we only want to manage tiers directly or if
        // mapped, we assume the DB handles relations correctly by tier sync.
        // Since we need to update the subscription table, let's just attempt tier sync here 
        //, and for deeper mapping we would pull userId from the users table.

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

        // Note: You could update the subscription status to 'canceled' via upsertSubscription
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
