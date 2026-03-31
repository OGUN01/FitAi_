import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { GlassCard } from "../../components/ui/aurora/GlassCard";
import { AuroraSpinner } from "../../components/ui/aurora/AuroraSpinner";
import { rf, rw, rp, rh } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { Button } from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import {
  useNutritionStore,
  useAppStateStore,
  useProfileStore,
} from "../../stores";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { GuestSignUpScreen } from "./GuestSignUpScreen";

import { NutritionSummaryCard } from "../../components/diet/NutritionSummaryCard";
import { MealPlanView } from "../../components/diet/MealPlanView";
import { WaterIntakeModal } from "../../components/diet/WaterIntakeModal";
import { DietScreenHeader } from "../../components/diet/DietScreenHeader";
import { MealSuggestions } from "../../components/diet/MealSuggestions";
import { DietModals } from "../../components/diet/DietModals";
import { DietQuickActions } from "../../components/diet/DietQuickActions";
import { ManualBarcodeEntry } from "../../components/diet/ManualBarcodeEntry";
import DatabaseDownloadBanner from "../../components/DatabaseDownloadBanner";
import {
  LogMealModal,
  LogMealScanResult,
} from "../../components/diet/LogMealModal";
import { MealDetailModal } from "../../components/diet/MealDetailModal";
import { ProductDetailsModal } from "../../components/diet/ProductDetailsModal";
import { FoodScanLoadingOverlay } from "../../components/diet/FoodScanLoadingOverlay";
import { ScanResultModal } from "../../components/diet/ScanResultModal";
import { DayMeal } from "../../types/ai";

import { useMealPlanning } from "../../hooks/useMealPlanning";
import { useNutritionTracking } from "../../hooks/useNutritionTracking";
import { useAIMealGeneration } from "../../hooks/useAIMealGeneration";
import { ProductLookupResult } from "../../services/barcodeService";
import { calculateMealSchedule } from "../../utils/mealSchedule";
import { getLocalDateString } from "../../utils/weekUtils";
import PaywallModal from "../../components/subscription/PaywallModal";
import { useSubscriptionStore } from "../../stores/subscriptionStore";
import { useUserStore } from "../../stores/userStore";
import { buildLegacyProfileAdapter } from "../../utils/profileLegacyAdapter";

interface DietScreenProps {
  navigation?: any;
  route?: any;
  isActive?: boolean;
}

