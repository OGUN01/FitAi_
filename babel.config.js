module.exports = function (api) {
  api.cache.never();
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Transform import.meta for web compatibility
      ['babel-plugin-transform-import-meta', {
        'import.meta.url': 'document.currentScript && document.currentScript.src || document.baseURI',
        'import.meta.env': 'process.env'
      }],
      'babel-plugin-transform-vite-meta-env',
      // Reanimated plugin must be last
      'react-native-reanimated/plugin',
    ],
  };
};