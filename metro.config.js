const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// CRITICAL: Fix for React Native 0.79.5 Flow syntax compatibility
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: false,
};

// CRITICAL: NativeWind 4.x requires this wrapper for CSS processing
module.exports = withNativeWind(config, { input: './global.css' });