export const DietScreen: React.FC<DietScreenProps> = ({
  navigation,
  route,
  isActive: _isActive = true,
}) => {
  const { isAuthenticated, isGuestMode } = useAuth();
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showCreateRecipe, setShowCreateRecipe] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showLogMealModal, setShowLogMealModal] = useState(false);
  const [logMealScanResult, setLogMealScanResult] =
    useState<LogMealScanResult | null>(null);
  const [showMealDetailModal, setShowMealDetailModal] = useState(false);
  const [selectedMealForDetail, setSelectedMealForDetail] =
    useState<DayMeal | null>(null);
  const [showBarcodeOptions, setShowBarcodeOptions] = useState(false);
  const [showLabelScanPrep, setShowLabelScanPrep] = useState(false);
  const [labelScanGramsInput, setLabelScanGramsInput] = useState("");
  const [photoWeightInput, setPhotoWeightInput] = useState("");

  const showPaywall = useSubscriptionStore((state) => state.showPaywall);
  const paywallReason = useSubscriptionStore((state) => state.paywallReason);
  const dismissPaywall = useSubscriptionStore((state) => state.dismissPaywall);

  const {
    weeklyMealPlan,
    isGeneratingPlan,
    asyncJob,
    todaysMeals,
    generateWeeklyMealPlan,
    cancelAsyncGeneration,
    handleDeleteMeal,
    forceRefresh,
    handleStartMeal,
    completeMealPreparation,
  } = useMealPlanning(navigation);

  const {
    waterIntakeML,
    waterGoalML,
    waterConsumedLiters,
    waterGoalLiters,
    hydrationAddWater,
    calculatedMetrics,
    getCalorieTarget,
    getMacroTargets,
    dailyNutrition,
    foodsLoading,
    foodsError,
    refreshAll,
    clearErrors,
    getTodaysConsumedNutrition,
    showWaterIntakeModal,
    setShowWaterIntakeModal,
    handleAddWater,
  } = useNutritionTracking(navigation);

  const {
    isGeneratingMeal,
    showCamera,
    setShowCamera,
    cameraMode,
    setCameraMode,
    scannedProduct,
    productHealthAssessment,
    showProductModal,
    setShowProductModal,
    showMealTypeSelector,
    setShowMealTypeSelector,
    portionData,
    setPortionData,
    showPortionAdjustment,
    setShowPortionAdjustment,
    feedbackData,
    setFeedbackData,
    showFeedbackModal,
    setShowFeedbackModal,
    handleMealTypeSelected,
    setSelectedMealType,
    handleBarcodeScanned,
    handleCameraCapture,
    handleLabelCameraCapture,
    handleAddProductToMeal,
    handleScanFood,
    handleScanProduct,
    handleBarcodeCameraClose,
    handleLabelScanned,
    handleLabelLibraryPick,
    handleManualLookupResolved,
    handleFeedbackSubmit,
    handlePortionAdjustmentComplete,
    isProcessingBarcode,
    barcodeCameraState,
    barcodeStatusMessage,
    barcodeInlineActions,
    portionGrams,
    setPortionGrams,
    showWeightPrompt,
    confirmPhotoRecognition,
    dismissWeightPrompt,
    setLogMealScanCallback,
    scanResult,
    showScanResult,
    handleScanResultAccept,
    handleScanResultAdjust,
    handleScanResultFeedback,
    handleScanResultDismiss,
  } = useAIMealGeneration({
    onBarcodeNotFound: (barcode) =>
      navigation?.navigate("ContributeFood", { barcode }),
    onOpenManualEntry: () => setShowManualEntry(true),
  });

  const selectedDay = useAppStateStore((state) => state.selectedDay);
  const selectedDateKey = useAppStateStore((state) => state.selectedDate);
  const shiftSelectedDate = useAppStateStore(
    (state) => state.shiftSelectedDate,
  );
  const setSelectedDay = useAppStateStore((state) => state.setSelectedDay);

  // Day name â†’ index mapping for date navigation
  const selectedDate = React.useMemo(
    () => new Date(`${selectedDateKey}T12:00:00`),
    [selectedDateKey],
  );

  const onPrevDay = useCallback(() => {
    shiftSelectedDate(-1);
  }, [shiftSelectedDate]);

  const onNextDay = useCallback(() => {
    shiftSelectedDate(1);
  }, [shiftSelectedDate]);

  const mealProgress = useNutritionStore((state) => state.mealProgress);
  const storeGetMealProgress = (mealId: string) => mealProgress[mealId] ?? null;
  const dailyMeals = useNutritionStore((state) => state.dailyMeals);
  const todaysConsumedMeals = React.useMemo(() => {
    const todayDate = getLocalDateString();
    return dailyMeals.filter(
      (meal) =>
        typeof (meal as any).loggedAt === "string" &&
        getLocalDateString((meal as any).loggedAt) === todayDate,
    );
  }, [dailyMeals]);
  const todaysPlannedSuggestionMeals = React.useMemo(() => {
    const todayDate = getLocalDateString();
    return dailyMeals.filter(
      (meal) =>
        !(meal as any).loggedAt &&
        !!meal.createdAt && getLocalDateString(meal.createdAt) === todayDate,
    );
  }, [dailyMeals]);
  const personalInfo = useProfileStore((state) => state.personalInfo);
  const bodyAnalysis = useProfileStore((state) => state.bodyAnalysis);
  const dietPreferences = useProfileStore((state) => state.dietPreferences);
  const workoutPreferences = useProfileStore(
    (state) => state.workoutPreferences,
  );
  const rawProfile = useUserStore((state) => state.profile);
  const userProfile = React.useMemo(
    () => ({
      ...rawProfile,
      bodyMetrics: bodyAnalysis,
      workoutPreferences,
      ...buildLegacyProfileAdapter({
        personalInfo,
        bodyAnalysis,
        workoutPreferences,
        dietPreferences,
        legacyProfile: rawProfile,
      }),
    }),
    [
      rawProfile,
      personalInfo,
      bodyAnalysis,
      dietPreferences,
      workoutPreferences,
    ],
  );

  const canAccessMealFeatures = isAuthenticated || isGuestMode;

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

  useEffect(() => {
    if (!route?.params || !navigation?.setParams) return;

    if (route.params.openLogMeal) {
      setShowLogMealModal(true);
      navigation.setParams({ openLogMeal: undefined });
    }

    if (route.params.openWaterModal) {
      setShowWaterIntakeModal(true);
      navigation.setParams({ openWaterModal: undefined });
    }

    if (route.params.openBarcodeOptions) {
      setShowBarcodeOptions(true);
      navigation.setParams({ openBarcodeOptions: undefined });
    }

    if (route.params.openLabelScanPrep) {
      setShowLabelScanPrep(true);
      navigation.setParams({ openLabelScanPrep: undefined });
    }

    if (route.params.openCreateRecipe) {
      setShowCreateRecipe(true);
      navigation.setParams({ openCreateRecipe: undefined });
    }

    if (route.params.openScanFood) {
      handleScanFood();
      navigation.setParams({ openScanFood: undefined });
    }
  }, [
    handleLabelScanned,
    handleScanFood,
    navigation,
    route?.params,
    setShowWaterIntakeModal,
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAll();
      clearErrors();
    } catch (error) {
      console.warn("Failed to refresh nutrition data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshAll, clearErrors]);

  const handleSearchFood = useCallback(() => {
    setShowLogMealModal(true);
  }, []);

  const handleRecipeCreated = useCallback((recipe: any) => {
    setShowCreateRecipe(false);
  }, []);

  const handleMealCardPress = useCallback((meal: DayMeal) => {
    setSelectedMealForDetail(meal);
    setShowMealDetailModal(true);
  }, []);

  const handleMealDetailComplete = useCallback(
    (meal: DayMeal) => {
      completeMealPreparation(meal);
      setShowMealDetailModal(false);
      setSelectedMealForDetail(null);
    },
    [completeMealPreparation],
  );

  const handleMealDetailDelete = useCallback(
    async (meal: DayMeal) => {
      const result = await handleDeleteMeal(meal);
      if (result) {
        setShowMealDetailModal(false);
        setSelectedMealForDetail(null);
      }
    },
    [handleDeleteMeal],
  );

  const handleManualProductFound = useCallback(
    (lookupResult: ProductLookupResult) => {
      setShowManualEntry(false);
      handleManualLookupResolved(lookupResult);
    },
    [handleManualLookupResolved],
  );

  const storeNutrition = getTodaysConsumedNutrition();
  // SSOT fix: nutritionStore.getTodaysConsumedNutrition() is the single source
  // for all today's calories. It aggregates:
  //   (a) completed weekly-plan meals via mealProgress
  //   (b) manually-logged daily meals hydrated into dailyMeals from meal_logs
  // We no longer fall back to a separate Supabase dailyNutrition fetch because
  // that fetch and the store fetch target the same meal_logs table â€” merging them
  // caused different calorie numbers on different screens.
  const currentNutrition = {
    calories: storeNutrition.calories,
    protein: storeNutrition.protein,
    carbs: storeNutrition.carbs,
    fat: storeNutrition.fat,
    fiber: storeNutrition.fiber,
    sugar: storeNutrition.sugar,
    mealsCount: dailyNutrition?.mealsCount ?? todaysConsumedMeals.length,
  };

  const macroTargets = getMacroTargets();
  // 0 when target not set â€” NutritionSummaryCard handles all-zeros with a
  // "Using estimated targets â€” complete your profile" notice banner.
  const calorieTarget = getCalorieTarget() || 0;

  const nutritionTargets = {
    calories: {
      current: currentNutrition.calories,
      target: calorieTarget as number,
    },
    protein: {
      current: currentNutrition.protein,
      target: (macroTargets.protein ?? 0) as number,
    },
    carbs: {
      current: currentNutrition.carbs,
      target: (macroTargets.carbs ?? 0) as number,
    },
    fat: {
      current: currentNutrition.fat,
      target: (macroTargets.fat ?? 0) as number,
    },
    fiber: {
      current: currentNutrition.fiber,
      target: 25, // Standard daily fiber target (getMacroTargets does not include fiber)
    },
    sugar: {
      current: currentNutrition.sugar,
      target: 50, // WHO recommendation: <50g/day added sugar (10% of 2000 kcal diet)
    },
  };

  const mealSchedule = React.useMemo(() => {
    return calculateMealSchedule(
      userProfile?.personalInfo?.wake_time,
      userProfile?.personalInfo?.sleep_time,
    );
  }, [
    userProfile?.personalInfo?.wake_time,
    userProfile?.personalInfo?.sleep_time,
  ]);

  const onGenerateWeeklyPlan = useCallback(
    () => generateWeeklyMealPlan(setShowGuestSignUp),
    [generateWeeklyMealPlan],
  );
  const onHandleCameraCapture = useCallback(
    (uri: string) => handleCameraCapture(uri, setShowGuestSignUp),
    [handleCameraCapture],
  );
  const onHandleLabelCapture = useCallback(
    (uri: string) => handleLabelCameraCapture(uri),
    [handleLabelCameraCapture],
  );
  const onHandleLabelLibraryPick = useCallback(
    () => handleLabelLibraryPick(),
    [handleLabelLibraryPick],
  );
  const logMealCameraScanActiveRef = useRef(false);
  const logMealLabelReviewActiveRef = useRef(false);

  const onHandleAddProductToMeal = useCallback(
    async (product: any, grams: number) => {
      logMealLabelReviewActiveRef.current = false;
      await handleAddProductToMeal(product, setShowGuestSignUp, grams);
    },
    [handleAddProductToMeal],
  );

  // When the camera (or meal-type selector) closes without producing a result,
  // reopen the LogMealModal so the user isn't left stranded.
  // isProcessingBarcode and isGeneratingMeal guard against the race where the
  // camera closes first but the async lookup/recognition hasn't fired the callback yet.
  useEffect(() => {
    if (
      logMealCameraScanActiveRef.current &&
      !showCamera &&
      !showMealTypeSelector &&
      !isProcessingBarcode &&
      !isGeneratingMeal &&
      !showScanResult &&
      !showProductModal
    ) {
      logMealCameraScanActiveRef.current = false;
      setShowLogMealModal(true);
    }
  }, [
    showCamera,
    showMealTypeSelector,
    isProcessingBarcode,
    isGeneratingMeal,
    showScanResult,
    showProductModal,
  ]);

  useEffect(() => {
    if (showProductModal) {
      logMealCameraScanActiveRef.current = false;
    }
  }, [showProductModal]);

  const handleCloseProductDetails = useCallback(() => {
    setShowProductModal(false);

    if (logMealLabelReviewActiveRef.current) {
      logMealLabelReviewActiveRef.current = false;
      setShowLogMealModal(true);
    }
  }, [setShowProductModal]);

  const handleLogMealFoodScan = useCallback(() => {
    setShowLogMealModal(false);
    logMealCameraScanActiveRef.current = true;
    setLogMealScanCallback((result) => {
      logMealCameraScanActiveRef.current = false;
      setLogMealScanResult(result);
      setShowLogMealModal(true);
    });
    handleScanFood();
  }, [setLogMealScanCallback, handleScanFood]);

  const handleLogMealLabelScan = useCallback(
    async (mealType: "breakfast" | "lunch" | "dinner" | "snack") => {
      setSelectedMealType(mealType);
      logMealLabelReviewActiveRef.current = true;
      setLogMealScanCallback(null);
      setLogMealScanResult(null);
      setShowLogMealModal(false);
      logMealCameraScanActiveRef.current = true;
      const started = await handleLabelScanned(
        setShowGuestSignUp,
        undefined,
        undefined,
        "log_meal_label",
      );
      if (!started) {
        logMealCameraScanActiveRef.current = false;
        logMealLabelReviewActiveRef.current = false;
        setShowLogMealModal(true);
      }
    },
    [
      handleLabelScanned,
      setLogMealScanCallback,
      setSelectedMealType,
      setShowGuestSignUp,
    ],
  );

  const handleLogMealBarcodeScan = useCallback(() => {
    setShowLogMealModal(false);
    logMealCameraScanActiveRef.current = true;
    setLogMealScanCallback((result) => {
      logMealCameraScanActiveRef.current = false;
      setLogMealScanResult(result);
      setShowLogMealModal(true);
    });
    handleScanProduct("log_meal_barcode");
  }, [setLogMealScanCallback, handleScanProduct]);

  // --- useCallback: child component prop callbacks ---
  const handleGuestBack = useCallback(() => setShowGuestSignUp(false), []);
  const handleGuestSignUpSuccess = useCallback(() => {
    setShowGuestSignUp(false);
    onRefresh();
  }, [onRefresh]);
  const handleShowBarcodeOptions = useCallback(
    () => setShowBarcodeOptions(true),
    [],
  );
  const handleStartLabelScan = useCallback(() => {
    setShowLabelScanPrep(true);
  }, []);
  const handleShowWaterIntake = useCallback(
    () => setShowWaterIntakeModal(true),
    [setShowWaterIntakeModal],
  );
  const handleShowCreateRecipe = useCallback(
    () => setShowCreateRecipe(true),
    [],
  );
  const handleCloseMealDetail = useCallback(() => {
    setShowMealDetailModal(false);
    setSelectedMealForDetail(null);
  }, []);
  const handleCloseLogMealModal = useCallback(
    () => setShowLogMealModal(false),
    [],
  );
  const handleScanResultConsumed = useCallback(
    () => setLogMealScanResult(null),
    [],
  );
  const handleCloseWaterIntake = useCallback(
    () => setShowWaterIntakeModal(false),
    [setShowWaterIntakeModal],
  );
  const handleCloseManualEntry = useCallback(
    () => setShowManualEntry(false),
    [],
  );

  const renderDailyMealSection = useCallback(
    (
      title: string,
      meals: typeof dailyMeals,
      status: "logged" | "planned",
    ) => (
      <View style={styles.dailyMealsSection}>
        <Text style={styles.dailyMealsSectionTitle}>{title}</Text>
        {meals.map((meal) => (
          <GlassCard
            key={meal.id}
            elevation={1}
            padding="md"
            style={styles.dailyMealCard}
          >
            <View style={styles.dailyMealRow}>
              <View style={styles.dailyMealInfo}>
                <Text style={styles.dailyMealName}>{meal.name || meal.type}</Text>
                <Text style={styles.dailyMealMacros}>
                  {meal.totalCalories || 0} cal |{" "}
                  {Math.round(meal.totalMacros?.protein || 0)}g P |{" "}
                  {Math.round(meal.totalMacros?.carbohydrates || 0)}g C |{" "}
                  {Math.round(meal.totalMacros?.fat || 0)}g F
                </Text>
              </View>
              <View
                style={[
                  styles.dailyMealStatusBadge,
                  status === "logged"
                    ? styles.dailyMealLoggedBadge
                    : styles.dailyMealPlannedBadge,
                ]}
              >
                <Ionicons
                  name={
                    status === "logged"
                      ? "checkmark-circle"
                      : "calendar-outline"
                  }
                  size={rf(16)}
                  color={
                    status === "logged"
                      ? ResponsiveTheme.colors.primary
                      : ResponsiveTheme.colors.warning
                  }
                />
                <Text
                  style={[
                    styles.dailyMealBadgeText,
                    status === "logged"
                      ? styles.dailyMealLoggedText
                      : styles.dailyMealPlannedText,
                  ]}
                >
                  {status === "logged" ? "Logged" : "Planned"}
                </Text>
              </View>
            </View>
          </GlassCard>
        ))}
      </View>
    ),
    [],
  );

  if (showGuestSignUp) {
    return (
      <GuestSignUpScreen
        onBack={handleGuestBack}
        onSignUpSuccess={handleGuestSignUpSuccess}
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
            <DietScreenHeader
              isGeneratingPlan={isGeneratingPlan}
              hasPlan={Boolean(weeklyMealPlan?.meals?.length)}
              onGenerateWeeklyPlan={onGenerateWeeklyPlan}
              handleSearchFood={handleSearchFood}
              selectedDate={selectedDate}
              onPrevDay={onPrevDay}
              onNextDay={onNextDay}
            />

            <DatabaseDownloadBanner />
            {foodsLoading ? (
              <View style={styles.loadingContainer}>
                <AuroraSpinner size="lg" theme="primary" />
                <Text style={styles.loadingText}>
                  Loading nutrition data...
                </Text>
              </View>
            ) : foodsError ? (
              <GlassCard style={styles.errorCard} elevation={1} padding="md">
                <Text style={styles.errorText}>{foodsError}</Text>
                <Button
                  title="Retry"
                  onPress={() => {
                    refreshAll().catch(console.error);
                  }}
                  size="sm"
                />
              </GlassCard>
            ) : null}
            {!canAccessMealFeatures && (
              <GlassCard style={styles.errorCard} elevation={1} padding="md">
                <Text style={styles.errorText}>
                  Please sign in to track your nutrition
                </Text>
              </GlassCard>
            )}

            <NutritionSummaryCard nutritionTargets={nutritionTargets} />

            <DietQuickActions
              onScanFood={handleScanFood}
              onScanBarcode={handleShowBarcodeOptions}
              onScanLabel={handleStartLabelScan}
              onLogMeal={handleSearchFood}
              onLogWater={handleShowWaterIntake}
              onViewRecipes={handleShowCreateRecipe}
            />

            {!weeklyMealPlan?.meals || weeklyMealPlan.meals.length === 0 ? (
              todaysConsumedMeals.length > 0 ? (
                renderDailyMealSection(
                  "Today's Logged Meals",
                  todaysConsumedMeals,
                  "logged",
                )
              ) : (
                <View
                  style={{
                    paddingTop: ResponsiveTheme.spacing.md,
                    paddingBottom: ResponsiveTheme.spacing.xl,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="restaurant-outline"
                    size={rf(48)}
                    color={ResponsiveTheme.colors.textSecondary}
                    style={{
                      opacity: 0.3,
                      marginBottom: ResponsiveTheme.spacing.md,
                    }}
                  />
                  <Text
                    style={{
                      color: ResponsiveTheme.colors.textSecondary,
                      fontSize: ResponsiveTheme.fontSize.md,
                      marginBottom: ResponsiveTheme.spacing.xs,
                    }}
                  >
                    No weekly plan yet
                  </Text>
                  <Text
                    style={{
                      color: ResponsiveTheme.colors.textSecondary,
                      opacity: 0.6,
                      fontSize: ResponsiveTheme.fontSize.sm,
                    }}
                  >
                    Tap Generate Week to build your plan
                  </Text>
                </View>
              )
            ) : (
              <>
                <MealPlanView
                  weeklyMealPlan={weeklyMealPlan}
                  selectedDay={selectedDay}
                  setSelectedDay={setSelectedDay}
                  todaysMeals={todaysMeals}
                  storeGetMealProgress={storeGetMealProgress}
                  mealSchedule={mealSchedule}
                  handleStartMeal={handleStartMeal}
                  completeMealPreparation={completeMealPreparation}
                  macroTargets={{
                    protein: macroTargets.protein || 0,
                    carbs: macroTargets.carbs || 0,
                    fat: macroTargets.fat || 0,
                  }}
                  calorieTarget={calorieTarget || 0}
                  onMealPress={handleMealCardPress}
                />
                {todaysConsumedMeals.length > 0
                  ? renderDailyMealSection(
                      "Today's Logged Meals",
                      todaysConsumedMeals,
                      "logged",
                    )
                  : null}
              </>
            )}

            {todaysPlannedSuggestionMeals.length > 0 ? (
              renderDailyMealSection(
                "Today's Planned Suggestions",
                todaysPlannedSuggestionMeals,
                "planned",
              )
            ) : null}
            <MealSuggestions />

            <View style={styles.bottomSpacing} />
          </View>
        </ScrollView>

        {(showCamera ||
          showPortionAdjustment ||
          showFeedbackModal ||
          showMealTypeSelector ||
          Boolean(asyncJob) ||
          showCreateRecipe) && (
          <DietModals
            showCamera={showCamera}
            cameraMode={cameraMode}
            onHandleCameraCapture={onHandleCameraCapture}
            onHandleLabelCapture={onHandleLabelCapture}
            handleBarcodeScanned={handleBarcodeScanned}
            handleLabelLibraryPick={onHandleLabelLibraryPick}
            handleBarcodeCameraClose={handleBarcodeCameraClose}
            setShowCamera={setShowCamera}
            setCameraMode={setCameraMode}
            barcodeCameraState={barcodeCameraState}
            barcodeStatusMessage={barcodeStatusMessage}
            barcodeInlineActions={barcodeInlineActions}
            portionData={portionData}
            showPortionAdjustment={showPortionAdjustment}
            setShowPortionAdjustment={setShowPortionAdjustment}
            setPortionData={setPortionData}
            handlePortionAdjustmentComplete={handlePortionAdjustmentComplete}
            feedbackData={feedbackData}
            showFeedbackModal={showFeedbackModal}
            setShowFeedbackModal={setShowFeedbackModal}
            setFeedbackData={setFeedbackData}
            handleFeedbackSubmit={handleFeedbackSubmit}
            showMealTypeSelector={showMealTypeSelector}
            handleMealTypeSelected={handleMealTypeSelected}
            setShowMealTypeSelector={setShowMealTypeSelector}
            userProfile={userProfile}
            asyncJob={asyncJob}
            cancelAsyncGeneration={cancelAsyncGeneration}
            showCreateRecipe={showCreateRecipe}
            setShowCreateRecipe={setShowCreateRecipe}
            handleRecipeCreated={handleRecipeCreated}
            portionGrams={portionGrams}
            setPortionGrams={setPortionGrams}
          />
        )}

        {showProductModal && scannedProduct && (
          <ProductDetailsModal
            visible={showProductModal}
            onClose={handleCloseProductDetails}
            product={scannedProduct}
            healthAssessment={productHealthAssessment}
            onAddToMeal={onHandleAddProductToMeal}
          />
        )}

        {showMealDetailModal && selectedMealForDetail && (
          <MealDetailModal
            visible={showMealDetailModal}
            meal={selectedMealForDetail}
            onClose={handleCloseMealDetail}
            onMarkComplete={handleMealDetailComplete}
            onDelete={handleMealDetailDelete}
            isCompleted={
              (storeGetMealProgress(selectedMealForDetail.id)?.progress ?? 0) >=
              100
            }
          />
        )}

        {isProcessingBarcode && !showCamera && (
          <View style={styles.barcodeLoadingOverlay}>
            <View style={styles.barcodeLoadingCard}>
              <ActivityIndicator
                size="large"
                color={ResponsiveTheme.colors.primary}
              />
              <Text style={styles.barcodeLoadingText}>
                {cameraMode === "label"
                  ? "Reading nutrition label..."
                  : "Looking up product..."}
              </Text>
            </View>
          </View>
        )}

        {showManualEntry && (
          <Modal
            visible={showManualEntry}
            transparent
            animationType="slide"
            onRequestClose={() => setShowManualEntry(false)}
          >
            <View style={styles.manualEntryOverlay}>
              <ManualBarcodeEntry
                onLookupResolved={handleManualProductFound}
                onRequestLabelScan={async () => {
                  setShowManualEntry(false);
                  const started = await handleLabelScanned(setShowGuestSignUp);
                  if (!started) {
                    setShowManualEntry(true);
                  }
                }}
                onContributeProduct={(barcode) => {
                  setShowManualEntry(false);
                  navigation?.navigate("ContributeFood", { barcode });
                }}
                onClose={handleCloseManualEntry}
              />
            </View>
          </Modal>
        )}

        {(showLogMealModal || Boolean(logMealScanResult)) && (
          <LogMealModal
            visible={showLogMealModal}
            onClose={handleCloseLogMealModal}
            onRequestFoodScan={handleLogMealFoodScan}
            onRequestLabelScan={handleLogMealLabelScan}
            onRequestBarcodeScan={handleLogMealBarcodeScan}
            pendingScanResult={logMealScanResult}
            onScanResultConsumed={handleScanResultConsumed}
          />
        )}

        {/* Water intake modal (formerly inside HydrationPanel) */}
        {showWaterIntakeModal && (
          <WaterIntakeModal
            visible={showWaterIntakeModal}
            onClose={handleCloseWaterIntake}
            onAddWater={hydrationAddWater}
            currentIntakeML={waterIntakeML || 0}
            goalML={waterGoalML || 2500}
          />
        )}

        {/* Barcode sub-options modal */}
        {showBarcodeOptions && (
          <Modal
            visible={showBarcodeOptions}
            transparent
            animationType="fade"
            onRequestClose={() => setShowBarcodeOptions(false)}
          >
            <View style={styles.optionsOverlay}>
              <View style={styles.optionsSheet}>
                <Text style={styles.optionsTitle}>Barcode</Text>
                <AnimatedPressable
                  style={styles.optionButton}
                  onPress={() => {
                    setShowBarcodeOptions(false);
                    handleScanProduct();
                  }}
                  scaleValue={0.96}
                >
                  <Ionicons
                    name="barcode-outline"
                    size={rf(22)}
                    color={ResponsiveTheme.colors.teal}
                  />
                  <Text style={styles.optionText}>Scan Barcode</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  style={styles.optionButton}
                  onPress={() => {
                    setShowBarcodeOptions(false);
                    setShowManualEntry(true);
                  }}
                  scaleValue={0.96}
                >
                  <Ionicons
                    name="keypad-outline"
                    size={rf(22)}
                    color={ResponsiveTheme.colors.text}
                  />
                  <Text style={styles.optionText}>Enter Manually</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  style={[styles.optionButton, styles.optionButtonCancel]}
                  onPress={() => setShowBarcodeOptions(false)}
                  scaleValue={0.96}
                >
                  <Text style={styles.optionCancelText}>Cancel</Text>
                </AnimatedPressable>
              </View>
            </View>
          </Modal>
        )}

        {/* Label scan prep modal â€” portion size before scanning */}
        {showLabelScanPrep && (
          <Modal
            visible={showLabelScanPrep}
            transparent
            animationType="fade"
            onRequestClose={() => {
              setShowLabelScanPrep(false);
              setLabelScanGramsInput("");
            }}
          >
            <View style={styles.optionsOverlay}>
              <View style={styles.optionsSheet}>
                <Text style={styles.optionsTitle}>Scan Nutrition Label</Text>
                <Text style={styles.optionsSubtitle}>
                  Enter the serving size you are eating for exact nutrient
                  calculation
                </Text>
                <View style={styles.labelGramsContainer}>
                  <Text style={styles.labelGramsLabel}>
                    Serving size (optional)
                  </Text>
                  <View style={styles.labelGramsRow}>
                    <TextInput
                      style={styles.labelGramsInputField}
                      value={labelScanGramsInput}
                      onChangeText={setLabelScanGramsInput}
                      placeholder="grams"
                      placeholderTextColor={
                        ResponsiveTheme.colors.textSecondary
                      }
                      keyboardType="numeric"
                      maxLength={4}
                      returnKeyType="done"
                    />
                    <Text style={styles.labelGramsUnit}>g</Text>
                  </View>
                  <Text style={styles.labelGramsHint}>
                    AI scales nutrients from the label to your exact portion
                  </Text>
                </View>
                <AnimatedPressable
                  style={styles.optionButton}
                  onPress={() => {
                    const grams = parseFloat(labelScanGramsInput);
                    const portionG = !isNaN(grams) && grams > 0 ? grams : null;
                    setShowLabelScanPrep(false);
                    setLabelScanGramsInput("");
                    void handleLabelScanned(setShowGuestSignUp, portionG);
                  }}
                  scaleValue={0.96}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={rf(22)}
                    color="#8B5CF6"
                  />
                  <Text style={styles.optionText}>Scan Label</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  style={[styles.optionButton, styles.optionButtonCancel]}
                  onPress={() => {
                    setShowLabelScanPrep(false);
                    setLabelScanGramsInput("");
                  }}
                  scaleValue={0.96}
                >
                  <Text style={styles.optionCancelText}>Cancel</Text>
                </AnimatedPressable>
              </View>
            </View>
          </Modal>
        )}

        {/* Photo weight prompt modal â€” asks for optional gram weight before food recognition */}
        {showWeightPrompt && (
          <Modal
            visible={showWeightPrompt}
            transparent
            animationType="fade"
            onRequestClose={() => {
              dismissWeightPrompt();
              setPhotoWeightInput("");
            }}
          >
            <View style={styles.optionsOverlay}>
              <View style={styles.optionsSheet}>
                <Text style={styles.optionsTitle}>Scan Food</Text>
                <Text style={styles.optionsSubtitle}>
                  Enter the weight of your portion for more accurate calorie
                  tracking
                </Text>
                <View style={styles.labelGramsContainer}>
                  <Text style={styles.labelGramsLabel}>
                    Portion weight (optional)
                  </Text>
                  <View style={styles.labelGramsRow}>
                    <TextInput
                      style={styles.labelGramsInputField}
                      value={photoWeightInput}
                      onChangeText={setPhotoWeightInput}
                      placeholder="grams"
                      placeholderTextColor={
                        ResponsiveTheme.colors.textSecondary
                      }
                      keyboardType="numeric"
                      maxLength={4}
                      returnKeyType="done"
                      autoFocus
                    />
                    <Text style={styles.labelGramsUnit}>g</Text>
                  </View>
                  <Text style={styles.labelGramsHint}>
                    AI estimates portion size from the photo if left blank
                  </Text>
                </View>
                <AnimatedPressable
                  style={styles.optionButton}
                  onPress={() => {
                    const grams = parseFloat(photoWeightInput);
                    const portionG =
                      !isNaN(grams) && grams > 0 ? grams : undefined;
                    setPhotoWeightInput("");
                    confirmPhotoRecognition(portionG);
                  }}
                  scaleValue={0.96}
                >
                  <Ionicons
                    name="camera-outline"
                    size={rf(22)}
                    color={ResponsiveTheme.colors.teal}
                  />
                  <Text style={styles.optionText}>Recognise Food</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  style={[styles.optionButton, styles.optionButtonCancel]}
                  onPress={() => {
                    dismissWeightPrompt();
                    setPhotoWeightInput("");
                  }}
                  scaleValue={0.96}
                >
                  <Text style={styles.optionCancelText}>Cancel</Text>
                </AnimatedPressable>
              </View>
            </View>
          </Modal>
        )}

        {showPaywall && (
          <PaywallModal
            visible={showPaywall}
            reason={paywallReason ?? undefined}
            onClose={dismissPaywall}
          />
        )}

        {isGeneratingMeal && !showScanResult && (
          <FoodScanLoadingOverlay visible={true} />
        )}

        {showScanResult && (
          <ScanResultModal
            visible={showScanResult}
            scanResult={scanResult}
            onAccept={handleScanResultAccept}
            onAdjustPortions={handleScanResultAdjust}
            onFeedback={handleScanResultFeedback}
            onDismiss={handleScanResultDismiss}
          />
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ResponsiveTheme.colors.background },
  scrollView: { flex: 1 },
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
  bottomSpacing: { height: rh(80) },
  manualEntryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    marginHorizontal: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    gap: ResponsiveTheme.spacing.xs,
  },
  manualEntryText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.text,
    fontWeight: "500" as const,
    opacity: 0.7,
  },
  barcodeLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // TODO: use theme overlay color when added
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  barcodeLoadingCard: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: ResponsiveTheme.spacing.xl,
    alignItems: "center",
    gap: ResponsiveTheme.spacing.md,
  },
  barcodeLoadingText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    fontWeight: "500" as const,
  },
  manualEntryOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // TODO: use theme overlay color when added
    justifyContent: "center",
  },
  dailyMealsSection: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  dailyMealsSectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: "700" as const,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  dailyMealCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  dailyMealRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  dailyMealInfo: {
    flex: 1,
  },
  dailyMealName: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "600" as const,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xxs,
  },
  dailyMealMacros: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },
  dailyMealStatusBadge: {
    marginLeft: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xxs,
    borderRadius: ResponsiveTheme.borderRadius.full,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.xxs,
  },
  dailyMealLoggedBadge: {
    backgroundColor: `${ResponsiveTheme.colors.primary}18`,
  },
  dailyMealPlannedBadge: {
    backgroundColor: `${ResponsiveTheme.colors.warning}18`,
  },
  dailyMealBadgeText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: "600" as const,
  },
  dailyMealLoggedText: {
    color: ResponsiveTheme.colors.primary,
  },
  dailyMealPlannedText: {
    color: ResponsiveTheme.colors.warning,
  },
  // Barcode/Label options modals
  optionsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end" as const,
  },
  optionsSheet: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderTopLeftRadius: ResponsiveTheme.borderRadius.xl,
    borderTopRightRadius: ResponsiveTheme.borderRadius.xl,
    padding: ResponsiveTheme.spacing.lg,
    paddingBottom: rp(32),
    gap: ResponsiveTheme.spacing.sm,
  },
  optionsTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: "700" as const,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  optionsSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  optionButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.md,
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: ResponsiveTheme.spacing.md,
  },
  optionText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "600" as const,
    color: ResponsiveTheme.colors.text,
  },
  optionButtonCancel: {
    backgroundColor: "transparent" as const,
    justifyContent: "center" as const,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  optionCancelText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center" as const,
    flex: 1,
  },
  // Label scan grams input
  labelGramsContainer: {
    backgroundColor: `${ResponsiveTheme.colors.primary}12`,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: ResponsiveTheme.spacing.md,
    borderWidth: 1,
    borderColor: `${ResponsiveTheme.colors.primary}30`,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  labelGramsLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "600" as const,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  labelGramsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  labelGramsInputField: {
    width: rw(90),
    height: rh(40),
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    paddingHorizontal: rp(12),
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "600" as const,
    color: ResponsiveTheme.colors.text,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    textAlign: "center" as const,
  },
  labelGramsUnit: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: "600" as const,
  },
  labelGramsHint: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },
});
