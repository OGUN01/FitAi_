import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  RefreshControl,
  Animated,
  PanResponder,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { useAuth } from "../../hooks/useAuth";
import {
  useNutritionStore,
  useAppStateStore,
  useUserStore,
} from "../../stores";
import MacroDashboard from "../../components/nutrition/MacroDashboard";
import { PremiumMealCard } from "../../components/diet/PremiumMealCard";
import { getMealTime } from "../../utils/mealSchedule";
import FoodRecognitionTest from "../../components/debug/FoodRecognitionTest";
import MealTypeSelector from "../../components/diet/MealTypeSelector";
import AIMealsPanel from "../../components/diet/AIMealsPanel";
import CreateRecipeModal from "../../components/diet/CreateRecipeModal";
import JobStatusIndicator from "../../components/diet/JobStatusIndicator";
import { WaterIntakeModal } from "../../components/diet/WaterIntakeModal";
import {
  runQuickActionsTests,
  runFoodRecognitionE2ETests,
} from "../../utils/testQuickActions";
import FoodRecognitionFeedback from "../../components/diet/FoodRecognitionFeedback";
import PortionAdjustment from "../../components/diet/PortionAdjustment";
import { ProductDetailsModal } from "../../components/diet/ProductDetailsModal";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { LargeProgressRing } from "../../components/ui/aurora/ProgressRing";
import { GuestSignUpScreen } from "./GuestSignUpScreen";

// Hooks
import { useMealPlanning } from "../../hooks/useMealPlanning";
import { useNutritionTracking } from "../../hooks/useNutritionTracking";
import { useAIMealGeneration } from "../../hooks/useAIMealGeneration";

interface DietScreenProps {
  navigation?: any;
  route?: any;
  isActive?: boolean;
}

