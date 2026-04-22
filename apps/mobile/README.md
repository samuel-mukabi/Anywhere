# Anywhere Traveler App (Mobile)

This is the central Expo React Native application for the Anywhere platform.

## Architecture

The mobile package is fully integrated into the Turborepo monorepo and consumes shared packages (`@repo/types`, `@anywhere/api-clients`) via internal workspace boundaries.

- **Framework**: Expo (React Native) -> `expo-router` for file-based routing.
- **Language**: TypeScript
- **Styling**: Vanilla React Native `StyleSheet` with a custom branded Theme token system.
- **State Management**: React Context / Hooks
- **Bundler**: Metro (Monorepo-aware configured via `metro.config.js`)

## Getting Started

### 1. Environment Setup

Copy the example environment file and fill in your keys:

```bash
cp .env.local.example .env.local
```

Required keys (these map to `app.config.js` via Expo Constants):
- `API_BASE_URL` - Your local API Gateway (e.g. `http://localhost:4000`)
- `MAPBOX_PUBLIC_TOKEN` - Your public mapbox token.
- `STRIPE_PUBLISHABLE_KEY` - Your stripe publishable test key.

### 2. Run the App

From the monorepo root, you can start the packager:

```bash
npm run dev:mobile
```

From within the `apps/mobile` directory explicitly clearing the Metro cache (recommended for monorepo stabilization):

```bash
npx expo start -c
```

## Design System

The application utilizes a custom design system mapped to the brand's aesthetics (Parchment, Near-Black, Terracotta, Sage, Ocean). 

The tokens are defined in `src/theme/` and consumed via direct imports (e.g. `import { Colors } from '@/theme/colors'`).
- `Colors`: Hex values and semantic aliases (e.g., `background`, `primary`, `textPrimary`).
- `Typography`: Scale for `Astoria` (Display) and `Cera Pro` (Body). Note: The font files must be placed in `assets/fonts/`.
- `Spacing`: 4pt-based grid system.
- `Radii`: Standardized component corner rounding (e.g., `md: 8px`).

## UI Component Library

Core reusable primitives are located in `src/components/ui/` and barrel-exported via `src/components/ui/index.ts`.

- `Button` (Dark, Terracotta, Ghost)
- `TextInput` (Animated focus states)
- `PillTag` & `PillGroup` (Single and multi-select spring toggle chips)
- `BudgetSlider` (React Native Community Slider with formatted state-driven labels)
- `BottomSheet` (Gorhom Bottom Sheet wrappers)
- `Toast` (Custom branded notifications)
- `Skeleton` (Shimmering loading states)
- `CalendarPicker` (Full range selection date picker)
- `Card` (Standardized elevated surfaces)

## State Management

Global state is managed via [Zustand](https://zustand-demo.pmnd.rs/) stores located in `src/stores/`:

| Store | File | Purpose |
|---|---|---| 
| `useAuthStore` | `authStore.ts` | User identity, JWT (in-memory), subscription tier, hydration flag |
| `useSearchStore` | `searchStore.ts` | Budget, dates, vibes, duration, destination results, search status |
| `useMapStore` | `mapStore.ts` | Selected map pin, Mapbox camera centre, zoom level |

All stores export typed selectors (e.g. `selectIsPro`, `selectResults`) for use with `useStore(selector)` to prevent unnecessary re-renders.

### SecureStore Wrapper

Sensitive credentials (JWT, refresh token) are stored via a typed wrapper at `src/lib/secureStorage.ts`.
Never access `expo-secure-store` directly — use this wrapper instead.

```ts
import { secureStorage } from '@/lib/secureStorage';
await secureStorage.setJwt(token);
const token = await secureStorage.getJwt();
await secureStorage.clearAll(); // call on logout
```

### Data Fetching

API calls use [TanStack Query](https://tanstack.com/query) configured in the root layout with `staleTime: 5 * 60 * 1000` (5 min). All query hooks should live in `src/hooks/queries/`.

## App Shell & Branded Splash

### AppHeader (`src/components/AppHeader.tsx`)
Persistent top bar used on all main tab screens.
- Left: `Anywhere.` wordmark in Astoria font
- Right: Feather bell icon + terracotta avatar with user initial
- Reads `user` from the auth store automatically
- Uses `useSafeAreaInsets` to adapt to notches and Dynamic Islands

### LoadingOverlay (`src/components/LoadingOverlay.tsx`)
A premium, branded React Native splash screen that handles the transition from the native boot process to the app UI.
- **Visuals**: Features the "Anywhere." wordmark (Astoria font) on a solid parchment background.
- **Animation**: Subtle scale-up and fade-in entrance when the app boots or authenticates.
- **Indicator**: A minimalist spinning terracotta arc for background async tasks.

The overlay automatically hides once the `authStore` is hydrated and fonts are ready.

## Navigation (Expo Router)

The app uses file-based routing via Expo Router, segmented into auth guards and feature tabs.

### Auth Flow
The root `app/_layout.tsx` validates a JWT in `SecureStore` upon launch.
- If no token is found, users are routed to the `(auth)` stack (`login` -> `register` -> `onboarding`).
- If a token is found, users bypass auth and land in the `(tabs)` navigator.

### Route Map
```text
app/
├── _layout.tsx              (Root layout, Toast, Font Loader, Auth Guard)
├── (auth)/                  (Unauthenticated stack)
│   ├── login.tsx
│   ├── register.tsx
│   └── onboarding.tsx       (Preferences: Style, Budget)
├── (tabs)/                  (Main application layout - Custom Tab Bar)
│   ├── explore.tsx          (Search, Filters, Destination discovery)
│   ├── trips.tsx            (Saved trips dashboard)
│   ├── group.tsx            (Group trip room directory - Pro)
│   └── profile.tsx          (User settings, logout)
├── destination/
│   └── [id].tsx             (Destination Detail Modal)
└── group/
    └── [roomId].tsx         (Collaborative Group Voting Stack)
```

## Deployment (EAS)

The project is linked to Expo Application Services (EAS). Production environment variables are injected as EAS Secrets.

Profiles are defined in `eas.json`:
- `development`: Local development client simulators.
  - `preview`: Internal distribution.
  - `production`: App Store and Play Store auto-incremented releases.

## Build & Stability Notes

- **Native iOS/Android Builds**: The native app environment is highly stabilized. If you are building natively, ensure `newArchEnabled` is false in your settings to avoid C++ header mismatch errors. Apple provisioning is configured to utilize Personal Team development by stripping "Pro" entitlements (Push Notifications, Associated Domains).
- **Dependency Pinning**: React Native Reanimated is strictly pinned in `metro.config.js` to prevent `Exception in HostFunction` crashes during startup.
- **Web Bundling Constraint**: Do **not** attempt to run `npx expo start --web` or build the app for the web platform. The `@stripe/stripe-react-native` package contains direct `react-native` internal imports which fundamentally break the Expo Web bundler. This application targets iOS and Android natively.
