# Explore Layout & Map Architecture Accomplishments

This document summarizes the core components and infrastructure fixes deployed during the Explore screen and Mapbox native implementation phase.

## 1. Expo Prebuild & EAS Deployment Pipeline Fixes
To accommodate the strict native requirements of `@rnmapbox/maps` v11, we migrated off standard Expo Go and configured a native iOS development build pipeline via EAS.

We fought and resolved multiple cloud deployment bottlenecks:
- **Dependency Pinning:** Escaped NPM resolution crashes by strict-pinning `@rnmapbox/maps: ^11.0.0` instead of a wildcard.
- **Monorepo Lockfiles:** Synchronized the root `/Users/samuel/anywhere/package-lock.json` workspace specifically so that `npm ci` executes securely during the "Install dependencies" EAS cloud phase.
- **Configuration Parsing:** Overrode legacy `runtimeVersion` blockings and effectively resolved Apple compliance warnings (`ITSAppUsesNonExemptEncryption`).

## 2. Interactive BottomSheet Explore UI
The `app/(tabs)/explore.tsx` interface is entirely refactored to align with your exact specifications for searching destinations.

### Map Execution Shell
- The layout runs `Mapbox.MapView` pinned under absolute styles with the `Dark` Map URL and `globe` projection to form the primary background axis.
- A fully dynamic, configurable `@gorhom/bottom-sheet` operates as the data entry point, smoothly handling dragging indices at `30%`, `45%` (default), and `95%` (full entry mode).
- At maximum collapse (`30%`), the Map is exposed, and a dynamic Terracotta Floating Action Button is injected allowing users to snap back to the search context instantly.

### Animated Form Widgets
Inside the BottomSheet ScrollView, we implemented a sophisticated search suite:
*   **Budget Slider:** Integrated `@react-native-community/slider` wrapping a `useNativeDriver: false` reactive Animated layout. It perfectly interprets slider gestures in milliseconds, smoothly re-rendering the Astoria 32px text block without UI thread jank.
*   **Pill Array Standardization:** Re-architected `PillTag.tsx` to handle fluid horizontal swipe views. Designed explicit prop parameters enabling *Active Sage* tags for multi-select (Vibes), and *Active Terracotta* styles for absolute-selection targets (Durations).
*   **Date Window Shell:** Injected a `Feather` branded pressable block representing the core `CalendarPicker` trigger event array.
*   **Surprise Me Randomizer:** Integrated `react-native-reanimated` with the Surprise link. Tapping it cascades a bouncy `withSequence` scaling animation, injects highly randomized location parameters (Vibes, Durations, Budgets), and aggressively triggers the auto-search submission handler.

## 3. Zustand Global Orchestration
The entire UI matrix respects `useSearchStore` state arrays. Tab persistence is verified. When users tap the final CTA, UI interaction is disabled, the system state transfers to `loading`, and upon search resolution, the Sheet gracefully cascades down resolving native Mapbox pins.

## 4. Asynchronous Polling & Ghost UI Engine
To handle inherently high-latency flight aggregations, we abstracted the API calls behind a specialized `useSearch` hook using `@tanstack/react-query`:
*   **Cache Bypassing:** When a user submits, the `POST /search` determines if the payload aligns with a previously cached MongoDB response. If `cached: true`, results inject instantly into Zustand safely averting polling loops.
*   **1.5s Polling Mechanism:** If calculations are pending, a discrete `useQuery` loop activates, firing `GET /search/:id/status` exactly every 1.5 seconds. The loop evaluates the response iteratively, detaching the moment it registers as strictly `ready` or `failed`.
*   **UX 'Ghost' Map Injection:** During the polling window where `useSearchStore` reads `pending`, `app/(tabs)/explore.tsx` loops through an array of pre-defined global coordinate integers. By mapping `Mapbox.PointAnnotation` across these coordinates and combining them with `useReanimatedEffect` and `withRepeat(withTiming)`, we generate a visually dynamic network of soft, pulsing "ghost pins" over the absolute mapping array to indicate background processing. Failed requests break this loop automatically broadcasting a `react-native-toast-message` payload to the user advising them to augment their parameters.

