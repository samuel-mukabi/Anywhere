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
  // ── TravelPayouts v3 ────────────────────────────────────────────────────
  http.get('https://api.travelpayouts.com/aviasales/v3/prices_for_dates', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          price: 450,
          airline: 'SU',
          flight_number: 123,
          departure_at: '2026-07-01T08:00:00Z',
          transfers: 0,
          expires_at: '2026-07-01T09:00:00Z',
        },
      ],
    });
  }),

  // ── TravelPayouts v1 ────────────────────────────────────────────────────
  http.get('https://api.travelpayouts.com/v1/prices/cheap', () => {
    return HttpResponse.json({
      success: true,
      data: {
        JFK: {
          '1': {
            price: 567,
            airline: 'SK',
            flight_number: 802,
            departure_at: '2026-05-07T07:05:00+01:00',
            transfers: 1,
          },
        },
      },
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

  // ── WhereNext (real endpoint + real schema) ─────────────────────────────
  http.get('https://getwherenext.com/api/data/cost-of-living', () => {
    return HttpResponse.json({
      data: [
        {
          rank: 1,
          country_code: 'US',
          country: 'United States',
          region: 'Americas',
          cost_index: 100,
          monthly_estimate_usd: 4000,
          grocery_index: 100,
          rent_index: 100,
          utilities_index: 100,
          transport_index: 100,
        },
        {
          rank: 78,
          country_code: 'FR',
          country: 'France',
          region: 'Europe',
          cost_index: 77,
          monthly_estimate_usd: 2800,
          grocery_index: 25.7,
          rent_index: 25.41,
          utilities_index: 32.9,
          transport_index: 40.92,
        },
      ],
    });
  }),

  // ── Open-Meteo ──────────────────────────────────────────────────────────
  http.get('https://archive-api.open-meteo.com/v1/archive', () => {
    return HttpResponse.json({
      daily: {
        time: ['2023-07-01', '2023-07-02'],
        temperature_2m_max: [28, 29],
        temperature_2m_min: [18, 19],
        precipitation_sum: [50, 60],
        sunshine_duration: [28800, 30000], // seconds → hours via ÷3600
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
        flag: '🏳',
        currencies: { USD: { name: 'US Dollar', symbol: '$' } },
        languages: { en: 'English' },
        region: 'Americas',
        subregion: 'North America',
        capital: ['Mock City'],
        latlng: [40, -70],
        population: 1_000_000,
      },
    ]);
  }),

  // ── GeoDB (free service — correct URL) ──────────────────────────────────
  http.get('https://geodb-free-service.wirefreethought.com/v1/geo/cities', () => {
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

  // ── Travel Risk ─────────────────────────────────────────────────────────
  http.get('https://travelriskapi.com/api/v1/health', () => {
    return HttpResponse.json({ status: 'healthy', version: '1.0.0' });
  }),

  http.get('https://travelriskapi.com/api/v1/risk-score/:iso_code', ({ params }) => {
    if (params.iso_code === 'AFG') {
      return HttpResponse.json({
        iso_code: 'AFG',
        name: 'Afghanistan',
        risk_score: 5.0,
        advisory_level: 4,
        active_alerts: 48,
        calculation: { base_score: 4.0, alert_impact: 25.0, composite: 5.0 },
      });
    }
    return HttpResponse.json({
      iso_code: params.iso_code,
      name: 'Mock Country',
      risk_score: 2.0,
      advisory_level: 2,
      active_alerts: 3,
      calculation: { base_score: 2.0, alert_impact: 0, composite: 2.0 },
    });
  }),
];
