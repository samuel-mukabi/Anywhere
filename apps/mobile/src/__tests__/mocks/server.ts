// MSW v1 server — uses 'rest' (not 'http'/'HttpResponse' which are v2-only)
import { rest } from 'msw';
import { setupServer } from 'msw/node';

export const MOCK_SEARCH_ID = 'srch_mock_001';
export const MOCK_DESTINATION = {
  id: 'dest_lisbon_01',
  city: 'Lisbon',
  country: 'Portugal',
  totalCost: 1450,
  flightPrice: 480,
  climateScore: 88,
  safetyScore: 82,
  imageUrl: 'https://images.unsplash.com/photo-1580323072510-9f6d7f87bd80',
  blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
  whyItFits: ['Perfect weather', 'Safe area'],
  climateData: [],
  latitude: 38.7223,
  longitude: -9.1393,
};

export const handlers = [
  // POST /search — cache miss path (default; override per-test for cache hit)
  rest.post('*/search', (_req, res, ctx) =>
    res(ctx.json({ searchId: MOCK_SEARCH_ID, cached: false })),
  ),

  // GET /search/poll/:id — returns ready state with results
  rest.get(`*/search/poll/${MOCK_SEARCH_ID}`, (_req, res, ctx) =>
    res(ctx.json({ status: 'ready', results: [MOCK_DESTINATION] })),
  ),

  // GET /trips
  rest.get('*/trips', (_req, res, ctx) =>
    res(ctx.json({ trips: [MOCK_DESTINATION] })),
  ),

  // GET /alerts
  rest.get('*/alerts', (_req, res, ctx) =>
    res(ctx.json({ alerts: [] })),
  ),

  // POST /users/push-token
  rest.post('*/users/push-token', (_req, res, ctx) =>
    res(ctx.json({ ok: true })),
  ),

  // POST /auth/logout
  rest.post('*/auth/logout', (_req, res, ctx) =>
    res(ctx.json({ ok: true })),
  ),
];

export const server = setupServer(...handlers);
