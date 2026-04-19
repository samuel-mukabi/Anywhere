const mockRedis = { get: jest.fn(), setex: jest.fn() };
jest.mock('@repo/redis/src/client', () => ({ redisClient: mockRedis }));

const mockRequest = jest.fn();
jest.mock('undici', () => ({ request: (...args: unknown[]) => mockRequest(...args) }));

import { OpenMeteoClient } from './OpenMeteoClient';

const resp = (statusCode: number, data: unknown) => ({
  statusCode,
  body: { json: async () => data },
});

// Full-year daily payload (simplified to 2 days per month for brevity — aggregation logic still runs)
const buildYearPayload = () => {
  const time: string[] = [];
  const temp_max: number[] = [];
  const temp_min: number[] = [];
  const precip: number[] = [];
  const sunshine: number[] = [];

  for (let m = 1; m <= 12; m++) {
    const days = m === 2 ? 28 : 30;
    for (let d = 1; d <= days; d++) {
      const mm = String(m).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      time.push(`2023-${mm}-${dd}`);
      temp_max.push(28 + m * 0.5);
      temp_min.push(18 + m * 0.5);
      precip.push(m <= 6 ? 3 : 8);     // more rain in second half of year
      sunshine.push(m <= 6 ? 28800 : 21600); // seconds → hours converted in client
    }
  }

  return {
    daily: { time, temperature_2m_max: temp_max, temperature_2m_min: temp_min, precipitation_sum: precip, sunshine_duration: sunshine },
  };
};

describe('OpenMeteoClient', () => {
  let client: OpenMeteoClient;

  beforeEach(() => {
    client = new OpenMeteoClient();
    mockRequest.mockReset();
    mockRedis.get.mockReset();
    mockRedis.setex.mockReset();
    mockRedis.get.mockResolvedValue(null); // default: cache miss
  });

  it('returns 12 MonthlyClimate entries on a successful fetch', async () => {
    mockRequest.mockResolvedValue(resp(200, buildYearPayload()));

    const result = await client.getMonthlyClimate(-8.4, 115.2, 2023);

    expect(result).toHaveLength(12);
    expect(result[0].month).toBe(1);
    expect(result[11].month).toBe(12);
    expect(typeof result[0].avgTempC).toBe('number');
    expect(typeof result[0].avgPrecipMm).toBe('number');
    expect(typeof result[0].avgSunshineHours).toBe('number');
  });

  it('caches the result in Redis with 90-day TTL', async () => {
    mockRequest.mockResolvedValue(resp(200, buildYearPayload()));

    await client.getMonthlyClimate(-8.4, 115.2, 2023);

    expect(mockRedis.setex).toHaveBeenCalledWith(
      expect.stringContaining('climate:'),
      7776000, // 90 days in seconds
      expect.any(String)
    );
  });

  it('returns cached result without hitting the API', async () => {
    const fakeCache = JSON.stringify([
      { month: 1, avgTempC: 27, avgPrecipMm: 50, avgSunshineHours: 7 },
    ]);
    mockRedis.get.mockResolvedValue(fakeCache);

    const result = await client.getMonthlyClimate(-8.4, 115.2, 2023);

    expect(result[0].month).toBe(1);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('falls back to nearest capital when Open-Meteo returns 400 with no-data reason', async () => {
    // First call: 400 with "No data available" → triggers capital fallback
    // Second call (fallback coords): 200 with real data
    mockRequest
      .mockResolvedValueOnce(resp(400, { error: true, reason: 'No data available for these coordinates' }))
      .mockResolvedValueOnce(resp(200, buildYearPayload()));

    const result = await client.getMonthlyClimate(0, 0, 2023); // coords with no data
    expect(result).toHaveLength(12);
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it('returns 12-month stub when API returns non-200', async () => {
    mockRequest.mockResolvedValue(resp(503, {}));

    const result = await client.getMonthlyClimate(-8.4, 115.2, 2023);
    // getEmptyStub() returns 12 entries — values are representative, not zero
    expect(result).toHaveLength(12);
    result.forEach((m) => {
      expect(m).toHaveProperty('month');
      expect(m).toHaveProperty('avgTempC');
      expect(m).toHaveProperty('avgPrecipMm');
      expect(m).toHaveProperty('avgSunshineHours');
    });
  });

  it('returns empty stub on network exception', async () => {
    mockRequest.mockRejectedValue(new Error('timeout'));

    const result = await client.getMonthlyClimate(-8.4, 115.2, 2023);
    expect(result).toHaveLength(12);
  });
});
