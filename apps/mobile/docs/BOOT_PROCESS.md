# Anywhere Mobile - Boot & Hydration Sequence

This document details the critical sequence of events that occur from the moment the user taps the app icon to the moment the first screen is rendered. Stabilization of this flow was a key factor in resolving "blank screen" issues.

## 1. Native Boot Layer
The entry point is `index.ts`. It ensures `react-native-gesture-handler` is initialized before the React tree.

1. **Native Splash**: The OS displays the static splash image defined in `app.config.js`.
2. **Font Loading**: `useFontLoader.ts` calls `SplashScreen.preventAutoHideAsync()` to prevent the native splash from hiding prematurely.

## 2. Redirection Bridge (`app/index.tsx`)
Because the app uses Expo Router with multiple groups (`(auth)`, `(tabs)`), a root `index.tsx` is required as a starting point.
- **Role**: It acts as a router bridge.
- **Logic**: It checks the `authStore` hydration status. If hydrated, it redirects to `(tabs)/explore` (if logged in) or `(auth)/login` (if not).

## 3. Root Layout & Hydration (`app/_layout.tsx`)
The `RootNavigator` component manages the secondary React-based splash screen and the actual hydration of user data.

### Handoff Sequence:
1. **Font Check**: Once fonts are loaded, `SplashScreen.hideAsync()` is called to reveal the React Native layer.
2. **Branded Splash**: The `LoadingOverlay` component is rendered immediately (it defaults to `visible: true` during hydration).
3. **Storage Hydration**:
   - `secureStorage.getJwt()` checks for a saved token.
   - If found, `setAuth()` updates the Zustand store.
4. **Visibility Reveal**:
   - Once `setHydrated()` is called, `showOverlay` becomes `false`.
   - `LoadingOverlay` performs a 300ms fade-out transition.
   - The underlying `Stack` is revealed.

## 4. Fail-safes
To prevent the app from being stuck on a blank screen if external factors (like font loading or SecureStore access) hang:
- **Hydration Timeout**: A 5-second `setTimeout` in `_layout.tsx` forces `setHydrated()` if the process hasn't completed.
- **Font Timeout**: A fallback in `_layout.tsx` hides the native splash screen after 4 seconds regardless of font status.

## Troubleshooting
If the app boots to a blank screen, check the terminal for the following logs:
- `[RootLayout] State update`: Shows the status of fonts and hydration.
- `[RootLayout] Storage check result`: Shows if a JWT was found in SecureStore.
