// Stub for react-native-worklets/plugin
// babel-preset-expo loads react-native-reanimated/plugin which requires this.
// In Jest/Node environment there are no native worklets, so we export a no-op plugin.
module.exports = function workletsPluginStub() {
  return { visitor: {} };
};
