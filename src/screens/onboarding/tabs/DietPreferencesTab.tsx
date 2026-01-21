import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import { rf, rp, rh, rw } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import { Button, Card, Slider } from "../../../components/ui";
import {
  GlassCard,
  AnimatedPressable,
  AnimatedSection,
  HeroSection,
  ProgressRing,
} from "../../../components/ui/aurora";
import { gradients, toLinearGradientProps } from "../../../theme/gradients";
import { MultiSelect } from "../../../components/advanced/MultiSelect";
import { MultiSelectWithCustom } from "../../../components/advanced/MultiSelectWithCustom";
import {
  DietPreferencesData,
  TabValidationResult,
  HealthHabits,
} from "../../../types/onboarding";

// ============================================================================
// TYPES
// ============================================================================

interface DietPreferencesTabProps {
  data: DietPreferencesData | null;
  validationResult?: TabValidationResult;
  onNext: (currentData?: DietPreferencesData) => void;
  onBack: () => void;
  onUpdate: (data: Partial<DietPreferencesData>) => void;
  onNavigateToTab?: (tabNumber: number) => void;
  isLoading?: boolean;
  isAutoSaving?: boolean;
  // Props for editing from Review tab
  isEditingFromReview?: boolean;
  onReturnToReview?: () => void;
}

// ============================================================================
// DATA CONSTANTS
// ============================================================================

const DIET_TYPE_OPTIONS = [
  {
    id: "non-veg",
    title: "Non-Vegetarian",
    iconName: "nutrition-outline",
    description: "Includes all types of meat and fish",
  },
  {
    id: "vegetarian",
    title: "Vegetarian",
    iconName: "leaf-outline",
    description: "No meat or fish, includes dairy and eggs",
  },
  {
    id: "vegan",
    title: "Vegan",
    iconName: "flower-outline",
    description: "No animal products whatsoever",
  },
  {
    id: "pescatarian",
    title: "Pescatarian",
    iconName: "fish-outline",
    description: "Vegetarian diet that includes fish",
  },
];

const DIET_READINESS_OPTIONS = [
  {
    key: "keto_ready",
    title: "Ketogenic Diet",
    iconName: "leaf-outline",
    description:
      "High fat, very low carb diet (5% carbs, 70% fat, 25% protein)",
    benefits: ["Rapid weight loss", "Mental clarity", "Reduced appetite"],
  },
  {
    key: "intermittent_fasting_ready",
    title: "Intermittent Fasting",
    iconName: "time-outline",
    description: "Time-restricted eating patterns (16:8, 18:6, etc.)",
    benefits: ["Improved metabolism", "Weight management", "Cellular repair"],
  },
  {
    key: "paleo_ready",
    title: "Paleo Diet",
    iconName: "flame-outline",
    description: "Whole foods based on paleolithic era eating",
    benefits: ["Natural nutrition", "Reduced inflammation", "Better digestion"],
  },
  {
    key: "mediterranean_ready",
    title: "Mediterranean Diet",
    iconName: "heart-outline",
    description: "Rich in olive oil, fish, vegetables, and whole grains",
    benefits: ["Heart health", "Brain function", "Longevity"],
  },
  {
    key: "low_carb_ready",
    title: "Low Carb Diet",
    iconName: "restaurant-outline",
    description: "Reduced carbohydrate intake (under 100g daily)",
    benefits: ["Blood sugar control", "Weight loss", "Energy stability"],
  },
  {
    key: "high_protein_ready",
    title: "High Protein Diet",
    iconName: "barbell-outline",
    description: "Increased protein intake for muscle building",
    benefits: ["Muscle growth", "Satiety", "Recovery"],
  },
];

const COOKING_SKILL_LEVELS = [
  {
    level: "beginner",
    title: "Beginner",
    iconName: "restaurant-outline",
    description: "Simple recipes, basic cooking skills",
    timeRange: "15-30 minutes",
  },
  {
    level: "intermediate",
    title: "Intermediate",
    iconName: "pizza-outline",
    description: "Comfortable with various techniques",
    timeRange: "30-60 minutes",
  },
  {
    level: "advanced",
    title: "Advanced",
    iconName: "flame-outline",
    description: "Complex recipes, professional techniques",
    timeRange: "60+ minutes",
  },
  {
    level: "not_applicable",
    title: "Not Applicable",
    iconName: "home-outline",
    description: "Made/home food prepared by others",
    timeRange: "N/A",
  },
];

const BUDGET_LEVELS = [
  {
    level: "low",
    title: "Budget-Friendly",
    iconName: "cash-outline",
    description: "Cost-effective ingredients and meals",
    range: "$50-100/week",
  },
  {
    level: "medium",
    title: "Moderate",
    iconName: "wallet-outline",
    description: "Balance of quality and affordability",
    range: "$100-200/week",
  },
  {
    level: "high",
    title: "Premium",
    iconName: "diamond-outline",
    description: "High-quality, organic ingredients",
    range: "$200+/week",
  },
];

const HEALTH_HABITS = {
  hydration: [
    {
      key: "drinks_enough_water",
      title: "Drinks 3-4L Water Daily",
      iconName: "water-outline",
      description: "Maintains proper hydration levels",
    },
    {
      key: "limits_sugary_drinks",
      title: "Limits Sugary Drinks",
      iconName: "warning-outline",
      description: "Avoids sodas, juices with added sugar",
    },
  ],
  eating_patterns: [
    {
      key: "eats_regular_meals",
      title: "Eats Regular Meals",
      iconName: "fast-food-outline",
      description: "Consistent meal timing throughout day",
    },
    {
      key: "avoids_late_night_eating",
      title: "Avoids Late Night Eating",
      iconName: "moon-outline",
      description: "No eating 3 hours before bedtime",
    },
    {
      key: "controls_portion_sizes",
      title: "Controls Portion Sizes",
      iconName: "scale-outline",
      description: "Mindful of serving sizes",
    },
    {
      key: "reads_nutrition_labels",
      title: "Reads Nutrition Labels",
      iconName: "document-text-outline",
      description: "Checks food labels before purchasing",
    },
  ],
  food_choices: [
    {
      key: "eats_processed_foods",
      title: "Eats Processed Foods",
      iconName: "cube-outline",
      description: "Regularly consumes packaged/processed foods",
    },
    {
      key: "eats_5_servings_fruits_veggies",
      title: "Eats 5+ Servings Fruits/Vegetables",
      iconName: "nutrition-outline",
      description: "Daily fruit and vegetable intake",
    },
    {
      key: "limits_refined_sugar",
      title: "Limits Refined Sugar",
      iconName: "close-circle-outline",
      description: "Reduces added sugars in diet",
    },
    {
      key: "includes_healthy_fats",
      title: "Includes Healthy Fats",
      iconName: "leaf-outline",
      description: "Nuts, avocado, olive oil, etc.",
    },
  ],
  substances: [
    {
      key: "drinks_alcohol",
      title: "Drinks Alcohol",
      iconName: "wine-outline",
      description: "Regular alcohol consumption",
    },
    {
      key: "smokes_tobacco",
      title: "Smokes Tobacco",
      iconName: "ban-outline",
      description: "Tobacco use (any form)",
    },
    {
      key: "drinks_coffee",
      title: "Drinks Coffee",
      iconName: "cafe-outline",
      description: "Daily caffeine intake",
    },
    {
      key: "takes_supplements",
      title: "Takes Supplements",
      iconName: "medkit-outline",
      description: "Vitamins, protein powder, etc.",
    },
  ],
};

