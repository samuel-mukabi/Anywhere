import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { searchApi, SearchPostPayload } from '@/services/api-client';
import { useSearchStore } from '@/features/search/search-store';

export function useSearch() {
  const queryClient = useQueryClient();
  
  // Store bindings
  const searchId = useSearchStore((s) => s.searchId);
  const status = useSearchStore((s) => s.status);
  const cached = useSearchStore((s) => s.cached);
  const setResults = useSearchStore((s) => s.setResults);
  const setStatus = useSearchStore((s) => s.setStatus);

  /**
   * 1. Initial Mutation: Triggers the backend Search generation
   */
  const searchMutation = useMutation({
    mutationFn: async (payload: SearchPostPayload) => {
      const res = await searchApi.createSearch(payload);
      return res.data;
    },
    onMutate: () => {
      setStatus('pending');
    },
    onSuccess: (data) => {
      // Determine cache routing
      if (data.cached && data.results) {
        // Fast-path: Pre-computed cache hits
        setResults(data.results, data.searchId, true);
      } else {
        // Slow-path: Store the ID and trigger the polling listener
        useSearchStore.setState({ searchId: data.searchId, cached: false });
      }
    },
    onError: (err: Error) => {
      setStatus('failed', err.message);
      Toast.show({
        type: 'error',
        text1: 'Search Failed',
        text2: 'Could not connect to travel servers. Please try again.',
      });
    },
  });

  /**
   * 2. Status Poller: Observes the un-cached backend queues every 1.5s
   */
  const pollingQuery = useQuery({
    queryKey: ['searchStatus', searchId],
    queryFn: async () => {
      if (!searchId) throw new Error('No searchId');
      const res = await searchApi.getSearchStatus(searchId);
      return res.data;
    },
    // Only poll if we have a searchId, it's not a cached resolution, and it's actively pending
    enabled: !!searchId && cached === false && status === 'pending',
    refetchInterval: 1500,
  });

  /**
   * 3. Sync polling updates into global state
   */
  useEffect(() => {
    if (pollingQuery.data) {
      const { status: pollStatus, results } = pollingQuery.data;

      if (pollStatus === 'ready' && results) {
        setResults(results, searchId, false);
      } else if (pollStatus === 'failed') {
        setStatus('failed');
        Toast.show({
          type: 'error',
          text1: 'No flights found.',
          text2: 'Try widening your travel window or increasing budget.',
        });
      }
    }
  }, [pollingQuery.data, searchId, setResults, setStatus]);

  // Expose a clean execution trigger wrapper
  const triggerSearch = (payload: SearchPostPayload) => {
    searchMutation.mutate(payload);
  };

  return {
    triggerSearch,
    isInitializing: searchMutation.isPending,
    isPolling: pollingQuery.isFetching && status === 'pending',
    status,
  };
}
