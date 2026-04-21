/**
 * Search store — src/stores/searchStore.ts
 *
 * Holds the current search parameters and the result state
 * returned from the destinations API.
 */

import { create } from 'zustand';

export type SearchStatus = 'idle' | 'pending' | 'ready' | 'failed';
export type SortMethod = 'match' | 'price' | 'safety' | 'climate';

export interface SearchParams {
  budget:         number;
  dateFrom:       string | null;
  dateTo:         string | null;
  vibes:          string[];
  durationNights: number;
  currency:       string;
  departureIATA:  string;
}

export interface DestinationResult {
  id:           string;
  city:         string;
  country:      string;
  iataCode:     string;
  imageUrl?:    string;
  flightPrice:  number;
  totalCost:    number;
  climateScore: number;
  costScore:    number;
  safetyScore:  number;
  // Ghost pins require simulated coordinates in typical implementations,
  // ensure there's at least a latitude/longitude property.
  latitude?:    number;
  longitude?:   number;
  // Detail Layout Extrapolations
  whyItFits?:   string[];
  climateData?: { month: string; temp: number; sunshine: number; precip: number }[];
  isPro?:       boolean;
  blurhash?:    string;
}

interface SearchState extends SearchParams {
  results:   DestinationResult[];
  searchId:  string | null;
  cached:    boolean | null;
  status:    SearchStatus;
  errorMsg:  string | null;
  sortBy:    SortMethod;

  setParams:  (params: Partial<SearchParams>) => void;
  setResults: (results: DestinationResult[], searchId?: string | null, cached?: boolean | null) => void;
  setStatus:  (status: SearchStatus, errorMsg?: string | null) => void;
  setSortBy:  (method: SortMethod) => void;
  reset:      () => void;
}

const DEFAULT_PARAMS: SearchParams = {
  budget:         2000,
  dateFrom:       null,
  dateTo:         null,
  vibes:          [],
  durationNights: 7,
  currency:       'USD',
  departureIATA:  'LHR',
};

export const useSearchStore = create<SearchState>((set) => ({
  ...DEFAULT_PARAMS,
  results:  [],
  searchId: null,
  cached:   null,
  status:   'idle',
  errorMsg: null,
  sortBy:   'match',

  setParams: (params) =>
    set((state) => ({ ...state, ...params })),

  setResults: (results, searchId = null, cached = null) =>
    set({ results, searchId, cached, status: 'ready', errorMsg: null, sortBy: 'match' }),

  setStatus: (status, errorMsg = null) =>
    set({ status, errorMsg }),

  setSortBy: (method) =>
    set((state) => {
      const sorted = [...state.results].sort((a, b) => {
        if (method === 'price') return (a.totalCost || 0) - (b.totalCost || 0);
        if (method === 'safety') return (b.safetyScore || 0) - (a.safetyScore || 0);
        if (method === 'climate') return (b.climateScore || 0) - (a.climateScore || 0);
        // Fallback for 'match' is random / original load usually, we can map ID
        return a.id.localeCompare(b.id);
      });
      return { sortBy: method, results: sorted };
    }),

  reset: () =>
    set({ ...DEFAULT_PARAMS, results: [], searchId: null, cached: null, status: 'idle', errorMsg: null, sortBy: 'match' }),
}));

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectSearchParams  = (s: SearchState): SearchParams => ({
  budget:         s.budget,
  dateFrom:       s.dateFrom,
  dateTo:         s.dateTo,
  vibes:          s.vibes,
  durationNights: s.durationNights,
  currency:       s.currency,
  departureIATA:  s.departureIATA,
});

export const selectResults       = (s: SearchState) => s.results;
export const selectSearchStatus  = (s: SearchState) => s.status;
export const selectSearchId      = (s: SearchState) => s.searchId;
