/**
 * __tests__/hooks/useSearch.test.ts
 *
 * Unit tests for the useSearch hook.
 * MSW v1 intercepts real HTTP calls — no manual axios mocking needed.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { rest } from 'msw';

import { useSearch } from '@/features/search/use-search';
import { useSearchStore } from '@/features/search/search-store';
import { MOCK_SEARCH_ID, MOCK_DESTINATION, server } from '../../../__tests__/mocks/server';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const SEARCH_PAYLOAD = {
  budget: 2000,
  duration: 7,
  tags: ['Beach'],
  dates: null,
};

describe('useSearch', () => {
  beforeEach(() => {
    queryClient.clear();
    useSearchStore.setState({
      status: 'idle',
      results: [],
      searchId: null,
      cached: false,
    });
  });

  it('sets status to "pending" immediately on triggerSearch', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });

    act(() => {
      result.current.triggerSearch(SEARCH_PAYLOAD);
    });

    expect(useSearchStore.getState().status).toBe('pending');
  });

  it('starts polling when cache miss, then lands results on "ready"', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });

    act(() => {
      result.current.triggerSearch(SEARCH_PAYLOAD);
    });

    await waitFor(
      () => {
        const { status, results } = useSearchStore.getState();
        expect(status).toBe('ready');
        expect(results).toHaveLength(1);
        expect(results[0].city).toBe('Lisbon');
      },
      { timeout: 5000 },
    );
  });

  it('stops polling once status is "ready"', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });

    act(() => { result.current.triggerSearch(SEARCH_PAYLOAD); });

    await waitFor(() => expect(useSearchStore.getState().status).toBe('ready')); console.log("State:", useSearchStore.getState());
    expect(result.current.isPolling).toBe(false);
  });

  it('sets status "failed" and shows a toast on server error', async () => {
    server.use(
      rest.post('*/search', (_req, res, ctx) =>
        res(ctx.status(500), ctx.json({ error: 'Server error' })),
      ),
    );

    const Toast = require('react-native-toast-message');
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });

    act(() => { result.current.triggerSearch(SEARCH_PAYLOAD); });

    await waitFor(() => expect(useSearchStore.getState().status).toBe('failed'));
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text1: 'Search Failed' }),
    );
  });

  it('fast-paths to "ready" on cache hit without polling', async () => {
    server.use(
      rest.post('*/search', (_req, res, ctx) =>
        res(ctx.json({ searchId: 'hit_mock', cached: true, results: [MOCK_DESTINATION] })),
      ),
    );

    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });

    act(() => { result.current.triggerSearch(SEARCH_PAYLOAD); });

    await waitFor(() => expect(useSearchStore.getState().status).toBe('ready'));
    expect(useSearchStore.getState().searchId).toBe('hit_mock');
    expect(useSearchStore.getState().cached).toBe(true);
    expect(result.current.isPolling).toBe(false);
  });
});
