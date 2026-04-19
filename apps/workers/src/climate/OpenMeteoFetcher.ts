/**
 * OpenMeteoFetcher
 * ─────────────────
 * Fetches 10-year historical monthly climate averages from the Open-Meteo
 * archive API (free, no API key required).
 *
 * API Reference: https://open-meteo.com/en/docs/historical-weather-api
 * Archive endpoint: https://archive-api.open-meteo.com/v1/archive
 *
 * Returns exactly 12 MonthlyClimateData entries (Jan–Dec) averaged over
 * the 2014-01-01 → 2023-12-31 10-year window.
 */

import pino from 'pino';
import { MonthlyClimateData } from '@repo/types/src/climate';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const ARCHIVE_BASE = 'https://archive-api.open-meteo.com/v1/archive';
const WINDOW_START = '2014-01-01';
const WINDOW_END   = '2023-12-31';

// Seconds → hours conversion factor for sunshine_duration
const SEC_TO_HOURS = 1 / 3600;

// ---------------------------------------------------------------------------
// Types mirroring Open-Meteo response shape
// ---------------------------------------------------------------------------

interface OpenMeteoMonthlyPayload {
  latitude: number;
  longitude: number;
  monthly: {
    time: string[];
    temperature_2m_mean: (number | null)[];
    precipitation_sum:   (number | null)[];
    sunshine_duration:   (number | null)[];
  };
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

export class OpenMeteoFetcher {
  /**
   * Fetch and average 10 years of monthly climate data for a single location.
   *
   * @param lat  Latitude  (e.g.  -8.4095 for Bali)
   * @param lon  Longitude (e.g. 115.1889 for Bali)
   * @returns    12-entry array (months 1–12), averaged over the 10-year window.
   */
  public async fetchMonthlyAverages(
    lat: number,
    lon: number,
  ): Promise<MonthlyClimateData[]> {
    const url = new URL(ARCHIVE_BASE);
    url.searchParams.set('latitude',              String(lat));
    url.searchParams.set('longitude',             String(lon));
    url.searchParams.set('start_date',            WINDOW_START);
    url.searchParams.set('end_date',              WINDOW_END);
    url.searchParams.set('monthly',               [
      'temperature_2m_mean',
      'precipitation_sum',
      'sunshine_duration',
    ].join(','));
    url.searchParams.set('timezone',              'UTC');

    logger.debug({ lat, lon, url: url.toString() }, 'OpenMeteo › fetching archive');

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(20_000), // 20 s hard timeout
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`OpenMeteo returned ${res.status}: ${body}`);
    }

    const json = (await res.json()) as OpenMeteoMonthlyPayload;
    return this._aggregate(json);
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  /**
   * Groups the flat monthly arrays by calendar month (1–12) and averages
   * values across all years in the window.
   */
  private _aggregate(payload: OpenMeteoMonthlyPayload): MonthlyClimateData[] {
    const { time, temperature_2m_mean, precipitation_sum, sunshine_duration } =
      payload.monthly;

    // Accumulators: index = month-1 (0 = Jan … 11 = Dec)
    const tempSum    = new Array<number>(12).fill(0);
    const precipSum  = new Array<number>(12).fill(0);
    const sunSum     = new Array<number>(12).fill(0);
    const counts     = new Array<number>(12).fill(0);

    for (let i = 0; i < time.length; i++) {
      // time[i] format: "2014-01", "2014-02", …
      const monthIndex = parseInt(time[i].split('-')[1], 10) - 1; // 0-indexed

      const temp   = temperature_2m_mean[i];
      const precip = precipitation_sum[i];
      const sun    = sunshine_duration[i];   // seconds/month from API

      // Skip null entries (data gaps)
      if (temp === null || precip === null || sun === null) continue;

      tempSum[monthIndex]   += temp;
      precipSum[monthIndex] += precip;
      sunSum[monthIndex]    += sun;
      counts[monthIndex]++;
    }

    const now = new Date();

    return Array.from({ length: 12 }, (_, i) => {
      const n = counts[i] || 1; // guard against division by zero
      return {
        month:             i + 1,
        avgTempC:          parseFloat((tempSum[i] / n).toFixed(2)),
        avgPrecipMm:       parseFloat((precipSum[i] / n).toFixed(2)),
        // API returns total sunshine in seconds per month; convert to daily avg hours
        avgSunshineHours:  parseFloat(
          ((sunSum[i] / n) * SEC_TO_HOURS / 30.44).toFixed(2) // 30.44 = avg days/month
        ),
        computedAt: now,
        scores:     {}, // populated later by ClimateScorer
      } satisfies MonthlyClimateData;
    });
  }
}
