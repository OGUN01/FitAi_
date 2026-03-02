import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
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
import { HydrationPanel } from "../../components/diet/HydrationPanel";
import { DietScreenHeader } from "../../components/diet/DietScreenHeader";
import { MealSuggestions } from "../../components/diet/MealSuggestions";
import { DietModals } from "../../components/diet/DietModals";
import { DietQuickActions } from "../../components/diet/DietQuickActions";
import { ManualBarcodeEntry } from "../../components/diet/ManualBarcodeEntry";
import DatabaseDownloadBanner from "../../components/DatabaseDownloadBanner";
import { LogMealModal } from "../../components/diet/LogMealModal";
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
  const [userRecipes, setUserRecipes] = useState<any[]>([]);
  const [showAIMealsPanel, setShowAIMealsPanel] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showLogMealModal, setShowLogMealModal] = useState(false);
  const [showMealDetailModal, setShowMealDetailModal] = useState(false);
  const [selectedMealForDetail, setSelectedMealForDetail] = useState<DayMeal | null>(null);

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
    generateAIMeal,
    generateDailyMealPlan: generateDailyMealPlanAction,
    handleFeedbackSubmit,
    handlePortionAdjustmentComplete,
    isProcessingBarcode,
    aiError,
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
    setUserRecipes((prev) => [recipe, ...prev]);
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
  // If store has zeros (no weekly plan tracked), fall back to dailyNutrition from meal_logs
  const hasStoreData = storeNutrition.calories > 0 || storeNutrition.protein > 0;
  const currentNutrition = {
    calories: hasStoreData ? storeNutrition.calories : (dailyNutrition?.calories || 0),
    protein: hasStoreData ? storeNutrition.protein : (dailyNutrition?.protein || 0),
    carbs: hasStoreData ? storeNutrition.carbs : (dailyNutrition?.carbs || 0),
    fat: hasStoreData ? storeNutrition.fat : (dailyNutrition?.fat || 0),
    mealsCount: dailyNutrition?.mealsCount || 0,
  };

  const macroTargets = getMacroTargets();
  const calorieTarget = getCalorieTarget();

  const nutritionTargets = {
    calories: {
      current: currentNutrition.calories,
      target: (calorieTarget ?? 0) as number,
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
              onScanBarcode={handleScanProduct}
              onLogMeal={handleSearchFood}
              onLogWater={() => setShowWaterIntakeModal(true)}
              onGenerateMeal={() => setShowAIMealsPanel(true)}
              onViewRecipes={() => setShowCreateRecipe(true)}
              isGenerating={isGeneratingMeal}
            />

            <AnimatedPressable
              style={styles.manualEntryButton}
              onPress={() => setShowManualEntry(true)}
              scaleValue={0.97}
            >
              <Ionicons
                name="keypad-outline"
                size={rf(14)}
                color={ResponsiveTheme.colors.text}
              />
              <Text style={styles.manualEntryText}>Enter Barcode Manually</Text>
            </AnimatedPressable>

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


            {dailyMeals.length > 0 && (
              <View style={styles.dailyMealsSection}>
                <Text style={styles.dailyMealsSectionTitle}>Today's Added Meals</Text>
                {dailyMeals
                  .filter((meal) => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    return meal.createdAt && meal.createdAt.startsWith(todayStr);
                  })
                  .map((meal) => (
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
                  ))
                }
              </View>
            )}
            <MealSuggestions />

            <HydrationPanel
              waterConsumedLiters={waterConsumedLiters || 0}
              waterGoalLiters={waterGoalLiters || 0}
              handleAddWater={handleAddWater}
              waterIntakeML={waterIntakeML || 0}
              waterGoalML={waterGoalML || 0}
              showWaterIntakeModal={showWaterIntakeModal}
              setShowWaterIntakeModal={setShowWaterIntakeModal}
              hydrationAddWater={hydrationAddWater}
            />

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
        />

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
});
