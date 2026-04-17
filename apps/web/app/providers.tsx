'use client';

/**
 * QueryProvider — TanStack React Query client
 * ============================================
 * Wraps the entire app so all Server→Client boundary data fetching
 * can use useQuery / useSuspenseQuery / useInfiniteQuery.
 *
 * Config rationale:
 *  staleTime 60 s  — flight prices from cache are fresh for 60 s on the
 *                    client (server cache via Redis has a 15-min TTL; the
 *                    client window is intentionally shorter to trigger
 *                    background refetches on return visits).
 *  gcTime    5 min — keep unmounted query data in memory for back-nav.
 *  retry 1         — one retry on network error; avoid hammering rate-
 *                    limited Amadeus / Numbeo endpoints on transient fails.
 *  refetchOnWindowFocus false — map page results shouldn't silently
 *                    re-fetch when the user alt-tabs back.
 */
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:            60 * 1000,       // 60 seconds
        gcTime:               5 * 60 * 1000,   // 5 minutes
        retry:                1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

// Singleton for the server component boundary — avoids creating a new
// QueryClient on every server render while still allowing tests to
// supply their own instance.
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new client (no caching between requests)
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState ensures the QueryClient is only created once per component
  // instance, even in React 18 Strict Mode double-invocation.
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools
        initialIsOpen={false}
        buttonPosition="bottom-left"
      />
    </QueryClientProvider>
  );
}
