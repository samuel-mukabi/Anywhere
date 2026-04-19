import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('SUPABASE config missing. Booking writes are disabled.');
}

const noopSupabase = {
  from: () => ({
    insert: () => ({
      select: () => ({
        single: async () => ({ data: null, error: { message: 'Supabase disabled (missing env)' } }),
      }),
    }),
  }),
} as unknown as SupabaseClient;

/**
 * Native Supabase Admin strictly used for system-level inserts (Bookings)
 */
export const supabaseAdmin: SupabaseClient = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : noopSupabase;
