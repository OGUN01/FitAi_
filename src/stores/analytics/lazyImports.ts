let _hydrationStoreModule: any = null;
let _healthDataStoreModule: any = null;

export const getHydrationGoal = (): number | null => {
  if (!_hydrationStoreModule) {
    _hydrationStoreModule = require("../hydrationStore");
  }
  return _hydrationStoreModule.useHydrationStore.getState().dailyGoalML;
};

export const getHealthMetrics = () => {
  if (!_healthDataStoreModule) {
    _healthDataStoreModule = require("../healthDataStore");
  }
  return _healthDataStoreModule.useHealthDataStore.getState().metrics;
};
