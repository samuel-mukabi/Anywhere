const mockRequest = jest.fn();
jest.mock('undici', () => ({
  request: (...args: unknown[]) => mockRequest(...args),
}));

// Simulate a connected Mongoose with a real-looking db stub
const mockFindOne = jest.fn();
const mockCollection = jest.fn(() => ({ findOne: mockFindOne }));
jest.mock('mongoose', () => ({
  connection: {
    readyState: 1,      // 1 = connected — exercises the Mongo fallback path
    db: { collection: mockCollection },
  },
}));

jest.mock('@repo/redis/src/client', () => ({
  redisClient: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
  },
}));

import { WhereNextClient } from './WhereNextClient';
import { redisClient } from '@repo/redis/src/client';

const redisMock = redisClient as jest.Mocked<typeof redisClient>;

const resp = (statusCode: number, data: unknown) => ({
  statusCode,
  body: { json: async () => data },
});

const WHERENEXT_CITY_DATA = {
  country_code: 'NE',
  country: 'USA',
  region: 'North America',
  cost_index: 85,
  monthly_estimate_usd: 2400, // daily = 80
  grocery_index: 80,
  rent_index: 90,
  utilities_index: 70,
  transport_index: 100,
};

describe('WhereNextClient', () => {
  let client: WhereNextClient;

  beforeEach(async () => {
    mockRequest.mockReset();
    mockFindOne.mockReset();
    (redisMock.get as jest.Mock).mockResolvedValue(null);
    (redisMock.setex as jest.Mock).mockResolvedValue('OK');

    // Resolve the prefetch before each test
    mockRequest.mockResolvedValueOnce(
      resp(200, { data: [WHERENEXT_CITY_DATA] })
    );
    client = new WhereNextClient();
    await new Promise((r) => setTimeout(r, 30));
  });

  // ── Core city lookup ─────────────────────────────────────────────────────
  it('city in dataset returns DailyBudgetEstimate (USD → USD)', async () => {
    const estimate = await client.getDailyBudget('new york');

    // daily = 80
    // mealCheap = 80 * 0.18 = 14.4
    // mealMid = 80 * 0.35 = 28
    // transport = 80 * 1 * 0.12 = 9.6
    // coffee = 80 * 0.05 = 4
    // dailyTotal = 14.4 + 28 + 9.6 + 4 = 56
    expect(estimate.tier).toBe('premium'); // 85 >= 80
    expect(estimate.dailyTotal).toBeCloseTo(56, 1);
    expect(estimate.currency).toBe('USD');
    expect(estimate.mealCheap).toBeCloseTo(14.4, 1);
    expect(estimate.colIndex).toBe(85);
  });

  // ── isKnownCity ───────────────────────────────────────────────────────────
  it('isKnownCity returns true for a prefetched city slug', async () => {
    // Wait for prefetch
    await new Promise(r => setTimeout(r, 200));
    expect(client.isKnownCity('new york')).toBe(true);
  });

  it('isKnownCity returns false for an unknown city', () => {
    expect(client.isKnownCity('atlantis')).toBe(false);
  });

  // ── FX rate conversion ───────────────────────────────────────────────────
  it('converts daily total to EUR when targetCurrency is EUR (cache miss → live fetch)', async () => {
    // 1st mockRequest call: FX rate API (er-api.com) returning EUR = 0.93
    mockRequest.mockResolvedValueOnce(
      resp(200, { rates: { EUR: 0.93, GBP: 0.78 } })
    );

    const estimate = await client.getDailyBudget('new york', 'EUR');

    expect(estimate.currency).toBe('EUR');
    // dailyTotal in USD is 56, × 0.93 ≈ 52.08
    expect(estimate.dailyTotal).toBeCloseTo(56 * 0.93, 0);
  });

  it('uses cached FX rates when available (skips live fetch)', async () => {
    const cachedRates = JSON.stringify({ EUR: 0.92 });
    (redisMock.get as jest.Mock).mockImplementation((key) =>
      key === 'fx:rates' ? Promise.resolve(cachedRates) : Promise.resolve(null)
    );

    // Clear the prefetch call that happened in beforeEach before asserting no new calls
    mockRequest.mockClear();

    const estimate = await client.getDailyBudget('new york', 'EUR');

    // FX API should NOT be called — cached rates were used
    expect(mockRequest).not.toHaveBeenCalled();
    expect(estimate.currency).toBe('EUR');
    expect(estimate.dailyTotal).toBeCloseTo(56 * 0.92, 0);
  });

  it('falls back to rate=1 when FX API is unavailable', async () => {
    mockRequest.mockRejectedValueOnce(new Error('FX network down'));

    const estimate = await client.getDailyBudget('new york', 'GBP');

    // Falls back to multiplier=1 → same as USD value (56)
    expect(estimate.currency).toBe('GBP');
    expect(estimate.dailyTotal).toBeCloseTo(56, 0);
  });

  it('USD → USD conversion returns rate 1 without hitting FX API', async () => {
    // Clear the prefetch call that happened in beforeEach
    mockRequest.mockClear();

    const estimate = await client.getDailyBudget('new york', 'USD');

    // No FX API call needed for same-currency conversion
    expect(mockRequest).not.toHaveBeenCalled();
    expect(estimate.currency).toBe('USD');
  });

  // ── MongoDB fallback ─────────────────────────────────────────────────────
  it('unknown city found in MongoDB → uses avgCosts from DB document', async () => {
    mockFindOne.mockResolvedValue({
      slug: 'kyoto',
      avgCosts: { mealCheap: 8, mealMid: 18, localTransport: 2, coffee: 3 },
      hiddenGemScore: 40, // < 50 -> budget
    });

    const estimate = await client.getDailyBudget('kyoto');

    // totalUsd = 8+18+2+3 = 31
    expect(estimate.tier).toBe('budget');
    expect(estimate.dailyTotal).toBeCloseTo(31, 1);
    expect(mockCollection).toHaveBeenCalledWith('destinations');
    expect(mockFindOne).toHaveBeenCalledWith({ slug: 'ky' });
  });

  it('unknown city in MongoDB with no avgCosts → falls through to continental default', async () => {
    // DB returns a document but without avgCosts
    mockFindOne.mockResolvedValue({ slug: 'nowhere_city', name: 'Nowhere City' });

    const estimate = await client.getDailyBudget('nowhere_city');

    // Continental AS fallback: dailyTotal=27
    expect(estimate.tier).toBe('budget');
    expect(estimate.dailyTotal).toBeCloseTo(27, 1);
  });

  it('MongoDB lookup not in DB → continental fallback (AS defaults)', async () => {
    mockFindOne.mockResolvedValue(null);

    const estimate = await client.getDailyBudget('atlantis');

    expect(estimate.tier).toBe('budget');
    expect(estimate.dailyTotal).toBeCloseTo(27, 1);
  });

  it('MongoDB throws → gracefully falls through to continental default', async () => {
    mockFindOne.mockRejectedValue(new Error('mongo connection lost'));

    const estimate = await client.getDailyBudget('some_city');

    expect(estimate).toBeDefined();
    expect(estimate.tier).toBeDefined();
  });

  // ── Prefetch failure handling ─────────────────────────────────────────────
  it('prefetch non-200 → logs warning; getDailyBudget still falls back via MongoDB/continental', async () => {
    // New client instance with a 403 prefetch response
    mockRequest.mockResolvedValueOnce(resp(403, {}));
    const failedClient = new WhereNextClient();
    await new Promise((r) => setTimeout(r, 30));

    mockFindOne.mockResolvedValue(null);
    const estimate = await failedClient.getDailyBudget('anywhere');

    expect(estimate).toBeDefined();
    expect(estimate.tier).toBeDefined();
    expect(failedClient.isKnownCity('anywhere')).toBe(false);
  });

  it('prefetch network crash → getDailyBudget returns continental fallback', async () => {
    mockRequest.mockRejectedValueOnce(new Error('network down'));
    const crashedClient = new WhereNextClient();
    await new Promise((r) => setTimeout(r, 30));

    mockFindOne.mockResolvedValue(null);
    const estimate = await crashedClient.getDailyBudget('reykjavik');

    expect(estimate).toBeDefined();
    expect(estimate.tier).toBeDefined();
  });

  // ── Tier classification boundaries ───────────────────────────────────────
  it('totalUsd < 40 → budget tier', async () => {
    // Cheap city: cost_index = 30 → budget
    const cheapData = { ...WHERENEXT_CITY_DATA, country_code: 'CH', cost_index: 30, monthly_estimate_usd: 1200 };
    mockRequest.mockResolvedValueOnce(resp(200, { data: [cheapData] }));
    const cheapClient = new WhereNextClient();
    await new Promise((r) => setTimeout(r, 30));

    const estimate = await cheapClient.getDailyBudget('cheapcity');
    expect(estimate.tier).toBe('budget');
  });

  it('totalUsd > 90 → premium tier', async () => {
    // Expensive city: cost_index = 95 → premium
    const expensiveData = { ...WHERENEXT_CITY_DATA, country_code: 'EX', cost_index: 95, monthly_estimate_usd: 4500 };
    mockRequest.mockResolvedValueOnce(resp(200, { data: [expensiveData] }));
    const expClient = new WhereNextClient();
    await new Promise((r) => setTimeout(r, 30));

    const estimate = await expClient.getDailyBudget('expenseville');
    expect(estimate.tier).toBe('premium');
  });
});
