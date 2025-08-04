module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      ['babel-preset-expo', { 
        unstable_transformImportMeta: true  // Correct flag for SDK 53 to transform import.meta
      }]
    ],
    plugins: [
      // Only keep reanimated plugin - must be last
      'react-native-reanimated/plugin',
    ],
  };
};