## 5. Time-of-Day Dynamic Map Styles
Instead of rigidly hardcoding mapping themes, we successfully integrated the dynamic Mapbox styling algorithms identical to the web client:
*   **Decoupled Map Component:** Abstracted the entire mapping engine into a dedicated `src/components/map/AnywhereMap.tsx` UI rendering block.
*   **Time Calculation Constants:** Extracted the core web constants into `src/lib/mapPalette.ts`. It mathematically evaluates standard local clock data (Dawn, Day, Dusk, Night) to construct strict HEX payload groupings (`ocean`, `sand`, `skyColor`, etc.).
*   **Native Mapbox Declarative Rendering:** Unlike web maps triggering `setPaintProperty`, React Native utilizes strict declarative components. Within `AnywhereMap` we overlaid `Mapbox.Atmosphere`, `Mapbox.BackgroundLayer`, and `Mapbox.FillLayer` implementations. These layers pass their localized component `id` attributes dynamically binding background properties directly to a synced React state.
*   **Synchronized 5 Minute Intervals:** The Map Component runs a constant 300,000ms `setInterval` wrapper. As the real-world clock clicks over a barrier (e.g. 19:59 Dusk into 20:00 Night), React re-evaluates the active hex palettes, immediately triggering an aggressive `<Mapbox.Atmosphere />` and generic boundary refresh, visually casting the globe into nighttime fog!

## 6. ShapeSource Geometry & Pin Interactions
Scaling past individual array map loops, all active search destinations are memoized as a strict GeoJSON `FeatureCollection` schema.
*   **Decoupled Render Flow:** Passing the GeoJSON wrapper explicitly into `<Mapbox.ShapeSource>` unlocks pure GPU native batch rendering natively bypassing the RN UI thread limits.
*   **Layer Abstraction:** Utilizing standard Mapbox Layer children against the source engine, we configured an active pulse hook bounding `<Mapbox.CircleLayer id="pin-pulse">` to `Animated.loop(Animated.timing(...))` interpolation frames.
*   **BottomSheet Synchronization Loop:** Invoking the `onPress` ShapeSource trap intercepts the clicked location's `feature.id`. Leveraging `useMapStore`, `explore.tsx` identifies the new selection identifier and directly commands `bottomSheetRef.current.snapToIndex(2)` (locking the drawer to a tight 70% axis profile) which surfaces the active `<DestinationPreviewCard />` right above the form constraints. At the same time, returning to the scope boundary, the `<Mapbox.Camera>` executes a smooth `flyTo` transitioning the coordinates to dead-center alignment.

## 7. Camera Management & Hardware Extensibility
We built an independent floating controls matrix mapped to `Mapbox.Camera` methods and the native `expo-location` module.
*   **Dynamic Bounding Computations:** Searching results dynamically strips the total global bounding box via `executeFitBounds()`, utilizing `<Mapbox.Camera fitBounds={[padding]}>`.
*   **Stateful Projection Controls:** An integrated ternary dynamically transitions the GPU raster path between `<Mapbox.MapView projection='globe' />` vs `'mercator'`.
*   **Hardware Coordinates:** Implementing `Location.getForegroundPermissionsAsync()`, the map directly triggers Apple/Android core hardware location nodes and automatically resolves the users current physical matrix geometry onto the application canvas.

## 8. Type Safety & Refactoring (Stabilization Phase)
In the final stabilization phase, we successfully eliminated technical debt related to TypeScript `any` types:
- **Strict Map Refs**: Migrated the `ShapeSource` reference from `any` to a custom `ShapeSourceRef` interface, enabling type-safe `setNativeProps` calls for high-performance animation updates.
- **Animation Typing**: Converted legacy animated values (e.g., `pulseAnim`) to strict `Animated.Value` types, ensuring compatible interpolation frames.
- **Dependency Unification**: Resolved a critical "Two Zod Identities" version mismatch by standardizing the `zod` version across all monorepo workspaces and applying a project-wide override. This ensured that `zodResolver` and the application schemas shared a single, compatible type identity.
- **Zero-Error Integrity**: Verified a 100% clean check via `tsc --noEmit`, providing a robust foundation for future native deployments.

