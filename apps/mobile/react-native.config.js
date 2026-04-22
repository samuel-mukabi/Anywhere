module.exports = {
  dependencies: {
    'react-native-worklets': {
      platforms: {
        ios: null, // Disable autolinking because it requires New Architecture
        android: null, // Disable autolinking
      },
    },
  },
};
