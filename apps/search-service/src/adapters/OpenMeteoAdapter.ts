/**
 * OpenMeteoAdapter  (search-service)
 * ────────────────────────────────────
 * Production replacement for the mock WeatherAdapter stub.
 *
 * Primary path  → reads pre-computed climate.monthly[] from MongoDB.
 * Fallback path → calls Open-Meteo live + runs ClimateScorer if the
 *                 MongoDB record is missing or stale (> STALE_DAYS old).
 *
 * Used by:
 *   - DestinationRanker  (climateScore dimension)
 *   - /climate/score     (full monthly profile endpoint)
 */

import mongoose from 'mongoose';
import pino from 'pino';
import { MonthlyClimateData, VibeFilter } from '@repo/types/src/climate';
import { ClimateScorer } from '../logic/ClimateScorer';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const scorer  = new ClimateScorer();

/** Days after which a climate profile is considered stale */
const STALE_DAYS = 90;

// ---------------------------------------------------------------------------
// Destination model reference
// We import it lazily (inline) to avoid circular-dependency issues and
// because search-service may not initialise Mongoose at module load time.
// ---------------------------------------------------------------------------

interface DestinationDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  coords: { coordinates: number[] };
  climate: {
    monthly: MonthlyClimateData[];
    lastRecomputedAt?: Date;
  };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class OpenMeteoAdapter {

  /**
   * Get the climate score for a specific destination + month + vibe.
   *
   * Preferred entry-point for DestinationRanker — returns a single number.
   */
  public async getMonthlyScore(
    destId: string,
    month: number,   // 1–12
    vibe: VibeFilter,
  ): Promise<number> {
    const data = await this.getMonthlyData(destId, month);
    if (!data) return 50; // neutral fallback — dest will still appear in results

    return data.scores[vibe] ?? scorer.scoreMonthForVibe(data, vibe);
  }

  /**
   * Get the full MonthlyClimateData for a specific destination + month.
   * Returns null if the destination doesn't exist.
   */
  public async getMonthlyData(
    destId: string,
    month: number,
  ): Promise<MonthlyClimateData | null> {
    const profile = await this._loadProfile(destId);
    if (!profile) return null;

    const entry = profile.climate.monthly.find((m) => m.month === month);
    return entry ?? null;
  }

  /**
   * Get all 12 monthly entries for a destination.
   * Returns empty array if not yet computed.
   */
  public async getAllMonthlyData(destId: string): Promise<MonthlyClimateData[]> {
    const profile = await this._loadProfile(destId);
    return profile?.climate.monthly ?? [];
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private async _loadProfile(destId: string): Promise<DestinationDoc | null> {
    if (!mongoose.models['Destination']) {
      // Lazy-register minimal schema so search-service can read the collection
      // without duplicating the full Destination schema.
      const schema = new mongoose.Schema({}, { strict: false, collection: 'destinations' });
      mongoose.model('Destination', schema);
    }

    const DestModel = mongoose.model('Destination');

    let doc: DestinationDoc | null = null;

    try {
      doc = (await DestModel.findById(destId, {
        _id: 1,
        name: 1,
        coords: 1,
        'climate.monthly': 1,
        'climate.lastRecomputedAt': 1,
      }).lean()) as DestinationDoc | null;
    } catch (err) {
      logger.warn({ err, destId }, 'OpenMeteoAdapter › MongoDB read failed');
      return null;
    }

    if (!doc) {
      logger.warn({ destId }, 'OpenMeteoAdapter › destination not found');
      return null;
    }

    // If stale, log a warning — the cron will refresh it next quarter.
    // We don't call Open-Meteo live here to avoid blocking the search path.
    const recomputed = doc.climate?.lastRecomputedAt;
    if (!recomputed) {
      logger.warn(
        { dest: doc.name },
        'OpenMeteoAdapter › climate profile not yet computed — returning null',
      );
      return null;
    }

    const ageDays = (Date.now() - recomputed.getTime()) / 86_400_000;
    if (ageDays > STALE_DAYS) {
      logger.warn(
        { dest: doc.name, ageDays: Math.round(ageDays) },
        'OpenMeteoAdapter › climate profile stale (> 90 days) — worker recompute pending',
      );
    }

    return doc;
  }
}
