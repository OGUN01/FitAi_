import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  Modal,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { GlassCard } from "../../components/ui/aurora/GlassCard";
import { AuroraSpinner } from "../../components/ui/aurora/AuroraSpinner";
import { gradients, toLinearGradientProps } from "../../theme/gradients";
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
import { LogMealModal, LogMealScanResult } from "../../components/diet/LogMealModal";
import { MealDetailModal } from "../../components/diet/MealDetailModal";
import { DayMeal } from "../../types/ai";

import { useMealPlanning } from "../../hooks/useMealPlanning";
import { useNutritionTracking } from "../../hooks/useNutritionTracking";
import { useAIMealGeneration } from "../../hooks/useAIMealGeneration";
import { ScannedProduct } from "../../services/barcodeService";
import { calculateMealSchedule } from "../../utils/mealSchedule";
import PaywallModal from "../../components/subscription/PaywallModal";
import { useSubscriptionStore } from "../../stores/subscriptionStore";

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

  const [showCreateRecipe, setShowCreateRecipe] = useState(false);
  const [showAIMealsPanel, setShowAIMealsPanel] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showLogMealModal, setShowLogMealModal] = useState(false);
  const [logMealScanResult, setLogMealScanResult] = useState<LogMealScanResult | null>(null);
  const [showMealDetailModal, setShowMealDetailModal] = useState(false);
  const [selectedMealForDetail, setSelectedMealForDetail] = useState<DayMeal | null>(null);
  const [showBarcodeOptions, setShowBarcodeOptions] = useState(false);
  const [showLabelScanPrep, setShowLabelScanPrep] = useState(false);
  const [labelScanGramsInput, setLabelScanGramsInput] = useState("");

  const { showPaywall, paywallReason, dismissPaywall } = useSubscriptionStore();

  const fabScale = useRef(new Animated.Value(1)).current;
  const fabRotation = useRef(new Animated.Value(0)).current;

  const {
    weeklyMealPlan,
    isGeneratingPlan,
    selectedDay,
    asyncJob,
    getTodaysMeals,
    generateWeeklyMealPlan,
    cancelAsyncGeneration,
    handleDeleteMeal,
    refreshMealData,
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
    userMealsLoading,
    userMeals,
    foodsError,
    userMealsError,
    refreshAll,
    clearErrors,
    trackBStatus,
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
    handleBarcodeScanned,
    handleCameraCapture,
    handleAddProductToMeal,
    handleScanFood,
    handleScanProduct,
    handleLabelScanned,
    generateAIMeal,
    generateDailyMealPlan: generateDailyMealPlanAction,
    handleFeedbackSubmit,
    handlePortionAdjustmentComplete,
    isProcessingBarcode,
    aiError,
    portionGrams,
    setPortionGrams,
    setLogMealScanCallback,
  } = useAIMealGeneration({
    onBarcodeNotFound: (barcode) => navigation?.navigate('ContributeFood', { barcode }),
  });

  const { setSelectedDay } = useAppStateStore();

  // Day name → index mapping for date navigation
  const DAY_NAME_TO_INDEX: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const INDEX_TO_DAY_NAME = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

  // Compute the actual Date for the currently selected day
  const selectedDate = React.useMemo(() => {
    const today = new Date();
    const todayIndex = today.getDay(); // 0=sun
    const targetIndex = DAY_NAME_TO_INDEX[selectedDay] ?? todayIndex;
    const diff = targetIndex - todayIndex;
    const d = new Date(today);
    d.setDate(today.getDate() + diff);
    return d;
  }, [selectedDay]);

  const onPrevDay = useCallback(() => {
    const prev = new Date(selectedDate);
    prev.setDate(selectedDate.getDate() - 1);
    setSelectedDay(INDEX_TO_DAY_NAME[prev.getDay()] as any);
  }, [selectedDate, setSelectedDay]);

  const onNextDay = useCallback(() => {
    const next = new Date(selectedDate);
    next.setDate(selectedDate.getDate() + 1);
    setSelectedDay(INDEX_TO_DAY_NAME[next.getDay()] as any);
  }, [selectedDate, setSelectedDay]);

  const { getMealProgress: storeGetMealProgress, dailyMeals } = useNutritionStore();
  const { personalInfo, bodyAnalysis, dietPreferences, workoutPreferences, advancedReview } = useProfileStore();
  const userProfile = { personalInfo, bodyMetrics: bodyAnalysis, fitnessGoals: advancedReview, dietPreferences, workoutPreferences };

  const canAccessMealFeatures = isAuthenticated || isGuestMode;

  useEffect(() => {
    if (isActive) {
      refreshMealData();
    }
  }, [isActive, refreshMealData]);

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
    if (!isActive || Platform.OS === 'web') return;
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

  useEffect(() => {
    Animated.timing(fabRotation, {
      toValue: showAIMealsPanel ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showAIMealsPanel, fabRotation]);

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

  const handleSearchFood = () => {
    setShowLogMealModal(true);
  };

  const handleRecipeCreated = (recipe: any) => {
    setShowCreateRecipe(false);
  };

  const handleMealCardPress = useCallback((meal: DayMeal) => {
    setSelectedMealForDetail(meal);
    setShowMealDetailModal(true);
  }, []);

  const handleMealDetailComplete = useCallback((meal: DayMeal) => {
    completeMealPreparation(meal);
    setShowMealDetailModal(false);
    setSelectedMealForDetail(null);
  }, [completeMealPreparation]);

  const handleMealDetailDelete = useCallback(async (meal: DayMeal) => {
    const result = await handleDeleteMeal(meal);
    if (result) {
      setShowMealDetailModal(false);
      setSelectedMealForDetail(null);
    }
  }, [handleDeleteMeal]);

  const handleManualProductFound = useCallback(
    (product: ScannedProduct) => {
      setShowManualEntry(false);
      // Re-use the existing barcode flow to show the product modal
      handleBarcodeScanned(product.barcode);
    },
    [handleBarcodeScanned],
  );

  const storeNutrition = getTodaysConsumedNutrition();
  // SSOT fix: nutritionStore.getTodaysConsumedNutrition() is the single source
  // for all today's calories. It aggregates:
  //   (a) completed weekly-plan meals via mealProgress
  //   (b) manually-logged daily meals hydrated into dailyMeals from meal_logs
  // We no longer fall back to a separate Supabase dailyNutrition fetch because
  // that fetch and the store fetch target the same meal_logs table — merging them
  // caused different calorie numbers on different screens.
  const currentNutrition = {
    calories: storeNutrition.calories,
    protein: storeNutrition.protein,
    carbs: storeNutrition.carbs,
    fat: storeNutrition.fat,
    fiber: storeNutrition.fiber,
    // mealsCount: count unique meals from store dailyMeals + userMeals not yet
    // hydrated into the store (new logs that arrived after the last loadData call).
    // Use a Set to avoid double-counting by meal id.
    mealsCount: (() => {
      const storeMealIds = new Set(dailyMeals.map((m) => m.id));
      const extraFromSupabase = (userMeals || []).filter((m) => !storeMealIds.has(m.id));
      return dailyMeals.length + extraFromSupabase.length;
    })(),
  };

  const macroTargets = getMacroTargets();
  // 0 when target not set — NutritionSummaryCard handles all-zeros with a
  // "Using estimated targets — complete your profile" notice banner.
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

  const onGenerateWeeklyPlan = () => generateWeeklyMealPlan(setShowGuestSignUp);
  const onGenerateDailyPlan = () =>
    generateDailyMealPlanAction(setShowGuestSignUp);
  const onGenerateAIMeal = async (type: string, options?: any) => {
    setShowAIMealsPanel(false);
    await generateAIMeal(type, setShowGuestSignUp, options);
  };
  const onHandleCameraCapture = (uri: string) =>
    handleCameraCapture(uri, setShowGuestSignUp);
  const onHandleAddProductToMeal = (product: any) =>
    handleAddProductToMeal(product, setShowGuestSignUp);

  // Tracks whether we're waiting for a camera-based scan (food/barcode) so we can
  // reopen the LogMealModal if the user cancels instead of completing the scan.
  const logMealCameraScanActiveRef = useRef(false);

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
      !isGeneratingMeal
    ) {
      logMealCameraScanActiveRef.current = false;
      setShowLogMealModal(true);
    }
  }, [showCamera, showMealTypeSelector, isProcessingBarcode, isGeneratingMeal]);

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

  const handleLogMealLabelScan = useCallback(async () => {
    setShowLogMealModal(false);
    let callbackFired = false;
    setLogMealScanCallback((result) => {
      callbackFired = true;
      setLogMealScanResult(result);
      setShowLogMealModal(true);
    });
    await handleLabelScanned(setShowGuestSignUp);
    // If the image picker was cancelled or scan failed, the callback never fired.
    if (!callbackFired) {
      setLogMealScanCallback(null);
      setShowLogMealModal(true);
    }
  }, [setLogMealScanCallback, handleLabelScanned, setShowGuestSignUp]);

  const handleLogMealBarcodeScan = useCallback(() => {
    setShowLogMealModal(false);
    logMealCameraScanActiveRef.current = true;
    setLogMealScanCallback((result) => {
      logMealCameraScanActiveRef.current = false;
      setLogMealScanResult(result);
      setShowLogMealModal(true);
    });
    handleScanProduct();
  }, [setLogMealScanCallback, handleScanProduct]);

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
            <DietScreenHeader
              isGeneratingPlan={isGeneratingPlan}
              isGeneratingMeal={isGeneratingMeal}
              onGenerateWeeklyPlan={onGenerateWeeklyPlan}
              onGenerateDailyPlan={onGenerateDailyPlan}
              handleSearchFood={handleSearchFood}
              trackBStatus={trackBStatus}
              selectedDate={selectedDate}
              onPrevDay={onPrevDay}
              onNextDay={onNextDay}
            />

            <DatabaseDownloadBanner />
            {(foodsLoading || userMealsLoading || isGeneratingMeal) ? (
              <View style={styles.loadingContainer}>
                <AuroraSpinner size="lg" theme="primary" />
                <Text style={styles.loadingText}>
                  {isGeneratingMeal
                    ? "Generating your meal..."
                    : "Loading nutrition data..."}
                </Text>
              </View>
            ) : (foodsError || userMealsError || aiError) ? (
              <GlassCard style={styles.errorCard} elevation={1} padding="md">
                <Text style={styles.errorText}>
                  {foodsError || userMealsError || aiError}
                </Text>
                <Button
                  title="Retry"
                  onPress={() => { refreshAll().catch(console.error); }}
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
              onScanBarcode={() => setShowBarcodeOptions(true)}
              onScanLabel={() => setShowLabelScanPrep(true)}
              onLogMeal={handleSearchFood}
              onLogWater={() => setShowWaterIntakeModal(true)}
              onGenerateMeal={() => setShowAIMealsPanel(true)}
              onViewRecipes={() => setShowCreateRecipe(true)}
              isGenerating={isGeneratingMeal}
            />

            {!weeklyMealPlan?.meals || weeklyMealPlan.meals.length === 0 ? (
              userMeals && userMeals.length > 0 ? (
                <View style={styles.dailyMealsSection}>
                  <Text style={styles.dailyMealsSectionTitle}>Today's Meals</Text>
                  {userMeals.map((meal) => (
                    <GlassCard key={meal.id} elevation={1} padding="md" style={styles.dailyMealCard}>
                      <View style={styles.dailyMealRow}>
                        <View style={styles.dailyMealInfo}>
                          <Text style={styles.dailyMealName}>{meal.name || meal.type}</Text>
                          <Text style={styles.dailyMealMacros}>
                            {meal.total_calories} cal | {Math.round(meal.total_protein || 0)}g P | {Math.round(meal.total_carbs || 0)}g C | {Math.round(meal.total_fat || 0)}g F
                          </Text>
                        </View>
                        <View style={styles.dailyMealBadge}>
                          <Ionicons name="checkmark-circle" size={rf(20)} color={ResponsiveTheme.colors.primary} />
                        </View>
                      </View>
                    </GlassCard>
                  ))}
                </View>
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
                  No meals logged
                </Text>
                <Text
                  style={{
                    color: ResponsiveTheme.colors.textSecondary,
                    opacity: 0.6,
                    fontSize: ResponsiveTheme.fontSize.sm,
                  }}
                >
                  Tap + to log your first meal
                </Text>
              </View>
              )
            ) : (
              <MealPlanView
                weeklyMealPlan={weeklyMealPlan}
                selectedDay={selectedDay}
                setSelectedDay={setSelectedDay}
                getTodaysMeals={getTodaysMeals}
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
            )}


            {(() => {
              // D3: Deduplicate dailyMeals against userMeals.
              // userMeals come from Supabase meal_logs (manually logged).
              // dailyMeals come from nutritionStore (AI plan completions).
              // They use different ID spaces, but a user could log the same meal
              // via both paths. Deduplicate by lowercased name + today's date.
              const userMealNames = new Set(
                (userMeals || []).map((m) =>
                  `${(m.name || m.type || '').toLowerCase()}_${new Date().toISOString().split('T')[0]}`,
                ),
              );
              const todayStr = new Date().toISOString().split('T')[0];
              const uniqueDailyMeals = dailyMeals.filter((meal) => {
                const mealDate = meal.createdAt ? meal.createdAt.split('T')[0] : '';
                if (mealDate !== todayStr) return false; // Only today's meals
                const key = `${(meal.name || '').toLowerCase()}_${todayStr}`;
                return !userMealNames.has(key);
              });
              return uniqueDailyMeals.length > 0 ? (
                <View style={styles.dailyMealsSection}>
                  <Text style={styles.dailyMealsSectionTitle}>Today's Added Meals</Text>
                  {uniqueDailyMeals.map((meal) => (
                    <GlassCard key={meal.id} elevation={1} padding="md" style={styles.dailyMealCard}>
                      <View style={styles.dailyMealRow}>
                        <View style={styles.dailyMealInfo}>
                          <Text style={styles.dailyMealName}>{meal.name}</Text>
                          <Text style={styles.dailyMealMacros}>
                            {meal.totalCalories} cal | {meal.totalMacros?.protein || 0}g P | {meal.totalMacros?.carbohydrates || 0}g C | {meal.totalMacros?.fat || 0}g F
                          </Text>
                        </View>
                        <View style={styles.dailyMealBadge}>
                          <Ionicons name="checkmark-circle" size={rf(20)} color={ResponsiveTheme.colors.primary} />
                        </View>
                      </View>
                    </GlassCard>
                  ))}
                </View>
              ) : null;
            })()}
            <MealSuggestions />

            <View style={styles.bottomSpacing} />
          </View>
        </ScrollView>

        <DietModals
          showCamera={showCamera}
          cameraMode={cameraMode}
          onHandleCameraCapture={onHandleCameraCapture}
          handleBarcodeScanned={handleBarcodeScanned}
          setShowCamera={setShowCamera}
          setCameraMode={setCameraMode}
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
          showAIMealsPanel={showAIMealsPanel}
          setShowAIMealsPanel={setShowAIMealsPanel}
          onGenerateAIMeal={onGenerateAIMeal}
          isGeneratingMeal={isGeneratingMeal}
          userProfile={userProfile}
          asyncJob={asyncJob}
          cancelAsyncGeneration={cancelAsyncGeneration}
          showCreateRecipe={showCreateRecipe}
          setShowCreateRecipe={setShowCreateRecipe}
          handleRecipeCreated={handleRecipeCreated}
          scannedProduct={scannedProduct}
          showProductModal={showProductModal}
          setShowProductModal={setShowProductModal}
          productHealthAssessment={productHealthAssessment}
          onHandleAddProductToMeal={onHandleAddProductToMeal}
          portionGrams={portionGrams}
          setPortionGrams={setPortionGrams}
        />

        <MealDetailModal
          visible={showMealDetailModal}
          meal={selectedMealForDetail}
          onClose={() => {
            setShowMealDetailModal(false);
            setSelectedMealForDetail(null);
          }}
          onMarkComplete={handleMealDetailComplete}
          onDelete={handleMealDetailDelete}
          isCompleted={
            selectedMealForDetail
              ? (storeGetMealProgress(selectedMealForDetail.id)?.progress ?? 0) >= 100
              : false
          }
        />

        {isProcessingBarcode && (
          <View style={styles.barcodeLoadingOverlay}>
            <View style={styles.barcodeLoadingCard}>
              <ActivityIndicator
                size="large"
                color={ResponsiveTheme.colors.primary}
              />
              <Text style={styles.barcodeLoadingText}>
                Looking up product...
              </Text>
            </View>
          </View>
        )}

        <Modal
          visible={showManualEntry}
          transparent
          animationType="slide"
          onRequestClose={() => setShowManualEntry(false)}
        >
          <View style={styles.manualEntryOverlay}>
            <ManualBarcodeEntry
              onProductFound={handleManualProductFound}
              onClose={() => setShowManualEntry(false)}
            />
          </View>
        </Modal>

        <LogMealModal
          visible={showLogMealModal}
          onClose={() => setShowLogMealModal(false)}
          onRequestFoodScan={handleLogMealFoodScan}
          onRequestLabelScan={handleLogMealLabelScan}
          onRequestBarcodeScan={handleLogMealBarcodeScan}
          pendingScanResult={logMealScanResult}
          onScanResultConsumed={() => setLogMealScanResult(null)}
        />

        {/* Water intake modal (formerly inside HydrationPanel) */}
        <WaterIntakeModal
          visible={showWaterIntakeModal}
          onClose={() => setShowWaterIntakeModal(false)}
          onAddWater={hydrationAddWater}
          currentIntakeML={waterIntakeML || 0}
          goalML={waterGoalML || 2500}
        />

        {/* Barcode sub-options modal */}
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
                <Ionicons name="barcode-outline" size={rf(22)} color={ResponsiveTheme.colors.teal} />
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
                <Ionicons name="keypad-outline" size={rf(22)} color={ResponsiveTheme.colors.text} />
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

        {/* Label scan prep modal — portion size before scanning */}
        <Modal
          visible={showLabelScanPrep}
          transparent
          animationType="fade"
          onRequestClose={() => { setShowLabelScanPrep(false); setLabelScanGramsInput(""); }}
        >
          <View style={styles.optionsOverlay}>
            <View style={styles.optionsSheet}>
              <Text style={styles.optionsTitle}>Scan Nutrition Label</Text>
              <Text style={styles.optionsSubtitle}>
                Enter the serving size you are eating for exact nutrient calculation
              </Text>
              <View style={styles.labelGramsContainer}>
                <Text style={styles.labelGramsLabel}>⚖️ Serving size (optional)</Text>
                <View style={styles.labelGramsRow}>
                  <TextInput
                    style={styles.labelGramsInputField}
                    value={labelScanGramsInput}
                    onChangeText={setLabelScanGramsInput}
                    placeholder="grams"
                    placeholderTextColor={ResponsiveTheme.colors.textSecondary}
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
                  handleLabelScanned(setShowGuestSignUp, portionG);
                }}
                scaleValue={0.96}
              >
                <Ionicons name="document-text-outline" size={rf(22)} color="#8B5CF6" />
                <Text style={styles.optionText}>Scan Label</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={[styles.optionButton, styles.optionButtonCancel]}
                onPress={() => { setShowLabelScanPrep(false); setLabelScanGramsInput(""); }}
                scaleValue={0.96}
              >
                <Text style={styles.optionCancelText}>Cancel</Text>
              </AnimatedPressable>
            </View>
          </View>
        </Modal>

        {!showLogMealModal && !showAIMealsPanel && !showManualEntry && !showMealDetailModal && (
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
            onPress={() => setShowAIMealsPanel(true)}
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
        )}
      <PaywallModal
        visible={showPaywall}
        reason={paywallReason ?? undefined}
        onClose={dismissPaywall}
      />
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
  fab: {
    position: "absolute",
    right: ResponsiveTheme.spacing.lg,
    bottom: rp(16),
  },
  fabGradient: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(22),
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
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
  dailyMealBadge: {
    marginLeft: ResponsiveTheme.spacing.sm,
  },
  fabIcon: { fontSize: rf(20), color: ResponsiveTheme.colors.white },
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