export const DietScreen: React.FC<DietScreenProps> = ({
  navigation,
  route,
  isActive = true,
}) => {
  const { user, isAuthenticated, isGuestMode } = useAuth();
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Test Component State
  const [showTestComponent, setShowTestComponent] = useState(false);
  const [showCreateRecipe, setShowCreateRecipe] = useState(false);
  const [userRecipes, setUserRecipes] = useState<any[]>([]);
  const [showAIMealsPanel, setShowAIMealsPanel] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    mealId: string | null;
    position: { x: number; y: number };
  }>({
    visible: false,
    mealId: null,
    position: { x: 0, y: 0 },
  });

  // UI Animations State
  const [mealSwipePositions, setMealSwipePositions] = useState<
    Record<string, Animated.Value>
  >({});
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<number>>(
    new Set(),
  );
  const [suggestionSwipeStates, setSuggestionSwipeStates] = useState<
    Record<number, { translateY: Animated.Value; opacity: Animated.Value }>
  >({});
  const [cardFlipStates, setCardFlipStates] = useState<
    Record<number, Animated.Value>
  >({});
  const [addedToPlan, setAddedToPlan] = useState<Set<number>>(new Set());

  // Animation Refs
  const calorieRingProgress = useRef(new Animated.Value(0)).current;
  const proteinCount = useRef(new Animated.Value(0)).current;
  const carbsCount = useRef(new Animated.Value(0)).current;
  const fatsCount = useRef(new Animated.Value(0)).current;
  const waterWaveOffset = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabRotation = useRef(new Animated.Value(0)).current;
  const waterButton1Ripple = useRef(new Animated.Value(0)).current;
  const waterButton2Ripple = useRef(new Animated.Value(0)).current;
  const waterButton3Ripple = useRef(new Animated.Value(0)).current;

  // Custom Hooks
  const {
    weeklyMealPlan,
    isGeneratingPlan,
    mealProgress,
    selectedDay,
    asyncJob,
    aiError: mealPlanError,
    getTodaysMeals,
    generateWeeklyMealPlan,
    cancelAsyncGeneration,
    handleDeleteMeal,
    refreshMealData,
    forceRefresh,
    handleStartMeal,
    completeMealPreparation,
    showMealPreparationModal,
    setShowMealPreparationModal,
    selectedMealForPreparation,
    setSelectedMealForPreparation,
  } = useMealPlanning(navigation);

  const {
    waterIntakeML,
    waterGoalML,
    waterConsumedLiters,
    waterGoalLiters,
    hydrationAddWater,
    waterReminders,
    calculatedMetrics,
    getWaterGoalLiters,
    getCalorieTarget,
    getMacroTargets,
    dailyNutrition,
    foodsLoading,
    userMealsLoading,
    foodsError,
    userMealsError,
    refreshAll,
    clearErrors,
    trackBStatus,
    getTodaysConsumedNutrition,
    showWaterIntakeModal,
    setShowWaterIntakeModal,
    handleAddWater,
    handleRemoveWater,
    handleLogWater,
  } = useNutritionTracking(navigation);

  const {
    aiMeals,
    isGeneratingMeal,
    aiError,
    showCamera,
    setShowCamera,
    cameraMode,
    setCameraMode,
    scannedProduct,
    productHealthAssessment,
    showProductModal,
    setShowProductModal,
    isProcessingBarcode,
    showMealTypeSelector,
    setShowMealTypeSelector,
    selectedMealType,
    setSelectedMealType,
    portionData,
    setPortionData,
    showPortionAdjustment,
    setShowPortionAdjustment,
    feedbackData,
    setFeedbackData,
    showFeedbackModal,
    setShowFeedbackModal,
    handleMealTypeSelected,
    handleScanFood,
    handleScanProduct,
    handleCameraCapture,
    handleBarcodeScanned,
    handleAddProductToMeal,
    generateAIMeal,
    generateDailyMealPlan: generateDailyMealPlanAction,
    handleFeedbackSubmit,
    handlePortionAdjustmentComplete,
  } = useAIMealGeneration();

  const { setSelectedDay } = useAppStateStore();
  const { getMealProgress: storeGetMealProgress } = useNutritionStore();

  const canAccessMealFeatures = isAuthenticated || isGuestMode;

  // --------------------------------------------------------------------------
  // EFFECTS
  // --------------------------------------------------------------------------

  // Refresh on focus
  useEffect(() => {
    if (isActive) {
      console.log(
        "[REFRESH] DietScreen became active - refreshing meal data...",
      );
      refreshMealData();
    }
  }, [isActive]);

  // Handle route params (e.g. returning from cooking session)
  useEffect(() => {
    if (route?.params?.mealCompleted) {
      forceRefresh();
      if (navigation?.setParams) {
        navigation.setParams({
          mealCompleted: undefined,
          completedMealId: undefined,
          timestamp: undefined,
        });
      }
    }
  }, [route?.params, navigation, forceRefresh]);

  // Animations
  useEffect(() => {
    Animated.timing(calorieRingProgress, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: false,
    }).start();

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

  useEffect(() => {
    if (!isActive) return;
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
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
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
  }, [isActive]);

  // --------------------------------------------------------------------------
  // HELPERS & HANDLERS
  // --------------------------------------------------------------------------

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

  const triggerRipple = (rippleAnim: Animated.Value) => {
    rippleAnim.setValue(0);
    Animated.timing(rippleAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  const handleSearchFood = () => {
    // This seems to open the AI Meals Panel in the original code
    // "handleSearchFood" calls "setShowAIMealsPanel(true)"
    // But we need to use the one from useAIMealGeneration hook?
    // Wait, useAIMealGeneration exposes setShowAIMealsPanel?
    // Checking hook: it exposes 'showMealTypeSelector', 'showCamera', etc.
    // It EXPOSES 'generateAIMeal'.
    // The panel visibility state was originally in DietScreen.
    // I should check if I missed 'showAIMealsPanel' in useAIMealGeneration.
    // Looking at useAIMealGeneration.ts:
    // It does NOT have showAIMealsPanel.
    // It has showMealTypeSelector, showProductModal, etc.
    // So I need to keep showAIMealsPanel state here or add it to hook.
    // I'll add it here for now.
    setShowAIMealsPanel(true);
  };

  const handleCreateRecipe = () => {
    setShowCreateRecipe(true);
  };

  const handleRecipeCreated = (recipe: any) => {
    setUserRecipes((prev) => [recipe, ...prev]);
    setShowCreateRecipe(false);
  };

  // Context Menu
  const handleMealLongPress = (mealId: string, event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setContextMenu({
      visible: true,
      mealId,
      position: { x: pageX, y: pageY },
    });
  };

  const handleContextMenuAction = (action: string) => {
    const mealId = contextMenu.mealId;
    setContextMenu({ visible: false, mealId: null, position: { x: 0, y: 0 } });

    if (!mealId) return;

    // Find meal object if needed
    const meal = weeklyMealPlan?.meals.find((m) => m.id === mealId);

    switch (action) {
      case "edit":
        Alert.alert("Edit Meal", "Meal editing feature coming soon...");
        break;
      case "delete":
        if (meal) handleDeleteMeal(meal);
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

  // Swipe & Animations
  const getSwipePosition = (mealId: string): Animated.Value => {
    if (!mealSwipePositions[mealId]) {
      const newPosition = new Animated.Value(0);
      setMealSwipePositions((prev) => ({ ...prev, [mealId]: newPosition }));
      return newPosition;
    }
    return mealSwipePositions[mealId];
  };

  const getCardFlipState = (cardId: number): Animated.Value => {
    if (!cardFlipStates[cardId]) {
      const newFlip = new Animated.Value(0);
      setCardFlipStates((prev) => ({ ...prev, [cardId]: newFlip }));
      return newFlip;
    }
    return cardFlipStates[cardId];
  };

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

  const handleAddToPlan = (suggestionId: number, suggestionName: string) => {
    const flipValue = getCardFlipState(suggestionId);
    Animated.sequence([
      Animated.timing(flipValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(1000),
      Animated.timing(flipValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setAddedToPlan((prev) => new Set(prev).add(suggestionId));
    haptics.medium();
    setTimeout(() => {
      Alert.alert(
        "Added to Plan",
        `${suggestionName} has been added to your meal plan`,
      );
    }, 300);
  };

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

  const createSuggestionPanResponder = (suggestionId: number) => {
    const swipeState = getSuggestionSwipeState(suggestionId);
    const DISMISS_THRESHOLD = 100;
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          gestureState.dy > 5 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          swipeState.translateY.setValue(gestureState.dy);
          swipeState.opacity.setValue(
            1 - gestureState.dy / DISMISS_THRESHOLD / 2,
          );
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DISMISS_THRESHOLD) {
          handleDismissSuggestion(suggestionId);
        } else {
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

  // Nutrition Calculation
  const storeNutrition = getTodaysConsumedNutrition();
  const currentNutrition = {
    calories: Math.max(storeNutrition.calories, dailyNutrition?.calories || 0),
    protein: Math.max(storeNutrition.protein, dailyNutrition?.protein || 0),
    carbs: Math.max(storeNutrition.carbs, dailyNutrition?.carbs || 0),
    fat: Math.max(storeNutrition.fat, dailyNutrition?.fat || 0),
    mealsCount: dailyNutrition?.mealsCount || 0,
  };

  const macroTargets = getMacroTargets();
  const calorieTarget = getCalorieTarget();

  const nutritionTargets = {
    calories: { current: currentNutrition.calories, target: calorieTarget },
    protein: {
      current: currentNutrition.protein,
      target: macroTargets.protein,
    },
    carbs: { current: currentNutrition.carbs, target: macroTargets.carbs },
    fat: { current: currentNutrition.fat, target: macroTargets.fat },
    fiber: { current: 0, target: calculatedMetrics?.dailyFiberG ?? null },
  };

  // Meal Schedule calculation (needed for UI display)
  // This logic was in DietScreen, using useMemo. We can keep it here.

  // I need profile to be available. useMealPlanning and useAIMealGeneration use it.
  // I can get it from useUserStore in the component.
  const { profile: userProfile } = useUserStore();

  // Calculate meal schedule
  const mealSchedule = React.useMemo(() => {
    const { calculateMealSchedule } = require("../../utils/mealSchedule");
    return calculateMealSchedule(
      userProfile?.personalInfo?.wake_time,
      userProfile?.personalInfo?.sleep_time,
    );
  }, [
    userProfile?.personalInfo?.wake_time,
    userProfile?.personalInfo?.sleep_time,
  ]);

  // Wrappers for AI Generation that require setShowGuestSignUp
  const onGenerateWeeklyPlan = () => generateWeeklyMealPlan(setShowGuestSignUp);
  const onGenerateDailyPlan = () =>
    generateDailyMealPlanAction(setShowGuestSignUp);
  const onGenerateAIMeal = (type: string) =>
    generateAIMeal(type, setShowGuestSignUp);
  const onHandleCameraCapture = (uri: string) =>
    handleCameraCapture(uri, setShowGuestSignUp);
  const onHandleAddProductToMeal = (product: any) =>
    handleAddProductToMeal(product, setShowGuestSignUp);

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  if (showGuestSignUp) {
    return (
      <GuestSignUpScreen
        onBack={() => setShowGuestSignUp(false)}
        onSignUpSuccess={() => {
          setShowGuestSignUp(false);
          onRefresh();
        }}
      />
    );
  }

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top"]}>
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
              <View style={styles.dateSelector}>
                <AnimatedPressable
                  style={styles.dateNavButton}
                  onPress={() => Alert.alert("Prev", "Previoud Day")}
                  scaleValue={0.9}
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
                  onPress={() => Alert.alert("Next", "Next Day")}
                  scaleValue={0.9}
                >
                  <Text style={styles.dateNavIcon}>›</Text>
                </AnimatedPressable>
              </View>
              <View style={styles.headerButtons}>
                <View style={styles.statusButton}>
                  <Ionicons
                    name={
                      trackBStatus.isConnected
                        ? "checkmark-circle"
                        : "close-circle"
                    }
                    size={rf(16)}
                    color={trackBStatus.isConnected ? "#10b981" : "#ef4444"}
                  />
                </View>
                <AnimatedPressable
                  style={
                    [
                      styles.aiButton,
                      isGeneratingMeal ? styles.aiButtonDisabled : undefined,
                    ] as any
                  }
                  onPress={onGenerateWeeklyPlan}
                  disabled={isGeneratingPlan}
                  scaleValue={0.95}
                >
                  {isGeneratingPlan ? (
                    <AuroraSpinner size="sm" theme="white" />
                  ) : (
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
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
                  style={
                    [
                      styles.aiButton,
                      isGeneratingPlan ? styles.aiButtonDisabled : undefined,
                    ] as any
                  }
                  onPress={onGenerateDailyPlan}
                  disabled={isGeneratingMeal}
                  scaleValue={0.95}
                >
                  {isGeneratingMeal ? (
                    <AuroraSpinner size="sm" theme="white" />
                  ) : (
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
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

            {/* Loading/Error States */}
            {(foodsLoading || userMealsLoading) && (
              <View style={styles.loadingContainer}>
                <AuroraSpinner size="lg" theme="primary" />
                <Text style={styles.loadingText}>
                  Loading nutrition data...
                </Text>
              </View>
            )}
            {(foodsError || userMealsError) && (
              <GlassCard style={styles.errorCard} elevation={1} padding="md">
                <Text style={styles.errorText}>
                  {foodsError || userMealsError}
                </Text>
                <Button
                  title="Retry"
                  onPress={refreshAll}
                  variant="outline"
                  size="sm"
                />
              </GlassCard>
            )}
            {!canAccessMealFeatures && (
              <GlassCard style={styles.errorCard} elevation={1} padding="md">
                <Text style={styles.errorText}>
                  Please sign in to track your nutrition
                </Text>
              </GlassCard>
            )}

            {/* Calorie Overview */}
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

            {/* Meals Section */}
            <View style={styles.section}>
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
                        new Date()
                          .toLocaleDateString("en-US", { weekday: "long" })
                          .toLowerCase();
                      return (
                        <AnimatedPressable
                          key={day}
                          style={
                            [
                              styles.dayButton,
                              selectedDay === day
                                ? styles.selectedDayButton
                                : undefined,
                              isToday ? styles.todayDayButton : undefined,
                            ] as any
                          }
                          onPress={() => setSelectedDay(day as any)}
                          scaleValue={0.95}
                        >
                          <Text
                            style={[
                              styles.dayButtonText,
                              selectedDay === day &&
                                styles.selectedDayButtonText,
                            ]}
                          >
                            {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                          </Text>
                          {isToday && <View style={styles.todayIndicator} />}
                        </AnimatedPressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {selectedDay
                    ? `${selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}'s Meals`
                    : "Today's Meals"}
                </Text>
              </View>

              {getTodaysMeals().length > 0 ? (
                <View style={styles.premiumMealsContainer}>
                  {getTodaysMeals().map((meal) => {
                    const progress = storeGetMealProgress(meal.id);
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
                      ? "No meals planned for today"
                      : "Generate a meal plan to get started"}
                  </Text>
                </GlassCard>
              )}
            </View>

            {/* Meal Suggestions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Meal Suggestions</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
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
                  .filter((s) => !dismissedSuggestions.has(s.id))
                  .map((suggestion) => {
                    const panResponder = createSuggestionPanResponder(
                      suggestion.id,
                    );
                    const swipeState = getSuggestionSwipeState(suggestion.id);
                    const isAdded = addedToPlan.has(suggestion.id);
                    return (
                      <Animated.View
                        key={suggestion.id}
                        {...panResponder.panHandlers}
                        style={{
                          transform: [{ translateY: swipeState.translateY }],
                          opacity: swipeState.opacity,
                        }}
                      >
                        <GlassCard
                          elevation={3}
                          style={styles.suggestionCard}
                          padding="none"
                          borderRadius="xl"
                        >
                          <View style={styles.suggestionContent}>
                            <Text style={styles.suggestionName}>
                              {suggestion.name}
                            </Text>
                            <AnimatedPressable
                              style={styles.addToPlanButton}
                              onPress={() =>
                                handleAddToPlan(suggestion.id, suggestion.name)
                              }
                              disabled={isAdded}
                            >
                              <Text style={styles.addToPlanButtonText}>
                                {isAdded ? "Added" : "Add"}
                              </Text>
                            </AnimatedPressable>
                          </View>
                        </GlassCard>
                      </Animated.View>
                    );
                  })}
              </ScrollView>
            </View>

            {/* Water Tracker */}
            <View style={styles.section}>
              <GlassCard
                elevation={2}
                blurIntensity="light"
                padding="lg"
                borderRadius="lg"
              >
                <Text style={styles.sectionTitle}>Hydration</Text>
                <View style={styles.waterTrackerContainer}>
                  <Text style={styles.waterAmountConsumed}>
                    {waterConsumedLiters.toFixed(1)}L
                  </Text>
                  <Text style={styles.waterTargetAmount}>
                    of {waterGoalLiters?.toFixed(1)}L goal
                  </Text>
                  <View style={styles.waterQuickAddButtons}>
                    <AnimatedPressable
                      onPress={() => {
                        triggerRipple(waterButton1Ripple);
                        handleAddWater();
                      }}
                      style={styles.waterQuickAddButton}
                    >
                      <Text style={styles.waterQuickAddButtonText}>+250ml</Text>
                    </AnimatedPressable>
                    <AnimatedPressable
                      onPress={() => {
                        triggerRipple(waterButton2Ripple);
                        handleAddWater();
                      }}
                      style={styles.waterQuickAddButton}
                    >
                      <Text style={styles.waterQuickAddButtonText}>+250ml</Text>
                    </AnimatedPressable>
                  </View>
                </View>
              </GlassCard>
            </View>

            <View style={styles.bottomSpacing} />
          </View>
        </ScrollView>

        {/* Modals & Overlays */}
        {showCamera && (
          <Camera
            mode={cameraMode}
            onCapture={onHandleCameraCapture}
            onBarcodeScanned={
              cameraMode === "barcode" ? handleBarcodeScanned : undefined
            }
            onClose={() => {
              setShowCamera(false);
              setCameraMode("food");
            }}
            style={styles.cameraModal}
          />
        )}

        <MealTypeSelector
          visible={showMealTypeSelector}
          onSelect={handleMealTypeSelected}
          onClose={() => setShowMealTypeSelector(false)}
        />

        <WaterIntakeModal
          visible={showWaterIntakeModal}
          onClose={() => setShowWaterIntakeModal(false)}
          onAddWater={hydrationAddWater}
          currentIntakeML={waterIntakeML}
          goalML={waterGoalML || 2500}
        />

        <AIMealsPanel
          visible={showAIMealsPanel}
          onClose={() => setShowAIMealsPanel(false)}
          onGenerateMeal={onGenerateAIMeal}
          isGenerating={isGeneratingMeal}
          profile={userProfile}
        />

        {asyncJob && (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
            onRequestClose={cancelAsyncGeneration}
          >
            <View style={styles.asyncJobModalOverlay}>
              <JobStatusIndicator
                job={{
                  jobId: asyncJob.jobId,
                  status: asyncJob.status as any,
                  error: asyncJob.error,
                  createdAt: asyncJob.createdAt,
                  estimatedTimeRemaining: asyncJob.estimatedTimeRemaining,
                  generationTimeMs: asyncJob.generationTimeMs,
                }}
                onCancel={cancelAsyncGeneration}
                onDismiss={() => {}}
              />
            </View>
          </Modal>
        )}

        <CreateRecipeModal
          visible={showCreateRecipe}
          onClose={() => setShowCreateRecipe(false)}
          onRecipeCreated={handleRecipeCreated}
          profile={userProfile}
        />

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

        {scannedProduct && (
          <ProductDetailsModal
            visible={showProductModal}
            onClose={() => setShowProductModal(false)}
            product={scannedProduct}
            healthAssessment={productHealthAssessment}
            onAddToMeal={onHandleAddProductToMeal}
          />
        )}

        {/* FAB */}
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
            onPress={handleSearchFood}
            scaleValue={0.9}
          >
            <LinearGradient
              {...(toLinearGradientProps(gradients.button.primary) as any)}
              style={styles.fabGradient}
            >
              <Text style={styles.fabIcon}>+</Text>
            </LinearGradient>
          </AnimatedPressable>
        </Animated.View>
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ResponsiveTheme.colors.background },
  scrollView: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.md,
  },
  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: "bold",
    color: ResponsiveTheme.colors.text,
  },
  headerButtons: { flexDirection: "row", alignItems: "center", gap: rp(12) },
  aiButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: rp(12),
    paddingVertical: rp(8),
    borderRadius: rs(20),
    minWidth: rw(70),
    alignItems: "center",
  },
  aiButtonDisabled: { backgroundColor: ResponsiveTheme.colors.textMuted },
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
    justifyContent: "center",
    alignItems: "center",
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.md,
  },
  dateNavButton: {
    width: rw(40),
    height: rh(40),
    borderRadius: ResponsiveTheme.borderRadius.full,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  dateNavIcon: {
    fontSize: rf(24),
    color: ResponsiveTheme.colors.text,
    fontWeight: "bold",
  },
  dateBadge: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.sm,
    alignItems: "center",
  },
  dateText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "600",
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
    justifyContent: "space-between",
    alignItems: "center",
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
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },
  premiumMealsContainer: { gap: ResponsiveTheme.spacing.md },
  overviewCard: { padding: ResponsiveTheme.spacing.lg },
  caloriesSection: { marginBottom: ResponsiveTheme.spacing.lg },
  caloriesHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  caloriesConsumed: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: "bold",
    color: ResponsiveTheme.colors.primary,
  },
  caloriesTarget: {
    fontSize: ResponsiveTheme.fontSize.lg,
    color: ResponsiveTheme.colors.textSecondary,
    marginLeft: ResponsiveTheme.spacing.sm,
  },
  caloriesProgress: { marginBottom: ResponsiveTheme.spacing.md },
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
  macrosGrid: { flexDirection: "row", justifyContent: "space-between" },
  macroItem: { alignItems: "center", flex: 1 },
  macroValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: "bold",
    color: ResponsiveTheme.colors.text,
  },
  macroLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  macroTarget: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  statusButton: {
    width: rw(32),
    height: rh(32),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    alignItems: "center",
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
    alignItems: "center",
  },
  errorText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.error,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  daySelectorContainer: {
    marginBottom: ResponsiveTheme.spacing.md,
    marginTop: -ResponsiveTheme.spacing.sm,
  },
  dayButton: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    marginRight: ResponsiveTheme.spacing.sm,
    borderRadius: rs(20),
    backgroundColor: ResponsiveTheme.colors.background,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    position: "relative",
    alignItems: "center",
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
    position: "absolute",
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
  selectedDayButtonText: { color: ResponsiveTheme.colors.surface },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  emptyMealsText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  suggestionCard: { width: rw(200), marginRight: ResponsiveTheme.spacing.md },
  suggestionContent: { padding: ResponsiveTheme.spacing.md },
  suggestionName: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  addToPlanButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingVertical: ResponsiveTheme.spacing.xs,
    alignItems: "center",
  },
  addToPlanButtonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: "600",
  },
  suggestionsScrollContent: { paddingHorizontal: ResponsiveTheme.spacing.lg },
  waterTrackerContainer: { marginTop: ResponsiveTheme.spacing.md },
  waterAmountConsumed: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: "bold",
    color: ResponsiveTheme.colors.primary,
  },
  waterTargetAmount: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  waterQuickAddButtons: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.md,
  },
  waterQuickAddButton: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
  },
  waterQuickAddButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
  },
  calorieOverviewCenter: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  calorieCenter: { alignItems: "center", justifyContent: "center" },
  caloriesRemaining: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: "bold",
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
  macroStat: { alignItems: "center" },
  bottomSpacing: { height: ResponsiveTheme.spacing.xl },
  cameraModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  asyncJobModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: ResponsiveTheme.spacing.lg,
  },
  fab: {
    position: "absolute",
    right: ResponsiveTheme.spacing.lg,
    bottom: ResponsiveTheme.spacing.lg,
  },
  fabGradient: {
    width: rw(56),
    height: rw(56),
    borderRadius: rw(28),
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  fabIcon: { fontSize: rf(32), color: ResponsiveTheme.colors.white },
});
