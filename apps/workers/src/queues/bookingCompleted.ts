import { Worker, Job } from 'bullmq';
import { redisClient } from '@repo/redis/src/client';
import { createClient } from '@supabase/supabase-js';
import pino from 'pino';

const logger = pino({ level: 'info' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export const bookingCompletedWorker = new Worker(
  'booking-events',
  async (job: Job) => {
    const { userId, destination, totalCost } = job.data;
    logger.info({ jobId: job.id, userId, destination }, 'Processing Affiliate Conversion Map');

    // 1. Fetch exactly the most recently tracked 'click' for this bound
    const { data: latestClick, error: fetchErr } = await supabaseAdmin
      .from('affiliate_clicks')
      .select('*')
      .eq('user_id', userId)
      .eq('destination_id', destination)
      .eq('provider', 'duffel')
      .order('clicked_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchErr || !latestClick) {
       logger.warn({ userId }, 'Conversion triggered but no originating affiliate click was mapped.');
       return;
    }

    // 2. Lock the converted parameters & native expected commission natively locally
    // Conservative 1.5% fixed calculation parameter exactly mirroring average Duffel thresholds
    const estimatedCommission = parseFloat((totalCost * 0.015).toFixed(2));

    const { error: updateErr } = await supabaseAdmin
      .from('affiliate_clicks')
      .update({
         converted_at: new Date().toISOString(),
         commission_est: estimatedCommission
      })
      .eq('id', latestClick.id);

    if (updateErr) {
        logger.error({ updateErr }, 'Database conversion sync physically failed');
        throw new Error('Supabase execution collapse');
    }

    logger.info({ clickId: latestClick.id, commission: estimatedCommission }, 'Affiliate natively converted!');
  },
  { connection: redisClient }
);

bookingCompletedWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Worker sequence failed');
});
