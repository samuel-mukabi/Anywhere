import { http, HttpResponse } from 'msw';

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

export const handlers = [
  // ── Tequila / Kiwi ──────────────────────────────────────────────────────
  http.get('https://api.tequila.kiwi.com/v2/search', () => {
    return HttpResponse.json({
      data: [{ price: 450.5, deep_link: 'https://kiwi.com/deep/mock' }],
    });
  }),

  // ── Duffel ──────────────────────────────────────────────────────────────
  http.post('https://api.duffel.com/air/offer_requests', ({ request }) => {
    if (!request.headers.has('Duffel-Version')) {
      return HttpResponse.json({ errors: [{ code: 'missing_version' }] }, { status: 400 });
    }
    return HttpResponse.json({ data: { id: 'orq_mock123', offers: [DUFFEL_OFFER] } });
  }),

  http.get('https://api.duffel.com/air/offers/:id', ({ params, request }) => {
    if (!request.headers.has('Duffel-Version')) {
      return HttpResponse.json({ errors: [{ code: 'missing_version' }] }, { status: 400 });
    }
    const changed = params.id === 'off_changed';
    return HttpResponse.json({
      data: { ...DUFFEL_OFFER, id: params.id as string, total_amount: changed ? '800.00' : '500.00' },
    });
  }),

  // ── WhereNext (correct endpoint used by WhereNextClient) ─────────────────
  http.get('https://api.wherenext.com/v1/cost-of-living/global', () => {
    return HttpResponse.json({
      data: [
        {
          city: 'New York',
          meal_inexpensive: 15,
          meal_for_2_mid_range: 60,
          one_way_ticket_local: 3,
          cappuccino_regular: 5,
          currency: 'USD',
          cost_of_living_index: 100,
        },
      ],
    });
  }),

  // ── Open-Meteo ──────────────────────────────────────────────────────────
  http.get('https://archive-api.open-meteo.com/v1/archive', () => {
    return HttpResponse.json({
      daily: {
        time: ['2023-07-01', '2023-07-02'],
        temperature_2m_mean: [28, 29],
        precipitation_sum: [50, 60],
        sunshine_duration: [28800, 30000], // seconds
      },
    });
  }),

  // ── REST Countries ───────────────────────────────────────────────────────
  http.get('https://restcountries.com/v3.1/alpha/:code', ({ params }) => {
    if (params.code === 'XX') {
      return HttpResponse.json({ status: 404, message: 'Not Found' }, { status: 404 });
    }
    return HttpResponse.json([
      {
        name: { common: 'Mockland' },
        cca2: params.code,
        cca3: `${params.code}X`,
        flags: { svg: 'https://mock.flag/flag.svg' },
        currencies: { USD: { name: 'US Dollar', symbol: '$' } },
        languages: { en: 'English' },
        region: 'Americas',
        subregion: 'North America',
        latlng: [40, -70],
        population: 1_000_000,
      },
    ]);
  }),

  // ── GeoDB ────────────────────────────────────────────────────────────────
  http.get('https://wft-geo-db.p.rapidapi.com/v1/geo/cities', () => {
    return HttpResponse.json({
      data: [
        {
          name: 'Mock City',
          countryCode: 'MC',
          latitude: 45.0,
          longitude: 45.0,
          population: 500_000,
          timezone: 'UTC',
        },
      ],
    });
  }),
];
