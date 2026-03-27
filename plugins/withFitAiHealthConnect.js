const { withMainActivity } = require('@expo/config-plugins');

const withBaseHealthConnect = require('react-native-health-connect/app.plugin');

const HEALTH_CONNECT_IMPORT =
  'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';
const HEALTH_CONNECT_SETUP_CALL =
  'HealthConnectPermissionDelegate.setPermissionDelegate(this)';

function withPermissionDelegate(config) {
  return withMainActivity(config, (modConfig) => {
    let src = modConfig.modResults.contents;

    if (!src.includes(HEALTH_CONNECT_IMPORT)) {
      src = src.replace(
        /^package .*$/m,
        (packageLine) => `${packageLine}\n\n${HEALTH_CONNECT_IMPORT}`
      );
    }

    if (!src.includes(HEALTH_CONNECT_SETUP_CALL)) {
      const updatedSrc = src.replace(
        /super\.onCreate\(([^)]*)\)/,
        (match) =>
          `${match}\n    // Register the launcher required by Health Connect permission requests.\n    ${HEALTH_CONNECT_SETUP_CALL}`
      );

      if (updatedSrc === src) {
        throw new Error(
          'Unable to inject Health Connect permission delegate into MainActivity.'
        );
      }

      src = updatedSrc;
    }

    modConfig.modResults.contents = src;
    return modConfig;
  });
}

module.exports = function withFitAiHealthConnect(config) {
  return withPermissionDelegate(withBaseHealthConnect(config));
};
