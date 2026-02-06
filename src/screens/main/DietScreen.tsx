import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { GlassCard } from "../../components/ui/aurora/GlassCard";
import { AuroraSpinner } from "../../components/ui/aurora/AuroraSpinner";
import { gradients, toLinearGradientProps } from "../../theme/gradients";
import { rf, rw } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { Button } from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import {
  useNutritionStore,
  useAppStateStore,
  useUserStore,
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

  const [showCreateRecipe, setShowCreateRecipe] = useState(false);
  const [userRecipes, setUserRecipes] = useState<any[]>([]);
  const [showAIMealsPanel, setShowAIMealsPanel] = useState(false);

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
    aiError,
  } = useAIMealGeneration();

  const { setSelectedDay } = useAppStateStore();
  const { getMealProgress: storeGetMealProgress } = useNutritionStore();
  const { profile: userProfile } = useUserStore();

  const canAccessMealFeatures = isAuthenticated || isGuestMode;

  useEffect(() => {
    if (isActive) {
      refreshMealData();
    }
  }, [isActive]);

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
    setShowAIMealsPanel(true);
  };

  const handleRecipeCreated = (recipe: any) => {
    setUserRecipes((prev) => [recipe, ...prev]);
    setShowCreateRecipe(false);
  };

  const storeNutrition = getTodaysConsumedNutrition();
  const currentNutrition = {
    calories: storeNutrition.calories,
    protein: storeNutrition.protein,
    carbs: storeNutrition.carbs,
    fat: storeNutrition.fat,
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
    const { calculateMealSchedule } = require("../../utils/mealSchedule");
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
  const onGenerateAIMeal = (type: string) =>
    generateAIMeal(type, setShowGuestSignUp);
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
            />

            {(foodsLoading || userMealsLoading || isGeneratingMeal) && (
              <View style={styles.loadingContainer}>
                <AuroraSpinner size="lg" theme="primary" />
                <Text style={styles.loadingText}>
                  {isGeneratingMeal
                    ? "Generating your meal..."
                    : "Loading nutrition data..."}
                </Text>
              </View>
            )}
            {(foodsError || userMealsError || aiError) && (
              <GlassCard style={styles.errorCard} elevation={1} padding="md">
                <Text style={styles.errorText}>
                  {foodsError || userMealsError || aiError}
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

            <NutritionSummaryCard nutritionTargets={nutritionTargets} />

            <DietQuickActions
              onScanFood={handleScanFood}
              onScanBarcode={handleScanProduct}
              onLogMeal={handleSearchFood}
              onLogWater={() => setShowWaterIntakeModal(true)}
              onGenerateMeal={() => onGenerateAIMeal("lunch")}
              onViewRecipes={() => setShowCreateRecipe(true)}
              isGenerating={isGeneratingMeal}
            />

            {!weeklyMealPlan?.meals || weeklyMealPlan.meals.length === 0 ? (
              <View
                style={{
                  paddingVertical: ResponsiveTheme.spacing.xl,
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
              />
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
  bottomSpacing: { height: ResponsiveTheme.spacing.xl },
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
