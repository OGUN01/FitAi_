const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Essential platform support
config.resolver.platforms = ['web', 'native', 'ios', 'android'];

// Proper polyfill handling for JSC engine
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Clean serializer configuration
config.serializer = {
  ...config.serializer,
};

// Optimized transformer for JSC compatibility
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: false,
    },
  }),
};

// Clean resolver configuration
config.resolver = {
  ...config.resolver,
  // Handle polyfill modules properly
  alias: {
    ...config.resolver.alias,
  },
};

module.exports = config;