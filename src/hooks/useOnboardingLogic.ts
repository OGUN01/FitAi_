import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { BackHandler, Platform } from "react-native";
import { useOnboardingState } from "./useOnboardingState";
import type { OnboardingReviewData } from "../types/onboarding";
import type { TabConfig } from "../components/onboarding/OnboardingTabBar";
import { ONBOARDING_TABS } from "../components/onboarding/OnboardingTabBar";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import { calculatePersonalizedStepGoal } from "../utils/healthCalculations/calculators/stepGoalCalculator";
import { useHealthDataStore } from "../stores/healthDataStore";

// ============================================================================
// TYPES
// ============================================================================

interface OnboardingLogicProps {
  onComplete: (data: OnboardingReviewData) => void;
  onExit?: () => void;
  startingTab?: number;
  editMode?: boolean;
  initialTab?: number;
  onEditComplete?: () => void;
  onEditCancel?: () => void;
}

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export const useOnboardingLogic = ({
  onComplete,
  onExit,
  startingTab = 1,
  editMode = false,
  initialTab,
  onEditComplete,
  onEditCancel,
}: OnboardingLogicProps) => {
  // ============================================================================
  // STATE FROM useOnboardingState
  // ============================================================================
  const {
    // State
    personalInfo,
    dietPreferences,
    bodyAnalysis,
    workoutPreferences,
    advancedReview,
    currentTab,
    completedTabs,
    tabValidationStatus,
    overallCompletion,
    isLoading,
    isAutoSaving,
    hasUnsavedChanges,

    // Actions
    setCurrentTab,
    markTabCompleted,
    markTabIncomplete,
    validateTab,
    saveToLocal,
    saveToDatabase,
    completeOnboarding,
    isOnboardingComplete,
    updatePersonalInfo,
    updateDietPreferences,
    updateBodyAnalysis,
    updateWorkoutPreferences,
    updateAdvancedReview,
  } = useOnboardingState();

  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [isEditingFromReview, setIsEditingFromReview] = useState(false);
  const [previousTab, setPreviousTab] = useState<number | null>(null);
  const [completionDialog, setCompletionDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error";
    onConfirm?: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "success",
  });
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const pendingEditingReset = useRef(false);

  // Refs to stabilize data values in callbacks without causing re-creation
  const personalInfoRef = useRef(personalInfo);
  useEffect(() => { personalInfoRef.current = personalInfo; }, [personalInfo]);
  const dietPreferencesRef = useRef(dietPreferences);
  useEffect(() => { dietPreferencesRef.current = dietPreferences; }, [dietPreferences]);
  const bodyAnalysisRef = useRef(bodyAnalysis);
  useEffect(() => { bodyAnalysisRef.current = bodyAnalysis; }, [bodyAnalysis]);
  const workoutPreferencesRef = useRef(workoutPreferences);
  useEffect(() => { workoutPreferencesRef.current = workoutPreferences; }, [workoutPreferences]);
  const advancedReviewRef = useRef(advancedReview);
  useEffect(() => { advancedReviewRef.current = advancedReview; }, [advancedReview]);

  // Stable ref for saveToLocal so auto-save interval doesn't restart on identity change
  const saveToLocalRef = useRef(saveToLocal);
  useEffect(() => { saveToLocalRef.current = saveToLocal; }, [saveToLocal]);

  // Guard to prevent concurrent writes between the 30s interval and the 1s debounce in useOnboardingState
  const isSavingRef = useRef(false);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initialize starting tab
  useEffect(() => {
    const tabToShow = editMode && initialTab ? initialTab : startingTab;
    setCurrentTab(tabToShow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, initialTab, startingTab, setCurrentTab]);


  // Reset editing state
  useEffect(() => {
    let isMounted = true;
    if (pendingEditingReset.current && currentTab === 5) {
      if (isMounted) {
        pendingEditingReset.current = false;
        setIsEditingFromReview(false);
        setPreviousTab(null);
      }
    }
    return () => { isMounted = false; };
  }, [currentTab]);

  // Auto-save — saveToLocalRef prevents interval from restarting on saveToLocal identity change
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const saveInterval = setInterval(async () => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      try {
        await saveToLocalRef.current?.();
      } finally {
        isSavingRef.current = false;
      }
    }, 30000);
    return () => {
      clearInterval(saveInterval);
    };
  }, [hasUnsavedChanges]);

  // ============================================================================
  // NAVIGATION HANDLERS
  // ============================================================================

  const handleNavigateFromReview = useCallback((tabNumber: number) => {
    setPreviousTab(currentTab);
    setIsEditingFromReview(true);
    setCurrentTab(tabNumber);
  }, [currentTab, setCurrentTab]);

  const handleReturnToReview = useCallback(() => {
    setIsEditingFromReview(false);
    setPreviousTab(null);
    setCurrentTab(5);
  }, [setCurrentTab]);

  const getTabAccessibility = useCallback((tabNumber: number): boolean => {
    if (tabNumber === 1) return true;
    return (
      completedTabs.has(tabNumber - 1) ||
      tabNumber === currentTab ||
      completedTabs.has(tabNumber)
    );
  }, [completedTabs, currentTab]);

  const tabConfigs = useMemo((): TabConfig[] => {
    return ONBOARDING_TABS.map((tab) => ({
      ...tab,
      isCompleted: completedTabs.has(tab.id),
      isAccessible: getTabAccessibility(tab.id),
      validationResult: tabValidationStatus[tab.id],
    }));
  }, [completedTabs, tabValidationStatus, getTabAccessibility]);

  const handleTabPress = useCallback((tabNumber: number) => {
    const isAccessible = getTabAccessibility(tabNumber);

    if (!isAccessible) {
      crossPlatformAlert(
        "Tab Not Available",
        "Please complete the previous tab before accessing this one.",
        [{ text: "OK" }],
      );
      return;
    }

    if (hasUnsavedChanges && tabNumber !== currentTab) {
      crossPlatformAlert(
        "Unsaved Changes",
        "You have unsaved changes. Do you want to save before switching tabs?",
        [
          {
            text: "Don't Save",
            style: "destructive",
            onPress: () => setCurrentTab(tabNumber),
          },
          {
            text: "Save & Continue",
            onPress: async () => {
              await saveToLocalRef.current();
              setCurrentTab(tabNumber);
            },
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
    } else {
      setCurrentTab(tabNumber);
    }
  }, [getTabAccessibility, hasUnsavedChanges, currentTab, setCurrentTab]);

  const handleNextTab = useCallback(async (currentTabData?: any) => {
    console.warn(`\n🔄 handleNextTab called — tab=${currentTab} isNavigating=${isNavigating} isSaving=${isSaving}`);

    if (isNavigating || isSaving) {
      console.warn('⛔ handleNextTab BLOCKED by isNavigating/isSaving guard');
      return;
    }

    setIsNavigating(true);

    try {
      const validation = validateTab(currentTab, currentTabData);
      console.warn(`📋 Validation tab=${currentTab}: is_valid=${validation.is_valid} errors=${JSON.stringify(validation.errors)}`);

      if (!validation.is_valid) {
        crossPlatformAlert(
          "Incomplete Information",
          `Please complete all required fields:\n\n${validation.errors.join("\n")}`,
          [{ text: "OK" }],
        );
        return;
      }

      if (editMode) {
        setIsSaving(true);
        try {
          await saveToLocalRef.current();
        } finally {
          setIsSaving(false);
        }
        markTabCompleted(currentTab);
        onEditComplete?.();
        return;
      }

      if (currentTab < 5) {
        const nextTab = currentTab + 1;
        // 💾 Immediately persist to AsyncStorage so data survives reload
        try {
          await saveToLocalRef.current();
          console.warn(`✅ [Onboarding] Tab ${currentTab} saved to local storage — moving to tab ${nextTab}`);
          markTabCompleted(currentTab);
        } catch (saveErr) {
          console.error('❌ [Onboarding] Failed to save tab data locally:', saveErr);
        }
        setCurrentTab(nextTab);
      } else {
        // Complete onboarding when on last tab
        const completionSuccess = await completeOnboarding();
        if (completionSuccess) {
          setShowCompletionModal(true);
        } else {
          console.error("❌ useOnboardingLogic: Completion failed!");
          setCompletionDialog({
            visible: true,
            title: "Error",
            message: "There was an issue completing your onboarding. Please try again.",
            type: "error",
            onConfirm: () => {
              setCompletionDialog((prev) => ({ ...prev, visible: false }));
            },
          });
        }
      }
    } finally {
      setIsNavigating(false);
    }
  }, [isNavigating, isSaving, validateTab, currentTab, markTabCompleted, editMode, onEditComplete, setCurrentTab, completeOnboarding]);

  const handlePreviousTab = useCallback(() => {
    if (editMode) {
      onEditCancel?.();
      return;
    }

    if (currentTab > 1) {
      saveToLocalRef.current?.();
      const targetTab = currentTab - 1;
      setCurrentTab(targetTab);
      // Invalidate all tabs after the target so stale completion marks are cleared
      for (let tab = targetTab + 1; tab <= 5; tab++) {
        markTabIncomplete(tab);
      }
    } else if (hasUnsavedChanges) {
      crossPlatformAlert(
        "Exit Onboarding",
        "You have unsaved changes. Are you sure you want to exit?",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Save & Exit",
            onPress: async () => {
              await saveToLocalRef.current();
              onExit?.();
            },
          },
          {
            text: "Exit Without Saving",
            style: "destructive",
            onPress: () => onExit?.(),
          },
        ],
      );
    } else {
      onExit?.();
    }
  }, [editMode, onEditCancel, currentTab, setCurrentTab, markTabIncomplete, hasUnsavedChanges, onExit]);

  // Handle hardware back button
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const backAction = () => {
      handlePreviousTab();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );
    return () => backHandler.remove();
  }, [handlePreviousTab]);

  const handleCompleteOnboarding = useCallback(async () => {
    // M8: isCalculating (Tab 5's performCalculations flag) is not accessible from this hook —
    // it lives in the AdvancedReviewTab's local state. If the user presses "Complete Setup"
    // while calculations are still running, refs here may snapshot pre-calculation values.
    // To guard against this, Tab 5 should disable the "Complete Setup" button while isCalculating=true.

    // 🔍 ONBOARDING DEBUG — "Complete Setup" button pressed (pre-save snapshot)
    if (__DEV__) {
      // H7: workoutPreferencesRef is updated via useEffect and may lag by one render cycle
      // if the user pressed "Complete Setup" immediately after a pace card selection.
      // The ref is the best available value here (no Zustand getState() for onboarding state).
      // Log a warning if the ref's weekly_weight_loss_goal is unset, which may indicate staleness.
      const liveWpFromRef = workoutPreferencesRef.current;
      if (liveWpFromRef?.weekly_weight_loss_goal === undefined || liveWpFromRef?.weekly_weight_loss_goal === null) {
        console.warn(
          '⚠️ [H7] workoutPreferencesRef.current.weekly_weight_loss_goal is',
          liveWpFromRef?.weekly_weight_loss_goal,
          '— ref may be stale (pace card selected immediately before Complete Setup pressed).',
          'completeOnboarding() reads from onboarding state directly, not from these debug refs.',
        );
      }
      const wp = liveWpFromRef;
      const ar = advancedReviewRef.current;
      const ba = bodyAnalysisRef.current;

      // Verification calculations
      const dailyDeficit = (ar?.calculated_tdee ?? 0) - (ar?.daily_calories ?? 0);
      const impliedWeeklyRateFromDeficit = (dailyDeficit * 7) / 7700;
      const weightToLose = Math.abs((ba?.current_weight_kg ?? 0) - (ba?.target_weight_kg ?? 0));
      const weeklyGoal = wp?.weekly_weight_loss_goal ?? 0;
      const impliedTimeline = weightToLose > 0 && weeklyGoal > 0
        ? Math.ceil(weightToLose / weeklyGoal)
        : 0;
      const macroCals = (ar?.daily_protein_g ?? 0) * 4 + (ar?.daily_carbs_g ?? 0) * 4 + (ar?.daily_fat_g ?? 0) * 9;
      const macroMatch = Math.abs(macroCals - (ar?.daily_calories ?? 0)) <= 50 ? '✅ MATCH' : '⚠️ MISMATCH';
      const rateMatch = Math.abs(impliedWeeklyRateFromDeficit - (ar?.weekly_weight_loss_rate ?? 0)) <= 0.05
        ? '✅ MATCH'
        : `⚠️ MISMATCH (deficit-implied: ${impliedWeeklyRateFromDeficit.toFixed(3)} vs stored: ${ar?.weekly_weight_loss_rate})`;
      const timelineMatch = impliedTimeline > 0 && impliedTimeline === ar?.estimated_timeline_weeks
        ? '✅ MATCH'
        : `⚠️ MISMATCH (goal-implied: ${impliedTimeline} wks vs stored: ${ar?.estimated_timeline_weeks} wks)`;

      // FITNESS_GOAL_MAP (mirrors aiRequestTransformers.ts mapping)
      const FITNESS_GOAL_MAP: Record<string, string> = {
        weight_loss: 'weight_loss', lose_weight: 'weight_loss',
        muscle_gain: 'muscle_gain', build_muscle: 'muscle_gain',
        maintenance: 'maintenance', maintain: 'maintenance',
        athletic_performance: 'athletic', endurance: 'endurance',
        strength: 'strength', flexibility: 'flexibility', general_fitness: 'general_fitness',
      };
      const primaryGoal = (wp?.primary_goals ?? [])[0] ?? 'not_set';
      const mappedFitnessGoal = FITNESS_GOAL_MAP[primaryGoal] ?? primaryGoal;

      console.warn(
        '\n\n🚀🚀🚀 ====================================================== 🚀🚀🚀',
        '\n🚀     COMPLETE SETUP PRESSED — PRE-SAVE SNAPSHOT              🚀',
        '\n🚀🚀🚀 ====================================================== 🚀🚀🚀',
        '\n',
        '\n====== 🎯 PACE SELECTION STATE (from workoutPreferences) ======',
        '\nweekly_weight_loss_goal :', wp?.weekly_weight_loss_goal, 'kg/wk  ← SSOT for selected pace card',
        '\nworkout_frequency/week  :', wp?.workout_frequency_per_week, 'sessions',
        '\nactivity_level          :', wp?.activity_level,
        '\nintensity               :', wp?.intensity,
        '\nworkout_types           :', wp?.workout_types,
        '\ntime_preference         :', wp?.time_preference, 'min/session',
        '\n',
        '\n====== 🔢 CALCULATION OUTPUTS (from advancedReview) ======',
        '\ncalculated_bmr          :', ar?.calculated_bmr, 'kcal/day',
        '\ncalculated_tdee         :', ar?.calculated_tdee, 'kcal/day',
        '\ndaily_calories          :', ar?.daily_calories, 'kcal/day',
        '\ndaily_protein_g         :', ar?.daily_protein_g, 'g',
        '\ndaily_carbs_g           :', ar?.daily_carbs_g, 'g',
        '\ndaily_fat_g             :', ar?.daily_fat_g, 'g',
        '\ndaily_water_ml          :', ar?.daily_water_ml, 'ml',
        '\ndaily_fiber_g           :', ar?.daily_fiber_g, 'g',
        '\nweekly_weight_loss_rate :', ar?.weekly_weight_loss_rate, 'kg/wk  ← must match weekly_weight_loss_goal',
        '\nestimated_timeline_weeks:', ar?.estimated_timeline_weeks, 'weeks',
        '\ntotal_calorie_deficit   :', ar?.total_calorie_deficit, 'kcal',
        '\nwas_rate_capped         :', ar?.was_rate_capped,
        '\ndetected_climate        :', ar?.detected_climate,
        '\nvalidation_status       :', ar?.validation_status,
        '\n',
        '\n====== ✅ VERIFICATION CHECKS ======',
        '\n[VERIFY] Daily deficit (TDEE - calories)    :', dailyDeficit.toFixed(1), 'kcal/day',
        '\n[VERIFY] Weekly rate implied by deficit      :', impliedWeeklyRateFromDeficit.toFixed(3), 'kg/wk',
        '\n[VERIFY] Rate consistency (deficit ↔ stored):', rateMatch,
        '\n[VERIFY] Weight to lose                      :', weightToLose.toFixed(2), 'kg',
        '\n[VERIFY] Timeline (goal ÷ rate)              :', impliedTimeline, 'weeks',
        '\n[VERIFY] Timeline consistency (goal ↔ stored):', timelineMatch,
        '\n[VERIFY] Macro calories sum                  :', macroCals.toFixed(0), 'kcal',
        '\n         (P:', (ar?.daily_protein_g ?? 0) * 4, '+ C:', (ar?.daily_carbs_g ?? 0) * 4, '+ F:', (ar?.daily_fat_g ?? 0) * 9, ')',
        '\n[VERIFY] Macros ↔ daily_calories             :', macroMatch,
        '\n',
        '\n====== 🏃 AI GENERATION INPUTS (what Cloudflare Workers will receive) ======',
        '\nworkoutsPerWeek         :', wp?.workout_frequency_per_week,
        '\nworkoutDuration         :', wp?.time_preference, 'min',
        '\nexperienceLevel         :', wp?.intensity,
        '\nactivityLevel           :', wp?.activity_level,
        '\nprimaryGoal (raw)       :', primaryGoal,
        '\nfitnessGoal (mapped)    :', mappedFitnessGoal,
        '\ncalorieTarget (diet AI) :', ar?.daily_calories, 'kcal  ← advancedReview.daily_calories',
        '\nrecommended_freq        :', ar?.recommended_workout_frequency,
        '\nrecommended_cardio_min  :', ar?.recommended_cardio_minutes,
        '\nrecommended_strength    :', ar?.recommended_strength_sessions,
        '\n',
        '\n🚀🚀🚀 ====================================================== 🚀🚀🚀\n',
      );
    }

    const success = await completeOnboarding();

    if (success) {
      setShowCompletionModal(true);
    } else {
      console.error("❌ useOnboardingLogic: Completion failed!");
      setCompletionDialog({
        visible: true,
        title: "Error",
        message:
          "There was an issue completing your onboarding. Please try again.",
        type: "error",
        onConfirm: () => {
          setCompletionDialog((prev) => ({ ...prev, visible: false }));
        },
      });
    }
  }, [completeOnboarding]);

  const handleCompletionGetStarted = useCallback(() => {
    setShowCompletionModal(false);

    const pi = personalInfoRef.current;
    const ba = bodyAnalysisRef.current;
    const wp = workoutPreferencesRef.current;
    const dp = dietPreferencesRef.current;
    const ar = advancedReviewRef.current;

    // Validate required data — surface error via dialog instead of throwing
    if (!pi?.age || !pi?.gender) {
      console.error("❌ useOnboardingLogic: Missing required personal info");
      setCompletionDialog({
        visible: true,
        title: "Incomplete Information",
        message: "Please complete Personal Info tab with age and gender.",
        type: "error",
        onConfirm: () => {
          setCompletionDialog((prev) => ({ ...prev, visible: false }));
        },
      });
      return;
    }

    const completeData: OnboardingReviewData = {
      personalInfo: {
        first_name: pi?.first_name || "User",
        last_name: pi?.last_name || "",
        email: pi?.email || "",
        age: pi.age,
        gender: pi.gender,
        height: ba?.height_cm || 0,
        weight: ba?.current_weight_kg || 0,
        country: pi?.country || "",
        state: pi?.state || "",
      } as any,
      fitnessGoals: {
        primary_goals: wp?.primary_goals || [],
        time_commitment: `${wp?.time_preference || wp?.session_duration_minutes || 45} minutes`,
        experience:
          wp?.intensity === "beginner"
            ? "beginner"
            : wp?.intensity === "advanced"
              ? "advanced"
              : "intermediate",
        experience_level:
          wp?.intensity === "beginner"
            ? "beginner"
            : wp?.intensity === "advanced"
              ? "advanced"
              : "intermediate",
      } as any,
      dietPreferences: {
        dietType: (dp?.diet_type || "balanced") as
          | "vegetarian"
          | "vegan"
          | "non-veg"
          | "pescatarian",
        allergies: dp?.allergies || [],
        restrictions: dp?.cuisine_preferences || [],
        calorieTarget: ar?.daily_calories || 2000,
      } as any,
      workoutPreferences: {
        location: wp?.location || "gym",
        equipment: wp?.equipment || wp?.available_equipment || [],
        workoutTypes: wp?.workout_types || [],
        timePreference: wp?.time_preference || 45,
        intensity: wp?.intensity || "intermediate",
        // Extended fields from onboarding Tab 4
        primary_goals: wp?.primary_goals || [],
        activity_level: wp?.activity_level || "sedentary",
        workout_frequency_per_week: wp?.workout_frequency_per_week || 0,
        workout_experience_years: wp?.workout_experience_years || 0,
        can_do_pushups: wp?.can_do_pushups || 0,
        can_run_minutes: wp?.can_run_minutes || 0,
        flexibility_level: wp?.flexibility_level || "fair",
        weekly_weight_loss_goal: wp?.weekly_weight_loss_goal,
        preferred_workout_times: wp?.preferred_workout_times || [],
        enjoys_cardio: wp?.enjoys_cardio ?? true,
        enjoys_strength_training: wp?.enjoys_strength_training ?? true,
        enjoys_group_classes: wp?.enjoys_group_classes ?? false,
        prefers_outdoor_activities: wp?.prefers_outdoor_activities ?? false,
        needs_motivation: wp?.needs_motivation ?? false,
        prefers_variety: wp?.prefers_variety ?? true,
      },
      bodyAnalysis: {
        photos: {},
        analysis: ba?.ai_body_type
          ? {
              bodyType: ba.ai_body_type,
              muscleMass: "Unknown",
              bodyFat:
                ba?.body_fat_percentage?.toString() || "Unknown",
              fitnessLevel: "Unknown",
              recommendations: [],
            }
          : undefined,
        // Extended fields from onboarding Tab 3
        height_cm: ba?.height_cm || 0,
        current_weight_kg: ba?.current_weight_kg || 0,
        target_weight_kg: ba?.target_weight_kg || 0,
        target_timeline_weeks: ba?.target_timeline_weeks || 12,
        body_fat_percentage: ba?.body_fat_percentage,
        waist_cm: ba?.waist_cm,
        hip_cm: ba?.hip_cm,
        chest_cm: ba?.chest_cm,
        medical_conditions: ba?.medical_conditions || [],
        medications: ba?.medications || [],
        physical_limitations: ba?.physical_limitations || [],
        pregnancy_status: ba?.pregnancy_status || false,
        breastfeeding_status: ba?.breastfeeding_status || false,
        stress_level: ba?.stress_level,
        bmi: ba?.bmi,
        bmr: ba?.bmr,
        ideal_weight_min: ba?.ideal_weight_min,
        ideal_weight_max: ba?.ideal_weight_max,
        ai_body_type: ba?.ai_body_type,
        ai_estimated_body_fat: ba?.ai_estimated_body_fat,
        ai_confidence_score: ba?.ai_confidence_score,
      },
    };

    // Calculate and set personalized step goal from onboarding data
    const personalizedStepGoal = calculatePersonalizedStepGoal({
      activityLevel: wp?.activity_level,
      primaryGoals: wp?.primary_goals,
      age: pi?.age,
      experienceLevel: wp?.intensity,
    });
    useHealthDataStore.getState().setStepsGoal(personalizedStepGoal);

    // 🔍 ONBOARDING DEBUG — FINAL COMPLETE DATA (handed to app)
    if (__DEV__) {
      const ar = advancedReviewRef.current;
      console.log(
        '\n\n🎯🎯🎯 ================================================== 🎯🎯🎯',
        '\n🎯     ONBOARDING COMPLETE — FULL DATA SNAPSHOT          🎯',
        '\n🎯🎯🎯 ================================================== 🎯🎯🎯\n',
        '\n===== 📋 PERSONAL INFO =====',
        '\nfirst_name          :', completeData.personalInfo.first_name,
        '\nlast_name           :', completeData.personalInfo.last_name,
        '\nage                 :', completeData.personalInfo.age,
        '\ngender              :', completeData.personalInfo.gender,
        '\ncountry             :', completeData.personalInfo.country,
        '\nstate               :', completeData.personalInfo.state,
        '\nwake_time           :', completeData.personalInfo.wake_time,
        '\nsleep_time          :', completeData.personalInfo.sleep_time,
        '\n\n===== 🔎 BODY ANALYSIS =====',
        '\nheight_cm           :', completeData.bodyAnalysis.height_cm,
        '\ncurrent_weight_kg   :', completeData.bodyAnalysis.current_weight_kg,
        '\ntarget_weight_kg    :', completeData.bodyAnalysis.target_weight_kg,
        '\ntarget_timeline_wks :', completeData.bodyAnalysis.target_timeline_weeks,
        '\nbody_fat_%          :', completeData.bodyAnalysis.body_fat_percentage,
        '\nwaist_cm            :', completeData.bodyAnalysis.waist_cm,
        '\nhip_cm              :', completeData.bodyAnalysis.hip_cm,
        '\nbmi                 :', completeData.bodyAnalysis.bmi,
        '\nbmr                 :', completeData.bodyAnalysis.bmr,
        '\nideal_weight_min    :', completeData.bodyAnalysis.ideal_weight_min,
        '\nideal_weight_max    :', completeData.bodyAnalysis.ideal_weight_max,
        '\nstress_level        :', completeData.bodyAnalysis.stress_level,
        '\nai_body_type        :', completeData.bodyAnalysis.ai_body_type,
        '\nai_body_fat         :', completeData.bodyAnalysis.ai_estimated_body_fat,
        '\nmedical_conditions  :', completeData.bodyAnalysis.medical_conditions,
        '\nmedications         :', completeData.bodyAnalysis.medications,
        '\nphysical_limitations:', completeData.bodyAnalysis.physical_limitations,
        '\npregnancy_status    :', completeData.bodyAnalysis.pregnancy_status,
        '\n\n===== 🥗 DIET PREFERENCES =====',
        '\ndietType            :', completeData.dietPreferences.dietType,
        '\nallergies           :', completeData.dietPreferences.allergies,
        '\ncalorieTarget       :', completeData.dietPreferences.calorieTarget,
        '\n\n===== 🏋️ WORKOUT PREFERENCES =====',
        '\nprimary_goals       :', completeData.workoutPreferences.primary_goals,
        '\nactivity_level      :', completeData.workoutPreferences.activity_level,
        '\nlocation            :', completeData.workoutPreferences.location,
        '\nworkout_types       :', completeData.workoutPreferences.workoutTypes,
        '\ntime_preference     :', completeData.workoutPreferences.timePreference,
        '\nintensity           :', completeData.workoutPreferences.intensity,
        '\nfrequency/week      :', completeData.workoutPreferences.workout_frequency_per_week,
        '\nexperience_years    :', completeData.workoutPreferences.workout_experience_years,
        '\ncan_do_pushups      :', completeData.workoutPreferences.can_do_pushups,
        '\ncan_run_minutes     :', completeData.workoutPreferences.can_run_minutes,
        '\nflexibility_level   :', completeData.workoutPreferences.flexibility_level,
        '\nweekly_loss_goal    :', completeData.workoutPreferences.weekly_weight_loss_goal,
        '\npreferred_times     :', completeData.workoutPreferences.preferred_workout_times,
        '\nenjoys_cardio       :', completeData.workoutPreferences.enjoys_cardio,
        '\nenjoys_strength     :', completeData.workoutPreferences.enjoys_strength_training,
        '\n\n===== 📊 CALCULATED REVIEW (advancedReview store) =====',
        '\ncalculated_bmr      :', ar?.calculated_bmr,
        '\ncalculated_tdee     :', ar?.calculated_tdee,
        '\ndaily_calories      :', ar?.daily_calories,
        '\ndaily_protein_g     :', ar?.daily_protein_g,
        '\ndaily_carbs_g       :', ar?.daily_carbs_g,
        '\ndaily_fat_g         :', ar?.daily_fat_g,
        '\ndaily_water_ml      :', ar?.daily_water_ml,
        '\ndaily_fiber_g       :', ar?.daily_fiber_g,
        '\nweekly_loss_rate    :', ar?.weekly_weight_loss_rate,
        '\nestimated_weeks     :', ar?.estimated_timeline_weeks,
        '\noverall_health_score:', ar?.overall_health_score,
        '\nvalidation_status   :', ar?.validation_status,
        '\ndetected_climate    :', ar?.detected_climate,
        '\n\n🎯🎯🎯 ================================================== 🎯🎯🎯\n'
      );
    }

    onComplete(completeData);
  }, [onComplete]);


  const handleDismissDialog = useCallback(() => {
    setCompletionDialog((prev) => ({ ...prev, visible: false }));
  }, []);

  // ============================================================================
  // RETURN
  // RETURN
  // ============================================================================

  return {
    // State
    personalInfo,
    dietPreferences,
    bodyAnalysis,
    workoutPreferences,
    advancedReview,
    currentTab,
    completedTabs,
    tabValidationStatus,
    overallCompletion,
    isLoading,
    isAutoSaving,
    hasUnsavedChanges,
    showProgressModal,
    isEditingFromReview,
    previousTab,
    completionDialog,
    showCompletionModal,
    isNavigating,
    isSaving,
    pendingEditingReset,

    // Actions
    setCurrentTab,
    markTabCompleted,
    markTabIncomplete,
    validateTab,
    saveToLocal,
    saveToDatabase,
    completeOnboarding,
    isOnboardingComplete,
    updatePersonalInfo,
    updateDietPreferences,
    updateBodyAnalysis,
    updateWorkoutPreferences,
    updateAdvancedReview,

    // Handlers
    handleNavigateFromReview,
    handleReturnToReview,
    handleTabPress,
    handleNextTab,
    handlePreviousTab,
    handleCompleteOnboarding,
    handleCompletionGetStarted,
    handleDismissDialog,
    setShowProgressModal,
    setCompletionDialog,
    setShowCompletionModal,

    // Computed
    tabConfigs,
    getTabAccessibility,
  };
};
