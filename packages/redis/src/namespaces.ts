/**
 * Strict Global Namespaces assuring Redis storage never accidentally collides natively!
 */
export const CacheNamespaces = {
    search: (hash: string) => `search:${hash}`,
    session: (userId: string) => `session:${userId}`,
    room: (roomId: string) => `room:${roomId}`,
    prices: (route: string, date: string) => `prices:${route}:${date}`,
};

/**
 * Strict Standard TTL Definitions natively mapping precise boundary limits (Outputs cleanly into Seconds)
 */
export const CacheTTL = {
    FLIGHT: 20 * 60,                // 20 minutes
    SESSION: 15 * 60,               // 15 minutes
    COST_OF_LIVING: 24 * 60 * 60,   // 24 hours
    CLIMATE: 7 * 24 * 60 * 60       // 7 days
};
