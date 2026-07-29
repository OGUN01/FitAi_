import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSharedValue } from 'react-native-reanimated';
import { AnimatedPressable } from '../../components/ui/aurora/AnimatedPressable';
import { GlassCard } from '../../components/ui/aurora/GlassCard';
import { AuroraSpinner } from '../../components/ui/aurora/AuroraSpinner';
import { DashboardSkeleton } from '../../components/ui/aurora/DashboardSkeleton';
import { rf, rw, rp, rh } from '../../utils/responsive';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
} from '../../theme/aurora-tokens';
import { hexToRgba, TINT_ALPHA_LOW, TINT_ALPHA_MEDIUM } from '../../utils/colors';
import { Button } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useNutritionStore, useAppStateStore, useProfileStore } from '../../stores';
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';
import { GuestSignUpScreen } from './GuestSignUpScreen';

import { MealDetailView } from '../../components/diet/MealDetailView';
import { WaterIntakeModal } from '../../components/diet/WaterIntakeModal';
// Diet tab redesigned (Hero Ring layout): the dashboard now shows a big
// calorie ring hero + macro rings + an integrated meals timeline on the
// AuroraBackground, replacing the prior card-stack (CalorieRingCard,
// MacroPillRow, QuickActionStrip, TodaysIntakeSummary, DateStepper) and
// the MealsListView full-screen overlay. Those components are now legacy.
import { DietModals } from '../../components/diet/DietModals';
import { StreakPill } from '../../components/diet/StreakPill';
import { WeekCalendarStrip } from '../../components/diet/WeekCalendarStrip';
import { ConcentricRings } from '../../components/diet/ConcentricRings';
import { MealsTimeline } from '../../components/diet/MealsTimeline';
import { WaterQuickRow } from '../../components/diet/WaterQuickRow';
import { DietActionDock } from '../../components/diet/DietActionDock';
import { ManualBarcodeEntry } from '../../components/diet/ManualBarcodeEntry';
import DatabaseDownloadBanner from '../../components/DatabaseDownloadBanner';
import { LogMealModal, LogMealScanResult } from '../../components/diet/LogMealModal';
import { ProductDetailsModal } from '../../components/diet/ProductDetailsModal';
import { FoodScanLoadingOverlay } from '../../components/diet/FoodScanLoadingOverlay';
import { ScanResultModal } from '../../components/diet/ScanResultModal';
import { DayMeal } from '../../types/ai';

