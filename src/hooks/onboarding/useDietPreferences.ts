import { useState, useEffect, useRef, useCallback } from "react";
import {
  DietPreferencesData,
  TabValidationResult,
} from "../../types/onboarding";

interface UseDietPreferencesProps {
  data: DietPreferencesData | null;
  validationResult?: TabValidationResult;
  onUpdate: (data: Partial<DietPreferencesData>) => void;
}

export const useDietPreferences = ({
  data,
  validationResult,
  onUpdate,
}: UseDietPreferencesProps) => {
  // Tooltip modal state
  const [tooltipModal, setTooltipModal] = useState<{
    visible: boolean;
    title: string;
    description: string;
    benefits?: string[];
  }>({
    visible: false,
    title: "",
    description: "",
    benefits: [],
  });

  const showInfoTooltip = (
    title: string,
    description: string,
    benefits?: string[],
  ) => {
    setTooltipModal({
      visible: true,
      title,
      description,
      benefits,
    });
  };

  const hideInfoTooltip = () => {
    setTooltipModal((prev) => ({ ...prev, visible: false }));
  };

  // Form state
  const [formData, setFormData] = useState<DietPreferencesData>({
    // Existing diet data
    diet_type: data?.diet_type ?? "balanced",
    allergies: data?.allergies || [],
    restrictions: data?.restrictions || [],

    // Diet readiness toggles
    keto_ready: data?.keto_ready ?? false,
    intermittent_fasting_ready: data?.intermittent_fasting_ready ?? false,
    paleo_ready: data?.paleo_ready ?? false,
    mediterranean_ready: data?.mediterranean_ready ?? false,
    low_carb_ready: data?.low_carb_ready ?? false,
    high_protein_ready: data?.high_protein_ready ?? false,

    // Meal preferences
    breakfast_enabled: data?.breakfast_enabled ?? true,
    lunch_enabled: data?.lunch_enabled ?? true,
    dinner_enabled: data?.dinner_enabled ?? true,
    snacks_enabled: data?.snacks_enabled ?? true,

    // Cooking preferences
    cooking_skill_level: data?.cooking_skill_level || "beginner",
    max_prep_time_minutes: data?.max_prep_time_minutes ?? 30,
    budget_level: data?.budget_level || "medium",
    cooking_methods: data?.cooking_methods || [],
    drinks_enough_water: data?.drinks_enough_water ?? false,
    limits_sugary_drinks: data?.limits_sugary_drinks ?? false,
    eats_regular_meals: data?.eats_regular_meals ?? false,
    avoids_late_night_eating: data?.avoids_late_night_eating ?? false,
    controls_portion_sizes: data?.controls_portion_sizes ?? false,
    reads_nutrition_labels: data?.reads_nutrition_labels ?? false,
    eats_processed_foods: data?.eats_processed_foods ?? true,
    eats_5_servings_fruits_veggies:
      data?.eats_5_servings_fruits_veggies ?? false,
    limits_refined_sugar: data?.limits_refined_sugar ?? false,
    includes_healthy_fats: data?.includes_healthy_fats ?? false,
    drinks_alcohol: data?.drinks_alcohol ?? false,
    smokes_tobacco: data?.smokes_tobacco ?? false,
    drinks_coffee: data?.drinks_coffee ?? false,
    takes_supplements: data?.takes_supplements ?? false,
  });

  // Sync formData with data prop when it changes
  const isSyncingFromProps = useRef(false);

  useEffect(() => {
    if (data && !isSyncingFromProps.current) {
      const newFormData = {
        diet_type: data.diet_type ?? "balanced",
        allergies: data.allergies || [],
        restrictions: data.restrictions || [],
        keto_ready: data.keto_ready ?? false,
        intermittent_fasting_ready: data.intermittent_fasting_ready ?? false,
        paleo_ready: data.paleo_ready ?? false,
        mediterranean_ready: data.mediterranean_ready ?? false,
        low_carb_ready: data.low_carb_ready ?? false,
        high_protein_ready: data.high_protein_ready ?? false,
        breakfast_enabled: data.breakfast_enabled ?? true,
        lunch_enabled: data.lunch_enabled ?? true,
        dinner_enabled: data.dinner_enabled ?? true,
        snacks_enabled: data.snacks_enabled ?? true,
        cooking_skill_level: data.cooking_skill_level || "beginner",
        max_prep_time_minutes: data.max_prep_time_minutes ?? 30,
        budget_level: data.budget_level || "medium",
        cooking_methods: data.cooking_methods || [],
        drinks_enough_water: data.drinks_enough_water ?? false,
        limits_sugary_drinks: data.limits_sugary_drinks ?? false,
        eats_regular_meals: data.eats_regular_meals ?? false,
        avoids_late_night_eating: data.avoids_late_night_eating ?? false,
        controls_portion_sizes: data.controls_portion_sizes ?? false,
        reads_nutrition_labels: data.reads_nutrition_labels ?? false,
        eats_processed_foods: data.eats_processed_foods ?? true,
        eats_5_servings_fruits_veggies:
          data.eats_5_servings_fruits_veggies ?? false,
        limits_refined_sugar: data.limits_refined_sugar ?? false,
        includes_healthy_fats: data.includes_healthy_fats ?? false,
        drinks_alcohol: data.drinks_alcohol ?? false,
        smokes_tobacco: data.smokes_tobacco ?? false,
        drinks_coffee: data.drinks_coffee ?? false,
        takes_supplements: data.takes_supplements ?? false,
      };

      isSyncingFromProps.current = true;
      setFormData(newFormData);

      const frameId = requestAnimationFrame(() => {
        isSyncingFromProps.current = false;
      });

      return () => {
        cancelAnimationFrame(frameId);
      };
    }
  }, [data]);

  // Validation update
  const stableOnUpdate = useCallback(() => {
    if (validationResult !== undefined) {
      onUpdate(formData);
    }
  }, [formData, onUpdate, validationResult]);

  useEffect(() => {
    if (validationResult !== undefined) {
      const timer = setTimeout(() => {
        stableOnUpdate();
      }, 500);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [formData, validationResult, stableOnUpdate]);

  // Handlers
  const updateField = <K extends keyof DietPreferencesData>(
    field: K,
    value: DietPreferencesData[K],
  ) => {
    setFormData((prev: DietPreferencesData) => {
      const newData = { ...prev, [field]: value };
      return newData;
    });
  };

  const toggleHealthHabit = (habitKey: keyof DietPreferencesData) => {
    setFormData((prev: DietPreferencesData) => {
      const newValue = !prev[habitKey];
      return {
        ...prev,
        [habitKey]: newValue,
      };
    });
  };

  const toggleDietReadiness = (dietKey: keyof DietPreferencesData) => {
    setFormData((prev: DietPreferencesData) => {
      const newValue = !prev[dietKey];
      return {
        ...prev,
        [dietKey]: newValue,
      };
    });
  };

  const toggleMealPreference = (mealKey: keyof DietPreferencesData) => {
    const newValue = !formData[mealKey];

    const otherMeals = [
      "breakfast_enabled",
      "lunch_enabled",
      "dinner_enabled",
      "snacks_enabled",
    ]
      .filter((key) => key !== mealKey)
      .some((key) => formData[key as keyof DietPreferencesData]);

    if (!newValue && !otherMeals) {
      return;
    }

    setFormData((prev: DietPreferencesData) => ({
      ...prev,
      [mealKey]: newValue,
    }));
  };

  const getEnabledMealsCount = (): number => {
    return [
      formData.breakfast_enabled,
      formData.lunch_enabled,
      formData.dinner_enabled,
      formData.snacks_enabled,
    ].filter(Boolean).length;
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return validationResult?.errors.find((error: string) =>
      error.toLowerCase().includes(fieldName.toLowerCase()),
    );
  };

  const hasFieldError = (fieldName: string): boolean => {
    return !!getFieldError(fieldName);
  };

  return {
    formData,
    tooltipModal,
    showInfoTooltip,
    hideInfoTooltip,
    updateField,
    toggleHealthHabit,
    toggleDietReadiness,
    toggleMealPreference,
    getEnabledMealsCount,
    getFieldError,
    hasFieldError,
  };
};
