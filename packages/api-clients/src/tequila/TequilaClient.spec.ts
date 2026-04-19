/**
 * Mock undici at the module level — MSW does not reliably intercept undici.request()
 * in all Node environments. Direct mocking is more deterministic for unit tests.
 */
const mockRequest = jest.fn();
jest.mock('undici', () => ({
  request: (...args: unknown[]) => mockRequest(...args),
}));

import { TequilaClient } from './TequilaClient';

// Helper: build a fake undici response
const resp = (statusCode: number, data: unknown) => ({
  statusCode,
  body: { json: async () => data },
});

describe('TequilaClient', () => {
  let client: TequilaClient;

  beforeEach(() => {
    process.env.KIWI_TEQUILA_API_KEY = 'test_real_key';
    client = new TequilaClient();
    mockRequest.mockReset();
  });

  afterAll(() => {
    delete process.env.KIWI_TEQUILA_API_KEY;
  });

  describe('searchAnywhere', () => {
    it('returns normalised TequilaResult array on 200', async () => {
      mockRequest.mockResolvedValue(
        resp(200, { data: [{ price: 450.5, deep_link: 'https://kiwi.com/deep/mock' }] })
      );

      const results = await client.searchAnywhere('NYC');
      expect(results).toHaveLength(1);
      expect(results[0].price).toBe(450.5);
      expect(results[0].deepLink).toBe('https://kiwi.com/deep/mock');
    });

    it('400 returns empty array', async () => {
      mockRequest.mockResolvedValue(resp(400, {}));
      const results = await client.searchAnywhere('NYC');
      expect(results).toEqual([]);
    });

    it('429 triggers withRetry (3 total calls) then returns []', async () => {
      mockRequest.mockResolvedValue(resp(429, { error: 'rate limited' }));

      jest.useFakeTimers();
      const promise = client.searchAnywhere('NYC');
      await jest.runAllTimersAsync();
      const results = await promise;
      jest.useRealTimers();

      expect(results).toEqual([]);
      // initial call + retryCount 0→1 + retryCount 1→2 = 3 total calls
      expect(mockRequest).toHaveBeenCalledTimes(3);
    });

    it('non-200/400/429 returns empty array', async () => {
      mockRequest.mockResolvedValue(resp(503, {}));
      expect(await client.searchAnywhere('NYC')).toEqual([]);
    });
  });

  describe('searchToDestination', () => {
    it('returns price + deepLink on 200', async () => {
      mockRequest.mockResolvedValue(
        resp(200, { data: [{ price: 620.0, deep_link: 'https://kiwi.com/deep/DPS' }] })
      );

      const result = await client.searchToDestination('DPS', 'NYC', '7');
      expect(result).not.toBeNull();
      expect(result!.price).toBe(620);
      expect(result!.deepLink).toBe('https://kiwi.com/deep/DPS');
    });

    it('returns null when data array is empty', async () => {
      mockRequest.mockResolvedValue(resp(200, { data: [] }));
      expect(await client.searchToDestination('DPS', 'NYC', '7')).toBeNull();
    });

    it('returns null on non-200', async () => {
      mockRequest.mockResolvedValue(resp(500, {}));
      expect(await client.searchToDestination('DPS', 'NYC', '7')).toBeNull();
    });

    it('falls back to deepLink default when deep_link missing', async () => {
      mockRequest.mockResolvedValue(
        resp(200, { data: [{ price: 300 }] }) // no deep_link
      );
      const result = await client.searchToDestination('BKK', 'NYC', '4');
      expect(result!.deepLink).toContain('kiwi.com/deep');
    });
  });
});
