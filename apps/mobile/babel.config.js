module.exports = function (api) {
  api.cache(true);

  // Use process.env directly — api.env() cannot be called after api.cache(true)
  const isTest = process.env.NODE_ENV === 'test';

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@anywhere/types': '../../packages/types/src',
            '@anywhere/api-clients': '../../packages/api-clients/src',
            '@repo/types': '../../packages/types/src',
          },
          extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.ts', '.tsx'],
        },
      ],
      // react-native-reanimated/plugin depends on react-native-worklets/plugin at
      // Babel compile-time, which is unavailable in a Node/Jest environment.
      // The reanimated mock (jest.mock('react-native-reanimated')) handles tests.
      ...(isTest ? [] : ['react-native-reanimated/plugin']),
    ],
  };
};
