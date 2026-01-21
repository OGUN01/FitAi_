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
  interpolate,
} from "react-native-reanimated";
import { rf, rp, rh, rw } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import { Button, Slider } from "../../../components/ui";
import {
  GlassCard,
  AnimatedPressable,
  AnimatedSection,
  HeroSection,
} from "../../../components/ui/aurora";
import { gradients, toLinearGradientProps } from "../../../theme/gradients";
import { MultiSelect } from "../../../components/advanced/MultiSelect";
import {
  WorkoutPreferencesData,
  BodyAnalysisData,
  PersonalInfoData,
  TabValidationResult,
} from "../../../types/onboarding";
import { MetabolicCalculations } from "../../../utils/healthCalculations";

// ============================================================================
// TYPES
// ============================================================================

interface WorkoutPreferencesTabProps {
  data: WorkoutPreferencesData | null;
  bodyAnalysisData?: BodyAnalysisData | null; // For auto-population
  personalInfoData?: PersonalInfoData | null; // For intensity calculation
  validationResult?: TabValidationResult;
  onNext: (currentData?: WorkoutPreferencesData) => void;
  onBack: () => void;
  onUpdate: (data: Partial<WorkoutPreferencesData>) => void;
  onNavigateToTab?: (tabNumber: number) => void;
  isLoading?: boolean;
  isAutoSaving?: boolean;
}

// ============================================================================
// DATA CONSTANTS
// ============================================================================

const FITNESS_GOALS = [
  {
    id: "weight-loss",
    title: "Weight Loss",
    iconName: "flame-outline",
    description: "Burn fat and lose weight",
  },
  {
    id: "weight-gain",
    title: "Weight Gain",
    iconName: "trending-up-outline",
    description: "Gain healthy weight (muscle and mass)",
  },
  {
    id: "muscle-gain",
    title: "Muscle Gain",
    iconName: "barbell-outline",
    description: "Build lean muscle mass",
  },
  {
    id: "strength",
    title: "Strength",
    iconName: "fitness-outline",
    description: "Increase overall strength",
  },
  {
    id: "endurance",
    title: "Endurance",
    iconName: "speedometer-outline",
    description: "Improve cardiovascular fitness",
  },
  {
    id: "flexibility",
    title: "Flexibility",
    iconName: "body-outline",
    description: "Enhance mobility and flexibility",
  },
  {
    id: "general_fitness",
    title: "General Fitness",
    iconName: "flash-outline",
    description: "Overall health and wellness",
  },
];

const ACTIVITY_LEVELS = [
  {
    value: "sedentary",
    label: "Sedentary",
    description: "Little to no exercise",
    iconName: "bed-outline",
  },
  {
    value: "light",
    label: "Lightly Active",
    description: "Light exercise 1-3 days/week",
    iconName: "walk-outline",
  },
  {
    value: "moderate",
    label: "Moderately Active",
    description: "Moderate exercise 3-5 days/week",
    iconName: "walk-outline",
  },
  {
    value: "active",
    label: "Very Active",
    description: "Hard exercise 6-7 days/week",
    iconName: "barbell-outline",
  },
  {
    value: "extreme",
    label: "Extremely Active",
    description: "Very hard exercise, physical job",
    iconName: "flame-outline",
  },
];

const LOCATION_OPTIONS = [
  {
    id: "home",
    title: "Home",
    iconName: "home-outline",
    description: "Workout from the comfort of your home",
  },
  {
    id: "gym",
    title: "Gym",
    iconName: "fitness-outline",
    description: "Access to full gym equipment",
  },
  {
    id: "both",
    title: "Both",
    iconName: "repeat-outline",
    description: "Flexible workouts anywhere",
  },
];

const EQUIPMENT_OPTIONS = [
  {
    id: "bodyweight",
    label: "Bodyweight",
    value: "bodyweight",
    iconName: "body-outline",
  },
  {
    id: "dumbbells",
    label: "Dumbbells",
    value: "dumbbells",
    iconName: "barbell-outline",
  },
  {
    id: "resistance-bands",
    label: "Resistance Bands",
    value: "resistance-bands",
    iconName: "resize-outline",
  },
  {
    id: "kettlebells",
    label: "Kettlebells",
    value: "kettlebells",
    iconName: "barbell-outline",
  },
  {
    id: "barbell",
    label: "Barbell",
    value: "barbell",
    iconName: "barbell-outline",
  },
  {
    id: "pull-up-bar",
    label: "Pull-up Bar",
    value: "pull-up-bar",
    iconName: "remove-outline",
  },
  {
    id: "yoga-mat",
    label: "Yoga Mat",
    value: "yoga-mat",
    iconName: "body-outline",
  },
  {
    id: "treadmill",
    label: "Treadmill",
    value: "treadmill",
    iconName: "speedometer-outline",
  },
  {
    id: "stationary-bike",
    label: "Stationary Bike",
    value: "stationary-bike",
    iconName: "bicycle-outline",
  },
];

// Standard gym equipment - auto-populated when gym is selected
const STANDARD_GYM_EQUIPMENT = [
  "bodyweight",
  "dumbbells",
  "barbell",
  "kettlebells",
  "pull-up-bar",
  "treadmill",
  "stationary-bike",
  "yoga-mat",
];

const INTENSITY_OPTIONS = [
  {
    value: "beginner",
    label: "Beginner",
    description: "New to fitness or returning after a break",
    iconName: "leaf-outline",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Some experience with regular exercise",
    iconName: "barbell-outline",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Experienced with consistent training",
    iconName: "flame-outline",
  },
];

const WORKOUT_TYPE_OPTIONS = [
  {
    id: "strength",
    label: "Strength Training",
    value: "strength",
    iconName: "barbell-outline",
  },
  { id: "cardio", label: "Cardio", value: "cardio", iconName: "heart-outline" },
  { id: "hiit", label: "HIIT", value: "hiit", iconName: "flash-outline" },
  { id: "yoga", label: "Yoga", value: "yoga", iconName: "body-outline" },
  {
    id: "pilates",
    label: "Pilates",
    value: "pilates",
    iconName: "body-outline",
  },
  {
    id: "flexibility",
    label: "Flexibility",
    value: "flexibility",
    iconName: "body-outline",
  },
  {
    id: "functional",
    label: "Functional Training",
    value: "functional",
    iconName: "walk-outline",
  },
  {
    id: "sports",
    label: "Sports Training",
    value: "sports",
    iconName: "football-outline",
  },
];

const FLEXIBILITY_LEVELS = [
  {
    value: "poor",
    label: "Poor",
    description: "Limited range of motion",
    iconName: "lock-closed-outline",
  },
  {
    value: "fair",
    label: "Fair",
    description: "Average flexibility",
    iconName: "resize-outline",
  },
  {
    value: "good",
    label: "Good",
    description: "Above average flexibility",
    iconName: "checkmark-circle-outline",
  },
  {
    value: "excellent",
    label: "Excellent",
    description: "Very flexible",
    iconName: "body-outline",
  },
];

const WORKOUT_TIMES = [
  {
    value: "morning",
    label: "Morning",
    iconName: "sunny-outline",
    description: "6AM - 10AM",
  },
  {
    value: "afternoon",
    label: "Afternoon",
    iconName: "sunny-outline",
    description: "12PM - 4PM",
  },
  {
    value: "evening",
    label: "Evening",
    iconName: "moon-outline",
    description: "6PM - 9PM",
  },
];

