const mockRequest = jest.fn();
jest.mock('undici', () => ({
  request: (...args: unknown[]) => mockRequest(...args),
}));

import { DuffelClient } from './DuffelClient';

const resp = (statusCode: number, data: unknown) => ({
  statusCode,
  body: { json: async () => data },
});

const DUFFEL_OFFER = {
  id: 'off_mock123',
  total_amount: '500.00',
  total_currency: 'USD',
  expires_at: '2027-12-31T00:00:00Z',
  slices: [
    {
      duration: 'PT2H30M',
      segments: [
        {
          operating_carrier: { name: 'Mock Air' },
          departing_at: '2027-01-01T08:00:00Z',
          arriving_at: '2027-01-01T10:30:00Z',
        },
      ],
    },
  ],
};

// Offer with empty slices — exercises the fallback airline/stops/duration logic
const EMPTY_SLICES_OFFER = {
  ...DUFFEL_OFFER,
  id: 'off_empty_slices',
  slices: [],
};

describe('DuffelClient', () => {
  let client: DuffelClient;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mockRequest.mockReset();
    process.env.NODE_ENV = 'development';
    delete process.env.DUFFEL_ACCESS_TOKEN;
    client = new DuffelClient('test_token', 'live_prod_token_that_must_be_blocked');
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  // ── Dev-mode token safety ────────────────────────────────────────────────
  describe('token safety', () => {
    it('uses empty string if live token is passed in dev and no env token exists', () => {
      const token = Reflect.get(client as object, 'token') as string;
      expect(token).toBe('');
    });

    it('isSandbox is false when token is empty', () => {
      expect(Reflect.get(client as object, 'isSandbox')).toBe(false);
    });

    it('uses a provided duffel_test_ token directly in dev', () => {
      const devClient = new DuffelClient('duffel_test_myowntoken', 'live_token');
      expect(Reflect.get(devClient as object, 'token')).toBe('duffel_test_myowntoken');
    });

    it('uses live token in non-dev environments', () => {
      process.env.NODE_ENV = 'production';
      const prodClient = new DuffelClient('test_token', 'live_tok_abc123');
      expect(Reflect.get(prodClient as object, 'token')).toBe('live_tok_abc123');
      expect(Reflect.get(prodClient as object, 'isSandbox')).toBe(false);
    });
  });

  // ── createOfferRequest ────────────────────────────────────────────────────
  describe('createOfferRequest', () => {
    it('sends Duffel-Version header and returns offer request ID', async () => {
      mockRequest.mockResolvedValue(
        resp(200, { data: { id: 'orq_mock123', offers: [] } })
      );

      const id = await client.createOfferRequest('JFK', 'LHR', '2027-06-01');
      expect(id).toBe('orq_mock123');

      const [, options] = mockRequest.mock.calls[0];
      expect(options.headers['Duffel-Version']).toBe('v2');
    });

    it('accepts 201 as a success response', async () => {
      mockRequest.mockResolvedValue(
        resp(201, { data: { id: 'orq_created201', offers: [] } })
      );
      expect(await client.createOfferRequest('JFK', 'CDG', '2027-07-01')).toBe('orq_created201');
    });

    it('returns null on non-2xx', async () => {
      mockRequest.mockResolvedValue(resp(422, {}));
      expect(await client.createOfferRequest('JFK', 'LHR', '2027-06-01')).toBeNull();
    });

    it('returns null on network exception', async () => {
      mockRequest.mockRejectedValue(new Error('connection refused'));
      expect(await client.createOfferRequest('JFK', 'LHR', '2027-06-01')).toBeNull();
    });

    it('sends multiple passengers when specified', async () => {
      mockRequest.mockResolvedValue(resp(201, { data: { id: 'orq_multi', offers: [] } }));

      await client.createOfferRequest('LHR', 'DXB', '2027-09-01', 3);

      const [, options] = mockRequest.mock.calls[0];
      const body = JSON.parse(options.body as string) as {
        data: { passengers: Array<{ type: string }> };
      };
      expect(body.data.passengers).toHaveLength(3);
      body.data.passengers.forEach((p) => expect(p.type).toBe('adult'));
    });
  });

  // ── listOffers ───────────────────────────────────────────────────────────
  describe('listOffers', () => {
    it('returns array of BookingOffers on 200', async () => {
      mockRequest.mockResolvedValue(
        resp(200, { data: [DUFFEL_OFFER, { ...DUFFEL_OFFER, id: 'off_mock456', total_amount: '600.00' }] })
      );

      const offers = await client.listOffers('orq_mock123');
      expect(offers).toHaveLength(2);
      expect(offers[0].offerId).toBe('off_mock123');
      expect(offers[0].totalAmount).toBe(500);
      expect(offers[0].durationMins).toBe(150); // PT2H30M
      expect(offers[0].airline).toBe('Mock Air');
      expect(offers[1].totalAmount).toBe(600);
    });

    it('filters out offers that fail Zod schema validation', async () => {
      mockRequest.mockResolvedValue(
        resp(200, {
          data: [
            DUFFEL_OFFER,          // valid
            { id: 'off_bad' },     // invalid — missing required fields
          ],
        })
      );

      const offers = await client.listOffers('orq_mock123');
      expect(offers).toHaveLength(1); // only the valid one survives
      expect(offers[0].offerId).toBe('off_mock123');
    });

    it('returns empty array on non-200', async () => {
      mockRequest.mockResolvedValue(resp(500, {}));
      expect(await client.listOffers('orq_x')).toEqual([]);
    });

    it('returns empty array on network exception', async () => {
      mockRequest.mockRejectedValue(new Error('timeout'));
      expect(await client.listOffers('orq_x')).toEqual([]);
    });

    it('normalizes offer with empty slices to Unknown Airline / 0 mins', async () => {
      mockRequest.mockResolvedValue(resp(200, { data: [EMPTY_SLICES_OFFER] }));

      const offers = await client.listOffers('orq_empty');
      expect(offers[0].airline).toBe('Unknown Airline');
      expect(offers[0].durationMins).toBe(0);
      expect(offers[0].stops).toBe(0);
    });
  });

  // ── getOffer ──────────────────────────────────────────────────────────────
  describe('getOffer', () => {
    it('returns normalised BookingOffer on 200', async () => {
      mockRequest.mockResolvedValue(resp(200, { data: DUFFEL_OFFER }));

      const offer = await client.getOffer('off_mock123');
      expect(offer).not.toBeNull();
      expect(offer!.totalAmount).toBe(500);
      expect(offer!.currency).toBe('USD');
    });

    it('price change detected correctly across two getOffer calls', async () => {
      mockRequest
        .mockResolvedValueOnce(resp(200, { data: DUFFEL_OFFER }))
        .mockResolvedValueOnce(
          resp(200, { data: { ...DUFFEL_OFFER, id: 'off_changed', total_amount: '800.00' } })
        );

      const original = await client.getOffer('off_mock123');
      const updated = await client.getOffer('off_changed');

      expect(updated!.totalAmount - original!.totalAmount).toBe(300);
    });

    it('returns null when Zod parse fails', async () => {
      mockRequest.mockResolvedValue(resp(200, { data: { id: 'off_bad' } }));
      expect(await client.getOffer('off_bad')).toBeNull();
    });

    it('returns null on non-200', async () => {
      mockRequest.mockResolvedValue(resp(503, {}));
      expect(await client.getOffer('off_mock123')).toBeNull();
    });

    it('returns null on network exception', async () => {
      mockRequest.mockRejectedValue(new Error('timeout'));
      expect(await client.getOffer('off_any')).toBeNull();
    });
  });

  // ── createOrder ───────────────────────────────────────────────────────────
  describe('createOrder', () => {
    const passengers = [
      { id: 'pas_0001', born_on: '1990-01-01', title: 'mr', given_name: 'John', family_name: 'Doe', gender: 'm', email: 'john@test.com', phone_number: '+1234567890' },
    ];

    it('returns order ID on 201 success', async () => {
      mockRequest.mockResolvedValue(resp(201, { data: { id: 'ord_abc123' } }));

      const orderId = await client.createOrder('off_mock123', passengers);
      expect(orderId).toBe('ord_abc123');
    });

    it('returns order ID on 200 success', async () => {
      mockRequest.mockResolvedValue(resp(200, { data: { id: 'ord_200ok' } }));

      const orderId = await client.createOrder('off_mock123', passengers);
      expect(orderId).toBe('ord_200ok');
    });

    it('throws offer_no_longer_available on 422', async () => {
      mockRequest.mockResolvedValue(resp(422, {}));

      await expect(client.createOrder('off_expired', passengers))
        .rejects.toThrow('offer_no_longer_available');
    });

    it('returns null on generic non-2xx error (e.g. 503)', async () => {
      mockRequest.mockResolvedValue(resp(503, {}));
      expect(await client.createOrder('off_mock123', passengers)).toBeNull();
    });

    it('returns null on network exception (non-422 error)', async () => {
      mockRequest.mockRejectedValue(new Error('connection reset'));
      expect(await client.createOrder('off_mock123', passengers)).toBeNull();
    });

    it('includes selected_offers and type:instant in request body', async () => {
      mockRequest.mockResolvedValue(resp(201, { data: { id: 'ord_verify' } }));

      await client.createOrder('off_verify', passengers);

      const [, options] = mockRequest.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.data.type).toBe('instant');
      expect(body.data.selected_offers).toEqual(['off_verify']);
      expect(body.data.passengers).toEqual(passengers);
    });
  });

  // ── parseDurationISOStr (private — tested via normalizeOffer) ────────────
  describe('duration parsing edge cases', () => {
    it('handles duration with only minutes (PT45M)', async () => {
      const offerWithMinutesOnly = {
        ...DUFFEL_OFFER,
        slices: [{ ...DUFFEL_OFFER.slices[0], duration: 'PT45M' }],
      };
      mockRequest.mockResolvedValue(resp(200, { data: [offerWithMinutesOnly] }));

      const [offer] = await client.listOffers('orq_x');
      expect(offer.durationMins).toBe(45);
    });

    it('handles duration with only hours (PT3H)', async () => {
      const offerHoursOnly = {
        ...DUFFEL_OFFER,
        slices: [{ ...DUFFEL_OFFER.slices[0], duration: 'PT3H' }],
      };
      mockRequest.mockResolvedValue(resp(200, { data: [offerHoursOnly] }));

      const [offer] = await client.listOffers('orq_x');
      expect(offer.durationMins).toBe(180);
    });

    it('handles malformed duration string → 0 minutes', async () => {
      const offerBadDuration = {
        ...DUFFEL_OFFER,
        slices: [{ ...DUFFEL_OFFER.slices[0], duration: 'P1D' }], // No T component
      };
      mockRequest.mockResolvedValue(resp(200, { data: [offerBadDuration] }));

      const [offer] = await client.listOffers('orq_x');
      expect(offer.durationMins).toBe(0);
    });
  });
});
