/**
 * /climate/score  —  Internal Climate Scoring Endpoint
 * ───────────────────────────────────────────────────────
 * Consumed by the search service's ranking pipeline and any
 * future frontend feature (e.g. "Best Time to Visit" panel).
 *
 * GET /climate/score?dest={mongoId}&month={1-12}&vibe={VibeFilter}
 *
 * Responses:
 *   200  { destId, month, vibe, score, raw }
 *   400  Missing required query params
 *   404  Climate profile not yet computed for this destination
 *   422  Invalid month (not 1-12) or unknown vibe filter
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { VIBE_FILTERS, VibeFilter } from '@repo/types/src/climate';
import { OpenMeteoAdapter } from '../adapters/OpenMeteoAdapter';

const adapter = new OpenMeteoAdapter();

// ---------------------------------------------------------------------------
// Query-string schema (Zod)
// ---------------------------------------------------------------------------

const ClimateScoreQuerySchema = z.object({
  dest:  z.string().min(24).max(24, { message: 'dest must be a 24-char MongoDB ObjectId' }),
  month: z.coerce.number().int().min(1).max(12, { message: 'month must be 1–12' }),
  vibe:  z.enum(VIBE_FILTERS as [VibeFilter, ...VibeFilter[]], {
    errorMap: () => ({
      message: `vibe must be one of: ${VIBE_FILTERS.join(', ')}`,
    }),
  }),
});

type ClimateScoreQuery = z.infer<typeof ClimateScoreQuerySchema>;

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function climateRoutes(app: FastifyInstance): Promise<void> {

  /**
   * GET /climate/score
   */
  app.get(
    '/score',
    async (
      req: FastifyRequest<{ Querystring: Partial<ClimateScoreQuery> }>,
      reply: FastifyReply,
    ) => {
      // 1. Validate query params
      const parsed = ClimateScoreQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        const status = firstIssue.path.includes('month') || firstIssue.path.includes('vibe')
          ? 422
          : 400;
        return reply.code(status).send({
          error:   firstIssue.message,
          details: parsed.error.issues,
        });
      }

      const { dest, month, vibe } = parsed.data;

      // 2. Fetch from MongoDB (via OpenMeteoAdapter)
      const monthlyData = await adapter.getMonthlyData(dest, month);

      if (!monthlyData) {
        return reply.code(404).send({
          error: 'Climate profile not yet computed for this destination.',
          hint:  'The workers quarterly cron will populate this data. Check back soon.',
        });
      }

      // 3. Retrieve or recompute score for the requested vibe
      const { ClimateScorer } = await import('../logic/ClimateScorer');
      const climateScorer = new ClimateScorer();
      const score =
        monthlyData.scores[vibe] ??
        climateScorer.scoreMonthForVibe(monthlyData, vibe);

      // 4. Respond
      return reply.code(200).send({
        destId: dest,
        month,
        vibe,
        score,
        raw: {
          avgTempC:         monthlyData.avgTempC,
          avgPrecipMm:      monthlyData.avgPrecipMm,
          avgSunshineHours: monthlyData.avgSunshineHours,
        },
        computedAt: monthlyData.computedAt,
      });
    },
  );

  /**
   * GET /climate/profile?dest={mongoId}
   * Returns the complete 12-month profile for all vibe filters.
   * Useful for the "Best Time to Visit" UI panel.
   */
  app.get(
    '/profile',
    async (
      req: FastifyRequest<{ Querystring: { dest?: string } }>,
      reply: FastifyReply,
    ) => {
      const dest = req.query.dest;
      if (!dest || dest.length !== 24) {
        return reply.code(400).send({ error: 'dest must be a 24-char MongoDB ObjectId' });
      }

      const monthly = await adapter.getAllMonthlyData(dest);

      if (!monthly.length) {
        return reply.code(404).send({
          error: 'Climate profile not yet computed for this destination.',
          hint:  'The workers quarterly cron will populate this data. Check back soon.',
        });
      }

      return reply.code(200).send({ destId: dest, monthly });
    },
  );
}
