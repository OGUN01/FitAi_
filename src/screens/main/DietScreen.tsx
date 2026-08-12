import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSharedValue } from 'react-native-reanimated';
import { AnimatedPressable } from '../../components/ui/aurora/AnimatedPressable';
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
import { GlassButton } from '../../components/ui/aurora/GlassButton';
import { useAuth } from '../../hooks/useAuth';
import { useNutritionStore, useAppStateStore, useProfileStore } from '../../stores';
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';
import { GuestSignUpScreen } from './GuestSignUpScreen';

import { MealDetailView } from '../../components/diet/MealDetailView';
import { WaterIntakeModal } from '../../components/diet/WaterIntakeModal';
import { DietOptionsSheet } from '../../components/diet/DietOptionsSheet';
import { BottomSheet } from '../../components/ui/aurora/BottomSheet';
// Diet dashboard stays summary-only; its meal timeline lives in the dedicated
// selected-day plan overlay so the home surface never duplicates meal cards.
import { DietModals } from '../../components/diet/DietModals';
import { StreakPill } from '../../components/diet/StreakPill';
import { ConcentricRings } from '../../components/diet/ConcentricRings';
import { DateStepper } from '../../components/diet/DateStepper';
import { CompactIntakeSummary } from '../../components/diet/CompactIntakeSummary';
import { TodaysPlanOverlay } from '../../components/diet/TodaysPlanOverlay';
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
import { DateFormatters } from '../../utils/formatters/dateFormatters';
import PaywallModal from '../../components/subscription/PaywallModal';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { buildLegacyProfileAdapter } from '../../utils/profileLegacyAdapter';

interface DietScreenProps {
  navigation?: any;
  route?: any;
  isActive?: boolean;
}

// Stable zero-value placeholder used when the selected-date nutrition query is
// skipped (viewing "today", where storeNutrition is the source of truth). A
// module-level constant keeps the reference stable across renders so the
// useMemo below doesn't churn.
const EMPTY_CONSUMED_NUTRITION = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  sodium: 0,
};

