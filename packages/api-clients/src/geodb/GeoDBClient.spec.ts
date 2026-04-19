const mockRedis = { get: jest.fn(), setex: jest.fn() };
jest.mock('@repo/redis/src/client', () => ({ redisClient: mockRedis }));

const mockRequest = jest.fn();
jest.mock('undici', () => ({ request: (...args: unknown[]) => mockRequest(...args) }));

import { GeoDBClient } from './GeoDBClient';

const resp = (statusCode: number, data: unknown) => ({
  statusCode,
  body: { json: async () => data },
});

const CITY_PAYLOAD = {
  data: [{
    name: 'Bali',
    countryCode: 'ID',
    latitude: -8.4095,
    longitude: 115.1889,
    population: 4200000,
    timezone: 'Asia/Makassar',
  }],
};

describe('GeoDBClient', () => {
  let client: GeoDBClient;

  beforeEach(() => {
    client = new GeoDBClient('test_rapid_key');
    mockRequest.mockReset();
    mockRedis.get.mockReset();
    mockRedis.setex.mockReset();
  });

  it('returns mapped GeoCityResult on 200', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRequest.mockResolvedValue(resp(200, CITY_PAYLOAD));

    const result = await client.searchCity('bali', 'ID');

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Bali');
    expect(result!.latitude).toBe(-8.4095);
    expect(result!.timezone).toBe('Asia/Makassar');
  });

  it('caches the result in Redis after a successful API call', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRequest.mockResolvedValue(resp(200, CITY_PAYLOAD));

    await client.searchCity('bali', 'ID');

    expect(mockRedis.setex).toHaveBeenCalledWith(
      'geodb:bali:id',
      expect.any(Number),
      expect.stringContaining('Bali')
    );
  });

  it('returns cached result without hitting the API', async () => {
    const cached = JSON.stringify({ name: 'Bali', countryCode: 'ID', latitude: -8.4095, longitude: 115.1889, population: 4200000, timezone: 'Asia/Makassar' });
    mockRedis.get.mockResolvedValue(cached);

    const result = await client.searchCity('bali', 'ID');

    expect(result!.name).toBe('Bali');
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('returns null when API returns 429 (rate limit)', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRequest.mockResolvedValue(resp(429, {}));

    expect(await client.searchCity('tokyo', 'JP')).toBeNull();
  });

  it('returns null when API returns non-200', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRequest.mockResolvedValue(resp(503, {}));

    expect(await client.searchCity('tokyo', 'JP')).toBeNull();
  });

  it('returns null when data array is empty', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRequest.mockResolvedValue(resp(200, { data: [] }));

    expect(await client.searchCity('nowhere', 'XX')).toBeNull();
  });

  it('returns null on network exception', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRequest.mockRejectedValue(new Error('network error'));

    expect(await client.searchCity('bali', 'ID')).toBeNull();
  });
});
