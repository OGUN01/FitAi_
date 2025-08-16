const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Essential platform support
config.resolver.platforms = ['web', 'native', 'ios', 'android'];

// Proper polyfill handling for JSC engine
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// CRITICAL FIX: React Native 0.79.5 Flow v0.275.0 compatibility
config.resolver = {
  ...config.resolver,
  // Fix for React Native 0.79.5 Metro bundler Flow syntax incompatibility
  unstable_enablePackageExports: false,
  // Handle polyfill modules properly
  alias: {
    ...config.resolver.alias,
  },
};

// Clean serializer configuration
config.serializer = {
  ...config.serializer,
};

// Enhanced transformer for React Native 0.79.5 + Flow v0.275.0 compatibility
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: false,
    },
  }),
};

module.exports = config;