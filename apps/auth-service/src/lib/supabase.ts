import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing. Database interactions will fail.');
}

/**
 * Admin Client bypassing RLS.
 * 
 * We use Supabase here exclusively as our resilient PostgreSQL identity datastore.
 * We DO NOT use their GoTrue JWT sessions. The Auth Service manages its own sessions.
 */
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export interface UserProfile {
  id: string;
  email: string;
  tier: 'free' | 'pro';
  stripe_customer_id?: string | null;
}

/**
 * Upserts a User based on their OAuth profile.
 * Standardizes Google/Apple payloads into our UserProfile format.
 */
export async function syncOAuthUser(email: string, providerId: string): Promise<UserProfile> {
  // 1. Try to find user by email. 
  // In a real app we might lookup `providerId` as well inside an `identities` table to prevent account hijacking via email.
  const { data: users, error: findError } = await supabaseAdmin
    .from('users')
    .select('id, email, tier, stripe_customer_id')
    .eq('email', email)
    .limit(1);

  if (findError) throw findError;

  if (users && users.length > 0) {
    return users[0] as UserProfile;
  }

  // 2. Create the user if they don't exist
  // We use our custom "users" table, bypassing standard Supabase Auth completely for this architecture,
  // or we can use supabase auth admin specifically:
  const { data: createdUser, error: createError } = await supabaseAdmin
    .from('users')
    .insert([
      { email, tier: 'free', provider_id: providerId }
    ])
    .select()
    .single();

  if (createError) throw createError;
  return createdUser as UserProfile;
}

export async function updateUserTierByStripeId(stripeCustomerId: string, tier: 'free' | 'pro') {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ tier })
      .eq('stripe_customer_id', stripeCustomerId);

    if (error) throw error;
}

/**
 * Link a Stripe Customer ID to our internal user (fired after successful checkout)
 */
export async function updateUserStripeCustomer(userId: string, stripeCustomerId: string) {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', userId);

    if (error) throw error;
}

/**
 * Upsert Subscription state from Stripe Webhooks
 */
export async function upsertSubscription(
  userId: string, 
  stripeSubscriptionId: string, 
  status: string, 
  currentPeriodEnd: Date
) {
    // Note: If updating, we match by stripe_subscription_id.
    // If inserting, we insert new. 
    // In a production Supabase DB, you'd use a unique constraint on stripe_subscription_id 
    // and `upsert` matching it. For now, we do a basic `upsert` relying on user_id + sub id combo
    // or just an explicit lookup.
    
    // Check if it exists
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .limit(1)
      .single();

    if (existing) {
       const { error } = await supabaseAdmin
         .from('subscriptions')
         .update({ status, current_period_end: currentPeriodEnd.toISOString(), user_id: userId })
         .eq('stripe_subscription_id', stripeSubscriptionId);
         
       if (error) throw error;
    } else {
       const { error } = await supabaseAdmin
         .from('subscriptions')
         .insert([{
            user_id: userId,
            stripe_subscription_id: stripeSubscriptionId,
            status,
            current_period_end: currentPeriodEnd.toISOString()
         }]);

       if (error) throw error;
    }
}
