const mockRedis = { get: jest.fn(), setex: jest.fn() };
jest.mock('@repo/redis/src/client', () => ({ redisClient: mockRedis }));

const mockRequest = jest.fn();
jest.mock('undici', () => ({ request: (...args: unknown[]) => mockRequest(...args) }));

import { RestCountriesClient } from './RestCountriesClient';

const resp = (statusCode: number, data: unknown) => ({
  statusCode,
  body: { json: async () => data },
});

const COUNTRY_PAYLOAD = [{
  name: { common: 'Indonesia', official: 'Republic of Indonesia' },
  cca2: 'ID',
  cca3: 'IDN',
  flag: '🇮🇩',
  currencies: { IDR: { name: 'Indonesian rupiah', symbol: 'Rp' } },
  languages: { ind: 'Indonesian' },
  region: 'Asia',
  subregion: 'South-Eastern Asia',
  capital: ['Jakarta'],
  latlng: [-5, 120],
  population: 270_000_000,
}];

describe('RestCountriesClient', () => {
  let client: RestCountriesClient;

  beforeEach(() => {
    client = new RestCountriesClient();
    mockRequest.mockReset();
    mockRedis.get.mockReset();
    mockRedis.setex.mockReset();
  });

  describe('getByAlpha2', () => {
    it('returns parsed CountryMeta on 200', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRequest.mockResolvedValue(resp(200, COUNTRY_PAYLOAD));

      const meta = await client.getByAlpha2('ID');

      expect(meta).not.toBeNull();
      expect(meta!.cca2).toBe('ID');
      expect(meta!.region).toBe('Asia');
      expect(meta!.population).toBe(270_000_000);
    });

    it('caches the result in Redis', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRequest.mockResolvedValue(resp(200, COUNTRY_PAYLOAD));

      await client.getByAlpha2('ID');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'country:ID',
        expect.any(Number),
        expect.stringContaining('Indonesia')
      );
    });

    it('returns cached result without hitting the API', async () => {
      const cached = JSON.stringify(COUNTRY_PAYLOAD[0]);
      mockRedis.get.mockResolvedValue(cached);

      const meta = await client.getByAlpha2('ID');

      expect(meta!.cca2).toBe('ID');
      expect(mockRequest).not.toHaveBeenCalled();
    });

    it('returns null on 404 (invalid country code)', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRequest.mockResolvedValue(resp(404, {}));

      expect(await client.getByAlpha2('XX')).toBeNull();
    });

    it('returns null on 400', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRequest.mockResolvedValue(resp(400, {}));
      expect(await client.getByAlpha2('BAD')).toBeNull();
    });

    it('returns null on non-200/400/404', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRequest.mockResolvedValue(resp(503, {}));
      expect(await client.getByAlpha2('ID')).toBeNull();
    });

    it('returns null when Zod validation fails', async () => {
      mockRedis.get.mockResolvedValue(null);
      // Missing required fields — Zod will throw
      mockRequest.mockResolvedValue(resp(200, [{ name: { common: 'Broken' } }]));
      expect(await client.getByAlpha2('BR')).toBeNull();
    });
  });

  describe('enrichDestination', () => {
    it('merges countryMeta into destination', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRequest.mockResolvedValue(resp(200, COUNTRY_PAYLOAD));

      const dest = { name: 'Bali', countryCode: 'ID' };
      const enriched = await client.enrichDestination(dest);

      expect(enriched.countryMeta).toBeDefined();
      expect(enriched.countryMeta!.cca2).toBe('ID');
      expect(enriched.name).toBe('Bali'); // original fields preserved
    });

    it('returns destination unchanged when no iso/countryCode', async () => {
      const dest = { name: 'Unknown Place', iso: undefined, countryCode: undefined };
      const enriched = await client.enrichDestination(dest);

      expect(enriched.name).toBe('Unknown Place');
      expect(mockRequest).not.toHaveBeenCalled();
    });

    it('returns destination without countryMeta when API fails', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRequest.mockResolvedValue(resp(404, {}));

      const dest = { name: 'Nowhere', countryCode: 'XX' };
      const enriched = await client.enrichDestination(dest);

      expect(enriched.name).toBe('Nowhere');
      expect('countryMeta' in enriched ? enriched.countryMeta : undefined).toBeUndefined();
    });
  });
});
