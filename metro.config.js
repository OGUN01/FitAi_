const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// CRITICAL: Fix for React Native 0.79.5 Flow syntax compatibility
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: false,
  // Exclude .claude agent worktrees from resolution to prevent ENOENT crashes
  blockList: [
    /\.claude[/\\].*/,
  ],
};

// Exclude .claude directory from Metro's file watcher entirely
config.watchFolders = (config.watchFolders || []).filter(
  (folder) => !folder.includes('.claude')
);

// CRITICAL: NativeWind 4.x requires this wrapper for CSS processing
module.exports = withNativeWind(config, { input: './global.css' });