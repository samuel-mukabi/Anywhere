/**
 * Trips store — src/stores/tripsStore.ts
 *
 * Persists explicitly saved destinations.
 */

import { create } from 'zustand';
import { DestinationResult } from '../search/search-store';

interface TripsState {
  savedTrips: DestinationResult[];
  
  saveTrip: (destination: DestinationResult) => void;
  removeTrip: (id: string) => void;
  clearTrips: () => void;
}

export const useTripsStore = create<TripsState>((set) => ({
  savedTrips: [],

  saveTrip: (destination) =>
    set((state) => {
      // Prevent duplicates safely
      if (state.savedTrips.some(t => t.id === destination.id)) {
        return state;
      }
      return { savedTrips: [...state.savedTrips, destination] };
    }),

  removeTrip: (id) =>
    set((state) => ({
      savedTrips: state.savedTrips.filter((t) => t.id !== id),
    })),

  clearTrips: () => set({ savedTrips: [] }),
}));
