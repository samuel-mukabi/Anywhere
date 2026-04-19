import { FastifyInstance } from 'fastify';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function adminRoutes(app: FastifyInstance) {

  // Verify Admin JWT dynamically naturally via the fastify auth hook
  // In production, an `app.addHook` checking req.user.tier === 'admin' acts here securely
  
  app.get('/revenue', async (req, reply) => {
     // For demo simplicity, aggregating using straight JS mappings via admin role
     // A native SQL RPC is better, but this highlights internal data extraction perfectly

     const { data: clicks, error } = await supabaseAdmin
       .from('affiliate_clicks')
       .select('converted_at, commission_est');

     if (error || !clicks) {
        return reply.code(500).send({ error: 'Reporting extraction internally collapsed' });
     }

     const totalClicks = clicks.length;
     const totalBookings = clicks.filter(c => c.converted_at !== null).length;
     
     const conversionRate = totalClicks === 0 ? 0 : parseFloat(((totalBookings / totalClicks) * 100).toFixed(2));
     
     const estimatedCommission = clicks.reduce((sum, c) => {
        return sum + (c.converted_at ? (parseFloat(c.commission_est) || 0) : 0);
     }, 0);

     return reply.send({
       totalClicks,
       totalBookings,
       conversionRate,
       estimatedCommission: parseFloat(estimatedCommission.toFixed(2)),
       periodStart: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
       periodEnd: new Date().toISOString()
     });
  });
}