const ALLERGY_OPTIONS = [
  { id: "nuts", label: "Nuts", value: "nuts", iconName: "warning-outline" },
  { id: "dairy", label: "Dairy", value: "dairy", iconName: "warning-outline" },
  { id: "eggs", label: "Eggs", value: "eggs", iconName: "warning-outline" },
  {
    id: "gluten",
    label: "Gluten",
    value: "gluten",
    iconName: "warning-outline",
  },
  { id: "soy", label: "Soy", value: "soy", iconName: "warning-outline" },
  {
    id: "shellfish",
    label: "Shellfish",
    value: "shellfish",
    iconName: "warning-outline",
  },
  { id: "fish", label: "Fish", value: "fish", iconName: "warning-outline" },
  {
    id: "sesame",
    label: "Sesame",
    value: "sesame",
    iconName: "warning-outline",
  },
];

const RESTRICTION_OPTIONS = [
  {
    id: "low-sodium",
    label: "Low Sodium",
    value: "low-sodium",
    iconName: "remove-circle-outline",
  },
  {
    id: "low-sugar",
    label: "Low Sugar",
    value: "low-sugar",
    iconName: "close-circle-outline",
  },
  {
    id: "low-carb",
    label: "Low Carb",
    value: "low-carb",
    iconName: "restaurant-outline",
  },
  {
    id: "high-protein",
    label: "High Protein",
    value: "high-protein",
    iconName: "barbell-outline",
  },
  {
    id: "diabetic-friendly",
    label: "Diabetic Friendly",
    value: "diabetic-friendly",
    iconName: "pulse-outline",
  },
  {
    id: "heart-healthy",
    label: "Heart Healthy",
    value: "heart-healthy",
    iconName: "heart-outline",
  },
];

// ============================================================================
// ANIMATED GLOW CARD COMPONENT
// ============================================================================

interface AnimatedGlowCardProps {
  isSelected: boolean;
  children: React.ReactNode;
}

const AnimatedGlowCard: React.FC<AnimatedGlowCardProps> = ({
  isSelected,
  children,
}) => {
  const glowAnimation = useSharedValue(0);

  useEffect(() => {
    glowAnimation.value = withTiming(isSelected ? 1 : 0, {
      duration: 300,
    });
  }, [isSelected]);

  // Note: Shadow animations removed from useAnimatedStyle to fix React Native warning
  // Glow effect is now applied via static styles based on isSelected state
  const animatedGlowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(glowAnimation.value, [0, 1], [0.9, 1]);
    return {
      opacity,
    };
  });

  // Static glow styles based on selection state
  const glowStyle = isSelected
    ? {
        shadowColor: ResponsiveTheme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 6,
      }
    : {};

  return (
    <Animated.View style={[glowStyle, animatedGlowStyle]}>
      {children}
    </Animated.View>
  );
};

// ============================================================================
// ANIMATED TOGGLE COMPONENT
// ============================================================================

interface AnimatedToggleProps {
  isActive: boolean;
  disabled?: boolean;
}

