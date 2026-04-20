/**
 * Search store — src/stores/searchStore.ts
 *
 * Holds the current search parameters and the result state
 * returned from the destinations API.
 */

import { create } from 'zustand';

export type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SearchParams {
  budget:         number;
  dateFrom:       string | null;
  dateTo:         string | null;
  /** Selected vibes / travel styles e.g. ['Beach', 'Adventure'] */
  vibes:          string[];
  durationNights: number;
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
}

interface SearchState extends SearchParams {
  results:   DestinationResult[];
  /** Unique ID for the current search — used to correlate polling results. */
  searchId:  string | null;
  status:    SearchStatus;
  errorMsg:  string | null;

  setParams:  (params: Partial<SearchParams>) => void;
  setResults: (results: DestinationResult[], searchId?: string) => void;
  setStatus:  (status: SearchStatus, errorMsg?: string) => void;
  reset:      () => void;
}

const DEFAULT_PARAMS: SearchParams = {
  budget:         2000,
  dateFrom:       null,
  dateTo:         null,
  vibes:          [],
  durationNights: 7,
};

export const useSearchStore = create<SearchState>((set) => ({
  ...DEFAULT_PARAMS,
  results:  [],
  searchId: null,
  status:   'idle',
  errorMsg: null,

  setParams: (params) =>
    set((state) => ({ ...state, ...params })),

  setResults: (results, searchId: string | null = null) =>
    set({ results, searchId, status: 'success', errorMsg: null }),

  setStatus: (status, errorMsg: string | null = null) =>
    set({ status, errorMsg }),

  reset: () =>
    set({ ...DEFAULT_PARAMS, results: [], searchId: null, status: 'idle', errorMsg: null }),
}));

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectSearchParams  = (s: SearchState): SearchParams => ({
  budget:         s.budget,
  dateFrom:       s.dateFrom,
  dateTo:         s.dateTo,
  vibes:          s.vibes,
  durationNights: s.durationNights,
});

export const selectResults       = (s: SearchState) => s.results;
export const selectSearchStatus  = (s: SearchState) => s.status;
export const selectSearchId      = (s: SearchState) => s.searchId;