import { useMealPlanning } from '../../hooks/useMealPlanning';
import { useNutritionTracking } from '../../hooks/useNutritionTracking';
import { useAIMealGeneration } from '../../hooks/useAIMealGeneration';
import { ProductLookupResult } from '../../services/barcodeService';
import { calculateMealSchedule } from '../../utils/mealSchedule';
import { getLocalDateString } from '../../utils/weekUtils';
import { getWeekDates } from '../../components/diet/dietViewModel';
import { DateFormatters } from '../../utils/formatters/dateFormatters';
import PaywallModal from '../../components/subscription/PaywallModal';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { buildLegacyProfileAdapter } from '../../utils/profileLegacyAdapter';

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
  const { isAuthenticated } = useAuth();
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showCreateRecipe, setShowCreateRecipe] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showLogMealModal, setShowLogMealModal] = useState(false);
  const [logMealScanResult, setLogMealScanResult] = useState<LogMealScanResult | null>(null);
  const [showMealDetail, setShowMealDetail] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<DayMeal | null>(null);
  const [showBarcodeOptions, setShowBarcodeOptions] = useState(false);
  const [showLabelScanPrep, setShowLabelScanPrep] = useState(false);
  const [labelScanGramsInput, setLabelScanGramsInput] = useState('');
  const [photoWeightInput, setPhotoWeightInput] = useState('');

  const showPaywall = useSubscriptionStore((state) => state.showPaywall);
  const paywallReason = useSubscriptionStore((state) => state.paywallReason);
  const dismissPaywall = useSubscriptionStore((state) => state.dismissPaywall);

  const {
    weeklyMealPlan,
    isGeneratingPlan,
    asyncJob,
    aiError,
    todaysMeals,
    generateWeeklyMealPlan,
    cancelAsyncGeneration,
    forceRefresh,
    completeMealPreparation,
    swapMealInPlan,
  } = useMealPlanning(navigation);

  const {
    waterIntakeML,
    waterGoalML,
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
    onBarcodeNotFound: (barcode) => navigation?.navigate('ContributeFood', { barcode }),
    onOpenManualEntry: () => setShowManualEntry(true),
  });

  const selectedDateKey = useAppStateStore((state) => state.selectedDate);

  // Auto-hide action dock on scroll-down, reveal on scroll-up (Google/Apple
  // pattern). `dockHide` is a Reanimated shared value (0 = visible,
  // 1 = hidden) consumed by DietActionDock's useAnimatedStyle. We drive it
  // from a plain onScroll (not useAnimatedScrollHandler) so the global
  // reanimated test mock — which doesn't export useAnimatedScrollHandler —
  // still renders the dashboard in unit tests. A deadzone of ~40px suppresses
  // flicker at the scroll-direction boundary. Initial state = visible.
  const dockHide = useSharedValue(0);
  const lastScrollY = useRef(0);
  const dockDirection = useRef<'none' | 'down' | 'up'>('none');
  const SCROLL_DEADZONE = 40;
  const onDashboardScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const y = event.nativeEvent.contentOffset.y;
      const delta = y - lastScrollY.current;
      // At the top, always show the dock.
      if (y <= 0) {
        dockHide.value = 0;
        dockDirection.current = 'none';
        lastScrollY.current = y;
        return;
      }
      if (Math.abs(delta) < 4) return; // micro-jitter guard
      if (delta > 0 && dockDirection.current !== 'down') {
        // Scrolling down past the deadzone → hide.
        if (y > SCROLL_DEADZONE) {
          dockHide.value = 1;
          dockDirection.current = 'down';
        }
      } else if (delta < 0 && dockDirection.current !== 'up') {
        // Any scroll-up → reveal.
        dockHide.value = 0;
        dockDirection.current = 'up';
      }
      lastScrollY.current = y;
    },
    [dockHide]
  );

  // Force-hide the dock whenever a full-screen overlay is open. The dock is
  // rendered as a sibling AFTER SafeAreaView, so it paints on top of overlays
  // whose zIndex only applies inside SafeAreaView (MealDetailView, the barcode
  // loading overlay). Hiding via the shared value is cheaper than restructuring
  // the tree and keeps the scroll-driven show/hide logic intact when closed.
  useEffect(() => {
    const overlayOpen =
      showMealDetail || (isProcessingBarcode && !showCamera) || showCamera;
    dockHide.value = overlayOpen ? 1 : 0;
  }, [showMealDetail, isProcessingBarcode, showCamera, dockHide]);

  const mealProgress = useNutritionStore((state) => state.mealProgress);
  const storeGetMealProgress = (mealId: string) => mealProgress[mealId] ?? null;
  const dailyMeals = useNutritionStore((state) => state.dailyMeals);
  const todaysConsumedMeals = React.useMemo(() => {
    const todayDate = getLocalDateString();
    return dailyMeals.filter(
      (meal) =>
        typeof (meal as unknown as Record<string, unknown>).loggedAt === 'string' &&
        getLocalDateString((meal as unknown as Record<string, unknown>).loggedAt as string) ===
          todayDate
    );
  }, [dailyMeals]);
  const personalInfo = useProfileStore((state) => state.personalInfo);
  const bodyAnalysis = useProfileStore((state) => state.bodyAnalysis);
  const dietPreferences = useProfileStore((state) => state.dietPreferences);
  const workoutPreferences = useProfileStore((state) => state.workoutPreferences);
  const userProfile = React.useMemo(
    () => ({
      bodyMetrics: bodyAnalysis,
      workoutPreferences,
      ...buildLegacyProfileAdapter({
        personalInfo,
        bodyAnalysis,
        workoutPreferences,
        dietPreferences,
      }),
    }),
    [personalInfo, bodyAnalysis, dietPreferences, workoutPreferences]
  );

  const canAccessMealFeatures = isAuthenticated;

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
  }, [handleLabelScanned, handleScanFood, navigation, route?.params, setShowWaterIntakeModal]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAll();
      clearErrors();
    } catch (error) {
      console.warn('Failed to refresh nutrition data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshAll, clearErrors]);

  const handleSearchFood = useCallback(() => {
    setShowLogMealModal(true);
  }, []);

  const handleRecipeCreated = useCallback((_recipe: any) => {
    setShowCreateRecipe(false);
  }, []);

  const handleManualProductFound = useCallback(
    (lookupResult: ProductLookupResult) => {
      setShowManualEntry(false);
      handleManualLookupResolved(lookupResult);
    },
    [handleManualLookupResolved]
  );

  const storeNutrition = getTodaysConsumedNutrition();
  // Date-aware nutrition: when user swipes to a different day, show that day's data
  const selectedDateNutrition = useNutritionStore((s) => s.getConsumedNutritionForDate)(
    selectedDateKey
  );
  const isSelectedDateToday = selectedDateKey === getLocalDateString();
  // Anchor the screen with a date subtitle (Apple Fitness / Whoop pattern).
  // selectedDateKey is an ISO date ("2026-07-28"); parse at noon to avoid the
  // midnight-UTC day-shift in negative timezones.
  const selectedDateMidnight = useMemo(
    () => new Date(`${selectedDateKey}T12:00:00`),
    [selectedDateKey],
  );
  const dateSubtitle = isSelectedDateToday
    ? `Today, ${DateFormatters.short(selectedDateMidnight)}`
    : `${DateFormatters.weekdayShort(selectedDateMidnight)}, ${DateFormatters.short(selectedDateMidnight)}`;
  // Meals-timeline header: "Today's Meals" for today, else a human-readable
  // date (never a raw ISO string like "2026-07-28").
  const mealsTimelineTitle = isSelectedDateToday
    ? "Today's Meals"
    : `Meals · ${DateFormatters.weekdayShort(selectedDateMidnight)}, ${DateFormatters.short(selectedDateMidnight)}`;
  // Per-day calorie completion for the WeekCalendarStrip dots. Sums the
  // reactive dailyMeals list per visible week date against the user's daily
  // calorie target. Past/today days get a percent; future days are omitted
  // (the strip skips dots for those). Recomputes only when meals or target
  // change — cheap (7 dates × filter).
  const dayCompletion = useMemo(() => {
    const target = getCalorieTarget() || 0;
    if (target <= 0) return undefined;
    const todayStr = getLocalDateString();
    const week = getWeekDates(selectedDateMidnight);
    const map: Record<string, number> = {};
    for (const date of week) {
      const dateStr = getLocalDateString(date);
      if (dateStr > todayStr) continue; // skip future
      const consumed = dailyMeals
        .filter((m) => {
          const loggedAt = (m as unknown as Record<string, unknown>).loggedAt;
          return typeof loggedAt === 'string' && getLocalDateString(loggedAt as string) === dateStr;
        })
        .reduce((sum, m) => sum + (m.totalCalories || 0), 0);
      map[dateStr] = Math.min(100, Math.round((consumed / target) * 100));
    }
    return map;
  }, [dailyMeals, selectedDateMidnight]);
  // Use optimized today cache when viewing today, date-filtered query otherwise
  const displayNutrition = isSelectedDateToday ? storeNutrition : selectedDateNutrition;
  // SSOT fix: nutritionStore.getTodaysConsumedNutrition() is the single source
  // for all today's calories. It aggregates:
  //   (a) completed weekly-plan meals via mealProgress
  //   (b) manually-logged daily meals hydrated into dailyMeals from meal_logs
  // We no longer fall back to a separate Supabase dailyNutrition fetch because
  // that fetch and the store fetch target the same meal_logs table \u2014 merging them
  // caused different calorie numbers on different screens.
  const currentNutrition = {
    calories: displayNutrition.calories,
    protein: displayNutrition.protein,
    carbs: displayNutrition.carbs,
    fat: displayNutrition.fat,
    fiber: displayNutrition.fiber,
    sugar: displayNutrition.sugar,
    mealsCount: dailyNutrition?.mealsCount ?? todaysConsumedMeals.length,
  };

  const macroTargets = getMacroTargets();
  // 0 when target not set â€” CompactDietCard renders the ring/pills against
  // these targets; a zero target shows an empty ring (no fabricated fallback).
  const calorieTarget = getCalorieTarget() || 0;

  const nutritionTargets = {
    calories: {
      current: currentNutrition.calories,
      target: calorieTarget,
    },
    protein: {
      current: currentNutrition.protein,
      target: macroTargets.protein ?? 0,
    },
    carbs: {
      current: currentNutrition.carbs,
      target: macroTargets.carbs ?? 0,
    },
    fat: {
      current: currentNutrition.fat,
      target: macroTargets.fat ?? 0,
    },
    fiber: {
      current: currentNutrition.fiber,
      // Prefer the onboarding-calculated value (advancedReview.daily_fiber_g).
      // Runtime fallback mirrors the architecture-doc formula (calories/1000 × 14)
      // so a partial profile still shows a reasonable fiber target instead of 0.
      target:
        calculatedMetrics?.dailyFiberG ??
        (calorieTarget ? Math.round((calorieTarget / 1000) * 14) : 0),
    },
    sugar: {
      current: currentNutrition.sugar,
      target: Math.round((calorieTarget * 0.1) / 4) || 0, // 10% of daily calories from sugar (WHO guideline), personalized
    },
  };

  const mealSchedule = React.useMemo(() => {
    return calculateMealSchedule(
      userProfile?.personalInfo?.wake_time,
      userProfile?.personalInfo?.sleep_time
    );
  }, [userProfile?.personalInfo?.wake_time, userProfile?.personalInfo?.sleep_time]);

  const onGenerateWeeklyPlan = useCallback(
    () => generateWeeklyMealPlan(setShowGuestSignUp),
    [generateWeeklyMealPlan]
  );
  const onHandleCameraCapture = useCallback(
    (uri: string) => handleCameraCapture(uri, setShowGuestSignUp),
    [handleCameraCapture]
  );
  const onHandleLabelCapture = useCallback(
    (uri: string) => handleLabelCameraCapture(uri),
    [handleLabelCameraCapture]
  );
  const onHandleLabelLibraryPick = useCallback(
    () => handleLabelLibraryPick(),
    [handleLabelLibraryPick]
  );
  const logMealCameraScanActiveRef = useRef(false);
  const logMealLabelReviewActiveRef = useRef(false);

  const onHandleAddProductToMeal = useCallback(
    async (product: any, grams: number) => {
      logMealLabelReviewActiveRef.current = false;
      await handleAddProductToMeal(product, setShowGuestSignUp, grams);
    },
    [handleAddProductToMeal]
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
    async (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
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
        'log_meal_label'
      );
      if (!started) {
        logMealCameraScanActiveRef.current = false;
        logMealLabelReviewActiveRef.current = false;
        setShowLogMealModal(true);
      }
    },
    [handleLabelScanned, setLogMealScanCallback, setSelectedMealType, setShowGuestSignUp]
  );

  const handleLogMealBarcodeScan = useCallback(() => {
    setShowLogMealModal(false);
    logMealCameraScanActiveRef.current = true;
    setLogMealScanCallback((result) => {
      logMealCameraScanActiveRef.current = false;
      setLogMealScanResult(result);
      setShowLogMealModal(true);
    });
    handleScanProduct('log_meal_barcode');
  }, [setLogMealScanCallback, handleScanProduct]);

  // --- useCallback: child component prop callbacks ---
  const handleGuestBack = useCallback(() => setShowGuestSignUp(false), []);
  const handleGuestSignUpSuccess = useCallback(() => {
    setShowGuestSignUp(false);
    onRefresh();
  }, [onRefresh]);
  const handleShowWaterIntake = useCallback(
    () => setShowWaterIntakeModal(true),
    [setShowWaterIntakeModal]
  );
  // Meal row tap from the dashboard timeline — opens the meal-detail overlay.
  // showMealDetail/selectedMeal are the contract for MealDetailView.
  const handleTimelineMealPress = useCallback((meal: DayMeal) => {
    setSelectedMeal(meal);
    setShowMealDetail(true);
  }, []);
  // AG3: closes the meal-detail overlay and clears the selected meal.
  const handleMealDetailBack = useCallback(() => {
    setShowMealDetail(false);
    setSelectedMeal(null);
  }, []);
  // AG3: "Log this meal" CTA — delegates to the existing
  // completeMealPreparation flow from useMealPlanning (the same handler the
  // MealDetailModal "Mark Complete" button uses). No new logging logic here.
  const handleMealDetailLogMeal = useCallback(
    (meal: DayMeal) => {
      completeMealPreparation(meal);
    },
    [completeMealPreparation]
  );
  const handleMealDetailSwap = useCallback(
    async (meal: DayMeal) => {
      await swapMealInPlan(meal);
      setShowMealDetail(false);
      setSelectedMeal(null);
    },
    [swapMealInPlan]
  );
  const handleCloseLogMealModal = useCallback(() => setShowLogMealModal(false), []);
  const handleScanResultConsumed = useCallback(() => setLogMealScanResult(null), []);
  const handleCloseWaterIntake = useCallback(
    () => setShowWaterIntakeModal(false),
    [setShowWaterIntakeModal]
  );
  const handleCloseManualEntry = useCallback(() => setShowManualEntry(false), []);

  if (showGuestSignUp) {
    return (
      <GuestSignUpScreen onBack={handleGuestBack} onSignUpSuccess={handleGuestSignUpSuccess} />
    );
  }

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          onScroll={onDashboardScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <View style={styles.feedContent}>
            <View style={styles.topBar}>
              <View style={styles.titleGroup}>
                <Text
                  style={styles.screenTitle}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  Diet
                </Text>
                <Text style={styles.dateSubtitle}>{dateSubtitle}</Text>
              </View>
              <View style={styles.topBarRight}>
                <StreakPill />
                <AnimatedPressable
                  onPress={onGenerateWeeklyPlan}
                  disabled={isGeneratingPlan}
                  scaleValue={0.9}
                  hapticType="light"
                  accessibilityRole="button"
                  accessibilityLabel={
                    weeklyMealPlan?.meals?.length ? 'Refresh weekly plan' : 'Generate weekly plan'
                  }
                  style={styles.refreshButton}
                >
                  {isGeneratingPlan ? (
                    <AuroraSpinner size="sm" theme="primary" />
                  ) : (
                    <Ionicons name="refresh-outline" size={rf(20)} color={colors.primary} />
                  )}
                </AnimatedPressable>
              </View>
            </View>

            <WeekCalendarStrip
              selectedDate={selectedDateKey}
              dayCompletion={dayCompletion}
              onDateSelect={(dateStr) => {
                useAppStateStore.getState().setSelectedDate(dateStr);
              }}
            />

            {foodsLoading ? (
              <DashboardSkeleton showHeader={false} cardCount={3} listItemCount={3} />
            ) : foodsError ? (
              <GlassCard style={styles.errorCard} elevation={1} padding="md">
                <Text style={styles.errorText}>
                  {typeof foodsError === 'string'
                    ? foodsError
                    : ((foodsError as any)?.message ?? 'Failed to load nutrition data')}
                </Text>
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
                <Text style={styles.errorText}>Please sign in to track your nutrition</Text>
              </GlassCard>
            )}

            {aiError && !isGeneratingPlan ? (
              <GlassCard style={styles.errorCard} elevation={1} padding="md">
                <View style={styles.errorBannerRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={rf(22)}
                    color={colors.error}
                    style={styles.errorBannerIcon}
                  />
                  <Text style={styles.errorText}>
                    {typeof aiError === 'string'
                      ? aiError
                      : 'Failed to generate meal plan. Please try again.'}
                  </Text>
                </View>
                <Button
                  title="Retry Generation"
                  onPress={() => onGenerateWeeklyPlan()}
                  variant="primary"
                  size="sm"
                />
              </GlassCard>
            ) : null}

            <ConcentricRings
              calories={nutritionTargets.calories}
              protein={nutritionTargets.protein}
              carbs={nutritionTargets.carbs}
              fat={nutritionTargets.fat}
            />

            <MealsTimeline
              meals={todaysMeals}
              mealSchedule={mealSchedule}
              mealProgress={mealProgress}
              selectedDate={selectedDateKey}
              onMealPress={handleTimelineMealPress}
              onGeneratePlan={onGenerateWeeklyPlan}
              isGeneratingPlan={isGeneratingPlan}
              title={mealsTimelineTitle}
            />

            <WaterQuickRow
              intakeML={waterIntakeML || 0}
              goalML={waterGoalML ?? 0}
              onAddWater={hydrationAddWater}
              onOpenDetails={handleShowWaterIntake}
            />

            {/* Offline-DB download prompt — kept off the top so the hero rings
                + meals are the first thing a user sees. Sits quietly at the
                bottom of the feed; dismissable. */}
            <DatabaseDownloadBanner />
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
            healthAssessment={productHealthAssessment ?? undefined}
            onAddToMeal={onHandleAddProductToMeal}
          />
        )}

        {isProcessingBarcode && !showCamera && (
          <View style={styles.barcodeLoadingOverlay}>
            <View style={styles.barcodeLoadingCard}>
              <AuroraSpinner size="lg" />
              <Text style={styles.barcodeLoadingText}>
                {cameraMode === 'label' ? 'Reading nutrition label...' : 'Looking up product...'}
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
                  navigation?.navigate('ContributeFood', { barcode });
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
            goalML={waterGoalML ?? 0}
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
                  accessibilityRole="button"
                  accessibilityLabel="Scan Barcode"
                >
                  <Ionicons name="barcode-outline" size={rf(22)} color={colors.teal} />
                  <Text style={styles.optionText}>Scan Barcode</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  style={styles.optionButton}
                  onPress={() => {
                    setShowBarcodeOptions(false);
                    setShowManualEntry(true);
                  }}
                  scaleValue={0.96}
                  accessibilityRole="button"
                  accessibilityLabel="Enter barcode manually"
                >
                  <Ionicons name="keypad-outline" size={rf(22)} color={colors.text} />
                  <Text style={styles.optionText}>Enter Manually</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  style={[styles.optionButton, styles.optionButtonCancel]}
                  onPress={() => setShowBarcodeOptions(false)}
                  scaleValue={0.96}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
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
              setLabelScanGramsInput('');
            }}
          >
            <View style={styles.optionsOverlay}>
              <View style={styles.optionsSheet}>
                <Text style={styles.optionsTitle}>Scan Nutrition Label</Text>
                <Text style={styles.optionsSubtitle}>
                  Enter the serving size you are eating for exact nutrient calculation
                </Text>
                <View style={styles.labelGramsContainer}>
                  <Text style={styles.labelGramsLabel}>Serving size (optional)</Text>
                  <View style={styles.labelGramsRow}>
                    <TextInput
                      style={styles.labelGramsInputField}
                      value={labelScanGramsInput}
                      onChangeText={setLabelScanGramsInput}
                      placeholder="grams"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      maxLength={4}
                      returnKeyType="done"
                      accessibilityLabel="Serving size in grams"
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
                    setLabelScanGramsInput('');
                    void handleLabelScanned(setShowGuestSignUp, portionG);
                  }}
                  scaleValue={0.96}
                  accessibilityRole="button"
                  accessibilityLabel="Scan Label"
                >
                  <Ionicons name="document-text-outline" size={rf(22)} color={colors.purple} />
                  <Text style={styles.optionText}>Scan Label</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  style={[styles.optionButton, styles.optionButtonCancel]}
                  onPress={() => {
                    setShowLabelScanPrep(false);
                    setLabelScanGramsInput('');
                  }}
                  scaleValue={0.96}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
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
              setPhotoWeightInput('');
            }}
          >
            <View style={styles.optionsOverlay}>
              <View style={styles.optionsSheet}>
                <Text style={styles.optionsTitle}>Scan Food</Text>
                <Text style={styles.optionsSubtitle}>
                  Enter the weight of your portion for more accurate calorie tracking
                </Text>
                <View style={styles.labelGramsContainer}>
                  <Text style={styles.labelGramsLabel}>Portion weight (optional)</Text>
                  <View style={styles.labelGramsRow}>
                    <TextInput
                      style={styles.labelGramsInputField}
                      value={photoWeightInput}
                      onChangeText={setPhotoWeightInput}
                      placeholder="grams"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      maxLength={4}
                      returnKeyType="done"
                      autoFocus
                      accessibilityLabel="Portion weight in grams"
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
                    const portionG = !isNaN(grams) && grams > 0 ? grams : undefined;
                    setPhotoWeightInput('');
                    confirmPhotoRecognition(portionG);
                  }}
                  scaleValue={0.96}
                  accessibilityRole="button"
                  accessibilityLabel="Recognise Food"
                >
                  <Ionicons name="camera-outline" size={rf(22)} color={colors.teal} />
                  <Text style={styles.optionText}>Recognise Food</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  style={[styles.optionButton, styles.optionButtonCancel]}
                  onPress={() => {
                    dismissWeightPrompt();
                    setPhotoWeightInput('');
                  }}
                  scaleValue={0.96}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
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

        {isGeneratingMeal && !showScanResult && <FoodScanLoadingOverlay visible={true} />}

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

        {/* Meal-detail overlay — opens when a timeline meal row is tapped
            (selectedMeal + showMealDetail). Renders the full meal detail card
            with macros, food items, and a "Log this meal" CTA that delegates to
            the existing completeMealPreparation flow. */}
        {showMealDetail && selectedMeal ? (
          <View style={styles.mealDetailOverlay}>
            <MealDetailView
              meal={selectedMeal}
              isCompleted={(storeGetMealProgress(selectedMeal.id)?.progress ?? 0) >= 100}
              progress={storeGetMealProgress(selectedMeal.id)?.progress ?? 0}
              onBack={handleMealDetailBack}
              onLogMeal={handleMealDetailLogMeal}
              onSwapMeal={handleMealDetailSwap}
              mealSchedule={mealSchedule}
              selectedDate={selectedDateKey}
              testID="diet-meal-detail-view"
            />
          </View>
        ) : null}
      </SafeAreaView>

      <DietActionDock
        onScan={handleScanFood}
        onBarcode={() => setShowBarcodeOptions(true)}
        onLabel={() => setShowLabelScanPrep(true)}
        onLog={handleSearchFood}
        onWater={handleShowWaterIntake}
        onRecipes={() => setShowCreateRecipe(true)}
        hide={dockHide}
      />
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  // Vertical rhythm between the dashboard sections (rings, calendar, timeline,
  // water, banner) so the feed breathes instead of stacking cluttered.
  feedContent: {
    gap: spacing.md,
    paddingBottom: rh(140), // clear the floating dock + tab bar
  },
  topBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  screenTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700' as const,
    color: colors.text,
  },
  titleGroup: {
    flex: 1 as const,
    marginRight: spacing.sm,
  },
  dateSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  topBarRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  refreshButton: {
    width: Math.max(rw(36), 36),
    height: Math.max(rw(36), 36),
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  errorCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
    flex: 1,
  },
  errorBannerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    width: '100%' as const,
    marginBottom: spacing.sm,
  },
  errorBannerIcon: {
    marginRight: spacing.sm,
  },
  // meal-detail overlay — full-screen detail card over the dashboard.
  mealDetailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 200,
  },
  bottomSpacing: { height: rh(120) },
  barcodeLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  barcodeLoadingCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  barcodeLoadingText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500' as const,
  },
  manualEntryOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
  },
  // Barcode/Label options modals
  optionsOverlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: 'flex-end' as const,
  },
  optionsSheet: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: rp(32),
    gap: spacing.sm,
  },
  optionsTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  optionsSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  optionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 44,
  },
  optionText: {
    fontSize: fontSize.md,
    fontWeight: '600' as const,
    color: colors.text,
  },
  optionButtonCancel: {
    backgroundColor: 'transparent' as const,
    justifyContent: 'center' as const,
    marginTop: spacing.xs,
  },
  optionCancelText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    flex: 1,
  },
  // Label scan grams input
  labelGramsContainer: {
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM),
    marginBottom: spacing.sm,
  },
  labelGramsLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  labelGramsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  labelGramsInputField: {
    width: rw(90),
    height: Math.max(rh(40), 44),
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingHorizontal: rp(12),
    fontSize: fontSize.md,
    fontWeight: '600' as const,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center' as const,
  },
  labelGramsUnit: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600' as const,
  },
  labelGramsHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
