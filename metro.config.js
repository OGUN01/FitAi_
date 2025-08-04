const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enhanced web compatibility configuration
config.resolver.platforms = ['web', 'native', 'ios', 'android'];

// Optimize transformer for better web support
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: false,
  },
});

// Ensure proper module resolution for web
config.resolver.alias = {
  ...config.resolver.alias,
  // Add any necessary aliases here if needed
};

module.exports = config;