export const DietScreen: React.FC<DietScreenProps> = ({
  navigation,
  route,
  isActive: _isActive = true,
}) => {
  const { isAuthenticated } = useAuth();
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showLogMealModal, setShowLogMealModal] = useState(false);
  const [logMealScanResult, setLogMealScanResult] = useState<LogMealScanResult | null>(null);
  const [showMealDetail, setShowMealDetail] = useState(false);
  const [showTodaysPlan, setShowTodaysPlan] = useState(false);
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
    generateWeeklyMealPlan,
    cancelAsyncGeneration,
    forceRefresh,
    completeMealPreparation,
    swapMealInPlan,
    handleDeleteMeal,
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
  const setSelectedDate = useAppStateStore((state) => state.setSelectedDate);
  const shiftSelectedDate = useAppStateStore((state) => state.shiftSelectedDate);

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
      showTodaysPlan || showMealDetail || (isProcessingBarcode && !showCamera) || showCamera;
    dockHide.value = overlayOpen ? 1 : 0;
  }, [showTodaysPlan, showMealDetail, isProcessingBarcode, showCamera, dockHide]);

  const mealProgress = useNutritionStore((state) => state.mealProgress);
  const storeGetMealProgress = (mealId: string) => mealProgress[mealId] ?? null;
  const dailyMeals = useNutritionStore((state) => state.dailyMeals);
  const selectedDateConsumedMeals = React.useMemo(() => {
    return dailyMeals.filter(
      (meal) =>
        typeof (meal as unknown as Record<string, unknown>).loggedAt === 'string' &&
        getLocalDateString((meal as unknown as Record<string, unknown>).loggedAt as string) ===
          selectedDateKey
    );
  }, [dailyMeals, selectedDateKey]);
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

  // Stable reference so it doesn't defeat CompactIntakeSummary's React.memo
  // (an inline `() => setShowTodaysPlan(true)` prop is a new function every
  // render, failing the shallow-compare regardless of the memo).
  const handleViewTodaysPlan = useCallback(() => {
    setShowTodaysPlan(true);
  }, []);

  const handleManualProductFound = useCallback(
    (lookupResult: ProductLookupResult) => {
      setShowManualEntry(false);
      handleManualLookupResolved(lookupResult);
    },
    [handleManualLookupResolved]
  );

  const storeNutrition = getTodaysConsumedNutrition();
  const isSelectedDateToday = selectedDateKey === getLocalDateString();
  const getConsumedNutritionForDate = useNutritionStore((s) => s.getConsumedNutritionForDate);
  // Date-aware nutrition: when user swipes to a different day, show that day's
  // data. Skipped entirely when viewing today (storeNutrition is used instead
  // below) and memoized on [dailyMeals, mealProgress, selectedDateKey] so this
  // O(n) scan doesn't re-run on every render while viewing a past/future day.
  const selectedDateNutrition = useMemo(
    () =>
      isSelectedDateToday
        ? EMPTY_CONSUMED_NUTRITION
        : getConsumedNutritionForDate(selectedDateKey),
    [isSelectedDateToday, getConsumedNutritionForDate, dailyMeals, mealProgress, selectedDateKey]
  );
  // Anchor the screen with a date subtitle (Apple Fitness / Whoop pattern).
  // selectedDateKey is an ISO date ("2026-07-28"); parse at noon to avoid the
  // midnight-UTC day-shift in negative timezones.
  const selectedDateMidnight = useMemo(
    () => new Date(`${selectedDateKey}T12:00:00`),
    [selectedDateKey]
  );
  const dateSubtitle = isSelectedDateToday
    ? `Today, ${DateFormatters.short(selectedDateMidnight)}`
    : `${DateFormatters.weekdayShort(selectedDateMidnight)}, ${DateFormatters.short(selectedDateMidnight)}`;
  // Weekly plans are weekday-based, so every selected date must resolve its own
  // weekday rather than reusing the hook's today-only projection.
  const selectedWeekday = selectedDateMidnight
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase();
  const selectedDayMeals = useMemo(
    () =>
      (weeklyMealPlan?.meals ?? []).filter(
        (meal) => meal.dayOfWeek?.toLowerCase() === selectedWeekday
      ),
    [weeklyMealPlan?.meals, selectedWeekday]
  );
  // Use optimized today cache when viewing today, date-filtered query otherwise
  const displayNutrition = isSelectedDateToday ? storeNutrition : selectedDateNutrition;
  // SSOT fix: nutritionStore.getTodaysConsumedNutrition() is the single source
  // for all today's calories. It aggregates:
  //   (a) completed weekly-plan meals via mealProgress
  //   (b) manually-logged daily meals hydrated into dailyMeals from meal_logs
  // We no longer fall back to a separate Supabase dailyNutrition fetch because
  // that fetch and the store fetch target the same meal_logs table \u2014 merging them
  // caused different calorie numbers on different screens.
  // Memoized on the underlying primitives (not on displayNutrition/storeNutrition
  // object identity, which is rebuilt every render by getTodaysConsumedNutrition)
  // so this object reference is stable across renders where the actual values
  // haven't changed. ConcentricRings and CompactIntakeSummary are React.memo'd
  // and receive this object as a prop — without primitive-keyed memoization here,
  // that memo does nothing (a fresh object every render always fails the shallow
  // compare, so both components re-render on every DietScreen keystroke/state
  // change regardless of whether the actual nutrition numbers moved).
  const currentNutrition = useMemo(
    () => ({
      calories: displayNutrition.calories,
      protein: displayNutrition.protein,
      carbs: displayNutrition.carbs,
      fat: displayNutrition.fat,
      fiber: displayNutrition.fiber,
      sugar: displayNutrition.sugar,
      mealsCount: isSelectedDateToday
        ? (dailyNutrition?.mealsCount ?? selectedDateConsumedMeals.length)
        : selectedDateConsumedMeals.length,
    }),
    [
      displayNutrition.calories,
      displayNutrition.protein,
      displayNutrition.carbs,
      displayNutrition.fat,
      displayNutrition.fiber,
      displayNutrition.sugar,
      isSelectedDateToday,
      dailyNutrition?.mealsCount,
      selectedDateConsumedMeals.length,
    ]
  );

  const macroTargets = getMacroTargets();
  // 0 when target not set â€” CompactDietCard renders the ring/pills against
  // these targets; a zero target shows an empty ring (no fabricated fallback).
  const calorieTarget = getCalorieTarget() || 0;

  const nutritionTargets = useMemo(
    () => ({
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
    }),
    [currentNutrition, calorieTarget, macroTargets.protein, macroTargets.carbs, macroTargets.fat, calculatedMetrics?.dailyFiberG]
  );

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
  // Overflow menu — "Share" hands the meal summary to the OS share sheet.
  const handleMealDetailShare = useCallback((meal: DayMeal) => {
    const calories = Math.round(meal.totalCalories || 0);
    Share.share({
      message: `${meal.name || 'Meal'} — ${calories} kcal\n\nShared from FitAI`,
    }).catch((error) => {
      console.error('[DietScreen] Failed to share meal:', error);
    });
  }, []);
  // Overflow menu — "Delete Meal" removes it from the weekly plan (and its
  // log, if any) via the existing useMealPlanning.handleDeleteMeal action.
  // The confirm dialog itself lives in MealDetailView (crossPlatformAlert).
  const handleMealDetailDelete = useCallback(
    async (meal: DayMeal) => {
      const deleted = await handleDeleteMeal(meal);
      if (deleted) {
        setShowMealDetail(false);
        setSelectedMeal(null);
      }
    },
    [handleDeleteMeal]
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
                <Text
                  style={styles.dateSubtitle}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {dateSubtitle}
                </Text>
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

            <DateStepper
              selectedDate={selectedDateKey}
              onPrevious={() => shiftSelectedDate(-1)}
              onNext={() => shiftSelectedDate(1)}
              onSelectDate={setSelectedDate}
            />

            {foodsLoading ? (
              <DashboardSkeleton showHeader={false} cardCount={3} listItemCount={3} />
            ) : foodsError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>
                  {typeof foodsError === 'string'
                    ? foodsError
                    : ((foodsError as any)?.message ?? 'Failed to load nutrition data')}
                </Text>
                <GlassButton
                  label="Retry"
                  onPress={() => {
                    refreshAll().catch(console.error);
                  }}
                />
              </View>
            ) : null}
            {!foodsLoading ? (
              <>
                {!canAccessMealFeatures && (
                  <View style={styles.errorCard}>
                    <Text style={styles.errorText}>Please sign in to track your nutrition</Text>
                  </View>
                )}

                {aiError && !isGeneratingPlan ? (
                  <View style={styles.errorCard}>
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
                    <GlassButton
                      label="Retry Generation"
                      onPress={() => onGenerateWeeklyPlan()}
                      variant="primary"
                    />
                  </View>
                ) : null}

                <ConcentricRings
                  calories={nutritionTargets.calories}
                  protein={nutritionTargets.protein}
                  carbs={nutritionTargets.carbs}
                  fat={nutritionTargets.fat}
                />

                <CompactIntakeSummary
                  consumedCalories={currentNutrition.calories}
                  calorieTarget={calorieTarget}
                  mealCount={currentNutrition.mealsCount}
                  plannedMealCount={selectedDayMeals.length}
                  onLogMeal={handleSearchFood}
                  onViewPlan={handleViewTodaysPlan}
                  selectedDate={selectedDateKey}
                />

                <WaterQuickRow
                  intakeML={waterIntakeML || 0}
                  goalML={waterGoalML ?? 0}
                  onAddWater={hydrationAddWater}
                  onOpenDetails={handleShowWaterIntake}
                  isToday={isSelectedDateToday}
                />

                {/* Offline-DB download prompt — kept off the top so the hero rings
                + meals are the first thing a user sees. Sits quietly at the
                bottom of the feed; dismissable. */}
                <DatabaseDownloadBanner />
              </>
            ) : null}
          </View>
        </ScrollView>

        {(showCamera ||
          showPortionAdjustment ||
          showFeedbackModal ||
          showMealTypeSelector ||
          Boolean(asyncJob)) && (
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
            asyncJob={asyncJob}
            cancelAsyncGeneration={cancelAsyncGeneration}
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

        {/* Bottom sheet — consistent with its 3 scan-flow siblings (barcode
            options, label scan prep, weight prompt) instead of a centered
            overlay, so the "add food" flow doesn't switch presentation
            style mid-task. */}
        {showManualEntry && (
          <BottomSheet
            visible={showManualEntry}
            onClose={() => setShowManualEntry(false)}
            showCloseButton={false}
            testID="manual-barcode-entry-sheet"
          >
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
          </BottomSheet>
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
            selectedDate={selectedDateKey}
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
            isToday={isSelectedDateToday}
          />
        )}

        {/* Barcode sub-options sheet */}
        {showBarcodeOptions && (
          <DietOptionsSheet
            visible={showBarcodeOptions}
            onClose={() => setShowBarcodeOptions(false)}
            title="Barcode"
            testID="barcode-options-sheet"
          >
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
          </DietOptionsSheet>
        )}

        {/* Label scan prep sheet — portion size before scanning */}
        {showLabelScanPrep && (
          <DietOptionsSheet
            visible={showLabelScanPrep}
            onClose={() => {
              setShowLabelScanPrep(false);
              setLabelScanGramsInput('');
            }}
            title="Scan Nutrition Label"
            subtitle="Enter the serving size you are eating for exact nutrient calculation"
            testID="label-scan-prep-sheet"
          >
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
          </DietOptionsSheet>
        )}

        {/* Photo weight prompt sheet — asks for optional gram weight before food recognition */}
        {showWeightPrompt && (
          <DietOptionsSheet
            visible={showWeightPrompt}
            onClose={() => {
              dismissWeightPrompt();
              setPhotoWeightInput('');
            }}
            title="Scan Food"
            subtitle="Enter the weight of your portion for more accurate calorie tracking"
            testID="weight-prompt-sheet"
          >
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
          </DietOptionsSheet>
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

        {showTodaysPlan && !showMealDetail ? (
          <TodaysPlanOverlay
            selectedDate={selectedDateKey}
            meals={selectedDayMeals}
            mealSchedule={mealSchedule}
            mealProgress={mealProgress}
            consumedCalories={currentNutrition.calories}
            calorieTarget={calorieTarget}
            mealCount={currentNutrition.mealsCount}
            isGeneratingPlan={isGeneratingPlan}
            onBack={() => setShowTodaysPlan(false)}
            onMealPress={handleTimelineMealPress}
            onLogMeal={handleSearchFood}
            onGeneratePlan={onGenerateWeeklyPlan}
          />
        ) : null}

        {/* Meal-detail overlay — back dismisses detail and reveals the plan. */}
        {showMealDetail && selectedMeal ? (
          <View style={styles.mealDetailOverlay}>
            <MealDetailView
              meal={selectedMeal}
              isCompleted={(storeGetMealProgress(selectedMeal.id)?.progress ?? 0) >= 100}
              progress={storeGetMealProgress(selectedMeal.id)?.progress ?? 0}
              onBack={handleMealDetailBack}
              onLogMeal={handleMealDetailLogMeal}
              onSwapMeal={handleMealDetailSwap}
              onShareMeal={handleMealDetailShare}
              onDeleteMeal={handleMealDetailDelete}
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
    width: Math.max(rw(44), 44),
    height: Math.max(rw(44), 44),
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  errorCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
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
  // Barcode/Label/Weight scan-flow options (rendered via DietOptionsSheet —
  // src/components/diet/DietOptionsSheet.tsx)
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
