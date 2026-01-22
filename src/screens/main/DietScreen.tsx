import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  RefreshControl,
  TextInput,
  Animated,
  Platform,
  PanResponder,
} from "react-native";
import { SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { GlassCard } from "../../components/ui/aurora/GlassCard";
import { AuroraSpinner } from "../../components/ui/aurora/AuroraSpinner";
import { haptics } from "../../utils/haptics";
import { gradients, toLinearGradientProps } from "../../theme/gradients";
import { rf, rp, rh, rw, rs } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { Button, THEME } from "../../components/ui";
import { Camera } from "../../components/advanced/Camera";
import { aiService } from "../../ai";
import { supabase } from "../../services/supabase";
import {
  useUserStore,
  useNutritionStore,
  useHydrationStore,
  useAchievementStore,
  useAppStateStore,
} from "../../stores";
import type { DayName } from "../../stores";
import Constants from "expo-constants";

// Simple Expo Go detection and safe loading
const isExpoGo =
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === "storeClient" ||
  (__DEV__ && !Constants.isDevice && !Constants.platform?.web);

let useWaterReminders: any = null;
if (!isExpoGo) {
  try {
    const notificationStore = require("../../stores/notificationStore");
    useWaterReminders = notificationStore.useWaterReminders;
  } catch (error) {
    console.warn("Failed to load water reminders:", error);
  }
}
import {
  foodRecognitionService,
  MealType,
} from "../../services/foodRecognitionService";
import { useAuth } from "../../hooks/useAuth";
import { useNutritionData } from "../../hooks/useNutritionData";
import { useCalculatedMetrics } from "../../hooks/useCalculatedMetrics";
import { Meal, DailyMealPlan } from "../../types/ai";
import { mealMotivationService } from "../../features/nutrition/MealMotivation";
import MacroDashboard from "../../components/nutrition/MacroDashboard";
import { Food } from "../../services/nutritionData";
import { WeeklyMealPlan, DayMeal } from "../../types/ai";
import { MealCard } from "../../components/diet/MealCard";
import { PremiumMealCard } from "../../components/diet/PremiumMealCard";
import { calculateMealSchedule, getMealTime } from "../../utils/mealSchedule";
import { completionTrackingService } from "../../services/completionTracking";
import FoodRecognitionTest from "../../components/debug/FoodRecognitionTest";
import MealTypeSelector from "../../components/diet/MealTypeSelector";
import AIMealsPanel from "../../components/diet/AIMealsPanel";
import CreateRecipeModal from "../../components/diet/CreateRecipeModal";
import JobStatusIndicator from "../../components/diet/JobStatusIndicator";
import {
  runQuickActionsTests,
  runFoodRecognitionE2ETests,
} from "../../utils/testQuickActions";
import { recognizedFoodLogger } from "../../services/recognizedFoodLogger";
import FoodRecognitionFeedback, {
  FoodFeedback,
} from "../../components/diet/FoodRecognitionFeedback";
import { foodRecognitionFeedbackService } from "../../services/foodRecognitionFeedbackService";
import PortionAdjustment from "../../components/diet/PortionAdjustment";
import { barcodeService } from "../../services/barcodeService";
import type { ScannedProduct } from "../../services/barcodeService";

// Health assessment generator - creates detailed analysis from product nutrition
const generateHealthAssessment = (product: ScannedProduct) => {
  const { nutrition, healthScore } = product;
  const score = healthScore ?? 50; // Use product's calculated score or default

  // Determine category based on score
  const getCategory = (
    s: number,
  ): "excellent" | "good" | "moderate" | "poor" | "unhealthy" => {
    if (s >= 80) return "excellent";
    if (s >= 60) return "good";
    if (s >= 40) return "moderate";
    if (s >= 20) return "poor";
    return "unhealthy";
  };

  // Generate breakdown scores
  const calorieScore = Math.max(
    0,
    Math.min(100, 100 - Math.max(0, (nutrition.calories - 200) / 4)),
  );
  const macroScore = Math.min(
    100,
    nutrition.protein * 2 + Math.max(0, 50 - nutrition.fat),
  );
  const sugarPenalty =
    (nutrition.sugar ?? 0) > 10 ? 30 : (nutrition.sugar ?? 0) > 5 ? 15 : 0;
  const sodiumPenalty =
    (nutrition.sodium ?? 0) > 1 ? 20 : (nutrition.sodium ?? 0) > 0.5 ? 10 : 0;

  // Generate recommendations based on nutrition
  const recommendations: string[] = [];
  const alerts: string[] = [];
  const healthBenefits: string[] = [];
  const concerns: string[] = [];

  if (nutrition.protein > 15)
    healthBenefits.push("High protein content supports muscle health");
  if (nutrition.fiber > 5) healthBenefits.push("Good source of dietary fiber");
  if (nutrition.calories < 150) healthBenefits.push("Low calorie option");

  if ((nutrition.sugar ?? 0) > 15) {
    alerts.push("High sugar content");
    recommendations.push("Consider limiting portion size due to sugar content");
  }
  if ((nutrition.sodium ?? 0) > 1.5) {
    alerts.push("High sodium content");
    concerns.push("May contribute to increased blood pressure");
  }
  if (nutrition.fat > 20) {
    concerns.push("High fat content per serving");
    recommendations.push("Balance with lower fat foods in other meals");
  }
  if (nutrition.protein < 5) {
    recommendations.push("Pair with a protein source for a balanced meal");
  }

  return {
    overallScore: score,
    category: getCategory(score),
    breakdown: {
      calories: {
        score: Math.round(calorieScore),
        status:
          calorieScore >= 70
            ? "good"
            : calorieScore >= 40
              ? "moderate"
              : "high",
        message:
          nutrition.calories < 200
            ? "Low calorie content"
            : nutrition.calories < 400
              ? "Moderate calories"
              : "High calorie content",
      },
      macros: {
        score: Math.round(macroScore),
        status:
          macroScore >= 70
            ? "balanced"
            : macroScore >= 40
              ? "acceptable"
              : "imbalanced",
        message: `${nutrition.protein}g protein, ${nutrition.carbs}g carbs, ${nutrition.fat}g fat`,
      },
      additives: {
        score: Math.round(100 - sugarPenalty),
        status:
          sugarPenalty === 0
            ? "good"
            : sugarPenalty <= 15
              ? "moderate"
              : "concerning",
        message:
          (nutrition.sugar ?? 0) > 10
            ? "Contains added sugars"
            : "Sugar content acceptable",
      },
      processing: {
        score: Math.round(100 - sodiumPenalty),
        status:
          sodiumPenalty === 0
            ? "minimal"
            : sodiumPenalty <= 10
              ? "moderate"
              : "high",
        message:
          (nutrition.sodium ?? 0) > 1
            ? "Higher sodium indicates processing"
            : "Sodium levels acceptable",
      },
    },
    recommendations:
      recommendations.length > 0
        ? recommendations
        : ["Enjoy as part of a balanced diet"],
    alerts,
    healthBenefits:
      healthBenefits.length > 0 ? healthBenefits : ["Part of a varied diet"],
    concerns,
    alternatives:
      score < 50
        ? ["Consider whole food alternatives", "Look for lower sodium options"]
        : undefined,
  };
};
import { ProductDetailsModal } from "../../components/diet/ProductDetailsModal";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { LargeProgressRing } from "../../components/ui/aurora/ProgressRing";
import { GuestSignUpScreen } from "./GuestSignUpScreen";

interface DietScreenProps {
  navigation?: any; // Navigation prop for routing
  route?: any; // Route params
  isActive?: boolean; // Whether this screen is currently active
}

export const DietScreen: React.FC<DietScreenProps> = ({
  navigation,
  route,
  isActive = true,
}) => {
  const [showCamera, setShowCamera] = useState(false);
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [showTestComponent, setShowTestComponent] = useState(false);
  const [showMealTypeSelector, setShowMealTypeSelector] = useState(false);
  const [showAIMealsPanel, setShowAIMealsPanel] = useState(false);
  const [showCreateRecipe, setShowCreateRecipe] = useState(false);
  const [userRecipes, setUserRecipes] = useState<any[]>([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackData, setFeedbackData] = useState<{
    recognizedFoods: any[];
    imageUri: string;
    mealId: string;
  } | null>(null);
  const [showPortionAdjustment, setShowPortionAdjustment] = useState(false);
  const [portionData, setPortionData] = useState<{
    recognizedFoods: any[];
    imageUri: string;
  } | null>(null);
  const [showMealPreparationModal, setShowMealPreparationModal] =
    useState(false);
  const [selectedMealForPreparation, setSelectedMealForPreparation] =
    useState<DayMeal | null>(null);
  // HYDRATION - Single Source of Truth from hydrationStore (ALL IN MILLILITERS)
  const {
    waterIntakeML,
    dailyGoalML: waterGoalML,
    addWater: hydrationAddWater,
    setDailyGoal: setHydrationGoal,
    checkAndResetIfNewDay,
  } = useHydrationStore();

  // STREAK - Single Source of Truth from achievementStore
  const { currentStreak: achievementStreak } = useAchievementStore();

  const waterReminders = useWaterReminders ? useWaterReminders() : null;

  // Use calculated metrics from onboarding - NO FALLBACKS
  const {
    metrics: calculatedMetrics,
    isLoading: metricsLoading,
    hasCalculatedMetrics,
    getWaterGoalLiters,
    getCalorieTarget,
    getMacroTargets,
  } = useCalculatedMetrics();

  // Sync hydration goal from calculated metrics on mount
  useEffect(() => {
    if (calculatedMetrics?.dailyWaterML) {
      setHydrationGoal(calculatedMetrics.dailyWaterML);
    }
    checkAndResetIfNewDay();
  }, [calculatedMetrics?.dailyWaterML]);

  // Convert ML to liters for display if needed (but store uses ML)
  const waterConsumedLiters = waterIntakeML / 1000;
  const waterGoalLiters = waterGoalML ? waterGoalML / 1000 : null;
  const [selectedMealType, setSelectedMealType] = useState<MealType>("lunch");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    mealId: string | null;
    position: { x: number; y: number };
  }>({
    visible: false,
    mealId: null,
    position: { x: 0, y: 0 },
  });

  // AI Integration State
  const [aiMeals, setAiMeals] = useState<Meal[]>([]);
  const [isGeneratingMeal, setIsGeneratingMeal] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Async Meal Plan Generation State
  const [asyncJob, setAsyncJob] = useState<{
    jobId: string;
    status: "pending" | "processing" | "completed" | "failed" | "cancelled";
    error?: string;
    createdAt: string;
    estimatedTimeRemaining?: number;
    generationTimeMs?: number;
  } | null>(null);
  const asyncJobPollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Guest Sign Up State
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);

  // Barcode Scanning State
  const [cameraMode, setCameraMode] = useState<"food" | "progress" | "barcode">(
    "food",
  );
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(
    null,
  );
  const [productHealthAssessment, setProductHealthAssessment] =
    useState<any>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false);

  // Swipe State
  const [mealSwipePositions, setMealSwipePositions] = useState<
    Record<string, Animated.Value>
  >({});
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<number>>(
    new Set(),
  );
  const [suggestionSwipeStates, setSuggestionSwipeStates] = useState<
    Record<number, { translateY: Animated.Value; opacity: Animated.Value }>
  >({});

  // Card Flip State
  const [cardFlipStates, setCardFlipStates] = useState<
    Record<number, Animated.Value>
  >({});
  const [addedToPlan, setAddedToPlan] = useState<Set<number>>(new Set());

  // Use nutrition store for meal plan state
  const {
    weeklyMealPlan,
    isGeneratingPlan,
    mealProgress,
    saveWeeklyMealPlan,
    setWeeklyMealPlan,
    setGeneratingPlan,
    getMealProgress,
    updateMealProgress,
    completeMeal,
    loadWeeklyMealPlan,
    loadData,
    // SINGLE SOURCE OF TRUTH: Use store selector for consumed nutrition
    // This calculates from mealProgress, avoiding desync with Supabase
    getTodaysConsumedNutrition,
  } = useNutritionStore();

  // Day Selection - Single Source of Truth from appStateStore
  const { selectedDay, setSelectedDay } = useAppStateStore();
  const [forceUpdate, setForceUpdate] = useState(0);

  // Animation refs for micro-interactions
  const calorieRingProgress = useRef(new Animated.Value(0)).current;
  const proteinCount = useRef(new Animated.Value(0)).current;
  const carbsCount = useRef(new Animated.Value(0)).current;
  const fatsCount = useRef(new Animated.Value(0)).current;
  const mealCard1Opacity = useRef(new Animated.Value(0)).current;
  const mealCard1TranslateX = useRef(new Animated.Value(-50)).current;
  const mealCard2Opacity = useRef(new Animated.Value(0)).current;
  const mealCard2TranslateX = useRef(new Animated.Value(-50)).current;
  const mealCard3Opacity = useRef(new Animated.Value(0)).current;
  const mealCard3TranslateX = useRef(new Animated.Value(-50)).current;
  const mealCard4Opacity = useRef(new Animated.Value(0)).current;
  const mealCard4TranslateX = useRef(new Animated.Value(-50)).current;
  const waterWaveOffset = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabRotation = useRef(new Animated.Value(0)).current;
  const waterButton1Ripple = useRef(new Animated.Value(0)).current;
  const waterButton2Ripple = useRef(new Animated.Value(0)).current;
  const waterButton3Ripple = useRef(new Animated.Value(0)).current;

  // Ripple effect handler
  const triggerRipple = (rippleAnim: Animated.Value) => {
    rippleAnim.setValue(0);
    Animated.timing(rippleAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  // Force re-render when meal progress changes
  const forceRefresh = useCallback(() => {
    console.log("[REFRESH] DietScreen: Force refresh triggered");
    setForceUpdate((prev) => prev + 1);
  }, []);

  // Debug: Monitor weeklyMealPlan changes
  useEffect(() => {
    console.log(
      `[DEBUG] weeklyMealPlan changed:`,
      weeklyMealPlan
        ? `Plan: ${weeklyMealPlan.planTitle}, meals: ${weeklyMealPlan.meals?.length}`
        : "null",
    );
  }, [weeklyMealPlan]);

  // Monitor meal progress changes and force refresh
  useEffect(() => {
    console.log("[DEBUG] mealProgress changed:", mealProgress);
    // Force a small delay to ensure state is fully updated
    const timeout = setTimeout(() => {
      forceRefresh();
    }, 50);

    return () => clearTimeout(timeout);
  }, [mealProgress, forceRefresh]);

  // Subscribe to completion events for real-time updates
  useEffect(() => {
    console.log("[EVENT] DietScreen: Setting up completion event listener");

    const unsubscribe = completionTrackingService.subscribe((event) => {
      console.log("[EVENT] DietScreen: Received completion event:", event);

      if (event.type === "meal") {
        console.log(
          "[MEAL] DietScreen: Meal completion event received for:",
          event.itemId,
        );

        // Force refresh the UI to show updated completion status
        setTimeout(() => {
          console.log(
            "[REFRESH] DietScreen: Triggering refresh due to meal completion event",
          );
          forceRefresh();
        }, 100);
      }
    });

    return () => {
      console.log("[EVENT] DietScreen: Cleaning up completion event listener");
      unsubscribe();
    };
  }, [forceRefresh]);

  // Handle navigation parameters when returning from cooking session
  useEffect(() => {
    if (route?.params?.mealCompleted) {
      console.log(
        "[NAV] DietScreen: Returned from cooking session with completion:",
        {
          completedMealId: route.params.completedMealId,
          timestamp: route.params.timestamp,
        },
      );

      // Force immediate refresh when returning from a completed cooking session
      forceRefresh();

      // Clear the navigation parameters to prevent duplicate triggers
      if (navigation?.setParams) {
        navigation.setParams({
          mealCompleted: undefined,
          completedMealId: undefined,
          timestamp: undefined,
        });
      }
    }
  }, [route?.params, navigation, forceRefresh]);

  // Custom focus effect - refresh data when screen becomes active
  useEffect(() => {
    if (isActive) {
      console.log(
        "[REFRESH] DietScreen became active - refreshing meal data...",
      );
      console.log(
        "[REFRESH] DietScreen: Current meal progress before refresh:",
        mealProgress,
      );

      const refreshMealData = async () => {
        try {
          await loadData(); // Refresh nutrition store data
          console.log("[SUCCESS] Meal data refreshed on focus");

          // Log meal progress after refresh
          setTimeout(() => {
            const currentProgress = useNutritionStore.getState().mealProgress;
            console.log(
              "[REFRESH] DietScreen: Meal progress after refresh:",
              currentProgress,
            );
          }, 100);
        } catch (error) {
          console.error("[ERROR] Error refreshing meal data on focus:", error);
        }
      };

      refreshMealData();
    }
  }, [isActive, loadData]);

  // Micro-interaction: Calorie ring and macro count-up animation on mount
  useEffect(() => {
    // Animate calorie ring progress
    Animated.timing(calorieRingProgress, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: false,
    }).start();

    // Animate macro counts with stagger
    Animated.stagger(150, [
      Animated.timing(proteinCount, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.timing(carbsCount, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.timing(fatsCount, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  // Micro-interaction: Meal cards staggered slide-in animation
  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(mealCard1Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(mealCard1TranslateX, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(mealCard2Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(mealCard2TranslateX, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(mealCard3Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(mealCard3TranslateX, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(mealCard4Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(mealCard4TranslateX, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  // Micro-interaction: Water wave continuous animation
  useEffect(() => {
    const waveAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(waterWaveOffset, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(waterWaveOffset, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    waveAnimation.start();
    return () => waveAnimation.stop();
  }, []);

  // Micro-interaction: FAB scale pulse animation
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(fabScale, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fabScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, []);

  // Load existing meal plan on component mount
  useEffect(() => {
    const loadExistingMealPlan = async () => {
      try {
        console.log("[DEBUG] Loading existing meal plan from store...");
        await loadData(); // Load all nutrition data

        const existingPlan = await loadWeeklyMealPlan();
        if (existingPlan) {
          console.log(
            "[SUCCESS] Found existing meal plan:",
            existingPlan.planTitle,
          );
          setWeeklyMealPlan(existingPlan);

          // Comprehensive retrieval test
          console.log("[TEST] COMPREHENSIVE RETRIEVAL TEST:");
          const allDays = [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ];
          const mealAvailability = allDays.map((day) => {
            const mealsForDay = existingPlan.meals.filter(
              (meal) => meal.dayOfWeek === day,
            );
            return {
              day,
              mealCount: mealsForDay.length,
              mealTypes: mealsForDay.map((m) => m.type),
            };
          });
          console.log(
            "[ANALYTICS] Meal availability by day:",
            mealAvailability,
          );

          const totalMeals = existingPlan.meals.length;
          const expectedMeals = 21; // 7 days × 3 meals
          console.log(
            `[ANALYTICS] Total meals: ${totalMeals}/${expectedMeals} (${Math.round((totalMeals / expectedMeals) * 100)}% complete)`,
          );
        } else {
          console.log("[DEBUG] No existing meal plan found");
        }
      } catch (error) {
        console.error("[ERROR] Error loading meal plan:", error);
      }
    };

    loadExistingMealPlan();
  }, []); // Run once on mount

  // Navigation helper for profile completion
  const navigateToProfileCompletion = async (missingSection: string) => {
    if (navigation) {
      // Try to navigate to profile screen
      try {
        // Store the intent to edit diet preferences
        const AsyncStorage =
          require("@react-native-async-storage/async-storage").default;
        await AsyncStorage.setItem(
          "profileEditIntent",
          JSON.stringify({
            section: "dietPreferences",
            fromScreen: "Diet",
            timestamp: Date.now(),
          }),
        );

        console.log(
          "[NAV] DietScreen: Stored edit intent and navigating to Profile",
        );
        navigation.navigate("Profile");
      } catch (error) {
        console.log("Navigation not available, showing alternative");
        showProfileCompletionModal(missingSection);
      }
    } else {
      showProfileCompletionModal(missingSection);
    }
  };

  // Show modal when navigation is not available
  const showProfileCompletionModal = (missingSection: string) => {
    Alert.alert(
      "Complete Your Profile",
      `To generate personalized meal plans, please complete your ${missingSection}.\n\nYou can update your profile from the Profile tab.`,
      [
        { text: "OK" },
        {
          text: "Go to Profile",
          onPress: () => {
            // This will be enhanced when we implement profile editing
            Alert.alert(
              "Profile",
              "Profile editing functionality will be available soon!",
            );
          },
        },
      ],
    );
  };

  // Authentication and user data
  const { user, isAuthenticated, isGuestMode } = useAuth();
  const { profile } = useUserStore();

  // Check if user can access meal features (authenticated or in guest mode)
  const canAccessMealFeatures = isAuthenticated || isGuestMode;

  // Calculate meal schedule from user's wake/sleep times
  const mealSchedule = useMemo(() => {
    return calculateMealSchedule(
      profile?.personalInfo?.wake_time,
      profile?.personalInfo?.sleep_time,
    );
  }, [profile?.personalInfo?.wake_time, profile?.personalInfo?.sleep_time]);

  // Real nutrition data with Track B integration
  const {
    foods,
    foodsLoading,
    foodsError,
    loadFoods,
    userMeals,
    userMealsLoading,
    userMealsError,
    loadUserMeals,
    dietPreferences,
    nutritionGoals,
    dailyNutrition,
    loadDailyNutrition,
    logMeal,
    trackBStatus,
    refreshAll,
    clearErrors,
  } = useNutritionData();

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Animate in on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleCameraCapture = async (imageUri: string) => {
    console.log(
      "[CAMERA] NEW Food Recognition System - Image captured:",
      imageUri,
    );
    console.log("[MEAL] Selected meal type:", selectedMealType);
    console.log("[PROFILE] Profile available:", !!profile);

    setShowCamera(false);

    // Check if guest user - AI features require authentication
    if (isGuestMode || !user?.id) {
      Alert.alert(
        "Sign Up for AI Features",
        "AI food recognition uses advanced machine learning to analyze your meals with 90%+ accuracy.\n\nCreate a free account to:\n• Scan food photos instantly\n• Get personalized nutrition insights\n• Track your meals automatically",
        [
          { text: "Maybe Later", style: "cancel" },
          {
            text: "Sign Up Free",
            onPress: () => setShowGuestSignUp(true),
            style: "default",
          },
        ],
      );
      return;
    }

    // Check if we have the food recognition service
    if (!foodRecognitionService) {
      Alert.alert(
        "Error",
        "Food recognition service not available. Please check your setup.",
      );
      return;
    }

    try {
      setIsGeneratingMeal(true);
      setAiError(null);

      // Show processing alert
      Alert.alert(
        "AI Food Recognition",
        `Analyzing your ${selectedMealType} with our advanced AI...`,
        [{ text: "Processing...", style: "cancel" }],
      );

      // Analyze food with the selected meal type (Workers backend handles API keys)
      console.log("[DEBUG] Calling food recognition service...");
      const dietaryRestrictions =
        profile?.dietPreferences?.allergies || undefined;
      const result = await foodRecognitionService.recognizeFood(
        imageUri,
        selectedMealType,
        dietaryRestrictions,
      );
      console.log("[ANALYTICS] Food recognition result:", result);

      if (result.success && result.foods) {
        const recognizedFoods = result.foods;
        const totalCalories = recognizedFoods.reduce(
          (sum: number, food: any) => sum + food.nutrition.calories,
          0,
        );

        // Show success result with feedback option
        Alert.alert(
          "Food Recognition Complete!",
          `Recognized ${recognizedFoods.length} food item(s):\n\n` +
            `${recognizedFoods.map((food: any) => `• ${food.name} (${Math.round(food.nutrition.calories)} cal)`).join("\n")}\n\n` +
            `Total: ${Math.round(totalCalories)} calories\n` +
            `Confidence: ${result.overallConfidence}%`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Adjust Portions",
              onPress: () => {
                setPortionData({
                  recognizedFoods,
                  imageUri,
                });
                setShowPortionAdjustment(true);
              },
            },
            {
              text: "Give Feedback",
              onPress: () => {
                setFeedbackData({
                  recognizedFoods,
                  imageUri,
                  mealId: `temp_${Date.now()}`, // Temporary ID, will be updated after logging
                });
                setShowFeedbackModal(true);
              },
            },
            {
              text: "Log Meal",
              onPress: async () => {
                try {
                  console.log("[MEAL] Starting meal logging process...");

                  // Use the recognized food logger service
                  // NO FALLBACK: Require authenticated user
                  if (!user?.id) {
                    console.warn("⚠️ Cannot log food: user not authenticated");
                    Alert.alert(
                      "Sign In Required",
                      "Please sign in to log meals.",
                    );
                    return;
                  }
                  const logResult =
                    await recognizedFoodLogger.logRecognizedFoods(
                      user.id,
                      recognizedFoods,
                      selectedMealType,
                    );

                  if (logResult.success) {
                    // Show success with detailed information
                    Alert.alert(
                      "Meal Logged Successfully!",
                      `${recognizedFoods.length} food item${recognizedFoods.length !== 1 ? "s" : ""} logged\n` +
                        `Total: ${logResult.totalCalories} calories\n` +
                        `Meal Type: ${selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}\n` +
                        `Meal ID: ${logResult.mealId?.slice(-8)}\n\n` +
                        `Your nutrition tracking has been updated!`,
                      [{ text: "Awesome!" }],
                    );

                    console.log("[SUCCESS] Meal logged successfully:", {
                      mealId: logResult.mealId,
                      totalCalories: logResult.totalCalories,
                      foodCount: recognizedFoods.length,
                    });

                    // Update feedback data with real meal ID
                    if (feedbackData) {
                      setFeedbackData((prev) =>
                        prev ? { ...prev, mealId: logResult.mealId! } : null,
                      );
                    }

                    // Refresh nutrition data to show updated totals
                    await loadDailyNutrition();
                    await refreshAll(); // Refresh all nutrition data
                  } else {
                    throw new Error(logResult.error || "Failed to log meal");
                  }
                } catch (logError) {
                  console.error("[ERROR] Failed to log meal:", logError);

                  const errorMessage =
                    logError instanceof Error
                      ? logError.message
                      : "Unknown error occurred";
                  Alert.alert(
                    "Meal Logging Failed",
                    `Error: ${errorMessage}\n\nThe food was recognized successfully, but we couldn't save it to your meal log. Please try again or check your connection.`,
                    [
                      { text: "OK" },
                      {
                        text: "Retry",
                        onPress: async () => {
                          // Retry the logging process
                          try {
                            if (!user?.id) {
                              console.warn(
                                "⚠️ Cannot retry log: user not authenticated",
                              );
                              return;
                            }
                            const retryResult =
                              await recognizedFoodLogger.logRecognizedFoods(
                                user.id,
                                recognizedFoods,
                                selectedMealType,
                              );

                            if (retryResult.success) {
                              Alert.alert(
                                "Success!",
                                "Meal logged successfully on retry!",
                              );
                              await loadDailyNutrition();
                              await refreshAll();
                            } else {
                              Alert.alert(
                                "Still Failed",
                                "Please try again later or contact support.",
                              );
                            }
                          } catch (retryError) {
                            Alert.alert(
                              "Retry Failed",
                              "Please try again later.",
                            );
                          }
                        },
                      },
                    ],
                  );
                }
              },
            },
          ],
        );
      } else {
        throw new Error(result.error || "Food recognition failed");
      }
    } catch (error) {
      console.error("[ERROR] Food recognition failed:", error);
      console.error("[ERROR] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });

      setAiError(
        error instanceof Error ? error.message : "Food recognition failed",
      );

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Check if it's an authentication issue
      if (
        errorMessage.includes("sign in") ||
        errorMessage.includes("session") ||
        errorMessage.includes("Authentication")
      ) {
        Alert.alert(
          "Sign In Required",
          "Please sign in to use AI food recognition. Your photos will be analyzed securely on our servers.",
          [
            { text: "OK" },
            {
              text: "Sign In",
              onPress: () => setShowGuestSignUp(true),
            },
          ],
        );
      } else if (
        errorMessage.includes("Network") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("fetch")
      ) {
        Alert.alert(
          "Connection Error",
          "Unable to connect to the food recognition service. Please check your internet connection and try again.",
          [
            { text: "OK" },
            { text: "Try Again", onPress: () => setShowCamera(true) },
          ],
        );
      } else {
        Alert.alert(
          "Recognition Failed",
          `Error: ${errorMessage}\n\nPlease try again with a clearer photo of your food.`,
          [
            { text: "OK" },
            { text: "Try Again", onPress: () => setShowCamera(true) },
          ],
        );
      }
    } finally {
      setIsGeneratingMeal(false);
    }
  };

  // Barcode scanning handlers
  const handleBarcodeScanned = async (barcode: string, type: string) => {
    console.log("[DEBUG] Barcode scanned:", { barcode, type });
    setIsProcessingBarcode(true);
    setShowCamera(false);

    try {
      // Show processing alert
      Alert.alert(
        "Scanning Product",
        "Analyzing product information and health assessment...",
        [{ text: "Processing...", style: "cancel" }],
      );

      // Lookup product using barcode service
      const lookupResult = await barcodeService.lookupProduct(barcode);

      if (!lookupResult.success || !lookupResult.product) {
        Alert.alert(
          "Product Not Found",
          lookupResult.error ||
            "This product is not in our database. Try scanning a different barcode or add the product manually.",
          [{ text: "OK" }],
        );
        return;
      }

      const product = lookupResult.product;
      console.log("[SUCCESS] Product found:", product.name);

      // Generate health assessment from product nutrition data
      const healthAssessment = generateHealthAssessment(product);

      console.log("[SUCCESS] Health assessment completed:", {
        score: healthAssessment.overallScore,
        category: healthAssessment.category,
      });

      // Update state and show modal
      setScannedProduct(product);
      setProductHealthAssessment(healthAssessment);
      setShowProductModal(true);

      // Success alert
      Alert.alert(
        "Product Scanned Successfully!",
        `Found: ${product.name}\nHealth Score: ${healthAssessment.overallScore}/100 (${healthAssessment.category})`,
        [{ text: "View Details", onPress: () => setShowProductModal(true) }],
      );
    } catch (error) {
      console.error("[ERROR] Barcode scanning error:", error);
      Alert.alert("Scanning Error", `Failed to process barcode: ${error}`, [
        { text: "OK" },
      ]);
    } finally {
      setIsProcessingBarcode(false);
    }
  };

  const handleScanProduct = () => {
    setCameraMode("barcode");
    setShowCamera(true);
  };

  const handleAddProductToMeal = (product: ScannedProduct) => {
    // Check if guest user - meal logging requires authentication
    if (isGuestMode || !user?.id) {
      Alert.alert(
        "Sign Up to Log Meals",
        `You scanned: ${product.name}\n\nCreate a free account to:\n• Save meals to your food diary\n• Track daily nutrition\n• Get personalized recommendations`,
        [
          { text: "Just Viewing", style: "cancel" },
          {
            text: "Sign Up Free",
            onPress: () => {
              setShowProductModal(false);
              setShowGuestSignUp(true);
            },
            style: "default",
          },
        ],
      );
      return;
    }

    // Add product to current meal - integration with meal logging system
    Alert.alert("Add to Meal", `Add ${product.name} to your current meal?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Add",
        onPress: async () => {
          try {
            // Log the scanned product as a food entry
            const foodEntry = {
              id: `barcode_${product.barcode}_${Date.now()}`,
              name: product.name,
              category: "main" as const,
              cuisine: "international" as const,
              portionSize: {
                estimatedGrams: product.nutrition.servingSize || 100,
                confidence: 95,
                servingType: "medium" as const,
              },
              nutrition: product.nutrition,
              confidence: product.confidence,
              enhancementSource: "barcode" as const,
              estimatedGrams: product.nutrition.servingSize || 100,
              servingDescription: product.nutrition.servingUnit || "serving",
              nutritionPer100g: product.nutrition,
            } as any;

            const logResult = await recognizedFoodLogger.logRecognizedFoods(
              user.id,
              [foodEntry],
              selectedMealType,
            );

            if (logResult.success) {
              Alert.alert(
                "Added to Meal",
                `${product.name} (${product.nutrition.calories} cal) has been added to your ${selectedMealType}.`,
              );
              setShowProductModal(false);
              await loadDailyNutrition();
              await refreshAll();
            } else {
              throw new Error(logResult.error || "Failed to log meal");
            }
          } catch (error) {
            console.error("[ERROR] Failed to add product to meal:", error);
            Alert.alert(
              "Error",
              "Failed to add product to meal. Please try again.",
            );
          }
        },
      },
    ]);
  };

  // Enhanced scan food handler with meal type selection
  const handleScanFood = () => {
    setShowMealTypeSelector(true);
  };

  const handleMealTypeSelected = (mealType: MealType) => {
    setSelectedMealType(mealType);
    setShowMealTypeSelector(false);

    // Small delay for smooth transition
    setTimeout(() => {
      setShowCamera(true);
    }, 300);
  };

  // Enhanced AI Meal Generation Function with comprehensive options
  const generateAIMeal = async (mealType: string, options?: any) => {
    // Handle different action types
    if (mealType === "daily_plan") {
      return generateDailyMealPlan();
    }

    // AUTHENTICATION CHECK: AI generation requires authenticated user
    if (!user?.id || user.id.startsWith("guest")) {
      console.log("[AUTH] User not authenticated for AI generation:", user?.id);
      Alert.alert(
        "Sign Up Required",
        "Create an account to generate personalized AI meals. Your preferences will be used for customized recommendations.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign Up",
            onPress: () => setShowGuestSignUp(true),
          },
        ],
      );
      return;
    }

    if (!profile?.personalInfo || !profile?.fitnessGoals) {
      Alert.alert(
        "Profile Incomplete",
        "Please complete your profile to generate personalized meals.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Complete Profile",
            onPress: () => navigateToProfileCompletion("Personal Information"),
          },
        ],
      );
      return;
    }

    setIsGeneratingMeal(true);
    setAiError(null);

    try {
      // Enhanced preferences with options
      // CRITICAL: Use calculated metrics from onboarding - throw if not available
      const calorieTarget = getCalorieTarget(); // SINGLE SOURCE - from calculatedMetrics only
      if (!calorieTarget) {
        throw new Error(
          "Calorie target not calculated. Please complete onboarding.",
        );
      }

      const preferences = {
        dietaryRestrictions: dietPreferences?.allergies || [],
        cuisinePreference: options?.cuisinePreference || "any",
        prepTimeLimit: options?.quickEasy ? 20 : 30,
        calorieTarget: calorieTarget,
        dietType: dietPreferences?.diet_type || [],
        dislikes: dietPreferences?.dislikes || [],
        customOptions: options?.customOptions || {},
        suggestions: options?.suggestions || [],
      };

      // Handle special action types
      let actualMealType = mealType;
      const specialActionType = [
        "meal_prep",
        "goal_focused",
        "quick_easy",
      ].includes(mealType)
        ? mealType
        : undefined;
      if (specialActionType) {
        actualMealType = "lunch"; // Default to lunch for special actions
        // Note: specialAction is handled in the custom options if needed
        (preferences as any).specialAction = specialActionType;
      }

      const response = await aiService.generateMeal(
        profile.personalInfo,
        profile.fitnessGoals,
        actualMealType as "breakfast" | "lunch" | "dinner" | "snack",
        preferences as any,
      );

      if (response.success && response.data) {
        setAiMeals((prev) => [response.data!, ...prev]);

        // Optionally save the generated meal to the database
        if (user?.id && response.data.ingredients && foods.length > 0) {
          // Convert AI meal to meal log format (simplified)
          const mealData = {
            name: response.data.name,
            type: mealType as "breakfast" | "lunch" | "dinner" | "snack",
            foods: response.data.ingredients
              .slice(0, 3)
              .map((ingredient: any, index: number) => ({
                food_id: foods[index % foods.length]?.id || foods[0]?.id,
                quantity_grams: 100, // Default quantity
              }))
              .filter((f) => f.food_id),
          };

          if (mealData.foods.length > 0) {
            await logMeal(mealData);
          }
        }

        Alert.alert(
          "Meal Generated!",
          `Your personalized ${mealType} is ready!`,
          [{ text: "Great!" }],
        );
      } else {
        setAiError(response.error || "Failed to generate meal");
        Alert.alert(
          "Generation Failed",
          response.error || "Failed to generate meal",
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setAiError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsGeneratingMeal(false);
    }
  };

  // Generate Daily Meal Plan
  const generateDailyMealPlan = async () => {
    // AUTHENTICATION CHECK: AI generation requires authenticated user
    if (!user?.id || user.id.startsWith("guest")) {
      console.log("[AUTH] User not authenticated for AI generation:", user?.id);
      Alert.alert(
        "Sign Up Required",
        "Create an account to generate personalized AI meal plans.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign Up",
            onPress: () => setShowGuestSignUp(true),
          },
        ],
      );
      return;
    }

    if (!profile?.personalInfo || !profile?.fitnessGoals) {
      Alert.alert(
        "Profile Incomplete",
        "Please complete your profile to generate meal plans.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Complete Profile",
            onPress: () => navigateToProfileCompletion("Personal Information"),
          },
        ],
      );
      return;
    }

    setIsGeneratingMeal(true);
    setAiError(null);

    try {
      // CRITICAL: Use calculated metrics from onboarding - throw if not available
      const userCalorieTarget = getCalorieTarget(); // SINGLE SOURCE - calculatedMetrics only
      if (!userCalorieTarget) {
        throw new Error(
          "Calorie target not calculated. Please complete onboarding.",
        );
      }

      const preferences = {
        calorieTarget: userCalorieTarget,
        dietaryRestrictions: dietPreferences?.allergies || [],
        cuisinePreferences: ["any"],
      };

      const response = await aiService.generateDailyMealPlan(
        profile.personalInfo,
        profile.fitnessGoals,
        preferences as any,
      );

      if (response.success && response.data) {
        setAiMeals((prev) => [...response.data!.meals, ...prev]);
        Alert.alert(
          "Daily Meal Plan Generated!",
          `Your complete meal plan for today is ready!`,
          [{ text: "Awesome!" }],
        );
      } else {
        setAiError(response.error || "Failed to generate meal plan");
        Alert.alert(
          "Generation Failed",
          response.error || "Failed to generate meal plan",
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setAiError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsGeneratingMeal(false);
    }
  };

  // Generate Weekly Meal Plan (ASYNC - handles 60-120 second generation time)
  const generateWeeklyMealPlan = async () => {
    console.log("[MEAL] Generate Weekly Plan button pressed!");

    // AUTHENTICATION CHECK: AI generation requires authenticated user
    // Guest users only have local storage data - backend needs Supabase data
    if (!user?.id || user.id.startsWith("guest")) {
      console.log("[AUTH] User not authenticated for AI generation:", user?.id);
      Alert.alert(
        "Sign Up Required",
        "Create an account to generate personalized AI meal plans. Your data will be securely stored and used for personalized recommendations.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign Up",
            onPress: () => setShowGuestSignUp(true),
          },
        ],
      );
      return;
    }

    console.log("[DEBUG] Profile check:", {
      personalInfo: !!profile?.personalInfo,
      fitnessGoals: !!profile?.fitnessGoals,
      dietPreferences: !!profile?.dietPreferences || !!dietPreferences,
    });

    // Check what's missing and provide specific guidance
    const missingItems = [];
    if (!profile?.personalInfo) missingItems.push("Personal Information");
    if (!profile?.fitnessGoals) missingItems.push("Fitness Goals");
    if (!profile?.dietPreferences && !dietPreferences)
      missingItems.push("Diet Preferences");

    if (missingItems.length > 0) {
      const primaryMissing = missingItems[0];
      console.log("[ERROR] Profile incomplete:", missingItems);
      Alert.alert(
        "Profile Incomplete",
        `Please complete the following to generate your meal plan:\n\n• ${missingItems.join("\n• ")}\n\nWould you like to complete your profile now?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Complete Profile",
            onPress: () => navigateToProfileCompletion(primaryMissing),
          },
        ],
      );
      return;
    }

    setGeneratingPlan(true);
    setAiError(null);

    try {
      // CRITICAL: Get calorie target from calculated metrics - required for meal generation
      const userCalorieTarget = getCalorieTarget(); // SINGLE SOURCE - calculatedMetrics only
      if (!userCalorieTarget) {
        throw new Error(
          "Calorie target not calculated. Please complete onboarding.",
        );
      }

      console.log("[MEAL] Generating weekly meal plan (ASYNC MODE)...");
      console.log("[DEBUG] Calorie target:", userCalorieTarget);

      // Use ASYNC aiService for meal plan generation (handles 60-120s generation)
      const response = await aiService.generateWeeklyMealPlanAsync(
        profile!.personalInfo,
        profile!.fitnessGoals,
        1, // weekNumber
        {
          bodyMetrics: profile!.bodyMetrics,
          dietPreferences: (profile!.dietPreferences ||
            dietPreferences ||
            undefined) as any,
          calorieTarget: userCalorieTarget,
        },
      );

      console.log("[DEBUG] Response from async generator:", response);

      if (!response.success || !response.data) {
        throw new Error(
          response.error || "Failed to start meal plan generation",
        );
      }

      // Handle cache hit - immediate result
      if (response.data.type === "cache_hit") {
        console.log("[SUCCESS] Cache hit - meal plan available immediately!");
        await handleMealPlanResult(response.data.plan);
        setGeneratingPlan(false);
        return;
      }

      // Handle async job started - begin polling
      if (response.data.type === "job_started") {
        console.log("[ASYNC] Job started:", response.data.jobId);

        // Set initial async job state
        setAsyncJob({
          jobId: response.data.jobId,
          status: "pending",
          createdAt: new Date().toISOString(),
          estimatedTimeRemaining: response.data.estimatedTimeMinutes * 60,
        });

        // Start polling for job completion
        startJobPolling(response.data.jobId);

        // Keep generating state true - UI shows JobStatusIndicator
        return;
      }
    } catch (error) {
      console.error("Error starting weekly meal plan generation:", error);
      setAiError(
        error instanceof Error ? error.message : "Failed to generate meal plan",
      );
      Alert.alert(
        "Error",
        "Failed to start meal plan generation. Please try again.",
      );
      setGeneratingPlan(false);
    }
  };

  // Handle completed meal plan result
  const handleMealPlanResult = async (weeklyPlan: WeeklyMealPlan) => {
    console.log("[SUCCESS] Weekly meal plan generated successfully");

    // Save to store and database
    await saveWeeklyMealPlan(weeklyPlan);

    // Ensure state is updated (backup approach)
    setWeeklyMealPlan(weeklyPlan);

    setForceUpdate((prev) => prev + 1); // Force re-render
    console.log("[DEBUG] Meal plan saved to store and database");

    // Analytics logging
    const allDays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    const generatedMealsByDay = allDays.map((day) => {
      const mealsForDay = weeklyPlan.meals.filter(
        (meal) => meal.dayOfWeek === day,
      );
      return {
        day,
        mealCount: mealsForDay.length,
        mealTypes: mealsForDay.map((m) => m.type),
      };
    });
    console.log("[ANALYTICS] Generated meals by day:", generatedMealsByDay);

    const totalGenerated = weeklyPlan.meals.length;
    const expectedTotal = 21; // 7 days × 3 meals
    console.log(
      `[ANALYTICS] Generation completeness: ${totalGenerated}/${expectedTotal} meals (${Math.round((totalGenerated / expectedTotal) * 100)}%)`,
    );

    Alert.alert(
      "Meal Plan Generated!",
      `Your personalized 7-day meal plan "${weeklyPlan.planTitle}" is ready!`,
      [{ text: "View Plan", onPress: () => {} }],
    );
  };

  // Poll for async job completion
  const startJobPolling = (jobId: string) => {
    let pollAttempt = 0;
    const maxAttempts = 60; // ~3 minutes max
    const initialInterval = 3000; // 3 seconds
    const maxInterval = 15000; // 15 seconds

    const poll = async () => {
      pollAttempt++;
      console.log(`[POLL] Checking job ${jobId} (attempt ${pollAttempt})`);

      try {
        const response = await aiService.checkMealPlanJobStatus(jobId, 1);

        if (!response.success || !response.data) {
          console.error("[POLL] Failed to check job status:", response.error);
          // Continue polling unless max attempts reached
          if (pollAttempt < maxAttempts) {
            scheduleNextPoll();
          } else {
            handlePollTimeout();
          }
          return;
        }

        const { status, plan, error, generationTimeMs } = response.data;
        console.log(`[POLL] Job status: ${status}`);

        // Update async job state
        setAsyncJob((prev) =>
          prev
            ? {
                ...prev,
                status,
                error,
                generationTimeMs,
              }
            : null,
        );

        // Handle terminal states
        if (status === "completed" && plan) {
          console.log(`[POLL] Job completed in ${generationTimeMs}ms`);
          await handleMealPlanResult(plan);
          cleanupPolling();
          return;
        }

        if (status === "failed") {
          console.error("[POLL] Job failed:", error);
          setAiError(error || "Meal plan generation failed");
          Alert.alert(
            "Generation Failed",
            error || "Failed to generate meal plan. Please try again.",
          );
          cleanupPolling();
          return;
        }

        if (status === "cancelled") {
          console.log("[POLL] Job was cancelled");
          cleanupPolling();
          return;
        }

        // Continue polling for pending/processing
        if (pollAttempt < maxAttempts) {
          scheduleNextPoll();
        } else {
          handlePollTimeout();
        }
      } catch (err) {
        console.error("[POLL] Error during polling:", err);
        if (pollAttempt < maxAttempts) {
          scheduleNextPoll();
        } else {
          handlePollTimeout();
        }
      }
    };

    const scheduleNextPoll = () => {
      // Exponential backoff with cap
      const interval = Math.min(
        initialInterval * Math.pow(1.5, Math.floor(pollAttempt / 5)),
        maxInterval,
      );
      console.log(`[POLL] Next poll in ${interval}ms`);
      asyncJobPollingRef.current = setTimeout(poll, interval);
    };

    const handlePollTimeout = () => {
      console.error("[POLL] Polling timeout after max attempts");
      setAiError(
        "Generation is taking longer than expected. Please check back later.",
      );
      Alert.alert(
        "Taking Longer Than Expected",
        "Your meal plan is still being generated. You can check back later or try again.",
        [{ text: "OK" }],
      );
      cleanupPolling();
    };

    const cleanupPolling = () => {
      if (asyncJobPollingRef.current) {
        clearTimeout(asyncJobPollingRef.current);
        asyncJobPollingRef.current = null;
      }
      setGeneratingPlan(false);
    };

    // Start first poll after initial delay
    asyncJobPollingRef.current = setTimeout(poll, initialInterval);
  };

  // Cancel ongoing async generation
  const cancelAsyncGeneration = () => {
    if (asyncJobPollingRef.current) {
      clearTimeout(asyncJobPollingRef.current);
      asyncJobPollingRef.current = null;
    }
    setAsyncJob(null);
    setGeneratingPlan(false);
    setAiError(null);
    console.log("[ASYNC] Generation cancelled by user");
  };

  // Clear async job indicator
  const clearAsyncJob = () => {
    setAsyncJob(null);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (asyncJobPollingRef.current) {
        clearTimeout(asyncJobPollingRef.current);
      }
    };
  }, []);

  // Get meals for selected day
  const getTodaysMeals = (): DayMeal[] => {
    if (
      !weeklyMealPlan ||
      !weeklyMealPlan.meals ||
      !Array.isArray(weeklyMealPlan.meals)
    ) {
      console.log(
        "[DEBUG] getTodaysMeals: No weekly meal plan or meals available",
      );
      return [];
    }
    const mealsForDay = weeklyMealPlan.meals.filter(
      (meal) => meal.dayOfWeek === selectedDay,
    );
    console.log(`[DEBUG] getTodaysMeals for ${selectedDay}:`, {
      mealsFound: mealsForDay.length,
      mealTypes: mealsForDay.map((m) => m.type),
      mealNames: mealsForDay.map((m) => m.name),
    });
    return mealsForDay;
  };

  // Get or create swipe position for a meal
  const getSwipePosition = (mealId: string): Animated.Value => {
    if (!mealSwipePositions[mealId]) {
      const newPosition = new Animated.Value(0);
      setMealSwipePositions((prev) => ({ ...prev, [mealId]: newPosition }));
      return newPosition;
    }
    return mealSwipePositions[mealId];
  };

  // Handle delete meal with swipe animation
  const handleDeleteMeal = async (meal: DayMeal) => {
    Alert.alert(
      "Delete Meal",
      `Are you sure you want to delete "${meal.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            haptics.medium();
            console.log("[DELETE] Deleting meal:", meal.name);

            try {
              // 1. Remove from weekly meal plan in store
              if (weeklyMealPlan) {
                const updatedMeals = weeklyMealPlan.meals.filter(
                  (m) => m.id !== meal.id,
                );
                const updatedPlan = {
                  ...weeklyMealPlan,
                  meals: updatedMeals,
                };

                // Update local state
                setWeeklyMealPlan(updatedPlan);

                // Save updated plan to database
                await saveWeeklyMealPlan(updatedPlan);
                console.log("[SUCCESS] Meal removed from plan");
              }

              // 2. Delete from Supabase meals table if it has a log ID
              const mealProgressData = getMealProgress(meal.id);
              if (mealProgressData?.logId && user?.id) {
                const { error } = await supabase
                  .from("meals")
                  .delete()
                  .eq("id", mealProgressData.logId);

                if (error) {
                  console.error(
                    "[ERROR] Failed to delete from database:",
                    error,
                  );
                } else {
                  console.log("[SUCCESS] Meal deleted from database");
                }
              }

              // 3. Remove from meal progress
              const currentProgress = { ...mealProgress };
              delete currentProgress[meal.id];
              useNutritionStore.setState({ mealProgress: currentProgress });

              // 4. Refresh nutrition data
              await loadData();

              Alert.alert("Success", "Meal deleted successfully");

              // Reset swipe position
              const swipePos = getSwipePosition(meal.id);
              Animated.spring(swipePos, {
                toValue: 0,
                useNativeDriver: true,
              }).start();

              // Force refresh
              forceRefresh();
            } catch (error) {
              console.error("[ERROR] Failed to delete meal:", error);
              Alert.alert("Error", "Failed to delete meal. Please try again.");
            }
          },
        },
      ],
    );
  };

  // Handle edit meal
  const handleEditMeal = (meal: DayMeal) => {
    haptics.light();
    console.log("[EDIT] Editing meal:", meal.name);
    Alert.alert(
      "Edit Meal",
      `Edit functionality for "${meal.name}" coming soon!`,
    );
    // Reset swipe position
    const swipePos = getSwipePosition(meal.id);
    Animated.spring(swipePos, { toValue: 0, useNativeDriver: true }).start();
  };

  // Get or create flip state for card
  const getCardFlipState = (cardId: number): Animated.Value => {
    if (!cardFlipStates[cardId]) {
      const newFlip = new Animated.Value(0);
      setCardFlipStates((prev) => ({ ...prev, [cardId]: newFlip }));
      return newFlip;
    }
    return cardFlipStates[cardId];
  };

  // Handle adding meal to plan with flip animation
  const handleAddToPlan = (suggestionId: number, suggestionName: string) => {
    const flipValue = getCardFlipState(suggestionId);

    // Flip to back
    Animated.sequence([
      Animated.timing(flipValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Hold for 1 second
      Animated.delay(1000),
      // Flip back to front
      Animated.timing(flipValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Mark as added
    setAddedToPlan((prev) => new Set(prev).add(suggestionId));
    haptics.medium();

    // Show success message
    setTimeout(() => {
      Alert.alert(
        "Added to Plan",
        `${suggestionName} has been added to your meal plan`,
      );
    }, 300);
  };

  // Get or create swipe state for suggestion card
  const getSuggestionSwipeState = (suggestionId: number) => {
    if (!suggestionSwipeStates[suggestionId]) {
      const newState = {
        translateY: new Animated.Value(0),
        opacity: new Animated.Value(1),
      };
      setSuggestionSwipeStates((prev) => ({
        ...prev,
        [suggestionId]: newState,
      }));
      return newState;
    }
    return suggestionSwipeStates[suggestionId];
  };

  // Handle dismissing a suggestion card
  const handleDismissSuggestion = (suggestionId: number) => {
    const swipeState = getSuggestionSwipeState(suggestionId);

    Animated.parallel([
      Animated.timing(swipeState.translateY, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(swipeState.opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDismissedSuggestions((prev) => new Set(prev).add(suggestionId));
      haptics.medium();
    });
  };

  // Create PanResponder for suggestion card swipe
  const createSuggestionPanResponder = (suggestionId: number) => {
    const swipeState = getSuggestionSwipeState(suggestionId);
    const DISMISS_THRESHOLD = 100; // Swipe down distance to dismiss

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical swipes (down)
        return (
          gestureState.dy > 5 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward swipe
        if (gestureState.dy > 0) {
          swipeState.translateY.setValue(gestureState.dy);
          swipeState.opacity.setValue(
            1 - gestureState.dy / DISMISS_THRESHOLD / 2,
          );
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DISMISS_THRESHOLD) {
          // Dismiss the card
          handleDismissSuggestion(suggestionId);
        } else {
          // Snap back
          Animated.parallel([
            Animated.spring(swipeState.translateY, {
              toValue: 0,
              tension: 100,
              friction: 10,
              useNativeDriver: true,
            }),
            Animated.timing(swipeState.opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    });
  };

  // Create PanResponder for swipe gestures
  const createMealPanResponder = (mealId: string) => {
    const swipePosition = getSwipePosition(mealId);
    const SWIPE_THRESHOLD = -80; // Minimum swipe distance to reveal actions

    // Track current value using a ref
    let currentValue = 0;
    swipePosition.addListener(({ value }) => {
      currentValue = value;
    });

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes
        return (
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 5
        );
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow left swipe (negative dx)
        if (gestureState.dx < 0) {
          swipePosition.setValue(gestureState.dx);
        } else if (gestureState.dx > 0 && currentValue < 0) {
          // Allow swiping back to original position
          swipePosition.setValue(Math.max(SWIPE_THRESHOLD, gestureState.dx));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < SWIPE_THRESHOLD / 2) {
          // Swipe left - reveal actions
          Animated.spring(swipePosition, {
            toValue: SWIPE_THRESHOLD,
            tension: 100,
            friction: 10,
            useNativeDriver: true,
          }).start();
          haptics.light();
        } else {
          // Snap back to closed
          Animated.spring(swipePosition, {
            toValue: 0,
            tension: 100,
            friction: 10,
            useNativeDriver: true,
          }).start();
        }
      },
    });
  };

  // Handle meal start (similar to workout start)
  const handleStartMeal = (meal: DayMeal) => {
    console.log("[MEAL] handleStartMeal called with meal:", meal.name);
    console.log("[MEAL] Navigation available:", !!navigation);

    if (!navigation) {
      console.error("[ERROR] Navigation not available for meal start");
      Alert.alert("Error", "Navigation not available");
      return;
    }

    // For web platform, use modal instead of Alert.alert
    if (Platform.OS === "web") {
      console.log(
        "[WEB] Web platform detected - showing meal preparation modal",
      );
      setSelectedMealForPreparation(meal);
      setShowMealPreparationModal(true);
      return;
    }

    // For mobile platforms, use Alert.alert with dynamic messaging
    // Calculate completed meals today
    const today = new Date();
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const todayName = dayNames[today.getDay()] as DayName;

    const completedMealsToday = Object.entries(mealProgress).filter(
      ([mealId, progress]) => {
        // Find the meal in the weekly plan
        const meal = weeklyMealPlan?.meals.find((m) => m.id === mealId);
        // Check if it's completed (100%) and belongs to today
        return progress.progress === 100 && meal?.dayOfWeek === todayName;
      },
    ).length;

    const motivationConfig = {
      personalInfo: profile?.personalInfo,
      fitnessGoals: profile?.fitnessGoals,
      currentStreak: achievementStreak, // Single source of truth from achievementStore
      completedMealsToday,
    };

    const dynamicMessage = mealMotivationService.getMealStartMessage(
      meal,
      motivationConfig,
    );
    const preparationTips = mealMotivationService.getPreparationTips(meal);

    const fullMessage = `${dynamicMessage}\n\nQuick Tips:\n${preparationTips
      .slice(0, 2)
      .map((tip) => `- ${tip}`)
      .join("\n")}`;

    Alert.alert("Ready to Cook?", fullMessage, [
      { text: "Maybe Later", style: "cancel" },
      {
        text: "Let's Cook!",
        onPress: () => startMealPreparation(meal),
      },
    ]);
  };

  // Separate function for meal preparation logic
  const startMealPreparation = async (meal: DayMeal) => {
    console.log("[MEAL] Starting meal preparation:", meal.name);

    // Initialize progress using completion tracking service
    completionTrackingService.updateMealProgress(meal.id, 0, {
      source: "diet_screen_start",
      startedAt: new Date().toISOString(),
    });

    // Check if meal has cooking instructions
    if (!meal.cookingInstructions || meal.cookingInstructions.length === 0) {
      console.log(
        "[WARNING] Meal has no cooking instructions, generating basic ones...",
      );
      // Add basic cooking instructions if none exist
      meal.cookingInstructions = [
        {
          step: 1,
          instruction: "Gather all ingredients and prepare your workspace",
        },
        {
          step: 2,
          instruction: "Follow your preferred cooking method for this meal",
        },
        {
          step: 3,
          instruction: "Cook according to the preparation time specified",
        },
        { step: 4, instruction: "Season to taste and serve immediately" },
        { step: 5, instruction: "Enjoy your healthy meal!" },
      ];
    }

    // Navigate to CookingSessionScreen
    console.log("[NAV] Navigating to CookingSessionScreen");
    navigation.navigate("CookingSession", { meal });
  };

  // Separate function for meal completion logic
  const completeMealPreparation = async (meal: DayMeal) => {
    console.log("[MEAL] Marking meal as complete:", meal.name);

    try {
      // Use completion tracking service for proper event emission
      const success = await completionTrackingService.completeMeal(
        meal.id,
        {
          completedAt: new Date().toISOString(),
          source: "diet_screen_manual",
        },
        user?.id, // Pass userId if available, undefined otherwise (handled by completionTracking)
      );

      if (success) {
        // Refresh nutrition data to update calorie display
        try {
          await loadDailyNutrition();
          console.log(
            "[SUCCESS] Daily nutrition data refreshed after meal completion",
          );
        } catch (refreshError) {
          console.warn(
            "[WARNING] Failed to refresh nutrition data:",
            refreshError,
          );
        }

        if (Platform.OS === "web") {
          setShowMealPreparationModal(false);
          setSelectedMealForPreparation(null);
          // You could show a success toast here for web
          console.log(`[SUCCESS] Meal completed: ${meal.name}`);
        } else {
          Alert.alert(
            "Meal Complete!",
            `You've completed "${meal.name}"!\n\nCheck the Progress tab to see your achievement!`,
          );
        }
      } else {
        Alert.alert(
          "Error",
          "Failed to mark meal as complete. Please try again.",
        );
      }
    } catch (error) {
      console.error("Error completing meal:", error);
      Alert.alert(
        "Error",
        "Failed to mark meal as complete. Please try again.",
      );
    }
  };

  const handleSearchFood = () => {
    setShowAIMealsPanel(true);
  };

  const handleCreateRecipe = () => {
    setShowCreateRecipe(true);
  };

  const handleRecipeCreated = (recipe: any) => {
    setUserRecipes((prev) => [recipe, ...prev]);
    setShowCreateRecipe(false);

    // You could save the recipe to the database here
    console.log("New recipe created:", recipe);
  };

  // Water tracking handlers - USES HYDRATION STORE (Single Source of Truth)
  // Store uses MILLILITERS, display uses LITERS
  const handleAddWater = () => {
    const incrementAmountML = 250; // 250ml increment

    if (waterGoalML && waterIntakeML >= waterGoalML) {
      Alert.alert(
        "Daily Goal Achieved!",
        `You've already reached your daily water goal of ${waterGoalLiters?.toFixed(1)}L! Great job staying hydrated!`,
        [{ text: "Awesome!" }],
      );
      return;
    }

    const previousIntake = waterIntakeML;
    hydrationAddWater(incrementAmountML); // Add to store in ML

    // Show celebration when goal is reached
    if (
      waterGoalML &&
      previousIntake + incrementAmountML >= waterGoalML &&
      previousIntake < waterGoalML
    ) {
      setTimeout(() => {
        Alert.alert(
          "Hydration Goal Achieved!",
          `Congratulations! You've reached your daily water goal of ${waterGoalLiters?.toFixed(1)}L!`,
          [
            { text: "Keep it up!", style: "default" },
            {
              text: "Adjust Goal",
              onPress: () => {
                if (navigation) {
                  navigation.navigate("Settings", { screen: "Notifications" });
                } else {
                  Alert.alert(
                    "Water Settings",
                    "Navigate to Settings > Notifications to adjust your water goal and reminder schedule.",
                  );
                }
              },
            },
          ],
        );
      }, 500);
    } else if (waterGoalML) {
      // Show encouraging message
      const remainingL = Math.max(
        (waterGoalML - (previousIntake + incrementAmountML)) / 1000,
        0,
      );
      Alert.alert(
        "Water Added!",
        `Great job! ${remainingL.toFixed(1)}L more to reach your goal.`,
      );
    }
  };

  const handleRemoveWater = () => {
    if (waterIntakeML > 0) {
      const decrementAmountML = 250;
      // Use setWaterIntake for decrementing since addWater only adds
      const newAmount = Math.max(0, waterIntakeML - decrementAmountML);
      useHydrationStore.getState().setWaterIntake(newAmount);
    }
  };

  const handleLogWater = () => {
    Alert.alert(
      "Log Water Intake",
      "Choose how to log your water consumption:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add 250ml",
          onPress: () => hydrationAddWater(250),
        },
        {
          text: "Add 500ml",
          onPress: () => {
            hydrationAddWater(500);
            Alert.alert("Water Added!", "Added 500ml to your daily intake.");
          },
        },
        {
          text: "Custom Amount",
          onPress: () => {
            Alert.prompt(
              "Water Amount (Liters)",
              "How many liters did you drink?",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Add",
                  onPress: (value) => {
                    const amountLiters = parseFloat(value || "0");
                    if (amountLiters > 0 && amountLiters <= 3) {
                      const amountML = amountLiters * 1000; // Convert to ML for store
                      hydrationAddWater(amountML);
                      Alert.alert(
                        "Water Added!",
                        `Added ${amountLiters}L to your daily intake.`,
                      );
                    } else {
                      Alert.alert(
                        "Invalid Amount",
                        "Please enter a number between 0.1 and 3.0 liters.",
                      );
                    }
                  },
                },
              ],
              "plain-text",
              "",
              "decimal-pad",
            );
          },
        },
      ],
    );
  };

  // Handle feedback submission
  const handleFeedbackSubmit = async (feedback: FoodFeedback[]) => {
    if (!feedbackData) return;

    try {
      // NO FALLBACK: Require authenticated user for feedback
      if (!user?.id) {
        console.warn("⚠️ Cannot submit feedback: user not authenticated");
        Alert.alert("Sign In Required", "Please sign in to submit feedback.");
        return;
      }
      const result = await foodRecognitionFeedbackService.submitFeedback(
        user.id,
        feedbackData.mealId,
        feedback,
        feedbackData.imageUri,
        feedbackData.recognizedFoods,
      );

      if (result.success) {
        console.log(
          "[SUCCESS] Feedback submitted successfully:",
          result.feedbackId,
        );
      } else {
        console.error("[ERROR] Failed to submit feedback:", result.error);
        Alert.alert("Error", "Failed to submit feedback. Please try again.");
      }
    } catch (error) {
      console.error("[ERROR] Error submitting feedback:", error);
      Alert.alert("Error", "Failed to submit feedback. Please try again.");
    }
  };

  // Handle portion adjustment completion
  const handlePortionAdjustmentComplete = (adjustedFoods: any[]) => {
    setShowPortionAdjustment(false);

    // Show updated recognition results with adjusted portions
    const totalCalories = adjustedFoods.reduce(
      (sum, food) => sum + food.nutrition.calories,
      0,
    );
    const adjustedCount = adjustedFoods.filter(
      (food) =>
        food.portionSize.estimatedGrams !==
        portionData?.recognizedFoods.find((orig) => orig.id === food.id)
          ?.portionSize.estimatedGrams,
    ).length;

    Alert.alert(
      "Portions Updated!",
      `${adjustedCount > 0 ? `Updated ${adjustedCount} portion size${adjustedCount !== 1 ? "s" : ""}!\n\n` : ""}` +
        `${adjustedFoods.map((food) => `- ${food.name} (${food.portionSize.estimatedGrams}g - ${Math.round(food.nutrition.calories)} cal)`).join("\n")}\n\n` +
        `Total: ${Math.round(totalCalories)} calories`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Give Feedback",
          onPress: () => {
            setFeedbackData({
              recognizedFoods: adjustedFoods,
              imageUri: portionData?.imageUri || "",
              mealId: `temp_${Date.now()}`,
            });
            setShowFeedbackModal(true);
          },
        },
        {
          text: "Log Meal",
          onPress: async () => {
            try {
              console.log(
                "[MEAL] Starting meal logging process with adjusted portions...",
              );

              // NO FALLBACK: Require authenticated user
              if (!user?.id) {
                console.warn(
                  "⚠️ Cannot log adjusted portions: user not authenticated",
                );
                Alert.alert("Sign In Required", "Please sign in to log meals.");
                return;
              }
              const logResult = await recognizedFoodLogger.logRecognizedFoods(
                user.id,
                adjustedFoods,
                selectedMealType,
              );

              if (logResult.success) {
                Alert.alert(
                  "Meal Logged Successfully!",
                  `${adjustedFoods.length} food item${adjustedFoods.length !== 1 ? "s" : ""} logged\n` +
                    `Total: ${logResult.totalCalories} calories\n` +
                    `Meal Type: ${selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}\n` +
                    `Meal ID: ${logResult.mealId?.slice(-8)}\n\n` +
                    `Your nutrition tracking has been updated!`,
                  [{ text: "Awesome!" }],
                );

                await loadDailyNutrition();
                await refreshAll();
              } else {
                throw new Error(logResult.error || "Failed to log meal");
              }
            } catch (error) {
              console.error("[ERROR] Failed to log adjusted meal:", error);
              Alert.alert("Error", "Failed to log meal. Please try again.");
            }
          },
        },
      ],
    );

    setPortionData(null);
  };

  // Note: Removed static food database display to focus on AI-generated personalized meals
  // The foods from database were generic seed data that interfered with personalization

  // Note: Removed food loading and filtering as we now focus on AI-generated personalized meals
  // The app no longer loads generic foods from database

  const handleMealLongPress = (mealId: string, event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setContextMenu({
      visible: true,
      mealId,
      position: { x: pageX, y: pageY },
    });
  };

  const handleContextMenuAction = (action: string) => {
    setContextMenu({ visible: false, mealId: null, position: { x: 0, y: 0 } });

    switch (action) {
      case "edit":
        Alert.alert("Edit Meal", "Meal editing feature coming soon...");
        break;
      case "delete":
        Alert.alert("Delete Meal", "Meal deletion feature coming soon...");
        break;
      case "duplicate":
        Alert.alert("Duplicate", "Meal duplication feature coming soon...");
        break;
      case "details":
        Alert.alert("Details", "Meal details feature coming soon...");
        break;
    }
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, mealId: null, position: { x: 0, y: 0 } });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
      clearErrors();
    } catch (error) {
      console.warn("Failed to refresh nutrition data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // SINGLE SOURCE OF TRUTH: Use store selector as PRIMARY source
  // This calculates consumed nutrition from mealProgress (local state)
  // and merges with Supabase data to ensure immediate updates on meal completion
  const storeNutrition = getTodaysConsumedNutrition();
  const currentNutrition = {
    // Use MAX of store selector vs Supabase to handle both:
    // 1. Immediate updates from mealProgress (store) - shows instantly
    // 2. Historical data from Supabase - catches meals from other sessions
    calories: Math.max(storeNutrition.calories, dailyNutrition?.calories || 0),
    protein: Math.max(storeNutrition.protein, dailyNutrition?.protein || 0),
    carbs: Math.max(storeNutrition.carbs, dailyNutrition?.carbs || 0),
    fat: Math.max(storeNutrition.fat, dailyNutrition?.fat || 0),
    mealsCount: dailyNutrition?.mealsCount || 0,
  };

  // Get macro targets from calculated metrics (onboarding) - NO FALLBACKS
  const macroTargets = getMacroTargets();
  const calorieTarget = getCalorieTarget();

  // Use calculated targets from onboarding, fallback to nutritionGoals hook, then null
  // CRITICAL: No hardcoded fallbacks - UI should handle null states
  const nutritionTargets = {
    calories: {
      current: currentNutrition.calories,
      target: calorieTarget, // SINGLE SOURCE - from calculatedMetrics only
    },
    protein: {
      current: currentNutrition.protein,
      target: macroTargets.protein, // SINGLE SOURCE - from calculatedMetrics only
    },
    carbs: {
      current: currentNutrition.carbs,
      target: macroTargets.carbs, // SINGLE SOURCE - from calculatedMetrics only
    },
    fat: {
      current: currentNutrition.fat,
      target: macroTargets.fat, // SINGLE SOURCE - from calculatedMetrics only
    },
    fiber: {
      current: 0,
      target: calculatedMetrics?.dailyFiberG ?? null,
    },
  };

  // Show Guest Sign Up Screen if user needs to authenticate
  if (showGuestSignUp) {
    return (
      <GuestSignUpScreen
        onBack={() => setShowGuestSignUp(false)}
        onSignUpSuccess={() => {
          setShowGuestSignUp(false);
          // Refresh to reload authenticated user data
          onRefresh();
        }}
      />
    );
  }

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ResponsiveTheme.colors.primary}
              colors={[ResponsiveTheme.colors.primary]}
            />
          }
        >
          <View>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Nutrition Plan</Text>

              {/* DateSelector (Today + navigation) - Aurora Design */}
              <View style={styles.dateSelector}>
                <AnimatedPressable
                  style={styles.dateNavButton}
                  onPress={() =>
                    Alert.alert("Previous Day", "Navigate to previous day")
                  }
                  scaleValue={0.9}
                  hapticFeedback={true}
                  hapticType="light"
                >
                  <Text style={styles.dateNavIcon}>‹</Text>
                </AnimatedPressable>

                <GlassCard
                  elevation={1}
                  blurIntensity="light"
                  padding="sm"
                  borderRadius="lg"
                  style={styles.dateBadge}
                >
                  <Text style={styles.dateText}>Today</Text>
                  <Text style={styles.dateSubtext}>
                    {new Date().toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </GlassCard>

                <AnimatedPressable
                  style={styles.dateNavButton}
                  onPress={() =>
                    Alert.alert("Next Day", "Navigate to next day")
                  }
                  scaleValue={0.9}
                  hapticFeedback={true}
                  hapticType="light"
                >
                  <Text style={styles.dateNavIcon}>›</Text>
                </AnimatedPressable>
              </View>

              <View style={styles.headerButtons}>
                {/* Track B Status Indicator */}
                <AnimatedPressable
                  style={styles.statusButton}
                  scaleValue={0.97}
                >
                  <Ionicons
                    name={
                      trackBStatus.isConnected
                        ? "checkmark-circle"
                        : "close-circle"
                    }
                    size={rf(16)}
                    color={trackBStatus.isConnected ? "#10b981" : "#ef4444"}
                  />
                </AnimatedPressable>
                <AnimatedPressable
                  style={[
                    styles.aiButton,
                    ...(isGeneratingPlan ? [styles.aiButtonDisabled] : []),
                  ]}
                  onPress={generateWeeklyMealPlan}
                  disabled={isGeneratingPlan}
                  scaleValue={0.95}
                  hapticFeedback={true}
                  hapticType="medium"
                >
                  {isGeneratingPlan ? (
                    <AuroraSpinner size="sm" theme="white" />
                  ) : (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center" as const,
                      }}
                    >
                      <Ionicons
                        name="restaurant-outline"
                        size={rf(12)}
                        color={ResponsiveTheme.colors.white}
                      />
                      <Text style={[styles.aiButtonText, { marginLeft: 4 }]}>
                        Week
                      </Text>
                    </View>
                  )}
                </AnimatedPressable>
                <AnimatedPressable
                  style={[
                    styles.aiButton,
                    ...(isGeneratingMeal ? [styles.aiButtonDisabled] : []),
                  ]}
                  onPress={generateDailyMealPlan}
                  disabled={isGeneratingMeal}
                  scaleValue={0.95}
                  hapticFeedback={true}
                  hapticType="medium"
                >
                  {isGeneratingMeal ? (
                    <AuroraSpinner size="sm" theme="white" />
                  ) : (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center" as const,
                      }}
                    >
                      <Ionicons
                        name="sparkles-outline"
                        size={rf(12)}
                        color={ResponsiveTheme.colors.white}
                      />
                      <Text style={[styles.aiButtonText, { marginLeft: 4 }]}>
                        Day
                      </Text>
                    </View>
                  )}
                </AnimatedPressable>
                <AnimatedPressable
                  style={[styles.aiButton, { backgroundColor: "#f59e0b" }]}
                  onPress={() => setShowTestComponent(true)}
                  scaleValue={0.95}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center" as const,
                    }}
                  >
                    <Ionicons
                      name="flask-outline"
                      size={rf(12)}
                      color={ResponsiveTheme.colors.white}
                    />
                    <Text style={[styles.aiButtonText, { marginLeft: 4 }]}>
                      Test
                    </Text>
                  </View>
                </AnimatedPressable>
                <AnimatedPressable
                  style={[styles.aiButton, { backgroundColor: "#10b981" }]}
                  onPress={runQuickActionsTests}
                  scaleValue={0.95}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center" as const,
                    }}
                  >
                    <Ionicons
                      name="checkmark-outline"
                      size={rf(12)}
                      color={ResponsiveTheme.colors.white}
                    />
                    <Text style={[styles.aiButtonText, { marginLeft: 4 }]}>
                      Quick
                    </Text>
                  </View>
                </AnimatedPressable>
                <AnimatedPressable
                  style={[styles.aiButton, { backgroundColor: "#8b5cf6" }]}
                  onPress={runFoodRecognitionE2ETests}
                  scaleValue={0.95}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center" as const,
                    }}
                  >
                    <Ionicons
                      name="flask-outline"
                      size={rf(12)}
                      color={ResponsiveTheme.colors.white}
                    />
                    <Text style={[styles.aiButtonText, { marginLeft: 4 }]}>
                      E2E
                    </Text>
                  </View>
                </AnimatedPressable>
                <AnimatedPressable
                  style={[styles.aiButton, { backgroundColor: "#ef4444" }]}
                  onPress={() => {
                    console.log(
                      "[TEST] Test button pressed - bypassing profile checks",
                    );
                    Alert.alert(
                      "Test Button",
                      "This button works! Check console for Generate Weekly Plan button logs.",
                    );
                  }}
                  scaleValue={0.95}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center" as const,
                    }}
                  >
                    <Ionicons
                      name="flask-outline"
                      size={rf(12)}
                      color={ResponsiveTheme.colors.white}
                    />
                    <Text style={[styles.aiButtonText, { marginLeft: 4 }]}>
                      Test
                    </Text>
                  </View>
                </AnimatedPressable>
                <AnimatedPressable
                  style={styles.addButton}
                  onPress={handleSearchFood}
                  scaleValue={0.95}
                >
                  <Ionicons
                    name="sparkles-outline"
                    size={rf(20)}
                    color={ResponsiveTheme.colors.white}
                  />
                </AnimatedPressable>
              </View>
            </View>

            {/* Loading State */}
            {(foodsLoading || userMealsLoading) && (
              <View style={styles.loadingContainer}>
                <AuroraSpinner size="lg" theme="primary" />
                <Text style={styles.loadingText}>
                  Loading nutrition data...
                </Text>
              </View>
            )}

            {/* Error State */}
            {(foodsError || userMealsError) && (
              <GlassCard
                style={styles.errorCard}
                elevation={1}
                padding="md"
                blurIntensity="light"
                borderRadius="lg"
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center" as const,
                  }}
                >
                  <Ionicons
                    name="warning-outline"
                    size={rf(16)}
                    color={ResponsiveTheme.colors.error || "#ef4444"}
                  />
                  <Text style={[styles.errorText, { marginLeft: 8 }]}>
                    {foodsError || userMealsError}
                  </Text>
                </View>
                <Button
                  title="Retry"
                  onPress={refreshAll}
                  variant="outline"
                  size="sm"
                  style={styles.retryButton}
                />
              </GlassCard>
            )}

            {/* No Authentication State */}
            {!canAccessMealFeatures && (
              <GlassCard
                style={styles.errorCard}
                elevation={1}
                padding="md"
                blurIntensity="light"
                borderRadius="lg"
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center" as const,
                  }}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={rf(16)}
                    color={ResponsiveTheme.colors.textSecondary}
                  />
                  <Text style={[styles.errorText, { marginLeft: 8 }]}>
                    Please sign in to track your nutrition
                  </Text>
                </View>
              </GlassCard>
            )}

            {/* Calorie Overview - Aurora Design */}
            <View style={styles.section}>
              <GlassCard
                elevation={2}
                blurIntensity="light"
                padding="lg"
                borderRadius="lg"
              >
                <View style={styles.calorieOverviewCenter}>
                  <LargeProgressRing
                    progress={
                      nutritionTargets.calories.target
                        ? (nutritionTargets.calories.current /
                            nutritionTargets.calories.target) *
                          100
                        : 0
                    }
                    gradient={true}
                    gradientColors={["#FF6B6B", "#FF8E53", "#FFC107"]}
                  >
                    <View style={styles.calorieCenter}>
                      <Text style={styles.caloriesRemaining}>
                        {nutritionTargets.calories.target
                          ? Math.max(
                              0,
                              nutritionTargets.calories.target -
                                nutritionTargets.calories.current,
                            )
                          : 0}
                      </Text>
                      <Text style={styles.caloriesLabel}>Calories left</Text>
                      <Text style={styles.caloriesTarget}>
                        of {nutritionTargets.calories.target}
                      </Text>
                    </View>
                  </LargeProgressRing>
                </View>

                {/* Macro Breakdown Grid */}
                <View style={styles.macroGrid}>
                  <View style={styles.macroStat}>
                    <Text style={styles.macroValue}>
                      {Math.round(nutritionTargets.protein.current)}g
                    </Text>
                    <Text style={styles.macroLabel}>Protein</Text>
                    <Text style={styles.macroTarget}>
                      / {nutritionTargets.protein.target}g
                    </Text>
                  </View>
                  <View style={styles.macroStat}>
                    <Text style={styles.macroValue}>
                      {Math.round(nutritionTargets.carbs.current)}g
                    </Text>
                    <Text style={styles.macroLabel}>Carbs</Text>
                    <Text style={styles.macroTarget}>
                      / {nutritionTargets.carbs.target}g
                    </Text>
                  </View>
                  <View style={styles.macroStat}>
                    <Text style={styles.macroValue}>
                      {Math.round(nutritionTargets.fat.current)}g
                    </Text>
                    <Text style={styles.macroLabel}>Fats</Text>
                    <Text style={styles.macroTarget}>
                      / {nutritionTargets.fat.target}g
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </View>

            {/* Day Selector + Meals - Premium Design */}
            <View style={styles.section}>
              {/* Day Selector - Only show when weekly plan exists */}
              {weeklyMealPlan && (
                <View style={styles.daySelectorContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {[
                      "monday",
                      "tuesday",
                      "wednesday",
                      "thursday",
                      "friday",
                      "saturday",
                      "sunday",
                    ].map((day) => {
                      const isToday =
                        day ===
                        (() => {
                          const dayNames = [
                            "sunday",
                            "monday",
                            "tuesday",
                            "wednesday",
                            "thursday",
                            "friday",
                            "saturday",
                          ];
                          return dayNames[new Date().getDay()];
                        })();
                      return (
                        <AnimatedPressable
                          key={day}
                          style={[
                            styles.dayButton,
                            ...(selectedDay === day
                              ? [styles.selectedDayButton]
                              : []),
                            ...(isToday ? [styles.todayDayButton] : []),
                          ]}
                          onPress={() =>
                            setSelectedDay(
                              day as
                                | "sunday"
                                | "monday"
                                | "tuesday"
                                | "wednesday"
                                | "thursday"
                                | "friday"
                                | "saturday",
                            )
                          }
                          scaleValue={0.95}
                        >
                          <Text
                            style={[
                              styles.dayButtonText,
                              selectedDay === day &&
                                styles.selectedDayButtonText,
                            ]}
                          >
                            {day
                              ? day.charAt(0).toUpperCase() + day.slice(1, 3)
                              : "Day"}
                          </Text>
                          {isToday && <View style={styles.todayIndicator} />}
                        </AnimatedPressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Section Header */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {selectedDay &&
                  selectedDay !==
                    (() => {
                      const dayNames = [
                        "sunday",
                        "monday",
                        "tuesday",
                        "wednesday",
                        "thursday",
                        "friday",
                        "saturday",
                      ];
                      return dayNames[new Date().getDay()];
                    })()
                    ? `${selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}'s Meals`
                    : "Today's Meals"}
                </Text>
                {getTodaysMeals().length > 0 && (
                  <View style={styles.mealCountBadge}>
                    <Text style={styles.mealCountText}>
                      {
                        getTodaysMeals().filter(
                          (m) => getMealProgress(m.id)?.progress === 100,
                        ).length
                      }
                      /{getTodaysMeals().length}
                    </Text>
                  </View>
                )}
              </View>

              {getTodaysMeals().length > 0 ? (
                <View style={styles.premiumMealsContainer}>
                  {getTodaysMeals().map((meal, index) => {
                    const progress = getMealProgress(meal.id);
                    const mealTime = getMealTime(
                      meal.type as any,
                      mealSchedule,
                    );

                    return (
                      <PremiumMealCard
                        key={meal.id}
                        meal={meal}
                        mealTime={mealTime}
                        onPress={() => handleStartMeal(meal)}
                        onStartMeal={() => handleStartMeal(meal)}
                        onCompleteMeal={() => completeMealPreparation(meal)}
                        progress={progress?.progress}
                        macroTargets={{
                          protein: macroTargets.protein ?? 0,
                          carbs: macroTargets.carbs ?? 0,
                          fat: macroTargets.fat ?? 0,
                          calories: calorieTarget ?? 0,
                        }}
                        style={{ marginBottom: ResponsiveTheme.spacing.md }}
                      />
                    );
                  })}
                </View>
              ) : (
                <GlassCard
                  elevation={1}
                  blurIntensity="light"
                  padding="lg"
                  borderRadius="lg"
                >
                  <Text style={styles.emptyMealsText}>
                    {weeklyMealPlan
                      ? `No meals planned for ${selectedDay ? selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1) : "today"}`
                      : "No meals planned for today"}
                  </Text>
                  <Text style={styles.emptyMealsSubtext}>
                    Generate a meal plan to get started
                  </Text>
                </GlassCard>
              )}
            </View>

            {/* Meal Suggestions - Aurora Design */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Meal Suggestions</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={rw(300) + ResponsiveTheme.spacing.md}
                decelerationRate="fast"
                contentContainerStyle={styles.suggestionsScrollContent}
              >
                {[
                  {
                    id: 1,
                    name: "Grilled Chicken Salad",
                    icon: "restaurant-outline",
                    cookTime: "15 min",
                    difficulty: "Easy",
                    calories: 320,
                    protein: 35,
                    carbs: 20,
                    fat: 10,
                  },
                  {
                    id: 2,
                    name: "Salmon with Quinoa",
                    icon: "fish-outline",
                    cookTime: "25 min",
                    difficulty: "Medium",
                    calories: 450,
                    protein: 40,
                    carbs: 35,
                    fat: 15,
                  },
                  {
                    id: 3,
                    name: "Veggie Buddha Bowl",
                    icon: "leaf-outline",
                    cookTime: "20 min",
                    difficulty: "Easy",
                    calories: 380,
                    protein: 18,
                    carbs: 55,
                    fat: 12,
                  },
                ]
                  .filter(
                    (suggestion) => !dismissedSuggestions.has(suggestion.id),
                  )
                  .map((suggestion) => {
                    const panResponder = createSuggestionPanResponder(
                      suggestion.id,
                    );
                    const swipeState = getSuggestionSwipeState(suggestion.id);
                    const flipValue = getCardFlipState(suggestion.id);
                    const isAdded = addedToPlan.has(suggestion.id);

                    const frontInterpolate = flipValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "180deg"],
                    });
                    const backInterpolate = flipValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["180deg", "360deg"],
                    });

                    return (
                      <Animated.View
                        key={suggestion.id}
                        {...panResponder.panHandlers}
                        style={{
                          transform: [{ translateY: swipeState.translateY }],
                          opacity: swipeState.opacity,
                        }}
                      >
                        {/* Front of Card */}
                        <Animated.View
                          style={[
                            styles.cardFace,
                            {
                              transform: [{ rotateY: frontInterpolate }],
                            },
                          ]}
                        >
                          <GlassCard
                            elevation={3}
                            blurIntensity="default"
                            padding="none"
                            borderRadius="xl"
                            style={styles.suggestionCard}
                          >
                            {/* Hero Image with Gradient Overlay */}
                            <View style={styles.suggestionImageContainer}>
                              <LinearGradient
                                {...(toLinearGradientProps(
                                  gradients.overlay.dark,
                                ) as any)}
                                style={styles.suggestionGradientOverlay}
                              >
                                <Ionicons
                                  name={suggestion.icon as any}
                                  size={rf(40)}
                                  color={ResponsiveTheme.colors.white}
                                />
                              </LinearGradient>
                            </View>

                            {/* Content */}
                            <View style={styles.suggestionContent}>
                              <Text style={styles.suggestionName}>
                                {suggestion.name}
                              </Text>
                              <Text style={styles.suggestionDetails}>
                                {suggestion.cookTime} • {suggestion.difficulty}
                              </Text>

                              {/* Macro Preview */}
                              <View style={styles.suggestionMacros}>
                                <View style={styles.suggestionMacroItem}>
                                  <Text style={styles.suggestionMacroValue}>
                                    {suggestion.calories}
                                  </Text>
                                  <Text style={styles.suggestionMacroLabel}>
                                    cal
                                  </Text>
                                </View>
                                <View style={styles.suggestionMacroItem}>
                                  <Text style={styles.suggestionMacroValue}>
                                    {suggestion.protein}g
                                  </Text>
                                  <Text style={styles.suggestionMacroLabel}>
                                    protein
                                  </Text>
                                </View>
                                <View style={styles.suggestionMacroItem}>
                                  <Text style={styles.suggestionMacroValue}>
                                    {suggestion.carbs}g
                                  </Text>
                                  <Text style={styles.suggestionMacroLabel}>
                                    carbs
                                  </Text>
                                </View>
                              </View>

                              {/* Add to Plan Button */}
                              <AnimatedPressable
                                style={styles.addToPlanButton}
                                onPress={() =>
                                  handleAddToPlan(
                                    suggestion.id,
                                    suggestion.name,
                                  )
                                }
                                scaleValue={0.95}
                                hapticFeedback={true}
                                hapticType="medium"
                                disabled={isAdded}
                              >
                                <LinearGradient
                                  {...(toLinearGradientProps(
                                    gradients.button.primary,
                                  ) as any)}
                                  style={styles.addToPlanButtonGradient}
                                >
                                  <Text style={styles.addToPlanButtonText}>
                                    Add to Plan
                                  </Text>
                                </LinearGradient>
                              </AnimatedPressable>
                            </View>
                          </GlassCard>
                        </Animated.View>

                        {/* Back of Card */}
                        <Animated.View
                          style={[
                            styles.cardFace,
                            styles.cardFaceBack,
                            {
                              transform: [{ rotateY: backInterpolate }],
                            },
                          ]}
                        >
                          <GlassCard
                            elevation={3}
                            blurIntensity="default"
                            padding="lg"
                            borderRadius="xl"
                            style={styles.suggestionCard}
                          >
                            <View style={styles.cardBackContent}>
                              <Ionicons
                                name="checkmark"
                                size={rf(32)}
                                color={
                                  ResponsiveTheme.colors.success || "#10b981"
                                }
                              />
                              <Text style={styles.cardBackTitle}>Added!</Text>
                              <Text style={styles.cardBackSubtitle}>
                                Meal added to your plan
                              </Text>
                            </View>
                          </GlassCard>
                        </Animated.View>
                      </Animated.View>
                    );
                  })}
              </ScrollView>
            </View>

            {/* Water Intake Tracker - Aurora Design */}
            <View style={styles.section}>
              <GlassCard
                elevation={2}
                blurIntensity="light"
                padding="lg"
                borderRadius="lg"
              >
                <Text style={styles.sectionTitle}>Hydration</Text>

                <View style={styles.waterTrackerContainer}>
                  {/* Animated Water Glass with wave effect */}
                  <View style={styles.waterGlassContainer}>
                    <View style={styles.waterGlass}>
                      {/* Water fill with gradient and wave animation */}
                      <Animated.View
                        style={[
                          styles.waterFill,
                          {
                            height: `${waterGoalLiters ? (waterConsumedLiters / waterGoalLiters) * 100 : 0}%`,
                            transform: [
                              {
                                translateY: waterWaveOffset.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0, -5],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={["#4ECDC4", "#44A08D", "#2E7D6E"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={styles.waterFillGradient}
                        />
                      </Animated.View>
                      {/* Glass border */}
                      <View style={styles.glassBorder} />
                    </View>

                    {/* Water icon/wave */}
                    <Ionicons
                      name="water-outline"
                      size={rf(24)}
                      color={ResponsiveTheme.colors.primary}
                      style={styles.waterDropIcon}
                    />
                  </View>

                  {/* Water Stats and Controls */}
                  <View style={styles.waterStatsContainer}>
                    <Text style={styles.waterAmountConsumed}>
                      {waterConsumedLiters.toFixed(1)}L
                    </Text>
                    <Text style={styles.waterTargetAmount}>
                      of {waterGoalLiters?.toFixed(1) ?? "?"}L goal
                    </Text>

                    {/* Quick Add Buttons with Ripple Effect */}
                    <View style={styles.waterQuickAddButtons}>
                      <AnimatedPressable
                        style={styles.waterQuickAddButton}
                        onPress={() => {
                          triggerRipple(waterButton1Ripple);
                          hydrationAddWater(250); // 250ml
                        }}
                        scaleValue={0.9}
                        hapticFeedback={true}
                        hapticType="light"
                      >
                        <Animated.View
                          style={[
                            styles.rippleCircle,
                            {
                              opacity: waterButton1Ripple.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.6, 0],
                              }),
                              transform: [
                                {
                                  scale: waterButton1Ripple.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 3],
                                  }),
                                },
                              ],
                            },
                          ]}
                        />
                        <Text style={styles.waterQuickAddButtonText}>
                          +250ml
                        </Text>
                      </AnimatedPressable>
                      <AnimatedPressable
                        style={styles.waterQuickAddButton}
                        onPress={() => {
                          triggerRipple(waterButton2Ripple);
                          hydrationAddWater(500); // 500ml
                        }}
                        scaleValue={0.9}
                        hapticFeedback={true}
                        hapticType="light"
                      >
                        <Animated.View
                          style={[
                            styles.rippleCircle,
                            {
                              opacity: waterButton2Ripple.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.6, 0],
                              }),
                              transform: [
                                {
                                  scale: waterButton2Ripple.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 3],
                                  }),
                                },
                              ],
                            },
                          ]}
                        />
                        <Text style={styles.waterQuickAddButtonText}>
                          +500ml
                        </Text>
                      </AnimatedPressable>
                      <AnimatedPressable
                        style={styles.waterQuickAddButton}
                        onPress={() => {
                          triggerRipple(waterButton3Ripple);
                          hydrationAddWater(1000); // 1L = 1000ml
                        }}
                        scaleValue={0.9}
                        hapticFeedback={true}
                        hapticType="medium"
                      >
                        <Animated.View
                          style={[
                            styles.rippleCircle,
                            {
                              opacity: waterButton3Ripple.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.6, 0],
                              }),
                              transform: [
                                {
                                  scale: waterButton3Ripple.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 3],
                                  }),
                                },
                              ],
                            },
                          ]}
                        />
                        <Text style={styles.waterQuickAddButtonText}>+1L</Text>
                      </AnimatedPressable>
                    </View>

                    {/* Intake Timeline */}
                    <View style={styles.waterTimeline}>
                      <Text style={styles.waterTimelineTitle}>
                        Today's Intake
                      </Text>
                      <View style={styles.waterTimelineBar}>
                        {[
                          ...Array(
                            Math.min(Math.ceil(waterConsumedLiters / 0.25), 16),
                          ),
                        ].map((_, index) => (
                          <View
                            key={`water-dot-${index}`}
                            style={styles.waterTimelineDot}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              </GlassCard>
            </View>

            {/* Weekly Nutrition Trends Chart */}
            <View style={styles.section}>
              <GlassCard
                elevation={2}
                blurIntensity="light"
                padding="lg"
                borderRadius="lg"
              >
                <Text style={styles.sectionTitle}>Weekly Nutrition Trends</Text>

                {/* Empty State - No mock data */}
                <View style={styles.weeklyNutritionEmptyState}>
                  <Ionicons
                    name="bar-chart-outline"
                    size={rf(48)}
                    color={ResponsiveTheme.colors.textMuted}
                  />
                  <Text style={styles.emptyStateTitle}>
                    No nutrition data yet
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    Log your meals to see weekly macro trends
                  </Text>
                  <View style={styles.emptyStateHint}>
                    <Ionicons
                      name="restaurant-outline"
                      size={rf(14)}
                      color={ResponsiveTheme.colors.primary}
                    />
                    <Text style={styles.emptyStateHintText}>
                      Start by logging today's meals
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </View>

            {/* Weekly Meal Plan - Generate Button (shown only when no plan exists) */}

            {/* Generate Weekly Plan Prompt */}
            {!weeklyMealPlan && canAccessMealFeatures && (
              <GlassCard
                style={styles.promptCard}
                elevation={1}
                padding="md"
                blurIntensity="light"
                borderRadius="lg"
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center" as const,
                    marginBottom: ResponsiveTheme.spacing.sm,
                  }}
                >
                  <Ionicons
                    name="restaurant-outline"
                    size={rf(20)}
                    color={ResponsiveTheme.colors.text}
                  />
                  <Text
                    style={[
                      styles.promptTitle,
                      { marginLeft: 8, marginBottom: 0 },
                    ]}
                  >
                    Weekly Meal Planning
                  </Text>
                </View>
                <Text style={styles.promptText}>
                  Get a personalized 7-day meal plan with recipes tailored to
                  your goals and preferences.
                </Text>
                <Button
                  title={
                    isGeneratingPlan ? "Generating..." : "Generate Weekly Plan"
                  }
                  onPress={generateWeeklyMealPlan}
                  disabled={isGeneratingPlan}
                  style={styles.promptButton}
                />
              </GlassCard>
            )}

            {/* AI Meal Generation Panel */}
            {showFoodSearch && (
              <View style={styles.searchSection}>
                <GlassCard
                  style={styles.aiMealCard}
                  elevation={2}
                  padding="lg"
                  blurIntensity="light"
                  borderRadius="lg"
                >
                  <View style={styles.aiMealContent}>
                    <Ionicons
                      name="sparkles-outline"
                      size={rf(32)}
                      color={ResponsiveTheme.colors.primary}
                      style={styles.aiMealIcon}
                    />
                    <Text style={styles.aiMealTitle}>Generate AI Meals</Text>
                    <Text style={styles.aiMealText}>
                      Create personalized meals based on your dietary
                      preferences and nutrition goals.
                    </Text>
                    <View style={styles.mealTypeButtons}>
                      <AnimatedPressable
                        style={styles.mealTypeButton}
                        onPress={() => generateAIMeal("breakfast")}
                        disabled={isGeneratingMeal}
                        scaleValue={0.95}
                        hapticFeedback={true}
                        hapticType="selection"
                      >
                        <Ionicons
                          name="sunny-outline"
                          size={rf(24)}
                          color={ResponsiveTheme.colors.text}
                          style={styles.mealTypeEmoji}
                        />
                        <Text style={styles.mealTypeText}>Breakfast</Text>
                      </AnimatedPressable>
                      <AnimatedPressable
                        style={styles.mealTypeButton}
                        onPress={() => generateAIMeal("lunch")}
                        disabled={isGeneratingMeal}
                        scaleValue={0.95}
                        hapticFeedback={true}
                        hapticType="selection"
                      >
                        <Ionicons
                          name="restaurant-outline"
                          size={rf(24)}
                          color={ResponsiveTheme.colors.text}
                          style={styles.mealTypeEmoji}
                        />
                        <Text style={styles.mealTypeText}>Lunch</Text>
                      </AnimatedPressable>
                      <AnimatedPressable
                        style={styles.mealTypeButton}
                        onPress={() => generateAIMeal("dinner")}
                        disabled={isGeneratingMeal}
                        scaleValue={0.95}
                        hapticFeedback={true}
                        hapticType="selection"
                      >
                        <Ionicons
                          name="moon-outline"
                          size={rf(24)}
                          color={ResponsiveTheme.colors.text}
                          style={styles.mealTypeEmoji}
                        />
                        <Text style={styles.mealTypeText}>Dinner</Text>
                      </AnimatedPressable>
                      <AnimatedPressable
                        style={styles.mealTypeButton}
                        onPress={() => generateAIMeal("snack")}
                        disabled={isGeneratingMeal}
                        scaleValue={0.95}
                        hapticFeedback={true}
                        hapticType="selection"
                      >
                        <Ionicons
                          name="nutrition-outline"
                          size={rf(24)}
                          color={ResponsiveTheme.colors.text}
                          style={styles.mealTypeEmoji}
                        />
                        <Text style={styles.mealTypeText}>Snack</Text>
                      </AnimatedPressable>
                    </View>
                    <AnimatedPressable
                      style={styles.closeSearchButton}
                      onPress={() => setShowFoodSearch(false)}
                      scaleValue={0.95}
                    >
                      <Text style={styles.closeSearchText}>Close</Text>
                    </AnimatedPressable>
                  </View>
                </GlassCard>
              </View>
            )}

            {/* Daily Overview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today's Progress</Text>
              <GlassCard
                style={styles.overviewCard}
                elevation={2}
                padding="lg"
                blurIntensity="light"
                borderRadius="lg"
              >
                <View style={styles.caloriesSection}>
                  <View style={styles.caloriesHeader}>
                    <Text style={styles.caloriesConsumed}>
                      {nutritionTargets.calories.current}
                    </Text>
                    <Text style={styles.caloriesTarget}>
                      / {nutritionTargets.calories.target} cal
                    </Text>
                  </View>
                  <View style={styles.caloriesProgress}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${nutritionTargets.calories.target ? Math.min((nutritionTargets.calories.current / nutritionTargets.calories.target) * 100, 100) : 0}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.remainingText}>
                      {nutritionTargets.calories.target
                        ? Math.max(
                            nutritionTargets.calories.target -
                              nutritionTargets.calories.current,
                            0,
                          )
                        : 0}{" "}
                      cal remaining
                    </Text>
                  </View>
                </View>

                <View style={styles.macrosGrid}>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>
                      {Math.round(nutritionTargets.protein.current)}g
                    </Text>
                    <Text style={styles.macroLabel}>Protein</Text>
                    <Text style={styles.macroTarget}>
                      of {nutritionTargets.protein.target}g
                    </Text>
                  </View>

                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>
                      {Math.round(nutritionTargets.carbs.current)}g
                    </Text>
                    <Text style={styles.macroLabel}>Carbs</Text>
                    <Text style={styles.macroTarget}>
                      of {nutritionTargets.carbs.target}g
                    </Text>
                  </View>

                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>
                      {Math.round(nutritionTargets.fat.current)}g
                    </Text>
                    <Text style={styles.macroLabel}>Fat</Text>
                    <Text style={styles.macroTarget}>
                      of {nutritionTargets.fat.target}g
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </View>

            {/* Quick Actions - Compact Horizontal Scrollable */}
            <View style={styles.quickActionsSection}>
              <Text style={styles.quickActionsSectionTitle}>Quick Actions</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickActionsScroll}
                decelerationRate="fast"
              >
                <AnimatedPressable
                  onPress={handleScanFood}
                  scaleValue={0.92}
                  style={styles.quickActionPill}
                >
                  <LinearGradient
                    colors={[
                      "rgba(102, 126, 234, 0.15)",
                      "rgba(102, 126, 234, 0.05)",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.quickActionPillGradient}
                  >
                    <View
                      style={[
                        styles.quickActionIconCircle,
                        { backgroundColor: "rgba(102, 126, 234, 0.2)" },
                      ]}
                    >
                      <Ionicons name="camera" size={rf(16)} color="#667eea" />
                    </View>
                    <Text style={styles.quickActionPillText}>Scan</Text>
                  </LinearGradient>
                </AnimatedPressable>

                <AnimatedPressable
                  onPress={handleSearchFood}
                  scaleValue={0.92}
                  style={styles.quickActionPill}
                >
                  <LinearGradient
                    colors={[
                      "rgba(156, 39, 176, 0.15)",
                      "rgba(156, 39, 176, 0.05)",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.quickActionPillGradient}
                  >
                    <View
                      style={[
                        styles.quickActionIconCircle,
                        { backgroundColor: "rgba(156, 39, 176, 0.2)" },
                      ]}
                    >
                      <Ionicons name="sparkles" size={rf(16)} color="#9C27B0" />
                    </View>
                    <Text style={styles.quickActionPillText}>AI Meals</Text>
                  </LinearGradient>
                </AnimatedPressable>

                <AnimatedPressable
                  onPress={handleCreateRecipe}
                  scaleValue={0.92}
                  style={styles.quickActionPill}
                >
                  <LinearGradient
                    colors={[
                      "rgba(76, 175, 80, 0.15)",
                      "rgba(76, 175, 80, 0.05)",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.quickActionPillGradient}
                  >
                    <View
                      style={[
                        styles.quickActionIconCircle,
                        { backgroundColor: "rgba(76, 175, 80, 0.2)" },
                      ]}
                    >
                      <Ionicons name="create" size={rf(16)} color="#4CAF50" />
                    </View>
                    <Text style={styles.quickActionPillText}>Recipe</Text>
                  </LinearGradient>
                </AnimatedPressable>

                <AnimatedPressable
                  onPress={handleScanProduct}
                  scaleValue={0.92}
                  style={styles.quickActionPill}
                >
                  <LinearGradient
                    colors={[
                      "rgba(255, 152, 0, 0.15)",
                      "rgba(255, 152, 0, 0.05)",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.quickActionPillGradient}
                  >
                    <View
                      style={[
                        styles.quickActionIconCircle,
                        { backgroundColor: "rgba(255, 152, 0, 0.2)" },
                      ]}
                    >
                      <Ionicons name="barcode" size={rf(16)} color="#FF9800" />
                    </View>
                    <Text style={styles.quickActionPillText}>Barcode</Text>
                  </LinearGradient>
                </AnimatedPressable>

                <AnimatedPressable
                  onPress={handleLogWater}
                  scaleValue={0.92}
                  style={styles.quickActionPill}
                >
                  <LinearGradient
                    colors={[
                      "rgba(33, 150, 243, 0.15)",
                      "rgba(33, 150, 243, 0.05)",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.quickActionPillGradient}
                  >
                    <View
                      style={[
                        styles.quickActionIconCircle,
                        { backgroundColor: "rgba(33, 150, 243, 0.2)" },
                      ]}
                    >
                      <Ionicons name="water" size={rf(16)} color="#2196F3" />
                    </View>
                    <Text style={styles.quickActionPillText}>Water</Text>
                  </LinearGradient>
                </AnimatedPressable>

                <AnimatedPressable
                  onPress={() => {}}
                  scaleValue={0.92}
                  style={styles.quickActionPill}
                >
                  <LinearGradient
                    colors={[
                      "rgba(233, 30, 99, 0.15)",
                      "rgba(233, 30, 99, 0.05)",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.quickActionPillGradient}
                  >
                    <View
                      style={[
                        styles.quickActionIconCircle,
                        { backgroundColor: "rgba(233, 30, 99, 0.2)" },
                      ]}
                    >
                      <Ionicons
                        name="restaurant"
                        size={rf(16)}
                        color="#E91E63"
                      />
                    </View>
                    <Text style={styles.quickActionPillText}>Log Meal</Text>
                  </LinearGradient>
                </AnimatedPressable>
              </ScrollView>
            </View>

            {/* Water Intake */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Water Intake</Text>
              <GlassCard
                style={styles.waterCard}
                elevation={2}
                padding="lg"
                blurIntensity="light"
                borderRadius="lg"
              >
                <View style={styles.waterHeader}>
                  <Ionicons
                    name="water-outline"
                    size={rf(32)}
                    color={ResponsiveTheme.colors.primary}
                    style={styles.waterIcon}
                  />
                  <View style={styles.waterInfo}>
                    <Text style={styles.waterAmount}>
                      {waterConsumedLiters.toFixed(1)}L /{" "}
                      {waterGoalLiters?.toFixed(1) ?? "?"}L
                    </Text>
                    <Text style={styles.waterSubtext}>
                      {waterConsumedLiters === 0
                        ? "Start tracking your hydration!"
                        : waterGoalLiters &&
                            waterConsumedLiters >= waterGoalLiters
                          ? "Daily goal achieved!"
                          : waterGoalLiters
                            ? `${(waterGoalLiters - waterConsumedLiters).toFixed(1)}L more to reach your goal!`
                            : "Set your water goal in settings"}
                    </Text>
                  </View>
                </View>

                <View style={styles.waterProgress}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${waterGoalLiters ? Math.max(0, Math.min((waterConsumedLiters / waterGoalLiters) * 100, 100)) : 0}%`,
                          backgroundColor:
                            waterGoalLiters &&
                            waterConsumedLiters >= waterGoalLiters
                              ? "#10b981"
                              : ResponsiveTheme.colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.waterButtons}>
                  <Button
                    title="+ 250ml"
                    onPress={handleAddWater}
                    variant={
                      waterGoalLiters && waterConsumedLiters >= waterGoalLiters
                        ? ("solid" as any)
                        : "outline"
                    }
                    size="sm"
                    style={{
                      ...styles.waterButton,
                      flex: 1,
                      marginRight: ResponsiveTheme.spacing.sm,
                    }}
                  />
                  <Button
                    title="Custom"
                    onPress={handleLogWater}
                    variant="outline"
                    size="sm"
                    style={{
                      ...styles.waterButton,
                      flex: 0.7,
                      marginRight: ResponsiveTheme.spacing.sm,
                    }}
                  />
                  {waterConsumedLiters > 0 && (
                    <Button
                      title="- 250ml"
                      onPress={handleRemoveWater}
                      variant="outline"
                      size="sm"
                      style={{ ...styles.waterButton, flex: 0.8 }}
                    />
                  )}
                </View>
              </GlassCard>
            </View>

            <View style={styles.bottomSpacing} />
          </View>
        </ScrollView>

        {/* Camera Modal */}
        {showCamera && (
          <Camera
            mode={cameraMode}
            onCapture={handleCameraCapture}
            onBarcodeScanned={
              cameraMode === "barcode" ? handleBarcodeScanned : undefined
            }
            onClose={() => {
              setShowCamera(false);
              setCameraMode("food"); // Reset to default
            }}
            style={styles.cameraModal}
          />
        )}

        {/* Test Component Modal */}
        <Modal
          visible={showTestComponent}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowTestComponent(false)}
        >
          <View style={styles.testContainer}>
            <View style={styles.testHeader}>
              <View
                style={{ flexDirection: "row", alignItems: "center" as const }}
              >
                <Ionicons
                  name="flask-outline"
                  size={rf(20)}
                  color={ResponsiveTheme.colors.text}
                />
                <Text style={[styles.testTitle, { marginLeft: 8 }]}>
                  Food Recognition Test
                </Text>
              </View>
              <AnimatedPressable
                onPress={() => setShowTestComponent(false)}
                style={styles.testCloseButton}
                scaleValue={0.95}
              >
                <Text style={styles.testCloseText}>✕</Text>
              </AnimatedPressable>
            </View>
            <FoodRecognitionTest />
          </View>
        </Modal>

        {/* Meal Type Selector Modal */}
        <MealTypeSelector
          visible={showMealTypeSelector}
          onSelect={handleMealTypeSelected}
          onClose={() => setShowMealTypeSelector(false)}
        />

        {/* AI Meals Panel */}
        <AIMealsPanel
          visible={showAIMealsPanel}
          onClose={() => setShowAIMealsPanel(false)}
          onGenerateMeal={generateAIMeal}
          isGenerating={isGeneratingMeal}
          profile={profile}
        />

        {/* Async Job Status Indicator */}
        {asyncJob && (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
            onRequestClose={cancelAsyncGeneration}
          >
            <View style={styles.asyncJobModalOverlay}>
              <View style={styles.asyncJobModalContent}>
                <JobStatusIndicator
                  job={{
                    jobId: asyncJob.jobId,
                    status:
                      asyncJob.status === "pending"
                        ? "pending"
                        : asyncJob.status === "processing"
                          ? "processing"
                          : asyncJob.status === "completed"
                            ? "completed"
                            : asyncJob.status === "failed"
                              ? "failed"
                              : asyncJob.status === "cancelled"
                                ? "cancelled"
                                : "idle",
                    result: undefined,
                    error: asyncJob.error,
                    createdAt: asyncJob.createdAt,
                    estimatedTimeRemaining: asyncJob.estimatedTimeRemaining,
                    generationTimeMs: asyncJob.generationTimeMs,
                  }}
                  onCancel={cancelAsyncGeneration}
                  onDismiss={clearAsyncJob}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Create Recipe Modal */}
        <CreateRecipeModal
          visible={showCreateRecipe}
          onClose={() => setShowCreateRecipe(false)}
          onRecipeCreated={handleRecipeCreated}
          profile={profile}
        />

        {/* Portion Adjustment Modal */}
        {portionData && (
          <PortionAdjustment
            visible={showPortionAdjustment}
            recognizedFoods={portionData.recognizedFoods}
            onClose={() => {
              setShowPortionAdjustment(false);
              setPortionData(null);
            }}
            onAdjustmentComplete={handlePortionAdjustmentComplete}
          />
        )}

        {/* Food Recognition Feedback Modal */}
        {feedbackData && (
          <FoodRecognitionFeedback
            visible={showFeedbackModal}
            recognizedFoods={feedbackData.recognizedFoods}
            onClose={() => {
              setShowFeedbackModal(false);
              setFeedbackData(null);
            }}
            onSubmitFeedback={handleFeedbackSubmit}
            originalImageUri={feedbackData.imageUri}
          />
        )}

        {/* Context Menu Modal */}
        <Modal
          visible={contextMenu.visible}
          transparent
          animationType="fade"
          onRequestClose={closeContextMenu}
        >
          <AnimatedPressable
            style={styles.contextMenuOverlay}
            onPress={closeContextMenu}
            scaleValue={1}
          >
            <View
              style={[
                styles.contextMenu,
                {
                  left: Math.min(contextMenu.position.x, 300),
                  top: Math.min(contextMenu.position.y, 600),
                },
              ]}
            >
              <AnimatedPressable
                style={styles.contextMenuItem}
                onPress={() => handleContextMenuAction("edit")}
                scaleValue={0.95}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center" as const,
                  }}
                >
                  <Ionicons
                    name="pencil-outline"
                    size={rf(16)}
                    color={ResponsiveTheme.colors.text}
                  />
                  <Text style={[styles.contextMenuText, { marginLeft: 8 }]}>
                    Edit Meal
                  </Text>
                </View>
              </AnimatedPressable>

              <AnimatedPressable
                style={styles.contextMenuItem}
                onPress={() => handleContextMenuAction("duplicate")}
                scaleValue={0.95}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center" as const,
                  }}
                >
                  <Ionicons
                    name="copy-outline"
                    size={rf(16)}
                    color={ResponsiveTheme.colors.text}
                  />
                  <Text style={[styles.contextMenuText, { marginLeft: 8 }]}>
                    Duplicate
                  </Text>
                </View>
              </AnimatedPressable>

              <AnimatedPressable
                style={styles.contextMenuItem}
                onPress={() => handleContextMenuAction("details")}
                scaleValue={0.95}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center" as const,
                  }}
                >
                  <Ionicons
                    name="stats-chart-outline"
                    size={rf(16)}
                    color={ResponsiveTheme.colors.text}
                  />
                  <Text style={[styles.contextMenuText, { marginLeft: 8 }]}>
                    Nutrition Details
                  </Text>
                </View>
              </AnimatedPressable>

              <AnimatedPressable
                style={styles.contextMenuItem}
                onPress={() => handleContextMenuAction("delete")}
                scaleValue={0.95}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center" as const,
                  }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={rf(16)}
                    color={ResponsiveTheme.colors.error || "#ef4444"}
                  />
                  <Text style={[styles.contextMenuText, { marginLeft: 8 }]}>
                    Delete Meal
                  </Text>
                </View>
              </AnimatedPressable>
            </View>
          </AnimatedPressable>
        </Modal>

        {/* Meal Preparation Modal */}
        <Modal
          visible={showMealPreparationModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowMealPreparationModal(false)}
        >
          <View style={styles.mealModalOverlay}>
            <View style={styles.mealModal}>
              {selectedMealForPreparation && (
                <>
                  <View style={styles.mealModalHeader}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center" as const,
                      }}
                    >
                      <Ionicons
                        name="restaurant-outline"
                        size={rf(20)}
                        color={ResponsiveTheme.colors.text}
                      />
                      <Text style={[styles.mealModalTitle, { marginLeft: 8 }]}>
                        Ready to Cook?
                      </Text>
                    </View>
                    <AnimatedPressable
                      onPress={() => setShowMealPreparationModal(false)}
                      style={styles.mealModalCloseButton}
                      scaleValue={0.95}
                    >
                      <Text style={styles.mealModalCloseText}>✕</Text>
                    </AnimatedPressable>
                  </View>

                  <View style={styles.mealModalContent}>
                    <Text style={styles.mealModalMealName}>
                      {selectedMealForPreparation.name}
                    </Text>

                    {/* Dynamic Motivation Message */}
                    <View style={styles.motivationSection}>
                      <Text style={styles.motivationText}>
                        {mealMotivationService.getMealStartMessage(
                          selectedMealForPreparation,
                          {
                            personalInfo: profile?.personalInfo,
                            fitnessGoals: profile?.fitnessGoals,
                            currentStreak: achievementStreak,
                            completedMealsToday: 0,
                          },
                        )}
                      </Text>
                    </View>

                    {/* Macro Dashboard */}
                    <MacroDashboard
                      meal={selectedMealForPreparation}
                      compact={true}
                      showTitle={false}
                      style={styles.modalMacroDashboard}
                    />

                    <View style={styles.mealModalDetails}>
                      <View style={styles.mealModalDetailItem}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center" as const,
                          }}
                        >
                          <Ionicons
                            name="time-outline"
                            size={rf(14)}
                            color={ResponsiveTheme.colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.mealModalDetailLabel,
                              { marginLeft: 4 },
                            ]}
                          >
                            Estimated Time:
                          </Text>
                        </View>
                        <Text style={styles.mealModalDetailValue}>
                          {selectedMealForPreparation.preparationTime} minutes
                        </Text>
                      </View>

                      <View style={styles.mealModalDetailItem}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center" as const,
                          }}
                        >
                          <Ionicons
                            name="flame-outline"
                            size={rf(14)}
                            color={ResponsiveTheme.colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.mealModalDetailLabel,
                              { marginLeft: 4 },
                            ]}
                          >
                            Difficulty:
                          </Text>
                        </View>
                        <Text style={styles.mealModalDetailValue}>
                          {selectedMealForPreparation.difficulty}
                        </Text>
                      </View>

                      <View style={styles.mealModalDetailItem}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center" as const,
                          }}
                        >
                          <Ionicons
                            name="cart-outline"
                            size={rf(14)}
                            color={ResponsiveTheme.colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.mealModalDetailLabel,
                              { marginLeft: 4 },
                            ]}
                          >
                            Ingredients:
                          </Text>
                        </View>
                        <Text style={styles.mealModalDetailValue}>
                          {selectedMealForPreparation.items?.length ?? 0} items
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.mealModalDescription}>
                      {selectedMealForPreparation.description}
                    </Text>
                  </View>

                  <View style={styles.mealModalActions}>
                    <AnimatedPressable
                      style={styles.mealModalCancelButton}
                      onPress={() => setShowMealPreparationModal(false)}
                      scaleValue={0.95}
                    >
                      <Text style={styles.mealModalCancelText}>Cancel</Text>
                    </AnimatedPressable>

                    <AnimatedPressable
                      style={styles.mealModalStartButton}
                      onPress={() => {
                        startMealPreparation(selectedMealForPreparation);
                        setShowMealPreparationModal(false);
                      }}
                      scaleValue={0.95}
                    >
                      <Text style={styles.mealModalStartText}>
                        Start Cooking
                      </Text>
                    </AnimatedPressable>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Floating Action Button (FAB) - Aurora Design with pulse + rotation */}
        <Animated.View
          style={{
            transform: [
              { scale: fabScale },
              {
                rotate: fabRotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "45deg"],
                }),
              },
            ],
          }}
        >
          <AnimatedPressable
            style={styles.fab}
            onPress={() => {
              // Rotation animation on press
              Animated.sequence([
                Animated.timing(fabRotation, {
                  toValue: 1,
                  duration: 200,
                  useNativeDriver: true,
                }),
                Animated.timing(fabRotation, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                }),
              ]).start();
              handleSearchFood();
            }}
            scaleValue={0.9}
            hapticFeedback={true}
            hapticType="medium"
          >
            <LinearGradient
              {...(toLinearGradientProps(gradients.button.primary) as any)}
              style={styles.fabGradient}
            >
              <Text style={styles.fabIcon}>+</Text>
            </LinearGradient>
          </AnimatedPressable>
        </Animated.View>

        {/* Product Details Modal */}
        {scannedProduct && (
          <ProductDetailsModal
            visible={showProductModal}
            onClose={() => setShowProductModal(false)}
            product={scannedProduct}
            healthAssessment={productHealthAssessment}
            onAddToMeal={handleAddProductToMeal}
          />
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },

  scrollView: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.md,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  headerButtons: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: rp(12),
  },

  aiButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: rp(12),
    paddingVertical: rp(8),
    borderRadius: rs(20),
    minWidth: rw(70),
    alignItems: "center" as const,
  },

  aiButtonDisabled: {
    backgroundColor: ResponsiveTheme.colors.textMuted,
  },

  aiButtonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: rf(12),
    fontWeight: "600",
  },

  addButton: {
    width: rw(40),
    height: rh(40),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  addIcon: {
    fontSize: rf(24),
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  // DateSelector Styles
  dateSelector: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.md,
  },

  dateNavButton: {
    width: rw(40),
    height: rh(40),
    borderRadius: ResponsiveTheme.borderRadius.full,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  dateNavIcon: {
    fontSize: rf(24),
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  dateBadge: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.sm,
    alignItems: "center" as const,
  },

  dateText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  dateSubtext: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(2),
  },

  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  mealCountBadge: {
    backgroundColor: ResponsiveTheme.colors.primary + "20",
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },

  mealCountText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.primary,
  },

  premiumMealsContainer: {
    gap: ResponsiveTheme.spacing.md,
  },

  overviewCard: {
    padding: ResponsiveTheme.spacing.lg,
  },

  caloriesSection: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  caloriesHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  caloriesConsumed: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },

  caloriesTarget: {
    fontSize: ResponsiveTheme.fontSize.lg,
    color: ResponsiveTheme.colors.textSecondary,
    marginLeft: ResponsiveTheme.spacing.sm,
  },

  caloriesProgress: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  progressBar: {
    height: rh(8),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  progressFill: {
    height: "100%",
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  remainingText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  macrosGrid: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
  },

  macroItem: {
    alignItems: "center" as const,
    flex: 1,
  },

  macroValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  macroLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  mealCard: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  mealContent: {
    padding: ResponsiveTheme.spacing.lg,
  },

  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "flex-start",
  },

  mealInfo: {
    flex: 1,
  },

  mealTitleRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.sm,
    position: "relative",
  },

  aiGeneratedBadge: {
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: rp(6),
    paddingVertical: rp(2),
    borderRadius: rs(8),
    marginLeft: rp(8),
  },

  aiGeneratedText: {
    color: ResponsiveTheme.colors.white,
    fontSize: rf(9),
    fontWeight: "600",
  },

  mealAIButton: {
    position: "absolute",
    right: 0,
    backgroundColor: ResponsiveTheme.colors.primary,
    width: rw(20),
    height: rh(20),
    borderRadius: rs(10),
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  mealAIText: {
    fontSize: rf(8),
  },

  mealIcon: {
    fontSize: rf(20),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  mealType: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },

  mealTime: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textMuted,
  },

  mealItems: {
    marginLeft: ResponsiveTheme.spacing.lg,
  },

  mealItem: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  plannedText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textMuted,
    fontStyle: "italic",
    marginLeft: ResponsiveTheme.spacing.lg,
  },

  mealCalories: {
    alignItems: "center" as const,
    marginLeft: ResponsiveTheme.spacing.md,
  },

  caloriesValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },

  // ============================================================================
  // QUICK ACTIONS - Compact Horizontal Scrollable
  // ============================================================================
  quickActionsSection: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  quickActionsSectionTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  quickActionsScroll: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    gap: ResponsiveTheme.spacing.sm,
  },
  quickActionPill: {
    borderRadius: rw(16),
    overflow: "hidden",
  },
  quickActionPillGradient: {
    flexDirection: "row",
    alignItems: "center" as const,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: rw(16),
    gap: ResponsiveTheme.spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  quickActionIconCircle: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  quickActionPillText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },

  // Legacy styles kept for compatibility
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.md,
  },

  actionItem: {
    width: "47%",
  },

  actionCard: {
    padding: ResponsiveTheme.spacing.lg,
    alignItems: "center" as const,
  },

  actionIcon: {
    fontSize: rf(32),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  actionText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    textAlign: "center",
  },

  waterCard: {
    padding: ResponsiveTheme.spacing.lg,
  },

  waterHeader: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  waterIcon: {
    fontSize: rf(32),
    marginRight: ResponsiveTheme.spacing.md,
  },

  waterInfo: {
    flex: 1,
  },

  waterAmount: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  waterSubtext: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  waterProgress: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  waterButton: {
    alignSelf: "flex-start",
  },

  waterButtons: {
    flexDirection: "row",
    alignItems: "center" as const,
  },

  bottomSpacing: {
    height: ResponsiveTheme.spacing.xl,
  },

  cameraModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },

  contextMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },

  contextMenu: {
    position: "absolute",
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    minWidth: rw(180),
    ...THEME.shadows.md,
  },

  contextMenuItem: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
  },

  contextMenuText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Search styles
  searchSection: {
    marginHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    ...THEME.shadows.sm,
  },

  searchInput: {
    flex: 1,
    height: rh(44),
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    paddingVertical: ResponsiveTheme.spacing.sm,
  },

  clearSearchButton: {
    padding: ResponsiveTheme.spacing.sm,
    marginLeft: ResponsiveTheme.spacing.sm,
  },

  clearSearchText: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.textSecondary,
  },

  foodResults: {
    marginTop: ResponsiveTheme.spacing.md,
    maxHeight: rh(120),
  },

  foodItem: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: ResponsiveTheme.spacing.md,
    marginRight: ResponsiveTheme.spacing.sm,
    minWidth: rw(140),
    ...THEME.shadows.sm,
  },

  foodName: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: rp(2),
  },

  foodCategory: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginBottom: rp(4),
  },

  foodCalories: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    marginBottom: rp(4),
  },

  foodMacros: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
  },

  foodMacro: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },

  // Enhanced meal card styles
  mealNutrition: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginLeft: ResponsiveTheme.spacing.lg,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  nutritionText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },

  nutritionDot: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginHorizontal: rp(4),
  },

  mealRating: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginLeft: ResponsiveTheme.spacing.lg,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  ratingStars: {
    fontSize: rf(12),
    marginRight: rp(4),
  },

  ratingText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  difficultyText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginLeft: rp(4),
  },

  statusButton: {
    width: rw(32),
    height: rh(32),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  statusIcon: {
    fontSize: rf(16),
  },

  loadingContainer: {
    alignItems: "center" as const,
    paddingVertical: ResponsiveTheme.spacing.xl,
  },

  loadingText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.md,
  },

  errorCard: {
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
    alignItems: "center" as const,
  },

  errorText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.error,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  retryButton: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  // Weekly Meal Plan Styles
  daySelectorContainer: {
    marginBottom: ResponsiveTheme.spacing.md,
    marginTop: -ResponsiveTheme.spacing.sm,
  },

  daySelector: {
    marginBottom: ResponsiveTheme.spacing.lg,
    paddingHorizontal: ResponsiveTheme.spacing.md,
  },

  dayButton: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    marginRight: ResponsiveTheme.spacing.sm,
    borderRadius: rs(20),
    backgroundColor: ResponsiveTheme.colors.background,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    position: "relative" as const,
    alignItems: "center" as const,
  },

  todayDayButton: {
    borderColor: ResponsiveTheme.colors.primary,
    borderWidth: 2,
  },

  todayIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ResponsiveTheme.colors.primary,
    position: "absolute" as const,
    bottom: -2,
  },

  selectedDayButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },

  dayButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
  },

  selectedDayButtonText: {
    color: ResponsiveTheme.colors.surface,
  },

  mealsSection: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: "700" as const,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  emptyCard: {
    padding: ResponsiveTheme.spacing.xl,
    alignItems: "center" as const,
  },

  emptyText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  promptCard: {
    margin: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.xl,
    alignItems: "center" as const,
  },

  promptTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  promptText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(22),
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  promptButton: {
    minWidth: rw(200),
  },

  // AI Meal Generation styles
  aiMealCard: {
    padding: ResponsiveTheme.spacing.lg,
  },

  aiMealContent: {
    alignItems: "center" as const,
  },

  aiMealIcon: {
    fontSize: rf(36),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  aiMealTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: "center",
  },

  aiMealText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
    lineHeight: rf(20),
  },

  mealTypeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center" as const,
    gap: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  mealTypeButton: {
    alignItems: "center" as const,
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    minWidth: rw(70),
  },

  mealTypeEmoji: {
    fontSize: rf(24),
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  mealTypeText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  closeSearchButton: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.sm,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  closeSearchText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Motivation section styles
  motivationSection: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: ResponsiveTheme.spacing.md,
    marginVertical: ResponsiveTheme.spacing.md,
  },

  motivationText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(18),
    textAlign: "center",
  },

  modalMacroDashboard: {
    marginVertical: ResponsiveTheme.spacing.md,
    shadowOpacity: 0.05,
    elevation: 2,
  },

  // Test component styles
  testContainer: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },

  testHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },

  testTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  testCloseButton: {
    width: rw(32),
    height: rh(32),
    borderRadius: rs(16),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  testCloseText: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  // Meal Preparation Modal Styles
  mealModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: ResponsiveTheme.spacing.lg,
  },

  mealModal: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.xl,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },

  mealModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: ResponsiveTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },

  mealModalTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  mealModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  mealModalCloseText: {
    fontSize: 16,
    color: ResponsiveTheme.colors.text,
    fontWeight: "bold",
  },

  mealModalContent: {
    padding: ResponsiveTheme.spacing.lg,
  },

  mealModalMealName: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.lg,
    textAlign: "center",
  },

  mealModalDetails: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  mealModalDetailItem: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
  },

  mealModalDetailLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: "500",
  },

  mealModalDetailValue: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  mealModalDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: 20,
    textAlign: "center",
  },

  mealModalActions: {
    flexDirection: "row",
    padding: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    gap: ResponsiveTheme.spacing.md,
  },

  mealModalCancelButton: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    alignItems: "center" as const,
  },

  mealModalCancelText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  mealModalStartButton: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    backgroundColor: ResponsiveTheme.colors.primary,
    alignItems: "center" as const,
  },

  mealModalStartText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.surface,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  // Aurora Calorie Overview Styles
  calorieOverviewCenter: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  calorieCenter: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  caloriesRemaining: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },

  caloriesLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  macroGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    opacity: 0.5,
  },

  macroStat: {
    alignItems: "center" as const,
  },

  macroTarget: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  // Aurora Meal Timeline Styles
  mealTimelineCard: {
    marginBottom: ResponsiveTheme.spacing.md,
    position: "relative",
  },

  // Swipeable Container Styles
  swipeableContainer: {
    marginBottom: ResponsiveTheme.spacing.md,
    position: "relative",
    overflow: "hidden",
  },

  swipeableCard: {
    width: "100%",
  },

  swipeActions: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.xs,
    paddingRight: ResponsiveTheme.spacing.md,
  },

  swipeActionEdit: {
    width: rw(70),
    height: "100%",
    backgroundColor: "#4ECDC4",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  swipeActionDelete: {
    width: rw(70),
    height: "100%",
    backgroundColor: "#FF6B6B",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  swipeActionIcon: {
    fontSize: rf(24),
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  swipeActionText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.white,
  },

  timeBadge: {
    position: "absolute",
    top: ResponsiveTheme.spacing.sm,
    right: ResponsiveTheme.spacing.sm,
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
    zIndex: 1,
  },

  timeBadgeText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  mealTimelineContent: {
    flexDirection: "row",
    alignItems: "center" as const,
  },

  mealImageContainer: {
    marginRight: ResponsiveTheme.spacing.md,
  },

  mealImageGradientBorder: {
    width: rw(70),
    height: rh(70),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: rp(3),
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  mealImageInner: {
    width: "100%",
    height: "100%",
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  mealImageEmoji: {
    fontSize: rf(32),
  },

  mealTimelineInfo: {
    flex: 1,
  },

  mealTimelineName: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  mealTimelineCalories: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  macroBadgesContainer: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.xs,
  },

  macroBadge: {
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  macroBadgeText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  mealActionButton: {
    width: rw(40),
    height: rh(40),
    borderRadius: ResponsiveTheme.borderRadius.full,
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginLeft: ResponsiveTheme.spacing.sm,
  },

  mealActionIcon: {
    fontSize: rf(16),
  },

  emptyMealsText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  emptyMealsSubtext: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },

  // Aurora Meal Suggestions Styles
  suggestionsScrollContent: {
    paddingRight: ResponsiveTheme.spacing.lg,
  },

  suggestionCard: {
    width: rw(300),
    marginRight: ResponsiveTheme.spacing.md,
    overflow: "hidden",
  },

  // Card Flip Styles
  cardFace: {
    backfaceVisibility: "hidden",
    position: "absolute",
    width: "100%",
  },

  cardFaceBack: {
    position: "absolute",
  },

  suggestionCardBack: {
    height: rh(350),
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  cardBackContent: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  cardBackIcon: {
    fontSize: rf(64),
    color: "#10b981",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  cardBackTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  cardBackSubtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },

  suggestionImageContainer: {
    height: rh(150),
    width: "100%",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    position: "relative",
  },

  suggestionGradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  suggestionImageEmoji: {
    fontSize: rf(64),
  },

  suggestionContent: {
    padding: ResponsiveTheme.spacing.lg,
  },

  suggestionName: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  suggestionDetails: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  suggestionMacros: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    opacity: 0.7,
  },

  suggestionMacroItem: {
    alignItems: "center" as const,
  },

  suggestionMacroValue: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },

  suggestionMacroLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  addToPlanButton: {
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: "hidden",
  },

  addToPlanButtonGradient: {
    paddingVertical: ResponsiveTheme.spacing.md,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  addToPlanButtonText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.white,
  },

  // Aurora Water Tracker Styles
  waterTrackerContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginTop: ResponsiveTheme.spacing.md,
  },

  waterGlassContainer: {
    alignItems: "center" as const,
    marginRight: ResponsiveTheme.spacing.xl,
  },

  waterGlass: {
    width: rw(100),
    height: rh(180),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: "rgba(78, 205, 196, 0.1)",
    position: "relative",
    overflow: "hidden",
    justifyContent: "flex-end" as const,
  },

  waterFill: {
    width: "100%",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },

  waterFillGradient: {
    width: "100%",
    height: "100%",
  },

  glassBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    borderWidth: rp(3),
    borderColor: "rgba(78, 205, 196, 0.3)",
  },

  waterDropIcon: {
    fontSize: rf(24),
    marginTop: ResponsiveTheme.spacing.sm,
  },

  waterStatsContainer: {
    flex: 1,
  },

  waterAmountConsumed: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: "#4ECDC4",
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  waterTargetAmount: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  waterQuickAddButtons: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  waterQuickAddButton: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
    backgroundColor: "rgba(78, 205, 196, 0.2)",
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(78, 205, 196, 0.3)",
    overflow: "hidden",
    position: "relative",
  },

  rippleCircle: {
    position: "absolute",
    width: rw(30),
    height: rh(30),
    borderRadius: ResponsiveTheme.borderRadius.full,
    backgroundColor: "#4ECDC4",
  },

  waterQuickAddButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: "#4ECDC4",
    zIndex: 1,
  },

  waterTimeline: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  waterTimelineTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  waterTimelineBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rp(4),
  },

  waterTimelineDot: {
    width: rw(12),
    height: rh(12),
    borderRadius: ResponsiveTheme.borderRadius.full,
    backgroundColor: "#4ECDC4",
  },

  // Weekly Nutrition Trends Chart Styles
  chartLegend: {
    flexDirection: "row",
    justifyContent: "center" as const,
    gap: ResponsiveTheme.spacing.lg,
    marginTop: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.xs,
  },

  legendDot: {
    width: rw(12),
    height: rh(12),
    borderRadius: ResponsiveTheme.borderRadius.full,
  },

  legendText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  weeklyNutritionChart: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "flex-end",
    height: rh(200),
    paddingHorizontal: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  weeklyNutritionEmptyState: {
    height: rh(200),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.sm,
  },

  emptyStateTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginTop: ResponsiveTheme.spacing.sm,
  },

  emptyStateSubtext: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textMuted,
    textAlign: "center",
  },

  emptyStateHint: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.xs,
    marginTop: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.xs,
    backgroundColor: "rgba(102, 126, 234, 0.1)",
    borderRadius: rw(16),
  },

  emptyStateHintText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },

  chartDayColumn: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
  },

  barsGroup: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: rp(2),
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  barContainer: {
    width: rw(8),
    height: rh(160),
    justifyContent: "flex-end" as const,
  },

  macroBar: {
    width: "100%",
    borderRadius: ResponsiveTheme.borderRadius.xs,
    minHeight: rh(8),
  },

  proteinBar: {
    backgroundColor: "#FF6B9D",
  },

  carbsBar: {
    backgroundColor: "#4ECDC4",
  },

  fatsBar: {
    backgroundColor: "#FFA726",
  },

  chartDayLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  averageLine: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: ResponsiveTheme.spacing.md,
  },

  averageLineDashed: {
    flex: 1,
    height: 1,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginRight: ResponsiveTheme.spacing.sm,
  },

  averageLineText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    fontStyle: "italic",
  },

  // Floating Action Button (FAB) Styles
  fab: {
    position: "absolute",
    bottom: ResponsiveTheme.spacing.xl,
    right: ResponsiveTheme.spacing.lg,
    width: rw(56),
    height: rh(56),
    borderRadius: ResponsiveTheme.borderRadius.full,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  fabGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  fabIcon: {
    fontSize: rf(32),
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  // Async Job Modal Styles
  asyncJobModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: ResponsiveTheme.spacing.lg,
  },

  asyncJobModalContent: {
    width: "100%",
    maxWidth: rw(400),
  },
});
