const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch the entire monorepo so Metro picks up workspace packages
config.watchFolders = [workspaceRoot];

// 2. Search local node_modules first, then root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Pin ALL React-related packages to the correct copy (local or root)
//    This prevents duplicate React errors and resolving to non-existent paths.
const resolvePackage = (name) => {
  const localPath = path.resolve(projectRoot, 'node_modules', name);
  const rootPath = path.resolve(workspaceRoot, 'node_modules', name);
  return require('fs').existsSync(localPath) ? localPath : rootPath;
};

config.resolver.extraNodeModules = {
  react: resolvePackage('react'),
  'react-dom': resolvePackage('react-dom'),
  'react-native': resolvePackage('react-native'),
  'scheduler': resolvePackage('scheduler'),

  // ─── Native animation / gesture (must all resolve to the same single copy) ──
  // Missing pins here cause "Exception in HostFunction" at runtime because the
  // Reanimated worklet runtime binds to a different native module than the JS
  // module Metro bundled.
  'react-native-reanimated': resolvePackage('react-native-reanimated'),
  'react-native-gesture-handler': resolvePackage('react-native-gesture-handler'),
  '@gorhom/bottom-sheet': resolvePackage('@gorhom/bottom-sheet'),

  '@tanstack/react-query': resolvePackage('@tanstack/react-query'),
  '@react-native-async-storage/async-storage': resolvePackage('@react-native-async-storage/async-storage'),
  'expo-router': resolvePackage('expo-router'),
  'expo-font': resolvePackage('expo-font'),
  'expo-asset': resolvePackage('expo-asset'),
  'expo-apple-authentication': resolvePackage('expo-apple-authentication'),
  'expo-auth-session': resolvePackage('expo-auth-session'),
  'expo-web-browser': resolvePackage('expo-web-browser'),
  'react-hook-form': resolvePackage('react-hook-form'),
  '@hookform/resolvers': resolvePackage('@hookform/resolvers'),
  'zod': resolvePackage('zod'),
  'axios': resolvePackage('axios'),
};

module.exports = config;
