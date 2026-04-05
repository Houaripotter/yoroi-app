module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Note: react-native-reanimated/plugin removed — Reanimated v4 + newArchEnabled:true
    // uses Worklets directly and does not need the Babel plugin.
    plugins: [],
  };
};
