/**
 * Map store — src/stores/mapStore.ts
 *
 * Tracks which destination marker is active and the camera state
 * so that the Mapbox map and the result list stay in sync.
 */

import { create } from 'zustand';

export interface CameraCenter {
  longitude: number;
  latitude:  number;
}

interface MapState {
  /** The destination id currently highlighted on the map. */
  selectedDestinationId: string | null;
  /** Mapbox camera centre coordinates. */
  cameraCenter:          CameraCenter;
  /** Mapbox zoom level. */
  zoom:                  number;

  /** Selects a destination and optionally re-centres the camera. */
  setSelected: (id: string | null, center?: CameraCenter, zoom?: number) => void;
  /** Resets map to initial state. */
  resetMap:    () => void;
  /** Updates camera without changing the selected marker. */
  setCamera:   (center: CameraCenter, zoom?: number) => void;
}

const DEFAULT_CENTER: CameraCenter = { longitude: 0, latitude: 20 };
const DEFAULT_ZOOM   = 2;

export const useMapStore = create<MapState>((set) => ({
  selectedDestinationId: null,
  cameraCenter:          DEFAULT_CENTER,
  zoom:                  DEFAULT_ZOOM,

  setSelected: (id, center?, zoom?) =>
    set((state) => ({
      selectedDestinationId: id,
      cameraCenter:          center ?? state.cameraCenter,
      zoom:                  zoom   ?? (center ? 10 : state.zoom),
    })),

  resetMap: () =>
    set({
      selectedDestinationId: null,
      cameraCenter:          DEFAULT_CENTER,
      zoom:                  DEFAULT_ZOOM,
    }),

  setCamera: (center, zoom?) =>
    set((state) => ({
      cameraCenter: center,
      zoom:         zoom ?? state.zoom,
    })),
}));

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectSelectedId   = (s: MapState) => s.selectedDestinationId;
export const selectCameraCenter = (s: MapState) => s.cameraCenter;
export const selectZoom         = (s: MapState) => s.zoom;
