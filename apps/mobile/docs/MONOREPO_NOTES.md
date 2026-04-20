# Anywhere Mobile - Monorepo & Dependency Management

This document explains the specialized Metro configuration required to run a React Native application inside this Turborepo environment.

## The Hoisting Challenge
In a monorepo, many packages (like `react`, `react-native`, and `@tanstack/react-query`) are "hoisted" to the root `node_modules` directory. Standard Metro resolution often fails to find these, leading to:
- `Invariant Violation: React Native is not found`.
- `ReferenceError: Property X doesn't exist` (even when it seems imported).

## Metro Configuration Strategy (`metro.config.js`)
We use a three-pronged approach to stabilize resolution:

### 1. Root Watching
`config.watchFolders = [workspaceRoot]` ensures Metro is aware of files at the monorepo root.

### 2. Manual Package Pinning
We use the `extraNodeModules` map to explicitly tell Metro where to find critical core packages. The `resolvePackage` helper checks the local `node_modules` first, then falls back to the root.

**Pinned Packages:**
- `react` / `react-dom`
- `react-native`
- `@tanstack/react-query`
- `expo-router`
- `expo-font` / `expo-asset`

```javascript
// Example from metro.config.js
config.resolver.extraNodeModules = {
  ...
  '@tanstack/react-query': resolvePackage('@tanstack/react-query'),
};
```

### 3. Dedicated Resolve Logic
The `resolvePackage` logic is critical because it prevents "Multiple copies of React" errors by forcing the entire app to use a single resolution path for core dependencies.

## Shared Packages
The app consumes shared workspace packages (e.g. `@repo/types`) via workspace linking. These are found automatically because of the `watchFolders` and `nodeModulesPaths` settings.

## Common Fixes
If you see a `ReferenceError` for a package that appears correctly installed:
1. Check if it's hoisted to the root `node_modules`.
2. Add it to the `extraNodeModules` list in `apps/mobile/metro.config.js`.
3. Restart the packager with the `-c` (clear cache) flag: `npx expo start -c`.