const AnimatedToggle: React.FC<AnimatedToggleProps> = ({
  isActive,
  disabled = false,
}) => {
  const toggleAnimation = useSharedValue(0);

  useEffect(() => {
    toggleAnimation.value = withTiming(isActive ? 1 : 0, {
      duration: 250,
    });
  }, [isActive]);

  const animatedSwitchStyle = useAnimatedStyle(() => {
    // Interpolate background color from gray to primary
    const backgroundColor = interpolate(toggleAnimation.value, [0, 1], [0, 1]);

    return {
      backgroundColor:
        backgroundColor === 1
          ? ResponsiveTheme.colors.primary
          : ResponsiveTheme.colors.backgroundTertiary,
      borderColor:
        backgroundColor === 1
          ? ResponsiveTheme.colors.primary
          : ResponsiveTheme.colors.border,
    };
  });

  const animatedThumbStyle = useAnimatedStyle(() => {
    // Slide the thumb from left to right
    const translateX = interpolate(
      toggleAnimation.value,
      [0, 1],
      [0, 20], // Full width (44) minus thumb width (20) minus padding (4)
    );

    return {
      transform: [{ translateX }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.toggleSwitch,
        animatedSwitchStyle,
        disabled && styles.toggleSwitchDisabled,
      ]}
    >
      <Animated.View style={[styles.toggleThumb, animatedThumbStyle]} />
    </Animated.View>
  );
};

// ============================================================================
// INFO TOOLTIP MODAL COMPONENT
// ============================================================================

interface InfoTooltipModalProps {
  visible: boolean;
  title: string;
  description: string;
  benefits?: string[];
  onClose: () => void;
}

const InfoTooltipModal: React.FC<InfoTooltipModalProps> = ({
  visible,
  title,
  description,
  benefits,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons
                name="close-circle"
                size={rf(24)}
                color={ResponsiveTheme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalDescription}>{description}</Text>
          {benefits && benefits.length > 0 && (
            <View style={styles.modalBenefits}>
              <Text style={styles.modalBenefitsTitle}>Benefits:</Text>
              {benefits.map((benefit, index) => (
                <View key={index} style={styles.modalBenefitItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={rf(16)}
                    color={ResponsiveTheme.colors.success}
                  />
                  <Text style={styles.modalBenefitText}>{benefit}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Pressable>
    </Modal>
  );
};

// ============================================================================
// INFO ICON BUTTON COMPONENT
// ============================================================================

interface InfoIconButtonProps {
  onPress: () => void;
  size?: number;
}

const InfoIconButton: React.FC<InfoIconButtonProps> = ({
  onPress,
  size = rf(16),
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.infoIconButton}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons
        name="information-circle"
        size={size}
        color={ResponsiveTheme.colors.primary}
      />
    </TouchableOpacity>
  );
};

// ============================================================================
// COMPACT TOGGLE PILL COMPONENT - For Health Habits
// ============================================================================

interface CompactTogglePillProps {
  isActive: boolean;
  iconName: string;
  title: string;
  description: string;
  onToggle: () => void;
  onInfoPress: () => void;
}

const CompactTogglePill: React.FC<CompactTogglePillProps> = ({
  isActive,
  iconName,
  title,
  description,
  onToggle,
  onInfoPress,
}) => {
  const toggleAnimation = useSharedValue(0);

  useEffect(() => {
    toggleAnimation.value = withTiming(isActive ? 1 : 0, { duration: 200 });
  }, [isActive]);

  const animatedSwitchStyle = useAnimatedStyle(() => {
    return {
      backgroundColor:
        toggleAnimation.value === 1
          ? ResponsiveTheme.colors.primary
          : ResponsiveTheme.colors.backgroundTertiary,
    };
  });

  const animatedThumbStyle = useAnimatedStyle(() => {
    const translateX = interpolate(toggleAnimation.value, [0, 1], [0, 16]);
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <AnimatedPressable
      onPress={onToggle}
      style={styles.compactPillContainer}
      scaleValue={0.98}
    >
      <View style={[styles.compactPill, isActive && styles.compactPillActive]}>
        {/* Single row layout: Icon + Title + Info + Toggle */}
        <View style={styles.compactPillRow}>
          {/* Icon */}
          <View style={styles.compactPillIconWrap}>
            <Ionicons
              name={iconName as any}
              size={rf(16)}
              color={
                isActive
                  ? ResponsiveTheme.colors.primary
                  : ResponsiveTheme.colors.textSecondary
              }
            />
          </View>

          {/* Title - takes remaining space */}
          <Text
            style={[
              styles.compactPillTitle,
              isActive && styles.compactPillTitleActive,
            ]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {title}
          </Text>

          {/* Info button */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              onInfoPress();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.compactPillInfoBtn}
          >
            <Ionicons
              name="information-circle-outline"
              size={rf(16)}
              color={ResponsiveTheme.colors.textMuted}
            />
          </TouchableOpacity>

          {/* Toggle */}
          <Animated.View
            style={[styles.compactToggleSwitch, animatedSwitchStyle]}
          >
            <Animated.View
              style={[styles.compactToggleThumb, animatedThumbStyle]}
            />
          </Animated.View>
        </View>
      </View>
    </AnimatedPressable>
  );
};

// ============================================================================
// COMPONENT
// ============================================================================

const DietPreferencesTab: React.FC<DietPreferencesTabProps> = ({
  data,
  validationResult,
  onNext,
  onBack,
  onUpdate,
  onNavigateToTab,
  isLoading = false,
  isAutoSaving = false,
  isEditingFromReview = false,
  onReturnToReview,
}) => {
  // No longer creating separate state instances - using props from parent

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

  // Form state - initialize with data or defaults
  const [formData, setFormData] = useState<DietPreferencesData>({
    // Existing diet data
    diet_type: data?.diet_type || "non-veg",
    allergies: data?.allergies || [],
    restrictions: data?.restrictions || [],

    // NEW: Diet readiness toggles
    keto_ready: data?.keto_ready || false,
    intermittent_fasting_ready: data?.intermittent_fasting_ready || false,
    paleo_ready: data?.paleo_ready || false,
    mediterranean_ready: data?.mediterranean_ready || false,
    low_carb_ready: data?.low_carb_ready || false,
    high_protein_ready: data?.high_protein_ready || false,

    // NEW: Meal preferences
    breakfast_enabled: data?.breakfast_enabled ?? true,
    lunch_enabled: data?.lunch_enabled ?? true,
    dinner_enabled: data?.dinner_enabled ?? true,
    snacks_enabled: data?.snacks_enabled ?? true,

    // NEW: Cooking preferences
    cooking_skill_level: data?.cooking_skill_level || "beginner",
    max_prep_time_minutes: data?.max_prep_time_minutes ?? 30,
    budget_level: data?.budget_level || "medium",

    // NEW: Health habits (14 boolean fields)
    drinks_enough_water: data?.drinks_enough_water || false,
    limits_sugary_drinks: data?.limits_sugary_drinks || false,
    eats_regular_meals: data?.eats_regular_meals || false,
    avoids_late_night_eating: data?.avoids_late_night_eating || false,
    controls_portion_sizes: data?.controls_portion_sizes || false,
    reads_nutrition_labels: data?.reads_nutrition_labels || false,
    eats_processed_foods: data?.eats_processed_foods ?? true,
    eats_5_servings_fruits_veggies:
      data?.eats_5_servings_fruits_veggies || false,
    limits_refined_sugar: data?.limits_refined_sugar || false,
    includes_healthy_fats: data?.includes_healthy_fats || false,
    drinks_alcohol: data?.drinks_alcohol || false,
    smokes_tobacco: data?.smokes_tobacco || false,
    drinks_coffee: data?.drinks_coffee || false,
    takes_supplements: data?.takes_supplements || false,
  });

  // Sync formData with data prop when it changes (e.g., when navigating back to this tab)
  // Use a ref to track if we're syncing from props to avoid circular updates
  const isSyncingFromProps = useRef(false);

  useEffect(() => {
    if (data && !isSyncingFromProps.current) {
      const newFormData = {
        diet_type: data.diet_type || "non-veg",
        allergies: data.allergies || [],
        restrictions: data.restrictions || [],
        keto_ready: data.keto_ready || false,
        intermittent_fasting_ready: data.intermittent_fasting_ready || false,
        paleo_ready: data.paleo_ready || false,
        mediterranean_ready: data.mediterranean_ready || false,
        low_carb_ready: data.low_carb_ready || false,
        high_protein_ready: data.high_protein_ready || false,
        breakfast_enabled: data.breakfast_enabled ?? true,
        lunch_enabled: data.lunch_enabled ?? true,
        dinner_enabled: data.dinner_enabled ?? true,
        snacks_enabled: data.snacks_enabled ?? true,
        cooking_skill_level: data.cooking_skill_level || "beginner",
        max_prep_time_minutes: data.max_prep_time_minutes ?? 30,
        budget_level: data.budget_level || "medium",
        drinks_enough_water: data.drinks_enough_water || false,
        limits_sugary_drinks: data.limits_sugary_drinks || false,
        eats_regular_meals: data.eats_regular_meals || false,
        avoids_late_night_eating: data.avoids_late_night_eating || false,
        controls_portion_sizes: data.controls_portion_sizes || false,
        reads_nutrition_labels: data.reads_nutrition_labels || false,
        eats_processed_foods: data.eats_processed_foods ?? true,
        eats_5_servings_fruits_veggies:
          data.eats_5_servings_fruits_veggies || false,
        limits_refined_sugar: data.limits_refined_sugar || false,
        includes_healthy_fats: data.includes_healthy_fats || false,
        drinks_alcohol: data.drinks_alcohol || false,
        smokes_tobacco: data.smokes_tobacco || false,
        drinks_coffee: data.drinks_coffee || false,
        takes_supplements: data.takes_supplements || false,
      };

      isSyncingFromProps.current = true;
      setFormData(newFormData);
      // Reset flag after state update completes using requestAnimationFrame instead of setTimeout
      // This is more efficient and ensures it runs after the render cycle
      const frameId = requestAnimationFrame(() => {
        isSyncingFromProps.current = false;
      });

      // Cleanup function to cancel if component unmounts
      return () => {
        cancelAnimationFrame(frameId);
      };
    }
  }, [data]); // ONLY depend on data prop, NOT formData!

  // Note: We no longer auto-update parent on every formData change to avoid infinite loops
  // Updates happen via onUpdate in the Next button handler

  // Validate when formData changes to enable/disable Next button
  // Memoize onUpdate callback to prevent unnecessary re-renders
  const stableOnUpdate = React.useCallback(() => {
    if (validationResult !== undefined) {
      onUpdate(formData);
    }
  }, [formData, onUpdate, validationResult]);

  useEffect(() => {
    // Only trigger validation if validationResult exists (means we're tracking validation)
    if (validationResult !== undefined) {
      // Debounce validation to avoid excessive calls
      const timer = setTimeout(() => {
        stableOnUpdate();
      }, 500);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [formData, validationResult, stableOnUpdate]);

  // ============================================================================
  // FORM HANDLERS
  // ============================================================================

  const updateField = <K extends keyof DietPreferencesData>(
    field: K,
    value: DietPreferencesData[K],
  ) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      // Log only final value changes
      console.log(`Updated ${String(field)}:`, value);
      return newData;
    });
  };

  const toggleHealthHabit = (habitKey: keyof DietPreferencesData) => {
    setFormData((prev) => {
      const newValue = !prev[habitKey];
      return {
        ...prev,
        [habitKey]: newValue,
      };
    });
  };

  const toggleDietReadiness = (dietKey: keyof DietPreferencesData) => {
    setFormData((prev) => {
      const newValue = !prev[dietKey];
      return {
        ...prev,
        [dietKey]: newValue,
      };
    });
  };

  const toggleMealPreference = (mealKey: keyof DietPreferencesData) => {
    const newValue = !formData[mealKey];

    // Ensure at least one meal is enabled
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

    setFormData((prev) => ({
      ...prev,
      [mealKey]: newValue,
    }));
  };

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  const getFieldError = (fieldName: string): string | undefined => {
    return validationResult?.errors.find((error) =>
      error.toLowerCase().includes(fieldName.toLowerCase()),
    );
  };

  const hasFieldError = (fieldName: string): boolean => {
    return !!getFieldError(fieldName);
  };

  const getEnabledMealsCount = (): number => {
    return [
      formData.breakfast_enabled,
      formData.lunch_enabled,
      formData.dinner_enabled,
      formData.snacks_enabled,
    ].filter(Boolean).length;
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderCurrentDietSection = () => (
    <GlassCard
      style={styles.sectionEdgeToEdge}
      elevation={2}
      blurIntensity="default"
      padding="none"
      borderRadius="none"
    >
      {/* Title with padding */}
      <View style={styles.sectionTitlePadded}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          Current Diet Type
        </Text>
        <Text
          style={styles.sectionSubtitle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          What best describes your current eating habits?
        </Text>
      </View>

      {/* Scroll container - inset from card edges */}
      <View style={styles.scrollContainerInset}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentInset}
          decelerationRate="fast"
          snapToInterval={rw(105) + rw(10)}
          snapToAlignment="start"
        >
          {DIET_TYPE_OPTIONS.map((option) => {
            const isSelected = formData.diet_type === option.id;
            return (
              <AnimatedPressable
                key={option.id}
                onPress={() =>
                  updateField(
                    "diet_type",
                    option.id as DietPreferencesData["diet_type"],
                  )
                }
                style={styles.consistentCardItem}
                scaleValue={0.97}
              >
                <View
                  style={[
                    styles.consistentCard,
                    isSelected && styles.consistentCardSelected,
                  ]}
                >
                  {/* Icon + Info row */}
                  <View style={styles.consistentCardHeader}>
                    <Ionicons
                      name={option.iconName as any}
                      size={rf(22)}
                      color={
                        isSelected
                          ? ResponsiveTheme.colors.primary
                          : ResponsiveTheme.colors.textSecondary
                      }
                    />
                    <TouchableOpacity
                      onPress={() =>
                        showInfoTooltip(option.title, option.description)
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="information-circle-outline"
                        size={rf(14)}
                        color={ResponsiveTheme.colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                  {/* Title */}
                  <Text
                    style={[
                      styles.consistentCardTitle,
                      isSelected && styles.consistentCardTitleSelected,
                    ]}
                    numberOfLines={2}
                  >
                    {option.title}
                  </Text>
                  {/* Selection indicator */}
                  <View
                    style={[
                      styles.consistentCardIndicator,
                      isSelected && styles.consistentCardIndicatorSelected,
                    ]}
                  >
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={rf(12)}
                        color={ResponsiveTheme.colors.white}
                      />
                    )}
                  </View>
                </View>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>
      {/* Bottom padding inside card */}
      <View style={styles.sectionBottomPad} />
    </GlassCard>
  );

  const renderDietReadinessSection = () => (
    <GlassCard
      style={styles.sectionEdgeToEdge}
      elevation={2}
      blurIntensity="default"
      padding="none"
      borderRadius="none"
    >
      <View style={styles.sectionTitlePadded}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          Diet Readiness
        </Text>
        <Text
          style={styles.sectionSubtitle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          Are you ready to try any of these specialized diets? (Optional)
        </Text>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        {DIET_READINESS_OPTIONS.map((option) => {
          const isReady = formData[
            option.key as keyof DietPreferencesData
          ] as boolean;

          return (
            <CompactTogglePill
              key={option.key}
              isActive={isReady}
              iconName={option.iconName}
              title={option.title}
              description={option.description}
              onToggle={() =>
                toggleDietReadiness(option.key as keyof DietPreferencesData)
              }
              onInfoPress={() =>
                showInfoTooltip(
                  option.title,
                  option.description,
                  option.benefits,
                )
              }
            />
          );
        })}
      </View>
      <View style={styles.sectionBottomPad} />
    </GlassCard>
  );

  const renderMealPreferencesSection = () => {
    const enabledCount = getEnabledMealsCount();

    return (
      <GlassCard
        style={styles.sectionEdgeToEdge}
        elevation={2}
        blurIntensity="default"
        padding="none"
        borderRadius="none"
      >
        <View style={styles.sectionTitlePadded}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            Meal Preferences
          </Text>
          <Text
            style={styles.sectionSubtitle}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            Which meals would you like us to plan for you? ({enabledCount}/4
            enabled)
          </Text>
        </View>

        {enabledCount === 1 && (
          <View style={styles.edgeToEdgeContentPadded}>
            <GlassCard
              elevation={2}
              blurIntensity="light"
              padding="md"
              borderRadius="md"
              style={styles.warningCardInline}
            >
              <View style={styles.warningContent}>
                <Ionicons
                  name="alert-circle-outline"
                  size={rf(18)}
                  color={ResponsiveTheme.colors.warning}
                />
                <Text
                  style={styles.warningText}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  At least one meal type must remain enabled
                </Text>
              </View>
            </GlassCard>
          </View>
        )}

        <View style={styles.scrollContainerInset}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContentInset}
            decelerationRate="fast"
            snapToInterval={rw(105) + rw(10)}
            snapToAlignment="start"
            pagingEnabled={false}
          >
            {[
              {
                key: "breakfast_enabled",
                title: "Breakfast",
                iconName: "sunny-outline",
                description: "Start your day right",
              },
              {
                key: "lunch_enabled",
                title: "Lunch",
                iconName: "partly-sunny-outline",
                description: "Midday fuel",
              },
              {
                key: "dinner_enabled",
                title: "Dinner",
                iconName: "moon-outline",
                description: "Evening nourishment",
              },
              {
                key: "snacks_enabled",
                title: "Snacks",
                iconName: "fast-food-outline",
                description: "Healthy snacking",
              },
            ].map((meal) => {
              const isEnabled = formData[
                meal.key as keyof DietPreferencesData
              ] as boolean;
              const isLastEnabled = enabledCount === 1 && isEnabled;

              return (
                <AnimatedPressable
                  key={meal.key}
                  onPress={() =>
                    !isLastEnabled &&
                    toggleMealPreference(meal.key as keyof DietPreferencesData)
                  }
                  style={
                    isLastEnabled
                      ? [
                          styles.consistentCardItem,
                          styles.consistentCardItemDisabled,
                        ]
                      : styles.consistentCardItem
                  }
                  disabled={isLastEnabled}
                  scaleValue={0.97}
                >
                  <View
                    style={[
                      styles.consistentCard,
                      isEnabled && styles.consistentCardSelected,
                      isLastEnabled && styles.consistentCardDisabled,
                    ]}
                  >
                    {/* Icon + Toggle row */}
                    <View style={styles.consistentCardHeader}>
                      <Ionicons
                        name={meal.iconName as any}
                        size={rf(22)}
                        color={
                          isEnabled
                            ? ResponsiveTheme.colors.primary
                            : ResponsiveTheme.colors.textSecondary
                        }
                      />
                      <View
                        style={[
                          styles.miniToggle,
                          isEnabled && styles.miniToggleActive,
                        ]}
                      >
                        <View
                          style={[
                            styles.miniToggleThumb,
                            isEnabled && styles.miniToggleThumbActive,
                          ]}
                        />
                      </View>
                    </View>
                    {/* Title */}
                    <Text
                      style={[
                        styles.consistentCardTitle,
                        isEnabled && styles.consistentCardTitleSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {meal.title}
                    </Text>
                    {/* Description */}
                    <Text style={styles.consistentCardDesc} numberOfLines={2}>
                      {meal.description}
                    </Text>
                  </View>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </View>

        {!formData.breakfast_enabled && (
          <View style={styles.edgeToEdgeContentPadded}>
            <GlassCard
              elevation={2}
              blurIntensity="light"
              padding="md"
              borderRadius="md"
              style={styles.infoCardInline}
            >
              <View style={styles.infoContent}>
                <Ionicons
                  name="bulb-outline"
                  size={rf(18)}
                  color={ResponsiveTheme.colors.primary}
                />
                <Text
                  style={styles.infoText}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  Meal plans will only include lunch and dinner
                </Text>
              </View>
            </GlassCard>
          </View>
        )}
        <View style={styles.sectionBottomPad} />
      </GlassCard>
    );
  };

  const renderCookingPreferencesSection = () => (
    <GlassCard
      style={styles.sectionEdgeToEdge}
      elevation={2}
      blurIntensity="default"
      padding="none"
      borderRadius="none"
    >
      <View style={styles.sectionTitlePadded}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          Cooking Preferences
        </Text>
        <Text
          style={styles.sectionSubtitle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          Help us suggest recipes that match your cooking style
        </Text>
      </View>

      {/* Cooking Skill Level */}
      <View style={styles.edgeToEdgeContentPadded}>
        <Text style={styles.fieldLabel} numberOfLines={1}>
          Cooking Skill Level
        </Text>
      </View>
      <View style={styles.scrollContainerInset}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentInset}
          decelerationRate="fast"
          snapToInterval={rw(105) + rw(10)}
          snapToAlignment="start"
          pagingEnabled={false}
        >
          {COOKING_SKILL_LEVELS.map((skill) => {
            const isSelected = formData.cooking_skill_level === skill.level;
            return (
              <AnimatedPressable
                key={skill.level}
                onPress={() => {
                  updateField(
                    "cooking_skill_level",
                    skill.level as DietPreferencesData["cooking_skill_level"],
                  );
                  if (skill.level === "not_applicable") {
                    updateField("max_prep_time_minutes", null);
                  } else if (formData.max_prep_time_minutes === null) {
                    updateField("max_prep_time_minutes", 30);
                  }
                }}
                style={styles.consistentCardItem}
                scaleValue={0.97}
              >
                <View
                  style={[
                    styles.consistentCard,
                    isSelected && styles.consistentCardSelected,
                  ]}
                >
                  {/* Icon */}
                  <View style={styles.consistentCardIconCenter}>
                    <Ionicons
                      name={skill.iconName as any}
                      size={rf(22)}
                      color={
                        isSelected
                          ? ResponsiveTheme.colors.primary
                          : ResponsiveTheme.colors.textSecondary
                      }
                    />
                  </View>
                  {/* Title */}
                  <Text
                    style={[
                      styles.consistentCardTitle,
                      isSelected && styles.consistentCardTitleSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {skill.title}
                  </Text>
                  {/* Description */}
                  <Text
                    style={styles.consistentCardDesc}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {skill.description}
                  </Text>
                  {/* Selection indicator */}
                  <View
                    style={[
                      styles.consistentCardIndicator,
                      isSelected && styles.consistentCardIndicatorSelected,
                    ]}
                  >
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={rf(12)}
                        color={ResponsiveTheme.colors.white}
                      />
                    )}
                  </View>
                </View>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Max Prep Time */}
      <View style={styles.edgeToEdgeContentPadded}>
        <Text style={styles.fieldLabel}>
          {formData.cooking_skill_level === "not_applicable"
            ? "Maximum Cooking Time: Not Applicable"
            : `Maximum Cooking Time: ${formData.max_prep_time_minutes ?? 30} minutes`}
        </Text>
        {formData.cooking_skill_level === "not_applicable" ? (
          <GlassCard
            elevation={1}
            blurIntensity="light"
            padding="md"
            borderRadius="md"
            style={styles.disabledCardInline}
          >
            <View style={styles.disabledContent}>
              <Ionicons
                name="information-circle-outline"
                size={rf(16)}
                color={ResponsiveTheme.colors.textSecondary}
              />
              <Text
                style={styles.disabledText}
                numberOfLines={3}
                ellipsizeMode="tail"
              >
                This field is not applicable since your meals are prepared by
                others. We'll suggest meals based on your dietary preferences
                without cooking time constraints.
              </Text>
            </View>
          </GlassCard>
        ) : (
          <Slider
            value={formData.max_prep_time_minutes ?? 30}
            onValueChange={(value) =>
              updateField("max_prep_time_minutes", value)
            }
            minimumValue={15}
            maximumValue={120}
            step={15}
            showTooltip={true}
            formatValue={(val) => `${val} min`}
          />
        )}
      </View>

      {/* Budget Level */}
      <View style={styles.edgeToEdgeContentPadded}>
        <Slider
          value={
            formData.budget_level === "low"
              ? 1
              : formData.budget_level === "medium"
                ? 2
                : 3
          }
          onValueChange={(value) => {
            const budgetLevel =
              value === 1 ? "low" : value === 2 ? "medium" : "high";
            updateField(
              "budget_level",
              budgetLevel as DietPreferencesData["budget_level"],
            );
          }}
          minimumValue={1}
          maximumValue={3}
          step={1}
          label="Food Budget"
          showTooltip={true}
          formatValue={(val) => {
            if (val === 1) return "Budget ($50-100/wk)";
            if (val === 2) return "Moderate ($100-200/wk)";
            return "Premium ($200+/wk)";
          }}
        />
      </View>
      <View style={styles.sectionBottomPad} />
    </GlassCard>
  );

  const renderHealthHabitsSection = () => {
    // Helper to format category title
    const formatCategoryTitle = (category: string) => {
      return category
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    };

    return (
      <GlassCard
        style={styles.sectionEdgeToEdge}
        elevation={2}
        blurIntensity="default"
        padding="none"
        borderRadius="none"
      >
        <View style={styles.sectionTitlePadded}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            Health Habits
          </Text>
          <Text
            style={styles.sectionSubtitle}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            Tap to toggle your current habits
          </Text>
        </View>

        <View style={styles.edgeToEdgeContentPadded}>
          {Object.entries(HEALTH_HABITS).map(([category, habits]) => (
            <View key={category} style={styles.habitCategoryCompact}>
              <Text style={styles.habitCategoryTitleCompact}>
                {formatCategoryTitle(category)}
              </Text>

              {/* 2-Column Grid */}
              <View style={styles.habitPillGrid}>
                {habits.map((habit) => {
                  const isActive = formData[
                    habit.key as keyof DietPreferencesData
                  ] as boolean;

                  return (
                    <CompactTogglePill
                      key={habit.key}
                      isActive={isActive}
                      iconName={habit.iconName}
                      title={habit.title}
                      description={habit.description}
                      onToggle={() =>
                        toggleHealthHabit(
                          habit.key as keyof DietPreferencesData,
                        )
                      }
                      onInfoPress={() =>
                        showInfoTooltip(habit.title, habit.description)
                      }
                    />
                  );
                })}
              </View>
            </View>
          ))}
        </View>
        <View style={styles.sectionBottomPad} />
      </GlassCard>
    );
  };

  const renderAllergiesAndRestrictionsSection = () => (
    <GlassCard
      style={styles.sectionEdgeToEdge}
      elevation={2}
      blurIntensity="default"
      padding="none"
      borderRadius="none"
    >
      <View style={styles.sectionTitlePadded}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          Allergies & Dietary Restrictions
        </Text>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        {/* Allergies */}
        <View style={styles.allergyFieldInline}>
          <MultiSelectWithCustom
            options={ALLERGY_OPTIONS}
            selectedValues={formData.allergies}
            onSelectionChange={(values) => updateField("allergies", values)}
            label="Food Allergies"
            placeholder="Select any food allergies"
            searchable={true}
            allowCustom={true}
            customLabel="Add Custom Allergy"
            customPlaceholder="Enter your specific allergy"
          />
        </View>

        {/* Dietary Restrictions */}
        <View style={styles.allergyFieldInline}>
          <MultiSelectWithCustom
            options={RESTRICTION_OPTIONS}
            selectedValues={formData.restrictions}
            onSelectionChange={(values) => updateField("restrictions", values)}
            label="Dietary Restrictions (Optional)"
            placeholder="Select any dietary restrictions"
            searchable={true}
            allowCustom={true}
            customLabel="Add Custom Restriction"
            customPlaceholder="Enter your specific dietary need"
          />
        </View>
      </View>
      <View style={styles.sectionBottomPad} />
    </GlassCard>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <SafeAreaView style={styles.container}>
      {/* Info Tooltip Modal */}
      <InfoTooltipModal
        visible={tooltipModal.visible}
        title={tooltipModal.title}
        description={tooltipModal.description}
        benefits={tooltipModal.benefits}
        onClose={hideInfoTooltip}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section with Background Image */}
        <HeroSection
          image={{
            uri: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80",
          }}
          overlayGradient={gradients.overlay.dark}
          contentPosition="center"
          minHeight={160}
          maxHeight={240}
        >
          <Text style={styles.title} numberOfLines={1}>
            What are your diet preferences?
          </Text>
          <Text style={styles.subtitle} numberOfLines={2} ellipsizeMode="tail">
            Help us personalize your meal recommendations and nutrition plan
          </Text>

          {/* Auto-save Indicator */}
          {isAutoSaving && (
            <View style={styles.autoSaveIndicator}>
              <Ionicons
                name="cloud-upload-outline"
                size={rf(16)}
                color={ResponsiveTheme.colors.success}
              />
              <Text style={styles.autoSaveText} numberOfLines={1}>
                Saving...
              </Text>
            </View>
          )}
        </HeroSection>

        {/* Form Sections */}
        <View style={styles.content}>
          <AnimatedSection delay={0}>
            {renderCurrentDietSection()}
          </AnimatedSection>

          <AnimatedSection delay={100}>
            {renderDietReadinessSection()}
          </AnimatedSection>

          <AnimatedSection delay={200}>
            {renderMealPreferencesSection()}
          </AnimatedSection>

          <AnimatedSection delay={300}>
            {renderCookingPreferencesSection()}
          </AnimatedSection>

          <AnimatedSection delay={400}>
            {renderHealthHabitsSection()}
          </AnimatedSection>

          <AnimatedSection delay={500}>
            {renderAllergiesAndRestrictionsSection()}
          </AnimatedSection>
        </View>

        {/* Validation Summary */}
        {validationResult && (
          <View style={styles.validationSummary}>
            <GlassCard
              elevation={3}
              blurIntensity="default"
              padding="md"
              borderRadius="lg"
              style={styles.validationCard}
            >
              <View style={styles.validationTitleContainer}>
                <Ionicons
                  name={
                    validationResult.is_valid
                      ? "checkmark-circle"
                      : "alert-circle"
                  }
                  size={rf(20)}
                  color={
                    validationResult.is_valid
                      ? ResponsiveTheme.colors.success
                      : ResponsiveTheme.colors.warning
                  }
                />
                <Text style={styles.validationTitle} numberOfLines={1}>
                  {validationResult.is_valid
                    ? "Ready to Continue"
                    : "Please Complete"}
                </Text>
              </View>
              <Text style={styles.validationPercentage} numberOfLines={1}>
                {validationResult.completion_percentage}% Complete
              </Text>

              {validationResult.errors.length > 0 && (
                <View style={styles.validationErrors}>
                  <Text style={styles.validationErrorTitle}>Required:</Text>
                  {validationResult.errors.map((error) => (
                    <Text key={error} style={styles.validationErrorText}>
                      • {error}
                    </Text>
                  ))}
                </View>
              )}

              {validationResult.warnings.length > 0 && (
                <View style={styles.validationWarnings}>
                  <Text style={styles.validationWarningTitle}>
                    Recommendations:
                  </Text>
                  {validationResult.warnings.map((warning) => (
                    <Text key={warning} style={styles.validationWarningText}>
                      • {warning}
                    </Text>
                  ))}
                </View>
              )}
            </GlassCard>
          </View>
        )}
      </ScrollView>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <AnimatedPressable
            style={styles.backButtonCompact}
            onPress={onBack}
            scaleValue={0.96}
          >
            <Ionicons
              name="chevron-back"
              size={rf(18)}
              color={ResponsiveTheme.colors.primary}
            />
            <Text style={styles.backButtonText}>Back</Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={styles.nextButtonCompact}
            onPress={() => {
              onUpdate(formData);
              requestAnimationFrame(() => {
                // If editing from Review, return directly to Review tab
                if (isEditingFromReview && onReturnToReview) {
                  onReturnToReview();
                } else {
                  onNext(formData);
                }
              });
            }}
            scaleValue={0.96}
          >
            <Text style={styles.nextButtonText}>
              {isEditingFromReview ? "Review" : "Next"}
            </Text>
            <Ionicons
              name={
                isEditingFromReview
                  ? "checkmark-circle-outline"
                  : "chevron-forward"
              }
              size={rf(18)}
              color="#FFFFFF"
            />
          </AnimatedPressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  scrollView: {
    flex: 1,
  },

  header: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  headerGradient: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.xl,
    paddingBottom: ResponsiveTheme.spacing.lg,
    borderBottomLeftRadius: ResponsiveTheme.borderRadius.xxl,
    borderBottomRightRadius: ResponsiveTheme.borderRadius.xxl,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: "700" as const,
    color: ResponsiveTheme.colors.white,
    marginBottom: ResponsiveTheme.spacing.sm,
    letterSpacing: -0.5,
    textAlign: "center" as const,
  },

  subtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: ResponsiveTheme.fontSize.md * 1.5,
    marginBottom: ResponsiveTheme.spacing.md,
    textAlign: "center" as const,
  },

  autoSaveIndicator: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.xs,
    alignSelf: "flex-start",
    backgroundColor: `${ResponsiveTheme.colors.success}20`,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  autoSaveText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.success,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  content: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  section: {
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    letterSpacing: -0.3,
    flexShrink: 1,
  },

  sectionSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: ResponsiveTheme.fontSize.sm * 1.4,
    flexShrink: 1,
  },

  // Edge-to-edge section styles
  sectionEdgeToEdge: {
    marginTop: ResponsiveTheme.spacing.md, // Proper spacing from hero image
    marginBottom: ResponsiveTheme.spacing.xl,
    marginHorizontal: -ResponsiveTheme.spacing.lg, // Negate parent's horizontal padding to go edge-to-edge
  },

  sectionTitlePadded: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.xs,
  },

  sectionBottomPad: {
    height: ResponsiveTheme.spacing.lg,
  },

  // Content padding for edge-to-edge cards (non-scroll content)
  edgeToEdgeContentPadded: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  // Inline variants for cards inside padded containers (no extra margin)
  warningCardInline: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  infoCardInline: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  disabledCardInline: {
    marginTop: ResponsiveTheme.spacing.xs,
  },

  allergyFieldInline: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  edgeToEdgeScrollContent: {
    paddingLeft: ResponsiveTheme.spacing.lg,
    paddingRight: ResponsiveTheme.spacing.xl,
    paddingVertical: ResponsiveTheme.spacing.sm,
    gap: rw(10),
  },

  // Container that clips the scroll content within the card bounds
  scrollClipContainer: {
    width: "100%",
    overflow: "hidden",
    marginTop: ResponsiveTheme.spacing.sm,
    // Adding a tiny borderRadius ensures overflow: hidden works on Android
    borderRadius: 1,
  },

  // Scroll content for clipped container
  clippedScrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.sm,
    gap: rw(10),
  },

  // Scroll container inset from card edges - keeps options inside card
  scrollContainerInset: {
    marginHorizontal: ResponsiveTheme.spacing.lg,
    marginTop: ResponsiveTheme.spacing.sm,
    overflow: "hidden",
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  // Scroll content with internal padding
  scrollContentInset: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    gap: rw(10),
  },

  fieldLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    flexShrink: 1,
  },

  // Info Icon Button
  infoIconButton: {
    padding: rp(4),
    borderRadius: rf(12),
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  // Info Tooltip Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  modalContent: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.xl,
    padding: ResponsiveTheme.spacing.xl,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: "transparent",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  modalTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },

  modalCloseButton: {
    padding: ResponsiveTheme.spacing.xs,
  },

  modalDescription: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(22),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  modalBenefits: {
    backgroundColor: `${ResponsiveTheme.colors.success}10`,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: ResponsiveTheme.spacing.md,
  },

  modalBenefitsTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.success,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  modalBenefitItem: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  modalBenefitText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },

  // ============================================================================
  // CONSISTENT CARD STYLES - Used for Diet Type, Meal Preferences, Cooking Skill
  // ============================================================================

  consistentScroll: {
    marginTop: ResponsiveTheme.spacing.sm,
    marginHorizontal: -ResponsiveTheme.spacing.md,
  },

  consistentScrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.xs,
    gap: rw(10),
  },

  consistentCardItem: {
    width: rw(105),
  },

  consistentCardItemDisabled: {
    opacity: 0.5,
  },

  consistentCard: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    padding: ResponsiveTheme.spacing.sm,
    minHeight: rh(12),
    alignItems: "center" as const,
  },

  consistentCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  consistentCardDisabled: {
    borderColor: ResponsiveTheme.colors.textMuted,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  consistentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    width: "100%",
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  consistentCardIconCenter: {
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  consistentCardTitle: {
    fontSize: rf(11),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  consistentCardTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  consistentCardDesc: {
    fontSize: rf(9),
    color: ResponsiveTheme.colors.textMuted,
    textAlign: "center",
    lineHeight: rf(12),
  },

  consistentCardIndicator: {
    width: rf(18),
    height: rf(18),
    borderRadius: rf(9),
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  consistentCardIndicatorSelected: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },

  // Mini toggle for meal preferences
  miniToggle: {
    width: 28,
    height: 16,
    borderRadius: 8,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: "transparent",
    justifyContent: "center" as const,
    paddingHorizontal: 2,
  },

  miniToggleActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },

  miniToggleThumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ResponsiveTheme.colors.white,
  },

  miniToggleThumbActive: {
    alignSelf: "flex-end",
  },

  // Diet Readiness Compact Grid
  dietReadinessCompactGrid: {
    gap: ResponsiveTheme.spacing.xs,
  },

  // Legacy Diet Type Section - kept for compatibility
  dietTypeScroll: {
    marginTop: ResponsiveTheme.spacing.sm,
    marginHorizontal: -ResponsiveTheme.spacing.md,
  },

  dietTypeScrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    gap: rw(12),
  },

  dietTypeItem: {
    width: rw(140),
  },

  dietTypeCard: {
    minHeight: rh(16),
  },

  dietTypeCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  dietTypeContent: {
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
  },

  dietTypeInfoRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: ResponsiveTheme.spacing.xs,
    width: "100%",
  },

  dietTypeIcon: {
    fontSize: rf(36),
  },

  dietTypeTitle: {
    fontSize: rf(13),
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    flexShrink: 1,
  },

  dietTypeTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  dietTypeDescription: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(14),
    flexShrink: 1,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
  },

  // Diet Readiness Section
  dietReadinessGrid: {
    gap: ResponsiveTheme.spacing.sm,
  },

  dietReadinessItem: {
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  dietReadinessCard: {
    minHeight: rh(11),
  },

  dietReadinessCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  dietReadinessContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.md,
  },

  dietReadinessProgressContainer: {
    position: "relative",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    flexShrink: 0,
  },

  dietReadinessProgressIconContainer: {
    position: "absolute",
  },

  dietReadinessContentContainer: {
    flex: 1,
    gap: rh(0.3),
  },

  dietReadinessTitleRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.xs,
  },

  dietReadinessToggle: {
    marginLeft: ResponsiveTheme.spacing.sm,
    flexShrink: 0,
  },

  dietReadinessTitle: {
    fontSize: rf(13),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    flexShrink: 1,
  },

  dietReadinessTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  dietReadinessDescription: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(14),
    flexShrink: 1,
  },

  dietReadinessBenefits: {
    gap: rh(0.15),
    marginTop: rh(0.2),
  },

  dietReadinessBenefit: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textMuted,
    lineHeight: rf(13),
    flexShrink: 1,
  },

  // Meal Preferences Section
  mealPreferencesScroll: {
    marginTop: ResponsiveTheme.spacing.sm,
    marginHorizontal: -ResponsiveTheme.spacing.md,
  },

  mealPreferencesScrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    gap: rw(12),
  },

  mealPreferenceItem: {
    width: rw(140),
  },

  mealPreferenceItemDisabled: {
    opacity: 0.6,
  },

  mealPreferenceCard: {
    minHeight: rh(14),
  },

  mealPreferenceCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  mealPreferenceCardDisabled: {
    borderColor: ResponsiveTheme.colors.textMuted,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  mealPreferenceCardContent: {
    alignItems: "center" as const,
    width: "100%",
  },

  mealPreferenceHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    width: "100%",
    marginBottom: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
  },

  mealPreferenceTitle: {
    fontSize: rf(13),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginBottom: rh(0.5),
  },

  mealPreferenceTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  mealPreferenceDescription: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(14),
    textAlign: "center",
    paddingHorizontal: ResponsiveTheme.spacing.xs,
  },

  // Cooking Preferences Section
  cookingField: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  skillLevelScroll: {
    marginTop: ResponsiveTheme.spacing.sm,
    marginHorizontal: -ResponsiveTheme.spacing.md,
  },

  skillLevelScrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    gap: rw(12),
  },

  skillLevelItem: {
    width: rw(140),
  },

  skillLevelCard: {
    minHeight: rh(14),
  },

  skillLevelCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  skillLevelContent: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: "100%",
    paddingVertical: ResponsiveTheme.spacing.xs,
  },

  skillLevelIcon: {
    fontSize: rf(28),
  },

  skillLevelTitle: {
    fontSize: rf(13),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginTop: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  skillLevelTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  skillLevelDescription: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(14),
    paddingHorizontal: ResponsiveTheme.spacing.xs,
  },

  // Prep Time Section
  prepTimeContainer: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  prepTimeSlider: {
    width: "100%",
    marginTop: ResponsiveTheme.spacing.sm,
  },

  budgetSlider: {
    width: "100%",
    marginTop: ResponsiveTheme.spacing.sm,
  },

  prepTimeOption: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    alignItems: "center" as const,
  },

  prepTimeOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  prepTimeText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  prepTimeTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
  disabledCard: {
    padding: rp(15),
    backgroundColor: "#F5F5F5",
    borderColor: "#E0E0E0",
    marginTop: rp(10),
  },
  disabledContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: ResponsiveTheme.spacing.xs,
  },
  disabledText: {
    flex: 1,
    fontSize: rf(14),
    color: "#666666",
    lineHeight: rp(20),
  },

  // Budget Section
  budgetGrid: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.sm,
  },

  budgetItem: {
    flex: 1,
  },

  budgetCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  budgetCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  budgetContent: {
    alignItems: "center" as const,
  },

  budgetIcon: {
    fontSize: rf(20),
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  budgetTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  budgetTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  budgetDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  budgetRange: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    fontStyle: "italic",
  },

  // Health Habits Section - Compact Single Column Layout
  habitCategoryCompact: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  habitCategoryTitleCompact: {
    fontSize: rf(14),
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  habitPillGrid: {
    gap: ResponsiveTheme.spacing.xs,
  },

  // Compact Toggle Pill Styles - Full width, single row
  compactPillContainer: {
    width: "100%",
  },

  compactPill: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
  },

  compactPillActive: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  compactPillRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.sm,
  },

  compactPillIconWrap: {
    width: rf(24),
    height: rf(24),
    borderRadius: rf(12),
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  compactPillTitle: {
    flex: 1,
    fontSize: rf(13),
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(18),
  },

  compactPillTitleActive: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  compactPillInfoBtn: {
    padding: ResponsiveTheme.spacing.xs,
  },

  // Compact toggle switch
  compactToggleSwitch: {
    width: 38,
    height: 22,
    borderRadius: 11,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: "center" as const,
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  compactToggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ResponsiveTheme.colors.white,
  },

  // Legacy - kept for reference
  compactPillHeader: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  compactPillToggleRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },

  compactPillStatus: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textMuted,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Legacy styles kept for compatibility (can be removed if not used elsewhere)
  habitCategory: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  habitCategoryTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
    textTransform: "capitalize",
  },

  habitsList: {
    gap: ResponsiveTheme.spacing.sm,
  },

  habitItem: {
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  habitCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  habitCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  habitContent: {
    flex: 1,
  },

  habitHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  habitIcon: {
    fontSize: rf(20),
  },

  habitToggle: {
    marginLeft: ResponsiveTheme.spacing.md,
  },

  habitTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  habitTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  habitDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },

  // Toggle Switch Styles
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: "transparent",
    justifyContent: "center" as const,
    paddingHorizontal: 2,
  },

  toggleSwitchActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },

  toggleSwitchDisabled: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderColor: ResponsiveTheme.colors.textMuted,
    opacity: 0.5,
  },

  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: ResponsiveTheme.colors.white,
    alignSelf: "flex-start",
  },

  toggleThumbActive: {
    alignSelf: "flex-end",
  },

  // Allergies Section
  allergyField: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  // Warning and Info Cards
  warningCard: {
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.warning}10`,
    borderColor: ResponsiveTheme.colors.warning,
    borderWidth: 1,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  warningContent: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.xs,
    justifyContent: "center" as const,
  },

  warningText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.warning,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  infoCard: {
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
    borderColor: ResponsiveTheme.colors.primary,
    borderWidth: 1,
    marginTop: ResponsiveTheme.spacing.md,
  },

  infoContent: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.xs,
    justifyContent: "center" as const,
  },

  infoText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Validation Section
  validationSummary: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  validationCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  validationTitleContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  validationTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  validationPercentage: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  validationErrors: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  validationErrorTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.error,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  validationErrorText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.error,
    lineHeight: rf(18),
  },

  validationWarnings: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  validationWarningTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.warning,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  validationWarningText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.warning,
    lineHeight: rf(18),
  },

  errorText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.error,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  // Footer
  // Footer - Compact aesthetic design
  footer: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: `${ResponsiveTheme.colors.border}50`,
    backgroundColor: ResponsiveTheme.colors.background,
  },

  buttonRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: ResponsiveTheme.spacing.md,
  },

  backButtonCompact: {
    flexDirection: "row",
    alignItems: "center" as const,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.full,
    backgroundColor: `${ResponsiveTheme.colors.primary}12`,
    gap: rw(4),
  },

  backButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.primary,
  },

  nextButtonCompact: {
    flexDirection: "row",
    alignItems: "center" as const,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    borderRadius: ResponsiveTheme.borderRadius.full,
    backgroundColor: ResponsiveTheme.colors.primary,
    gap: rw(4),
  },

  nextButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: "#FFFFFF",
  },

  nextButtonDisabled: {
    opacity: 0.5,
  },

  // Legacy button styles
  backButton: {
    flex: 1,
  },

  jumpButton: {
    flex: 1.5,
  },

  nextButton: {
    flex: 2,
  },
});

export default DietPreferencesTab;
