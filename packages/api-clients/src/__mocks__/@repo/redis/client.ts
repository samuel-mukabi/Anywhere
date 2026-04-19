/**
 * Lightweight in-memory Redis mock for unit tests.
 * Prevents real network calls while keeping the same interface shape
 * used by OpenMeteoClient and WhereNextClient.
 */
const store = new Map<string, string>();

export const redisClient = {
  get:    jest.fn(async (key: string) => store.get(key) ?? null),
  setex:  jest.fn(async (key: string, _ttl: number, value: string) => { store.set(key, value); return 'OK'; }),
  del:    jest.fn(async (key: string) => { store.delete(key); return 1; }),
};
