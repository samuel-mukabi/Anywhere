/**
 * Stores barrel — src/stores/index.ts
 * Single import point for all Zustand stores and their selectors.
 *
 * Usage:
 *   import { useAuthStore, selectIsPro } from '@/stores';
 */

export {
  useAuthStore,
  selectUser,
  selectToken,
  selectTier,
  selectIsPro,
  selectHydrated,
} from './authStore';
export type { AuthUser, SubscriptionTier } from './authStore';

export {
  useSearchStore,
  selectSearchParams,
  selectResults,
  selectSearchStatus,
  selectSearchId,
} from './searchStore';
export type { SearchParams, DestinationResult, SearchStatus } from './searchStore';

export {
  useMapStore,
  selectSelectedId,
  selectCameraCenter,
  selectZoom,
} from './mapStore';
export type { CameraCenter } from './mapStore';
