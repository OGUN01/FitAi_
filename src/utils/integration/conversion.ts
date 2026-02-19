import { api } from "../../services/api";
import { useDashboardIntegration } from "./dashboard";
import { WeightUnit, HeightUnit } from "./types";

export const useUnitConversion = () => {
  const { getUserPreferences } = useDashboardIntegration();
  const preferences = getUserPreferences();

  return {
    convertWeight: api.utils.convertWeight,
    convertHeight: api.utils.convertHeight,
    userUnits: preferences?.units,
    formatWeight: (weight: number, fromUnit: WeightUnit = "kg") => {
      const converted = api.utils.convertWeight(
        weight,
        fromUnit,
        (preferences?.units ?? "metric") === "metric" ? "kg" : "lbs",
      );
      const unit = (preferences?.units ?? "metric") === "metric" ? "kg" : "lbs";
      return `${Math.round(converted * 10) / 10} ${unit}`;
    },
    formatHeight: (height: number, fromUnit: HeightUnit = "cm") => {
      const converted = api.utils.convertHeight(
        height,
        fromUnit,
        (preferences?.units ?? "metric") === "metric" ? "cm" : "ft",
      );
      const unit = (preferences?.units ?? "metric") === "metric" ? "cm" : "ft";
      return `${Math.round(converted * 10) / 10} ${unit}`;
    },
  };
};