const OCCUPATION_OPTIONS = [
  { value: "desk_job", label: "Desk Job" },
  { value: "light_active", label: "Light Activity" },
  { value: "moderate_active", label: "Moderate Activity" },
  { value: "heavy_labor", label: "Heavy Labor" },
  { value: "very_active", label: "Very Active" },
];

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
// COMPACT TOGGLE PILL COMPONENT - For Workout Style Preferences
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

const WorkoutPreferencesTab: React.FC<WorkoutPreferencesTabProps> = ({
  data,
  bodyAnalysisData,
  personalInfoData,
  validationResult,
  onNext,
  onBack,
  onUpdate,
  onNavigateToTab,
  isLoading = false,
  isAutoSaving = false,
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

  // Intensity recommendation state
  const [intensityRecommendation, setIntensityRecommendation] = useState<{
    level: "beginner" | "intermediate" | "advanced";
    reasoning: string;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState<WorkoutPreferencesData>({
    // Existing data
    location: data?.location || "both",
    equipment: data?.equipment || [],
    time_preference: data?.time_preference || 30,
    intensity: data?.intensity || "beginner",
    workout_types: data?.workout_types || [],

    // Enhanced data
    primary_goals: data?.primary_goals || [],
    activity_level: data?.activity_level || "sedentary",

    // Current fitness assessment
    workout_experience_years: data?.workout_experience_years || 0,
    workout_frequency_per_week: data?.workout_frequency_per_week || 0,
    can_do_pushups: data?.can_do_pushups || 0,
    can_run_minutes: data?.can_run_minutes || 0,
    flexibility_level: data?.flexibility_level || "fair",

    // Weight goals (auto-populated from body analysis)
    weekly_weight_loss_goal: data?.weekly_weight_loss_goal || undefined,

    // Preferences
    preferred_workout_times: data?.preferred_workout_times || [],
    enjoys_cardio: data?.enjoys_cardio ?? true,
    enjoys_strength_training: data?.enjoys_strength_training ?? true,
    enjoys_group_classes: data?.enjoys_group_classes ?? false,
    prefers_outdoor_activities: data?.prefers_outdoor_activities ?? false,
    needs_motivation: data?.needs_motivation ?? false,
    prefers_variety: data?.prefers_variety ?? true,
  });

  // Sync formData with data prop when it changes (e.g., when navigating back to this tab)
  // Use a ref to track if we're syncing from props to avoid circular updates
  const isSyncingFromProps = useRef(false);

  useEffect(() => {
    if (data && !isSyncingFromProps.current) {
      const newFormData = {
        location: data.location || "both",
        equipment: data.equipment || [],
        time_preference: data.time_preference || 30,
        intensity: data.intensity || "beginner",
        workout_types: data.workout_types || [],
        primary_goals: data.primary_goals || [],
        activity_level: data.activity_level || "sedentary",
        workout_experience_years: data.workout_experience_years || 0,
        workout_frequency_per_week: data.workout_frequency_per_week || 0,
        can_do_pushups: data.can_do_pushups || 0,
        can_run_minutes: data.can_run_minutes || 0,
        flexibility_level: data.flexibility_level || "fair",
        weekly_weight_loss_goal: data.weekly_weight_loss_goal || undefined,
        preferred_workout_times: data.preferred_workout_times || [],
        enjoys_cardio: data.enjoys_cardio ?? true,
        enjoys_strength_training: data.enjoys_strength_training ?? true,
        enjoys_group_classes: data.enjoys_group_classes ?? false,
        prefers_outdoor_activities: data.prefers_outdoor_activities ?? false,
        needs_motivation: data.needs_motivation ?? false,
        prefers_variety: data.prefers_variety ?? true,
      };

      // Deep comparison: check if data has actually changed
      const hasChanged =
        JSON.stringify(formData) !== JSON.stringify(newFormData);

      if (hasChanged) {
        console.log(
          "[SYNC] WorkoutPreferencesTab: Data changed, syncing form data with prop data:",
          data,
        );
        isSyncingFromProps.current = true;
        setFormData(newFormData);
        // Reset flag after state update completes
        setTimeout(() => {
          isSyncingFromProps.current = false;
        }, 0);
      }
    }
  }, [data]); // ONLY depend on data prop, NOT formData!

  // Auto-populate gym equipment when location is gym
  useEffect(() => {
    if (formData.location === "gym" && formData.equipment.length === 0) {
      setFormData((prev) => ({
        ...prev,
        equipment: STANDARD_GYM_EQUIPMENT,
      }));
    }
  }, [formData.location, formData.equipment.length]);

  // Auto-calculate activity level from occupation type (NEW APPROACH)
  useEffect(() => {
    if (personalInfoData?.occupation_type) {
      // Map occupation to activity level
      const OCCUPATION_TO_ACTIVITY: Record<
        string,
        WorkoutPreferencesData["activity_level"]
      > = {
        desk_job: "sedentary",
        light_active: "light",
        moderate_active: "moderate",
        heavy_labor: "active",
        very_active: "extreme",
      };

      const calculatedActivityLevel =
        OCCUPATION_TO_ACTIVITY[personalInfoData.occupation_type] || "sedentary";

      // Only update if it's different to avoid unnecessary re-renders
      if (formData.activity_level !== calculatedActivityLevel) {
        setFormData((prev) => ({
          ...prev,
          activity_level: calculatedActivityLevel,
        }));
      }
    }
  }, [personalInfoData?.occupation_type, formData.activity_level]);

  // Auto-populate from body analysis data
  useEffect(() => {
    if (bodyAnalysisData && !data?.weekly_weight_loss_goal) {
      const { current_weight_kg, target_weight_kg, target_timeline_weeks } =
        bodyAnalysisData;

      if (current_weight_kg && target_weight_kg && target_timeline_weeks) {
        const weightDifference = Math.abs(current_weight_kg - target_weight_kg);
        const weeklyRate = Math.min(
          1.0,
          weightDifference / target_timeline_weeks,
        ); // Max 1kg/week

        setFormData((prev) => ({
          ...prev,
          weekly_weight_loss_goal: Math.round(weeklyRate * 100) / 100,
        }));
      }

      // Auto-suggest goals based on body analysis
      if (
        bodyAnalysisData.ai_body_type &&
        formData.primary_goals.length === 0
      ) {
        let suggestedGoals: string[] = [];

        switch (bodyAnalysisData.ai_body_type) {
          case "ectomorph":
            suggestedGoals = ["muscle_gain", "strength"];
            break;
          case "endomorph":
            suggestedGoals = ["weight_loss", "endurance"];
            break;
          case "mesomorph":
            suggestedGoals = ["strength", "muscle_gain"];
            break;
        }

        if (suggestedGoals.length > 0) {
          setFormData((prev) => ({ ...prev, primary_goals: suggestedGoals }));
        }
      }
    }
  }, [bodyAnalysisData, data?.weekly_weight_loss_goal]);

  // ============================================================================
  // FORM HANDLERS
  // ============================================================================

  const updateField = <K extends keyof WorkoutPreferencesData>(
    field: K,
    value: WorkoutPreferencesData[K],
  ) => {
    console.log(
      `✏️ [TAB4-INPUT] updateField called - field: "${String(field)}", value:`,
      value,
    );
    let updated = { ...formData, [field]: value };

    // Auto-populate equipment when gym is selected
    if (field === "location") {
      console.log(`🏋️ [TAB4-INPUT] Location changed to: "${value}"`);
      if (value === "gym") {
        console.log(`🏋️ [TAB4-INPUT] Auto-populating standard gym equipment`);
        updated.equipment = STANDARD_GYM_EQUIPMENT;
      } else if (value === "home") {
        console.log(`🏋️ [TAB4-INPUT] Resetting equipment for home location`);
        // Reset to empty when switching to home, let user select
        updated.equipment = [];
      } else if (value === "both") {
        console.log(
          `🏋️ [TAB4-INPUT] Keeping existing equipment for both locations`,
        );
        // For both, keep current selection or reset to empty
        updated.equipment =
          formData.equipment.length > 0 ? formData.equipment : [];
      }
    }

    console.log(`✏️ [TAB4-INPUT] Updated formData:`, updated);
    setFormData(updated);
    onUpdate(updated);
  };

  const toggleGoal = (goalId: string) => {
    console.log(`🎯 [TAB4-INPUT] toggleGoal called - goalId: "${goalId}"`);
    const currentGoals = formData.primary_goals;
    const newGoals = currentGoals.includes(goalId)
      ? currentGoals.filter((id) => id !== goalId)
      : [...currentGoals, goalId];
    console.log(
      `🎯 [TAB4-INPUT] Goals updated from`,
      currentGoals,
      "to",
      newGoals,
    );
    updateField("primary_goals", newGoals);
  };

  const toggleWorkoutTime = (timeId: string) => {
    console.log(
      `⏰ [TAB4-INPUT] toggleWorkoutTime called - timeId: "${timeId}"`,
    );
    const currentTimes = formData.preferred_workout_times;
    const newTimes = currentTimes.includes(timeId)
      ? currentTimes.filter((id) => id !== timeId)
      : [...currentTimes, timeId];
    console.log(
      `⏰ [TAB4-INPUT] Workout times updated from`,
      currentTimes,
      "to",
      newTimes,
    );
    updateField("preferred_workout_times", newTimes);
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  };

  // ============================================================================
  // FITNESS LEVEL AUTO-DETERMINATION (NEW - Using MetabolicCalculations)
  // ============================================================================

  // Auto-calculate and show intensity recommendation when fitness assessment changes
  React.useEffect(() => {
    // Only calculate if we have all required data
    if (
      formData.workout_experience_years !== undefined &&
      formData.can_do_pushups !== undefined &&
      formData.can_run_minutes !== undefined &&
      personalInfoData?.age &&
      personalInfoData?.gender
    ) {
      console.log("🧮 [TAB4-CALC] Calculating recommended intensity level");
      console.log(
        "🧮 [TAB4-CALC] Inputs - experience:",
        formData.workout_experience_years,
        "years, pushups:",
        formData.can_do_pushups,
        "run:",
        formData.can_run_minutes,
        "min",
      );

      const { recommendedIntensity, reasoning } =
        MetabolicCalculations.calculateRecommendedIntensity(
          formData.workout_experience_years,
          formData.can_do_pushups,
          formData.can_run_minutes,
          personalInfoData.age,
          personalInfoData.gender,
        );

      console.log(
        "🧮 [TAB4-CALC] Recommended intensity:",
        recommendedIntensity,
      );
      console.log("🧮 [TAB4-CALC] Reasoning:", reasoning);

      // Set recommendation for display
      setIntensityRecommendation({
        level: recommendedIntensity,
        reasoning,
      });

      // Auto-set intensity (user can override)
      setFormData((prev) => {
        if (prev.intensity !== recommendedIntensity) {
          console.log(
            "🧮 [TAB4-CALC] Auto-setting intensity from",
            prev.intensity,
            "to",
            recommendedIntensity,
          );
          return {
            ...prev,
            intensity: recommendedIntensity,
          };
        }
        return prev;
      });
    }
  }, [
    formData.workout_experience_years,
    formData.can_do_pushups,
    formData.can_run_minutes,
    personalInfoData?.age,
    personalInfoData?.gender,
  ]);

  // ============================================================================
  // WORKOUT TYPE AUTO-RECOMMENDATION
  // ============================================================================

  const calculateRecommendedWorkoutTypes = (): string[] => {
    const recommendedTypes: string[] = [];
    const { primary_goals, intensity, time_preference, location, equipment } =
      formData;

    // Base recommendations for everyone
    recommendedTypes.push("strength"); // Everyone benefits from strength training

    // Goal-based recommendations
    if (
      primary_goals.includes("weight-loss") ||
      primary_goals.includes("endurance")
    ) {
      recommendedTypes.push("cardio");
      if (time_preference >= 30) {
        recommendedTypes.push("hiit"); // HIIT for efficient fat burning
      }
    }

    if (
      primary_goals.includes("muscle-gain") ||
      primary_goals.includes("strength")
    ) {
      recommendedTypes.push("strength");
      if (intensity === "advanced") {
        recommendedTypes.push("functional"); // Advanced functional training
      }
    }

    if (
      primary_goals.includes("flexibility") ||
      primary_goals.includes("general-fitness")
    ) {
      recommendedTypes.push("yoga");
      recommendedTypes.push("flexibility");
    }

    // Fitness level adjustments
    if (intensity === "beginner") {
      recommendedTypes.push("yoga"); // Gentle start
      recommendedTypes.push("flexibility");
    } else if (intensity === "intermediate") {
      recommendedTypes.push("hiit");
      recommendedTypes.push("functional");
    } else if (intensity === "advanced") {
      recommendedTypes.push("hiit");
      recommendedTypes.push("functional");
      recommendedTypes.push("pilates");
    }

    // Equipment-based adjustments
    if (location === "home" && equipment.includes("yoga-mat")) {
      recommendedTypes.push("yoga", "pilates");
    }

    if (equipment.includes("resistance-bands")) {
      recommendedTypes.push("functional");
    }

    // Body analysis integration (if available)
    if (bodyAnalysisData?.ai_body_type) {
      if (bodyAnalysisData.ai_body_type === "ectomorph") {
        // Focus on muscle building
        recommendedTypes.push("strength", "functional");
      } else if (bodyAnalysisData.ai_body_type === "endomorph") {
        // Focus on fat burning
        recommendedTypes.push("cardio", "hiit");
      } else if (bodyAnalysisData.ai_body_type === "mesomorph") {
        // Balanced approach
        recommendedTypes.push("strength", "hiit", "functional");
      }
    }

    // Remove duplicates and return top 4-5 recommendations
    const uniqueTypes = [...new Set(recommendedTypes)];
    return uniqueTypes.slice(0, 5);
  };

  // Memoize the calculation function to avoid recreating it
  const calculateRecommendedWorkoutTypesMemo = React.useCallback(() => {
    const recommendedTypes: string[] = [];
    const { primary_goals, intensity, time_preference, location, equipment } =
      formData;

    // Base recommendations for everyone
    recommendedTypes.push("strength"); // Everyone benefits from strength training

    // Goal-based recommendations
    if (
      primary_goals.includes("weight-loss") ||
      primary_goals.includes("endurance")
    ) {
      recommendedTypes.push("cardio");
      if (time_preference >= 30) {
        recommendedTypes.push("hiit"); // HIIT for efficient fat burning
      }
    }

    if (
      primary_goals.includes("muscle-gain") ||
      primary_goals.includes("strength")
    ) {
      recommendedTypes.push("strength");
      if (intensity === "advanced") {
        recommendedTypes.push("functional"); // Advanced functional training
      }
    }

    if (
      primary_goals.includes("flexibility") ||
      primary_goals.includes("general-fitness")
    ) {
      recommendedTypes.push("yoga");
      recommendedTypes.push("flexibility");
    }

    // Fitness level adjustments
    if (intensity === "beginner") {
      recommendedTypes.push("yoga"); // Gentle start
      recommendedTypes.push("flexibility");
    } else if (intensity === "intermediate") {
      recommendedTypes.push("hiit");
      recommendedTypes.push("functional");
    } else if (intensity === "advanced") {
      recommendedTypes.push("hiit");
      recommendedTypes.push("functional");
      recommendedTypes.push("pilates");
    }

    // Equipment-based adjustments
    if (location === "home" && equipment.includes("yoga-mat")) {
      recommendedTypes.push("yoga", "pilates");
    }

    if (equipment.includes("resistance-bands")) {
      recommendedTypes.push("functional");
    }

    // Body analysis integration (if available)
    if (bodyAnalysisData?.ai_body_type) {
      if (bodyAnalysisData.ai_body_type === "ectomorph") {
        // Focus on muscle building
        recommendedTypes.push("strength", "functional");
      } else if (bodyAnalysisData.ai_body_type === "endomorph") {
        // Focus on fat burning
        recommendedTypes.push("cardio", "hiit");
      } else if (bodyAnalysisData.ai_body_type === "mesomorph") {
        // Balanced approach
        recommendedTypes.push("strength", "hiit", "functional");
      }
    }

    // Remove duplicates and return top 4-5 recommendations
    const uniqueTypes = [...new Set(recommendedTypes)];
    return uniqueTypes.slice(0, 5);
  }, [
    formData.primary_goals,
    formData.intensity,
    formData.time_preference,
    formData.location,
    formData.equipment,
    bodyAnalysisData?.ai_body_type,
  ]);

  // Auto-update workout types when relevant data changes
  React.useEffect(() => {
    const recommendedTypes = calculateRecommendedWorkoutTypesMemo();
    setFormData((prev) => ({ ...prev, workout_types: recommendedTypes }));
  }, [calculateRecommendedWorkoutTypesMemo]);

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

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderGoalsAndActivitySection = () => {
    // Get activity level info for display
    const currentActivityLevel = ACTIVITY_LEVELS.find(
      (level) => level.value === formData.activity_level,
    );
    const occupationType = personalInfoData?.occupation_type || "desk_job";
    const occupationLabel =
      OCCUPATION_OPTIONS.find((opt) => opt.value === occupationType)?.label ||
      "Unknown";

    return (
      <GlassCard
        style={styles.sectionEdgeToEdge}
        elevation={2}
        blurIntensity="medium"
        padding="none"
        borderRadius="none"
      >
        <View style={styles.sectionTitlePadded}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            Fitness Goals
          </Text>
          <Text
            style={styles.sectionSubtitle}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            What are your fitness goals? (Select all that apply)
          </Text>
        </View>

        {/* Body type suggestion */}
        {bodyAnalysisData?.ai_body_type && (
          <View style={styles.edgeToEdgeContentPadded}>
            <View style={styles.autoSuggestText}>
              <Ionicons
                name="bulb-outline"
                size={rf(16)}
                color={ResponsiveTheme.colors.primary}
                style={{ marginRight: ResponsiveTheme.spacing.xs }}
              />
              <Text
                style={styles.autoSuggestTextContent}
                numberOfLines={3}
                ellipsizeMode="tail"
              >
                Based on your {bodyAnalysisData.ai_body_type} body type, we
                suggest focusing on{" "}
                {bodyAnalysisData.ai_body_type === "ectomorph"
                  ? "muscle gain and strength"
                  : bodyAnalysisData.ai_body_type === "endomorph"
                    ? "weight loss and endurance"
                    : "strength and muscle gain"}
              </Text>
            </View>
          </View>
        )}

        {/* Horizontal scroll for fitness goals - inset from card edges */}
        <View style={styles.scrollContainerInset}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContentInset}
            decelerationRate="fast"
            snapToInterval={rw(105) + rw(10)}
            snapToAlignment="start"
          >
            {FITNESS_GOALS.map((goal) => {
              const isSelected = formData.primary_goals.includes(goal.id);
              return (
                <AnimatedPressable
                  key={goal.id}
                  onPress={() => toggleGoal(goal.id)}
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
                        name={goal.iconName as any}
                        size={rf(22)}
                        color={
                          isSelected
                            ? ResponsiveTheme.colors.primary
                            : ResponsiveTheme.colors.textSecondary
                        }
                      />
                      <TouchableOpacity
                        onPress={() =>
                          showInfoTooltip(goal.title, goal.description)
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
                      {goal.title}
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

        {hasFieldError("goals") && (
          <View style={styles.edgeToEdgeContentPadded}>
            <Text style={styles.errorText}>{getFieldError("goals")}</Text>
          </View>
        )}

        {/* Activity Level - Display Only (Auto-calculated from occupation) */}
        <View style={styles.edgeToEdgeContentPadded}>
          <View style={styles.activityField}>
            <Text style={styles.fieldLabel} numberOfLines={1}>
              Daily Activity Level
            </Text>
            <Text
              style={styles.fieldSubtitle}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              Auto-calculated based on your occupation ({occupationLabel})
            </Text>

            <GlassCard
              elevation={2}
              blurIntensity="default"
              padding="md"
              borderRadius="lg"
              style={styles.calculatedActivityCard}
            >
              <View style={styles.calculatedActivityContent}>
                <Ionicons
                  name={
                    (currentActivityLevel?.iconName as any) || "bed-outline"
                  }
                  size={rf(32)}
                  color={ResponsiveTheme.colors.textSecondary}
                  style={{ marginRight: ResponsiveTheme.spacing.md }}
                />
                <View style={styles.calculatedActivityText}>
                  <Text
                    style={styles.calculatedActivityTitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {currentActivityLevel?.label || "Sedentary"}
                  </Text>
                  <Text
                    style={styles.calculatedActivityDescription}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {currentActivityLevel?.description ||
                      "Little to no exercise"}
                  </Text>
                  <View style={styles.calculatedActivityNote}>
                    <Ionicons
                      name="bulb-outline"
                      size={rf(16)}
                      color={ResponsiveTheme.colors.primary}
                      style={{ marginRight: ResponsiveTheme.spacing.xs }}
                    />
                    <Text
                      style={styles.calculatedActivityNoteText}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      Activity level is automatically determined by your
                      occupation type from Personal Info (Tab 1).
                    </Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          </View>
        </View>
        <View style={styles.sectionBottomPad} />
      </GlassCard>
    );
  };

  const renderCurrentFitnessSection = () => {
    const levelInfo = INTENSITY_OPTIONS.find(
      (opt) => opt.value === formData.intensity,
    );

    return (
      <GlassCard
        style={styles.sectionEdgeToEdge}
        elevation={2}
        blurIntensity="medium"
        padding="none"
        borderRadius="none"
      >
        <View style={styles.sectionTitlePadded}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            Current Fitness Assessment
          </Text>
          <Text
            style={styles.sectionSubtitle}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            Help us understand your starting point
          </Text>
        </View>

        <View style={styles.edgeToEdgeContentPadded}>
          {/* Intensity Recommendation with Reasoning */}
          {intensityRecommendation && (
            <GlassCard
              elevation={2}
              blurIntensity="default"
              padding="md"
              borderRadius="lg"
              style={styles.calculatedLevelCardInline}
            >
              <View style={styles.calculatedLevelContent}>
                <Ionicons
                  name={(levelInfo?.iconName as any) || "leaf-outline"}
                  size={rf(24)}
                  color={ResponsiveTheme.colors.primary}
                  style={{ marginRight: ResponsiveTheme.spacing.sm }}
                />
                <View style={styles.calculatedLevelText}>
                  <Text style={styles.calculatedLevelTitle} numberOfLines={1}>
                    Recommended Intensity:{" "}
                    {intensityRecommendation.level.charAt(0).toUpperCase() +
                      intensityRecommendation.level.slice(1)}
                  </Text>
                  <Text
                    style={styles.calculatedLevelDescription}
                    numberOfLines={3}
                    ellipsizeMode="tail"
                  >
                    {intensityRecommendation.reasoning}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: ResponsiveTheme.spacing.xs,
                    }}
                  >
                    <Ionicons
                      name="bulb-outline"
                      size={rf(12)}
                      color={ResponsiveTheme.colors.primary}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={styles.calculatedLevelHint}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      You can change this below if you feel differently
                    </Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          )}

          {/* Recommended Workout Types */}
          <GlassCard
            elevation={2}
            blurIntensity="default"
            padding="md"
            borderRadius="lg"
            style={styles.recommendedTypesCard}
          >
            <View style={styles.recommendedTypesHeader}>
              <Ionicons
                name="flag-outline"
                size={rf(20)}
                color={ResponsiveTheme.colors.primary}
                style={{ marginRight: ResponsiveTheme.spacing.xs }}
              />
              <Text style={styles.recommendedTypesTitle} numberOfLines={1}>
                Recommended Workout Types
              </Text>
            </View>
            <Text
              style={styles.recommendedTypesDescription}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              Based on your goals, fitness level, and available equipment
            </Text>
            <View style={styles.recommendedTypesList}>
              {calculateRecommendedWorkoutTypes().map((typeId) => {
                const workoutType = WORKOUT_TYPE_OPTIONS.find(
                  (opt) => opt.value === typeId,
                );
                return workoutType ? (
                  <View key={typeId} style={styles.recommendedTypeItem}>
                    <Ionicons
                      name={workoutType.iconName as any}
                      size={rf(16)}
                      color={ResponsiveTheme.colors.text}
                      style={{ marginRight: ResponsiveTheme.spacing.xs }}
                    />
                    <Text style={styles.recommendedTypeLabel} numberOfLines={1}>
                      {workoutType.label}
                    </Text>
                  </View>
                ) : null;
              })}
            </View>
          </GlassCard>

          <View style={styles.fitnessGrid}>
            <View style={styles.fitnessItem}>
              <Slider
                value={formData.workout_experience_years || 0}
                onValueChange={(value) =>
                  updateField("workout_experience_years", value)
                }
                minimumValue={0}
                maximumValue={20}
                step={1}
                label="Workout Experience"
                showTooltip={true}
                formatValue={(val) =>
                  val === 0 ? "New" : `${val} year${val > 1 ? "s" : ""}`
                }
                style={styles.experienceSlider}
              />
            </View>

            <View style={styles.fitnessItem}>
              <Slider
                value={formData.workout_frequency_per_week || 0}
                onValueChange={(value) =>
                  updateField("workout_frequency_per_week", value)
                }
                minimumValue={0}
                maximumValue={7}
                step={1}
                label="Current Workout Frequency"
                showTooltip={true}
                formatValue={(val) => (val === 0 ? "None" : `${val}x per week`)}
                style={styles.frequencySlider}
              />
            </View>

            <View style={styles.fitnessItem}>
              <Slider
                value={formData.can_do_pushups || 0}
                onValueChange={(value) => updateField("can_do_pushups", value)}
                minimumValue={0}
                maximumValue={100}
                step={5}
                label="Max Pushups"
                showTooltip={true}
                formatValue={(val) => (val === 0 ? "None" : `${val} pushups`)}
                style={styles.pushupsSlider}
              />
            </View>

            <View style={styles.fitnessItem}>
              <Slider
                value={formData.can_run_minutes || 0}
                onValueChange={(value) => updateField("can_run_minutes", value)}
                minimumValue={0}
                maximumValue={60}
                step={5}
                label="Continuous Running"
                showTooltip={true}
                formatValue={(val) => (val === 0 ? "None" : `${val} minutes`)}
                style={styles.runningSlider}
              />
            </View>

            <View style={styles.fitnessItem}>
              <Slider
                value={
                  formData.flexibility_level === "poor"
                    ? 2
                    : formData.flexibility_level === "fair"
                      ? 5
                      : formData.flexibility_level === "good"
                        ? 7
                        : formData.flexibility_level === "excellent"
                          ? 10
                          : 5
                }
                onValueChange={(value) => {
                  let level: "poor" | "fair" | "good" | "excellent" = "fair";
                  if (value <= 3) level = "poor";
                  else if (value <= 6) level = "fair";
                  else if (value <= 8) level = "good";
                  else level = "excellent";
                  updateField("flexibility_level", level);
                }}
                minimumValue={1}
                maximumValue={10}
                step={1}
                label="Flexibility Level"
                showTooltip={true}
                formatValue={(val) => {
                  if (val <= 3) return "Poor";
                  if (val <= 6) return "Fair";
                  if (val <= 8) return "Good";
                  return "Excellent";
                }}
                style={styles.flexibilitySlider}
              />
            </View>
          </View>
        </View>
        <View style={styles.sectionBottomPad} />
      </GlassCard>
    );
  };

  const renderWorkoutPreferencesSection = () => (
    <GlassCard
      style={styles.sectionEdgeToEdge}
      elevation={2}
      blurIntensity="medium"
      padding="none"
      borderRadius="none"
    >
      <View style={styles.sectionTitlePadded}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          Workout Preferences
        </Text>
        <Text
          style={styles.sectionSubtitle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          Where and when do you prefer to workout?
        </Text>
      </View>

      {/* Location - Horizontal scroll */}
      <View style={styles.edgeToEdgeContentPadded}>
        <Text style={styles.fieldLabel} numberOfLines={1}>
          Workout Location
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
        >
          {LOCATION_OPTIONS.map((option) => {
            const isSelected = formData.location === option.id;
            return (
              <AnimatedPressable
                key={option.id}
                onPress={() =>
                  updateField(
                    "location",
                    option.id as WorkoutPreferencesData["location"],
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
                    numberOfLines={1}
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

      {/* Equipment - Hidden for gym, shown for home/both */}
      <View style={styles.edgeToEdgeContentPadded}>
        {formData.location !== "gym" ? (
          <View style={styles.preferenceField}>
            <MultiSelect
              options={EQUIPMENT_OPTIONS}
              selectedValues={formData.equipment}
              onSelectionChange={(values) => updateField("equipment", values)}
              label="Available Equipment"
              placeholder="Select equipment you have access to"
              searchable={true}
            />
          </View>
        ) : (
          <View style={styles.preferenceField}>
            <Text style={styles.fieldLabel} numberOfLines={1}>
              Available Equipment
            </Text>
            <GlassCard
              elevation={2}
              blurIntensity="default"
              padding="md"
              borderRadius="lg"
              style={styles.gymEquipmentCard}
            >
              <View style={styles.gymEquipmentContent}>
                <Ionicons
                  name="fitness-outline"
                  size={rf(24)}
                  color={ResponsiveTheme.colors.primary}
                  style={{ marginBottom: ResponsiveTheme.spacing.sm }}
                />
                <Text style={styles.gymEquipmentTitle} numberOfLines={1}>
                  Full Gym Access
                </Text>
                <Text
                  style={styles.gymEquipmentDescription}
                  numberOfLines={3}
                  ellipsizeMode="tail"
                >
                  All standard gym equipment is available. Equipment selection
                  is automatically configured.
                </Text>
                <View style={styles.gymEquipmentList}>
                  {STANDARD_GYM_EQUIPMENT.map((equipmentId) => {
                    const equipment = EQUIPMENT_OPTIONS.find(
                      (opt) => opt.value === equipmentId,
                    );
                    return equipment ? (
                      <View key={equipmentId} style={styles.gymEquipmentItem}>
                        <Ionicons
                          name={equipment.iconName as any}
                          size={rf(16)}
                          color={ResponsiveTheme.colors.text}
                          style={{ marginRight: ResponsiveTheme.spacing.xs }}
                        />
                        <Text style={styles.gymEquipmentItemLabel}>
                          {equipment.label}
                        </Text>
                      </View>
                    ) : null;
                  })}
                </View>
              </View>
            </GlassCard>
          </View>
        )}
      </View>

      {/* Workout Duration - Horizontal scroll compact pills */}
      <View style={styles.edgeToEdgeContentPadded}>
        <Text style={styles.fieldLabel}>
          Workout Duration: {formatTime(formData.time_preference)}
        </Text>
      </View>
      <View style={styles.scrollContainerInset}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentInset}
          decelerationRate="fast"
          snapToInterval={rw(70) + rw(10)}
          snapToAlignment="start"
        >
          {[15, 30, 45, 60, 75, 90, 120].map((minutes) => {
            const isSelected = formData.time_preference === minutes;
            return (
              <AnimatedPressable
                key={minutes}
                style={
                  isSelected
                    ? [styles.durationPill, styles.durationPillSelected]
                    : styles.durationPill
                }
                onPress={() => updateField("time_preference", minutes)}
                scaleValue={0.97}
              >
                <Text
                  style={[
                    styles.durationPillText,
                    isSelected && styles.durationPillTextSelected,
                  ]}
                >
                  {formatTime(minutes)}
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Preferred Workout Times - Horizontal scroll */}
      <View style={styles.edgeToEdgeContentPadded}>
        <Text style={styles.fieldLabel}>Preferred Workout Times</Text>
      </View>
      <View style={styles.scrollContainerInset}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentInset}
          decelerationRate="fast"
          snapToInterval={rw(105) + rw(10)}
          snapToAlignment="start"
        >
          {WORKOUT_TIMES.map((time) => {
            const isSelected = formData.preferred_workout_times.includes(
              time.value,
            );
            return (
              <AnimatedPressable
                key={time.value}
                onPress={() => toggleWorkoutTime(time.value)}
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
                      name={time.iconName as any}
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
                    {time.label}
                  </Text>
                  {/* Description */}
                  <Text style={styles.consistentCardDesc} numberOfLines={1}>
                    {time.description}
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
      <View style={styles.sectionBottomPad} />
    </GlassCard>
  );

  const renderWorkoutStyleSection = () => (
    <GlassCard
      style={styles.sectionEdgeToEdge}
      elevation={2}
      blurIntensity="medium"
      padding="none"
      borderRadius="none"
    >
      <View style={styles.sectionTitlePadded}>
        <Text style={styles.sectionTitle}>Workout Style Preferences</Text>
        <Text style={styles.sectionSubtitle}>
          Tap to toggle your workout preferences
        </Text>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        <View style={styles.stylePreferencesCompactGrid}>
          {[
            {
              key: "enjoys_cardio",
              title: "Enjoys Cardio",
              iconName: "heart-outline",
              description: "Running, cycling, aerobic exercises",
            },
            {
              key: "enjoys_strength_training",
              title: "Enjoys Strength Training",
              iconName: "barbell-outline",
              description: "Weight lifting, resistance exercises",
            },
            {
              key: "enjoys_group_classes",
              title: "Enjoys Group Classes",
              iconName: "people-outline",
              description: "Fitness classes, group workouts",
            },
            {
              key: "prefers_outdoor_activities",
              title: "Prefers Outdoor",
              iconName: "leaf-outline",
              description: "Hiking, outdoor sports, fresh air",
            },
            {
              key: "needs_motivation",
              title: "Needs Motivation",
              iconName: "megaphone-outline",
              description: "Coaching, accountability, encouragement",
            },
            {
              key: "prefers_variety",
              title: "Prefers Variety",
              iconName: "shuffle-outline",
              description: "Different exercises, avoiding routine",
            },
          ].map((preference) => {
            const isActive = formData[
              preference.key as keyof WorkoutPreferencesData
            ] as boolean;

            return (
              <CompactTogglePill
                key={preference.key}
                isActive={isActive}
                iconName={preference.iconName}
                title={preference.title}
                description={preference.description}
                onToggle={() =>
                  updateField(
                    preference.key as keyof WorkoutPreferencesData,
                    !isActive as any,
                  )
                }
                onInfoPress={() =>
                  showInfoTooltip(preference.title, preference.description)
                }
              />
            );
          })}
        </View>
      </View>
      <View style={styles.sectionBottomPad} />
    </GlassCard>
  );

  const renderWeightGoalsSection = () => {
    if (!bodyAnalysisData) return null;

    return (
      <GlassCard
        style={styles.sectionEdgeToEdge}
        elevation={2}
        blurIntensity="medium"
        padding="none"
        borderRadius="none"
      >
        <View style={styles.sectionTitlePadded}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weight Goals Summary</Text>
            <View style={styles.readOnlyBadge}>
              <Ionicons
                name="document-text-outline"
                size={rf(12)}
                color={ResponsiveTheme.colors.warning}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.readOnlyText}>READ ONLY - FROM TAB 3</Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>
            This information was entered in your Body Analysis (Tab 3)
          </Text>
        </View>

        <View style={styles.edgeToEdgeContentPadded}>
          <GlassCard
            elevation={2}
            blurIntensity="default"
            padding="md"
            borderRadius="lg"
            style={styles.weightGoalsCardInline}
          >
            <View style={styles.weightGoalsContent}>
              <View style={styles.weightGoalItem}>
                <Text style={styles.weightGoalLabel}>Current Weight</Text>
                <Text style={styles.weightGoalValue}>
                  {bodyAnalysisData.current_weight_kg}kg
                </Text>
              </View>

              <Ionicons
                name="arrow-forward-outline"
                size={rf(20)}
                color={ResponsiveTheme.colors.textSecondary}
              />

              <View style={styles.weightGoalItem}>
                <Text style={styles.weightGoalLabel}>Target Weight</Text>
                <Text style={styles.weightGoalValue}>
                  {bodyAnalysisData.target_weight_kg}kg
                </Text>
              </View>

              <Ionicons
                name="time-outline"
                size={rf(20)}
                color={ResponsiveTheme.colors.textSecondary}
              />

              <View style={styles.weightGoalItem}>
                <Text style={styles.weightGoalLabel}>Timeline</Text>
                <Text style={styles.weightGoalValue}>
                  {bodyAnalysisData.target_timeline_weeks}w
                </Text>
              </View>
            </View>

            {formData.weekly_weight_loss_goal && (
              <View style={styles.weeklyRateInfo}>
                <Text style={styles.weeklyRateText}>
                  Safe weekly rate: {formData.weekly_weight_loss_goal}kg/week
                </Text>
              </View>
            )}
          </GlassCard>
        </View>
        <View style={styles.sectionBottomPad} />
      </GlassCard>
    );
  };

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
            uri: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80",
          }}
          overlayGradient={gradients.overlay.dark}
          contentPosition="center"
          height={200}
        >
          <Text style={styles.title}>Let's create your fitness profile</Text>
          <Text style={styles.subtitle}>
            Tell us about your goals, current fitness level, and workout
            preferences
          </Text>

          {/* Auto-save Indicator */}
          {isAutoSaving && (
            <View style={styles.autoSaveIndicator}>
              <Ionicons
                name="save-outline"
                size={rf(16)}
                color={ResponsiveTheme.colors.success}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.autoSaveText}>Saving...</Text>
            </View>
          )}
        </HeroSection>

        {/* Form Sections */}
        <View style={styles.content}>
          <AnimatedSection delay={0}>
            {renderGoalsAndActivitySection()}
          </AnimatedSection>

          <AnimatedSection delay={100}>
            {renderCurrentFitnessSection()}
          </AnimatedSection>

          <AnimatedSection delay={200}>
            {renderWorkoutPreferencesSection()}
          </AnimatedSection>

          <AnimatedSection delay={300}>
            {renderWorkoutStyleSection()}
          </AnimatedSection>

          <AnimatedSection delay={400}>
            {renderWeightGoalsSection()}
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
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: ResponsiveTheme.spacing.xs,
                }}
              >
                <Ionicons
                  name={
                    validationResult.is_valid
                      ? "checkmark-circle-outline"
                      : "warning-outline"
                  }
                  size={rf(20)}
                  color={
                    validationResult.is_valid
                      ? ResponsiveTheme.colors.success
                      : ResponsiveTheme.colors.warning
                  }
                  style={{ marginRight: ResponsiveTheme.spacing.xs }}
                />
                <Text style={styles.validationTitle}>
                  {validationResult.is_valid
                    ? "Ready to Continue"
                    : "Please Complete"}
                </Text>
              </View>
              <Text style={styles.validationPercentage}>
                {validationResult.completion_percentage}% Complete
              </Text>

              {validationResult.errors.length > 0 && (
                <View style={styles.validationErrors}>
                  <Text style={styles.validationErrorTitle}>Required:</Text>
                  {validationResult.errors.map((error, index) => (
                    <Text key={index} style={styles.validationErrorText}>
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
                  {validationResult.warnings.map((warning, index) => (
                    <Text key={index} style={styles.validationWarningText}>
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
              setTimeout(() => {
                onNext(formData);
              }, 100);
            }}
            scaleValue={0.96}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="chevron-forward" size={rf(18)} color="#FFFFFF" />
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
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
    marginBottom: ResponsiveTheme.spacing.sm,
    letterSpacing: -0.5,
    textAlign: "center",
  },

  subtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: ResponsiveTheme.fontSize.md * 1.5,
    marginBottom: ResponsiveTheme.spacing.md,
    textAlign: "center",
  },

  autoSaveIndicator: {
    flexDirection: "row",
    alignItems: "center",
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

  // Edge-to-edge section styles
  sectionEdgeToEdge: {
    marginTop: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.xl,
    marginHorizontal: -ResponsiveTheme.spacing.lg,
  },

  sectionTitlePadded: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
  },

  sectionBottomPad: {
    height: ResponsiveTheme.spacing.lg,
  },

  edgeToEdgeContentPadded: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  // Container that clips the scroll content within the card bounds
  scrollClipContainer: {
    width: "100%",
    overflow: "hidden",
    marginTop: ResponsiveTheme.spacing.sm,
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

  // ============================================================================
  // CONSISTENT CARD STYLES - Used for Goals, Location, Workout Times
  // ============================================================================

  consistentCardItem: {
    width: rw(105),
  },

  consistentCard: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    padding: ResponsiveTheme.spacing.sm,
    minHeight: rh(12),
    alignItems: "center",
  },

  consistentCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  consistentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  consistentCardIconCenter: {
    alignItems: "center",
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
    justifyContent: "center",
    alignItems: "center",
    marginTop: ResponsiveTheme.spacing.xs,
  },

  consistentCardIndicatorSelected: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },

  // ============================================================================
  // DURATION PILL STYLES - Compact horizontal pills
  // ============================================================================

  durationPill: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.full,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    minWidth: rw(70),
    alignItems: "center",
  },

  durationPillSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  durationPillText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  durationPillTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  // ============================================================================
  // COMPACT TOGGLE PILL STYLES - For Workout Style Preferences
  // ============================================================================

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
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
  },

  compactPillIconWrap: {
    width: rf(24),
    height: rf(24),
    borderRadius: rf(12),
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
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
    justifyContent: "center",
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

  stylePreferencesCompactGrid: {
    gap: ResponsiveTheme.spacing.xs,
  },

  // ============================================================================
  // INFO TOOLTIP MODAL STYLES
  // ============================================================================

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
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
    justifyContent: "space-between",
    alignItems: "center",
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
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  modalBenefitText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },

  // Inline card variants for edge-to-edge sections
  calculatedLevelCardInline: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  weightGoalsCardInline: {
    marginTop: ResponsiveTheme.spacing.xs,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    letterSpacing: -0.3,
    flexShrink: 1,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  readOnlyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${ResponsiveTheme.colors.warning}20`,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  readOnlyText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.warning,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  sectionSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: ResponsiveTheme.fontSize.sm * 1.4,
    flexShrink: 1,
  },

  fieldLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    flexShrink: 1,
  },

  fieldSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  // Goals Section
  goalField: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  autoSuggestText: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  autoSuggestTextContent: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    lineHeight: rf(18),
  },

  goalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
  },

  goalItem: {
    flex: 1,
    minWidth: "45%",
    maxWidth: "48%",
  },

  goalCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  goalCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  goalContent: {
    alignItems: "center",
    padding: ResponsiveTheme.spacing.md,
  },

  goalIcon: {
    fontSize: rf(32),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  goalTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
    flexShrink: 1,
  },

  goalTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  goalDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    flexShrink: 1,
  },

  // Activity Level Section
  activityField: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  activityCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  activityCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  activityContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: ResponsiveTheme.spacing.md,
  },

  activityIcon: {
    fontSize: rf(24),
    marginRight: ResponsiveTheme.spacing.md,
  },

  activityText: {
    flex: 1,
  },

  activityTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
    flexShrink: 1,
  },

  activityTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  activityDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    flexShrink: 1,
  },

  // Fitness Assessment Section
  fitnessGrid: {
    gap: ResponsiveTheme.spacing.lg,
  },

  fitnessItem: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  fitnessLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  // Sliders
  experienceSlider: {
    width: "100%",
  },

  experienceOption: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
  },

  experienceOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  experienceText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  experienceTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  frequencySlider: {
    width: "100%",
  },

  frequencyOption: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  frequencyOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  frequencyText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  frequencyTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  pushupsSlider: {
    width: "100%",
  },

  pushupsOption: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  pushupsOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  pushupsText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  pushupsTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  runningSlider: {
    width: "100%",
  },

  runningOption: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  runningOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  runningText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  runningTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  flexibilityGrid: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.sm,
  },

  flexibilityItem: {
    flex: 1,
  },

  flexibilityCard: {
    padding: ResponsiveTheme.spacing.md,
    alignItems: "center",
  },

  flexibilityCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  flexibilityIcon: {
    fontSize: rf(20),
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  flexibilityTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
  },

  flexibilityTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  // Workout Preferences Section
  preferenceField: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  locationGrid: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.sm,
  },

  locationItem: {
    flex: 1,
  },

  locationCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  locationCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  locationContent: {
    alignItems: "center",
  },

  locationIcon: {
    fontSize: rf(24),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  locationTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  locationTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  locationDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },

  durationSlider: {
    width: "100%",
  },

  durationOption: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  durationOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  durationText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  durationTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  intensityCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  intensityCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  intensityContent: {
    padding: ResponsiveTheme.spacing.md,
  },

  intensityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  intensityIcon: {
    fontSize: rf(24),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  intensityTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  intensityTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  intensityDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  // Workout Times Section
  workoutTimesGrid: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.sm,
  },

  workoutTimeItem: {
    flex: 1,
  },

  workoutTimeCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  workoutTimeCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  workoutTimeContent: {
    alignItems: "center",
  },

  workoutTimeIcon: {
    fontSize: rf(20),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  workoutTimeTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  workoutTimeTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  workoutTimeDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },

  // Style Preferences Section
  stylePreferencesGrid: {
    gap: ResponsiveTheme.spacing.sm,
  },

  stylePreferenceItem: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  stylePreferenceCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  stylePreferenceCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  stylePreferenceContent: {
    flex: 1,
  },

  stylePreferenceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  stylePreferenceIcon: {
    fontSize: rf(20),
  },

  stylePreferenceToggle: {
    marginLeft: ResponsiveTheme.spacing.md,
  },

  stylePreferenceTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  stylePreferenceTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  stylePreferenceDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: ResponsiveTheme.fontSize.xs * 1.3,
  },

  // Toggle Switch Styles
  toggleSwitch: {
    width: rf(40),
    height: rf(20),
    borderRadius: ResponsiveTheme.borderRadius.full,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: "transparent",
    justifyContent: "center",
    paddingHorizontal: ResponsiveTheme.spacing.xxs,
  },

  toggleSwitchActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },

  toggleThumb: {
    width: rf(16),
    height: rf(16),
    borderRadius: ResponsiveTheme.borderRadius.full,
    backgroundColor: ResponsiveTheme.colors.white,
    alignSelf: "flex-start",
  },

  toggleThumbActive: {
    alignSelf: "flex-end",
  },

  // Weight Goals Section
  weightGoalsCard: {
    padding: ResponsiveTheme.spacing.lg,
    backgroundColor: `${ResponsiveTheme.colors.secondary}10`,
    borderColor: ResponsiveTheme.colors.secondary,
    borderWidth: 1,
  },

  weightGoalsContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  weightGoalItem: {
    alignItems: "center",
  },

  weightGoalLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  weightGoalValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.secondary,
  },

  weightGoalArrow: {
    fontSize: rf(20),
    color: ResponsiveTheme.colors.textSecondary,
  },

  weeklyRateInfo: {
    alignItems: "center",
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  weeklyRateText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.success,
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

  validationTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
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
    lineHeight: ResponsiveTheme.fontSize.sm * 1.3,
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
    lineHeight: ResponsiveTheme.fontSize.sm * 1.3,
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: ResponsiveTheme.spacing.md,
  },

  backButtonCompact: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
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

  // Gym Equipment Styles
  gymEquipmentCard: {
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.success}08`,
    borderColor: `${ResponsiveTheme.colors.success}30`,
    borderWidth: 1,
  },

  gymEquipmentContent: {
    alignItems: "center",
  },

  gymEquipmentIcon: {
    fontSize: rf(32),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  gymEquipmentTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.success,
    marginBottom: ResponsiveTheme.spacing.xs,
    textAlign: "center",
  },

  gymEquipmentDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: rf(18),
  },

  gymEquipmentList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.sm,
  },

  gymEquipmentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  gymEquipmentItemIcon: {
    fontSize: rf(16),
    marginRight: ResponsiveTheme.spacing.xs,
  },

  gymEquipmentItemLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Calculated Level Styles
  calculatedLevelCard: {
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.primary}08`,
    borderColor: `${ResponsiveTheme.colors.primary}30`,
    borderWidth: 1,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  calculatedLevelContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  calculatedLevelIcon: {
    fontSize: rf(24),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  calculatedLevelText: {
    flex: 1,
  },

  calculatedLevelTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  calculatedLevelDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: ResponsiveTheme.fontSize.sm * 1.3,
  },

  calculatedLevelHint: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.primary,
    marginTop: ResponsiveTheme.spacing.xs,
    fontStyle: "italic",
  },

  // Recommended Workout Types Styles
  recommendedTypesCard: {
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.secondary}08`,
    borderColor: `${ResponsiveTheme.colors.secondary}30`,
    borderWidth: 1,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  recommendedTypesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  recommendedTypesIcon: {
    fontSize: rf(20),
    marginRight: ResponsiveTheme.spacing.xs,
  },

  recommendedTypesTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.secondary,
  },

  recommendedTypesDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: ResponsiveTheme.fontSize.sm * 1.3,
  },

  recommendedTypesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
  },

  recommendedTypeItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  recommendedTypeIcon: {
    fontSize: rf(16),
    marginRight: ResponsiveTheme.spacing.xs,
  },

  recommendedTypeLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Calculated Activity Level Styles (Read-only display)
  calculatedActivityCard: {
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.info}08`,
    borderColor: `${ResponsiveTheme.colors.info || ResponsiveTheme.colors.primary}30`,
    borderWidth: 1,
    marginTop: ResponsiveTheme.spacing.md,
  },

  calculatedActivityContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  calculatedActivityIcon: {
    fontSize: rf(32),
    marginRight: ResponsiveTheme.spacing.md,
  },

  calculatedActivityText: {
    flex: 1,
  },

  calculatedActivityTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  calculatedActivityDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
    lineHeight: ResponsiveTheme.fontSize.sm * 1.3,
  },

  calculatedActivityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${ResponsiveTheme.colors.warning}10`,
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginTop: ResponsiveTheme.spacing.sm,
  },

  calculatedActivityNoteIcon: {
    fontSize: rf(16),
    marginRight: ResponsiveTheme.spacing.xs,
  },

  calculatedActivityNoteText: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },
});

export default WorkoutPreferencesTab;
