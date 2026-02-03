// Data Source Registry - Priority ranking for accuracy
// Tier 1: Medical grade devices (highest accuracy)
// Tier 2: Premium smartwatches (very high accuracy)
// Tier 3: Consumer smartwatches (high accuracy)
// Tier 4: Fitness bands (moderate accuracy)
// Tier 5: Phone sensors (lowest accuracy)

import { DataSource } from "./types";

export const DATA_SOURCES: Record<string, DataSource> = {
  // Tier 1: Medical Grade
  "com.withings.wiscale2": {
    name: "Withings",
    tier: 1,
    accuracy: 99,
    icon: "medical",
    deviceType: "scale",
  },
  "com.omronhealthcare.omronconnect": {
    name: "Omron",
    tier: 1,
    accuracy: 99,
    icon: "medical",
    deviceType: "medical",
  },

  // Tier 2: Premium Smartwatches
  "com.garmin.android.apps.connectmobile": {
    name: "Garmin",
    tier: 2,
    accuracy: 97,
    icon: "watch",
    deviceType: "watch",
  },
  "com.polar.beat": {
    name: "Polar",
    tier: 2,
    accuracy: 97,
    icon: "watch",
    deviceType: "watch",
  },
  "com.ouraring.oura": {
    name: "Oura Ring",
    tier: 2,
    accuracy: 96,
    icon: "fitness",
    deviceType: "band",
  },
  "com.whoop.android": {
    name: "Whoop",
    tier: 2,
    accuracy: 96,
    icon: "fitness",
    deviceType: "band",
  },

  // Tier 3: Consumer Smartwatches
  "com.samsung.android.health": {
    name: "Samsung Health",
    tier: 3,
    accuracy: 94,
    icon: "watch",
    deviceType: "watch",
  },
  "com.google.android.apps.healthdata": {
    name: "Pixel Watch",
    tier: 3,
    accuracy: 94,
    icon: "watch",
    deviceType: "watch",
  },
  "com.fitbit.FitbitMobile": {
    name: "Fitbit",
    tier: 3,
    accuracy: 93,
    icon: "watch",
    deviceType: "watch",
  },
  "com.huawei.health": {
    name: "Huawei Health",
    tier: 3,
    accuracy: 92,
    icon: "watch",
    deviceType: "watch",
  },
  "com.amazfit.app": {
    name: "Amazfit",
    tier: 3,
    accuracy: 91,
    icon: "watch",
    deviceType: "watch",
  },

  // Tier 4: Fitness Bands
  "com.xiaomi.hm.health": {
    name: "Mi Fitness",
    tier: 4,
    accuracy: 88,
    icon: "fitness",
    deviceType: "band",
  },
  "com.huami.midong": {
    name: "Zepp",
    tier: 4,
    accuracy: 87,
    icon: "fitness",
    deviceType: "band",
  },
  "com.hihonor.health": {
    name: "Honor Health",
    tier: 4,
    accuracy: 86,
    icon: "fitness",
    deviceType: "band",
  },

  // Tier 5: Phone Sensors (lowest priority)
  "com.google.android.apps.fitness": {
    name: "Google Fit (Phone)",
    tier: 5,
    accuracy: 75,
    icon: "phone-portrait",
    deviceType: "phone",
  },
  "com.sec.android.app.shealth": {
    name: "Samsung Health (Phone)",
    tier: 5,
    accuracy: 74,
    icon: "phone-portrait",
    deviceType: "phone",
  },
};

// Get source info by package name, with fallback for unknown sources
export const getDataSource = (packageName: string): DataSource => {
  if (DATA_SOURCES[packageName]) {
    return DATA_SOURCES[packageName];
  }
  // Unknown source - assume it's a phone app (lowest tier)
  return {
    name: packageName.split(".").pop() || "Unknown",
    tier: 5,
    accuracy: 70,
    icon: "help-circle",
    deviceType: "unknown",
  };
};

// Get the best (highest priority) source from a list
export const getBestDataSource = (
  packageNames: string[],
): DataSource | null => {
  if (!packageNames || packageNames.length === 0) return null;

  const sources = packageNames.map((pkg) => ({
    pkg,
    source: getDataSource(pkg),
  }));
  sources.sort(
    (a, b) =>
      a.source.tier - b.source.tier || b.source.accuracy - a.source.accuracy,
  );

  return sources[0]?.source || null;
};
