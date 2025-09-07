const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// CRITICAL: Fix for React Native 0.79.5 Flow syntax compatibility
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: false,
};

module.exports = config;