import React, { startTransition, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, BackHandler, Platform, Linking } from 'react-native';
import { rf, rh, rw } from '../../utils/responsive';
import { TabBar } from './TabBar';
import { crossPlatformAlert } from '../../utils/crossPlatformAlert';
import { HomeIcon, FitnessIcon, DietIcon, ProfileIcon, AnalyticsIcon } from '../icons/TabIcons';
import { HomeScreen } from '../../screens/main/HomeScreen';
import { FitnessScreen } from '../../screens/main/FitnessScreen';
import { DietScreen } from '../../screens/main/DietScreen';
import { ProgressScreen } from '../../screens/main/ProgressScreen';
import { ProgressTrendsScreen } from '../../screens/main/ProgressTrendsScreen';
import { AchievementsScreen } from '../../screens/main/AchievementsScreen';
import { ProfileScreen } from '../../screens/main/ProfileScreen';
import AnalyticsScreen from '../../screens/main/AnalyticsScreen';
import { WorkoutSessionScreen } from '../../screens/workout/WorkoutSessionScreen';
import { MealSession } from '../../screens/session/MealSession';
import CookingSessionScreen from '../../screens/cooking/CookingSessionScreen';
import { OnboardingContainer } from '../../screens/onboarding/OnboardingContainer';
import { ContributeFood } from '../../screens/ContributeFood';
import TemplateLibraryScreen from '../../screens/workouts/TemplateLibraryScreen';
import CreateWorkoutScreen from '../../screens/workouts/CreateWorkoutScreen';
import ExerciseHistoryScreen from '../../screens/workouts/ExerciseHistoryScreen';
import ScheduleBuilderScreen from '../../screens/workouts/ScheduleBuilderScreen';
import WeeklyBuilderScreen from '../../screens/workouts/WeeklyBuilderScreen';
import { BuildMethodLandingScreen } from '../../screens/workouts/BuildMethodLandingScreen';
import { WorkoutDetailScreen } from '../../screens/workouts/WorkoutDetailScreen';
import { FullPlanScreen } from '../../screens/workouts/FullPlanScreen';
import { WorkoutHistoryScreen } from '../../screens/workouts/WorkoutHistoryScreen';
import { flatColors as colors } from '../../theme/aurora-tokens';
import { DayWorkout, DayMeal } from '../../types/ai';
import type { WorkoutTemplate } from '../../services/workoutTemplateService';
import { useAppConfig } from '../../hooks/useAppConfig';
import { ScreenErrorBoundary } from '../errors/ScreenErrorBoundary';
import { isTemplateLink, parseTemplateLink } from '../../services/templateShareService';
import { exerciseHistoryOverlayFlag } from '../../navigation/exerciseHistoryOverlayFlag';

type MainTabKey = 'home' | 'fitness' | 'diet' | 'profile' | 'analytics';

// Linking.getInitialURL() reflects the process's original launch intent and
// keeps returning the same value for the life of the app process (it is not
// cleared after first read). MainNavigation itself can mount/unmount within a
// single process (e.g. sign-out then sign-in without killing the app), so a
// per-instance ref isn't enough — this must be module-level to prevent a
// remount from re-opening an already-handled template-share deep link and
// silently clobbering whatever the user is currently doing.
let hasConsumedInitialURL = false;

const DEFAULT_TAB: MainTabKey = 'home';
const isMainTabKey = (value: string): value is MainTabKey =>
  value === 'home' ||
  value === 'fitness' ||
  value === 'diet' ||
  value === 'profile' ||
  value === 'analytics';

interface MainNavigationProps {
  initialTab?: string;
  /**
   * Optional route params to seed the initial tab with — e.g. when a
   * notification tap should deep-link into the Diet water modal:
   * `{ openWaterModal: true }`. Only applied to the initial tab; subsequent
   * tab switches use the normal navigate(params) flow.
   */
  initialTabParams?: Record<string, unknown>;
}

export const MainNavigation: React.FC<MainNavigationProps> = ({
  initialTab = 'home',
  initialTabParams,
}) => {
  const { config: appConfig } = useAppConfig();
  const initialResolvedTab = isMainTabKey(initialTab) ? initialTab : DEFAULT_TAB;
  const [activeTab, setActiveTab] = useState<MainTabKey>(initialResolvedTab);

  const [mountedTabs, setMountedTabs] = useState<Record<MainTabKey, boolean>>({
    home: initialResolvedTab === 'home',
    fitness: initialResolvedTab === 'fitness',
    diet: initialResolvedTab === 'diet',
    profile: initialResolvedTab === 'profile',
    analytics: initialResolvedTab === 'analytics',
  });
  // Seed the initial tab's params so notification-tap deep links (e.g.
  // openWaterModal) reach the target screen on first render. Other tabs start
  // with no params and receive them via navigation.navigate().
  const [tabParams, setTabParams] = useState<Partial<Record<MainTabKey, any>>>(
    initialTabParams ? { [initialResolvedTab]: initialTabParams } : {}
  );
  const [workoutSession, setWorkoutSession] = useState<{
    isActive: boolean;
    workout?: DayWorkout;
    sessionId?: string;
    resumeExerciseIndex?: number;
    isExtra?: boolean;
  }>({ isActive: false });

  const [mealSession, setMealSession] = useState<{
    isActive: boolean;
    meal?: DayMeal;
  }>({ isActive: false });

  const [cookingSession, setCookingSession] = useState<{
    isActive: boolean;
    meal?: DayMeal;
  }>({ isActive: false });

  // NEW: Onboarding edit session state
  const [onboardingEditSession, setOnboardingEditSession] = useState<{
    isActive: boolean;
    editMode?: boolean;
    initialTab?: number;
    onEditComplete?: () => void;
    onEditCancel?: () => void;
  }>({ isActive: false });

  // NEW: Progress screen session state
  const [progressSession, setProgressSession] = useState<{
    isActive: boolean;
  }>({ isActive: false });

  // NEW: ProgressTrends screen session state
  const [progressTrendsSession, setProgressTrendsSession] = useState<{
    isActive: boolean;
  }>({ isActive: false });

  // NEW: Achievements screen session state
  const [achievementsSession, setAchievementsSession] = useState<{
    isActive: boolean;
  }>({ isActive: false });

  // ContributeFood session state
  const [contributeFoodSession, setContributeFoodSession] = useState<{
    isActive: boolean;
    barcode?: string;
  }>({ isActive: false });

  // Template Library overlay state. `initialTab` lets callers (e.g.
  // BuildMethodLandingScreen's "Import Community" row) open the library
  // directly on a specific tab instead of always landing on "mine".
  const [templateLibrarySession, setTemplateLibrarySession] = useState<{
    isActive: boolean;
    initialTab?: string;
  }>({ isActive: false });

  // Create Workout overlay state
  const [createWorkoutSession, setCreateWorkoutSession] = useState<{
    isActive: boolean;
    templateId?: string;
  }>({ isActive: false });

  // Exercise History overlay state
  const [exerciseHistorySession, setExerciseHistorySession] = useState<{
    isActive: boolean;
    exerciseId?: string;
    exerciseName?: string;
  }>({ isActive: false });

  // Schedule Builder overlay state
  const [scheduleBuilderSession, setScheduleBuilderSession] = useState<{
    isActive: boolean;
  }>({ isActive: false });

  // Weekly Builder overlay state (Phase 3 — new premium schedule builder;
  // replaces ScheduleBuilder for the "Build From Scratch" path. The old
  // ScheduleBuilderSession stays for safety until Phase 8 cleanup.)
  const [weeklyBuilderSession, setWeeklyBuilderSession] = useState<{
    isActive: boolean;
    sourceTemplate?: WorkoutTemplate;
  }>({ isActive: false });

  // Build Method Landing overlay state (Phase 2 — 4-option build entry)
  const [buildMethodLandingSession, setBuildMethodLandingSession] = useState<{
    isActive: boolean;
  }>({ isActive: false });

  // Workout Detail overlay state (Phase 8 — replaces the WorkoutDetailsDialog
  // modal with a full screen). Carries the DayWorkout + optional editor wiring.
  const [workoutDetailSession, setWorkoutDetailSession] = useState<{
    isActive: boolean;
    workout?: DayWorkout;
    dayIndex?: number;
  }>({ isActive: false });

  // Template deep-link import session (Phase 10). When an incoming
  // fitai://template/{id} link arrives (cold start OR runtime), we open the
  // TemplateLibraryScreen and pass the linked templateId so it can be fetched
  // + presented in the TemplateDetailSheet for the user to fork.
  const [templateShareSession, setTemplateShareSession] = useState<{
    isActive: boolean;
    templateId?: string;
  }>({ isActive: false });

  // Full Plan + Workout History overlay screens (audit #2/#3 — previously the
  // "View All" and "See all N workouts" CTAs opened a plain Alert). Pure
  // presentational; both read from the fitness store directly.
  const [fullPlanSession, setFullPlanSession] = useState<{
    isActive: boolean;
  }>({ isActive: false });
  const [workoutHistorySession, setWorkoutHistorySession] = useState<{
    isActive: boolean;
  }>({ isActive: false });
  const ensureTabMounted = (tab: MainTabKey) => {
    setMountedTabs((prev) => (prev[tab] ? prev : { ...prev, [tab]: true }));
  };
  const clearTransientScreens = () => {
    setWorkoutSession({ isActive: false, resumeExerciseIndex: undefined });
    setMealSession({ isActive: false });
    setCookingSession({ isActive: false });
    setOnboardingEditSession({ isActive: false });
    setProgressSession({ isActive: false });
    setProgressTrendsSession({ isActive: false });
    setAchievementsSession({ isActive: false });
    setContributeFoodSession({ isActive: false });
    setTemplateLibrarySession({ isActive: false });
    setCreateWorkoutSession({ isActive: false });
    setExerciseHistorySession({ isActive: false });
    setScheduleBuilderSession({ isActive: false });
    setWeeklyBuilderSession({ isActive: false });
    setBuildMethodLandingSession({ isActive: false });
    setWorkoutDetailSession({ isActive: false });
    setTemplateShareSession({ isActive: false });
    setFullPlanSession({ isActive: false });
    setWorkoutHistorySession({ isActive: false });
  };
  const resolveTabKey = (screen: string): MainTabKey | null => {
    switch (screen) {
      case 'Home':
        return 'home';
      case 'Workout':
      case 'Fitness':
        return 'fitness';
      case 'Diet':
        return 'diet';
      case 'Profile':
        return 'profile';
      case 'Analytics':
        return 'analytics';
      default:
        return null;
    }
  };
  const normalizeSettingsScreen = (screen?: string) => {
    if (!screen) return undefined;
    return screen.trim().toLowerCase();
  };
  const transitionToTab = (tab: MainTabKey, params?: any, resetWhenParamsMissing = false) => {
    startTransition(() => {
      ensureTabMounted(tab);
      setActiveTab(tab);
      if (params !== undefined || resetWhenParamsMissing) {
        setTabParams((prev) => ({
          ...prev,
          [tab]: params,
        }));
      }
    });
  };
  // React to notification-tap deep links forwarded via props. The useState
  // initializer above seeds tabParams on cold start; this effect covers warm
  // start (app already mounted when the notification was tapped). When
  // initialTabParams is set, transition to the target tab with those params.
  useEffect(() => {
    if (!initialTabParams || !initialTab) return;
    if (!isMainTabKey(initialTab)) return;
    transitionToTab(initialTab, initialTabParams, true);
    // We intentionally depend on initialTabParams identity (App.tsx creates a
    // fresh object per tap) so repeated taps re-fire the transition.
  }, [initialTab, initialTabParams]);
  // Navigation object to pass to screens
  const navigation = {
    navigate: (screen: string, params?: any) => {
      const tabKey = resolveTabKey(screen);
      if (tabKey) {
        clearTransientScreens();
        transitionToTab(tabKey, params, true);
        return;
      }
      if (screen === 'WorkoutSession') {
        setWorkoutSession({
          isActive: true,
          workout: params.workout,
          sessionId: params.sessionId,
          resumeExerciseIndex: params.resumeExerciseIndex,
          isExtra: params.isExtra,
        });
      } else if (screen === 'MealSession') {
        setMealSession({ isActive: true, meal: params?.meal });
      } else if (screen === 'CookingSession') {
        setCookingSession({ isActive: true, meal: params?.meal });
      } else if (screen === 'OnboardingContainer') {
        setOnboardingEditSession({
          isActive: true,
          editMode: params?.editMode,
          initialTab: params?.initialTab,
          onEditComplete: params?.onEditComplete,
          onEditCancel: params?.onEditCancel,
        });
      } else if (screen === 'Progress') {
        setProgressSession({ isActive: true });
      } else if (screen === 'ProgressTrends') {
        setProgressTrendsSession({ isActive: true });
      } else if (screen === 'Achievements') {
        setAchievementsSession({ isActive: true });
      } else if (screen === 'Settings') {
        clearTransientScreens();
        startTransition(() => {
          ensureTabMounted('profile');
          setActiveTab('profile');
          setTabParams((prev) => ({
            ...prev,
            profile: {
              ...(prev.profile || {}),
              settingsScreen: normalizeSettingsScreen(params?.screen),
            },
          }));
        });
      } else if (screen === 'ContributeFood') {
        if (!appConfig.featureFoodContributions) {
          crossPlatformAlert('Feature Unavailable', 'Food contributions are currently disabled.', [
            { text: 'OK' },
          ]);
          return;
        }
        setContributeFoodSession({ isActive: true, barcode: params?.barcode });
      } else if (screen === 'TemplateLibrary') {
        setCreateWorkoutSession({ isActive: false });
        setExerciseHistorySession({ isActive: false });
        setScheduleBuilderSession({ isActive: false });
        setWeeklyBuilderSession({ isActive: false });
        setBuildMethodLandingSession({ isActive: false });
        setTemplateShareSession({ isActive: false });
        setTemplateLibrarySession({
          isActive: true,
          initialTab: params?.initialTab as string | undefined,
        });
      } else if (screen === 'CreateWorkout') {
        setTemplateLibrarySession({ isActive: false });
        setExerciseHistorySession({ isActive: false });
        setScheduleBuilderSession({ isActive: false });
        setWeeklyBuilderSession({ isActive: false });
        setBuildMethodLandingSession({ isActive: false });
        setTemplateShareSession({ isActive: false });
        setCreateWorkoutSession({
          isActive: true,
          templateId: params?.templateId,
        });
      } else if (screen === 'ExerciseHistory') {
        setTemplateLibrarySession({ isActive: false });
        setCreateWorkoutSession({ isActive: false });
        setScheduleBuilderSession({ isActive: false });
        setWeeklyBuilderSession({ isActive: false });
        setBuildMethodLandingSession({ isActive: false });
        setTemplateShareSession({ isActive: false });
        setExerciseHistorySession({
          isActive: true,
          exerciseId: params?.exerciseId,
          exerciseName: params?.exerciseName,
        });
      } else if (screen === 'ScheduleBuilder') {
        setTemplateLibrarySession({ isActive: false });
        setCreateWorkoutSession({ isActive: false });
        setExerciseHistorySession({ isActive: false });
        setWeeklyBuilderSession({ isActive: false });
        setBuildMethodLandingSession({ isActive: false });
        setTemplateShareSession({ isActive: false });
        setScheduleBuilderSession({ isActive: true });
      } else if (screen === 'WeeklyBuilder') {
        setTemplateLibrarySession({ isActive: false });
        setCreateWorkoutSession({ isActive: false });
        setExerciseHistorySession({ isActive: false });
        setScheduleBuilderSession({ isActive: false });
        setBuildMethodLandingSession({ isActive: false });
        setTemplateShareSession({ isActive: false });
        setWeeklyBuilderSession({
          isActive: true,
          sourceTemplate: params?.sourceTemplate as WorkoutTemplate | undefined,
        });
      } else if (screen === 'BuildMethodLanding') {
        setTemplateLibrarySession({ isActive: false });
        setCreateWorkoutSession({ isActive: false });
        setExerciseHistorySession({ isActive: false });
        setScheduleBuilderSession({ isActive: false });
        setWeeklyBuilderSession({ isActive: false });
        setTemplateShareSession({ isActive: false });
        setBuildMethodLandingSession({ isActive: true });
      } else if (screen === 'WorkoutDetail') {
        // Phase 8 — full-screen workout detail (replaces WorkoutDetailsDialog).
        // Additive overlay: other builder/overlay sessions are cleared so the
        // detail screen owns the surface, mirroring the scheduleBuilder pattern.
        setTemplateLibrarySession({ isActive: false });
        setCreateWorkoutSession({ isActive: false });
        setExerciseHistorySession({ isActive: false });
        setScheduleBuilderSession({ isActive: false });
        setWeeklyBuilderSession({ isActive: false });
        setBuildMethodLandingSession({ isActive: false });
        setTemplateShareSession({ isActive: false });
        setWorkoutDetailSession({
          isActive: true,
          workout: params?.workout as DayWorkout | undefined,
          dayIndex: params?.dayIndex as number | undefined,
        });
      } else if (screen === 'FullPlan') {
        setFullPlanSession({ isActive: true });
      } else if (screen === 'WorkoutHistory') {
        setWorkoutHistorySession({ isActive: true });
      }
    },
    goBack: () => {
      // If ExerciseHistory is open on top of a workout session, only close
      // the history overlay — keep the workout session alive so the user
      // returns to their in-progress workout.
      if (exerciseHistorySession.isActive && workoutSession.isActive) {
        setExerciseHistorySession({ isActive: false });
        return;
      }
      clearTransientScreens();
    },
    setParams: (params: any) => {
      const currentTab = activeTab as MainTabKey;
      setTabParams((prev) => ({
        ...prev,
        [currentTab]: {
          ...(prev[currentTab] || {}),
          ...params,
        },
      }));
    },
  };

  // Keep the shared module-level flag in sync so WorkoutSessionScreen's own
  // hardware-back listener knows to defer to MainNavigation when
  // ExerciseHistory is open on top of an active workout session. See
  // exerciseHistoryOverlayFlag.ts for why this is needed (BackHandler LIFO
  // ordering).
  useEffect(() => {
    exerciseHistoryOverlayFlag.isOpen = exerciseHistorySession.isActive && workoutSession.isActive;
    return () => {
      exerciseHistoryOverlayFlag.isOpen = false;
    };
  }, [exerciseHistorySession.isActive, workoutSession.isActive]);

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // If any session is active, go back
      if (
        workoutSession.isActive ||
        mealSession.isActive ||
        cookingSession.isActive ||
        onboardingEditSession.isActive ||
        progressSession.isActive ||
        progressTrendsSession.isActive ||
        achievementsSession.isActive ||
        contributeFoodSession.isActive ||
        templateLibrarySession.isActive ||
        createWorkoutSession.isActive ||
        exerciseHistorySession.isActive ||
        scheduleBuilderSession.isActive ||
        weeklyBuilderSession.isActive ||
        buildMethodLandingSession.isActive ||
        workoutDetailSession.isActive ||
        templateShareSession.isActive ||
        fullPlanSession.isActive ||
        workoutHistorySession.isActive
      ) {
        navigation.goBack();
        return true; // Prevent default behavior
      }

      // On root screen, show exit confirmation
      crossPlatformAlert('Exit App', 'Are you sure you want to exit?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    });

    return () => backHandler.remove();
  }, [
    workoutSession.isActive,
    mealSession.isActive,
    cookingSession.isActive,
    onboardingEditSession.isActive,
    progressSession.isActive,
    progressTrendsSession.isActive,
    achievementsSession.isActive,
    contributeFoodSession.isActive,
    templateLibrarySession.isActive,
    createWorkoutSession.isActive,
    exerciseHistorySession.isActive,
    scheduleBuilderSession.isActive,
    weeklyBuilderSession.isActive,
    buildMethodLandingSession.isActive,
    workoutDetailSession.isActive,
    templateShareSession.isActive,
    fullPlanSession.isActive,
    workoutHistorySession.isActive,
  ]);

  // Analytics tab is always enabled — no redirect needed

  useEffect(() => {
    if (!contributeFoodSession.isActive || appConfig.featureFoodContributions) {
      return;
    }

    crossPlatformAlert(
      'Feature Unavailable',
      'Food contributions were disabled while this screen was open. Returning to the previous screen.',
      [{ text: 'OK' }]
    );
    setContributeFoodSession({ isActive: false });
  }, [appConfig.featureFoodContributions, contributeFoodSession.isActive]);

  // ── Phase 10: Template deep-link handling ─────────────────────────────────
  // Listens for incoming fitai://template/{id} (or https://fitai.app/template/{id})
  // links from both cold-start (Linking.getInitialURL) and runtime
  // (Linking.addEventListener 'url'). When a template link arrives, we open the
  // TemplateLibraryScreen overlay with the linked templateId so it can be
  // fetched + presented in the TemplateDetailSheet for the user to review/fork.
  //
  // Non-template links (e.g. auth deep links owned by useAuthDeepLinks) are
  // left alone — isTemplateLink returns false for those.
  const handleTemplateDeepLink = useCallback((url: string | null) => {
    if (!url || !isTemplateLink(url)) return;
    const templateId = parseTemplateLink(url);
    if (!templateId) return;
    // Clear any other active overlay so the template library owns the surface.
    clearTransientScreens();
    setTemplateShareSession({ isActive: true, templateId });
  }, []);

  useEffect(() => {
    // Cold start: the URL that launched the app (if any). Only consume it
    // once per app process — see hasConsumedInitialURL above.
    if (!hasConsumedInitialURL) {
      hasConsumedInitialURL = true;
      Linking.getInitialURL()
        .then((url) => {
          if (url) handleTemplateDeepLink(url);
        })
        .catch((error) => {
          // Swallow — a transient getInitialURL failure must not crash on launch.
          console.error('[MainNavigation] getInitialURL failed:', error);
        });
    }

    // Runtime: links tapped while the app is open.
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleTemplateDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleTemplateDeepLink]);

  const handleHomeNavigation = (tab: string, params?: Record<string, unknown>) => {
    if (tab === 'achievements') {
      setAchievementsSession({ isActive: true });
      return;
    }

    if (tab === 'progress') {
      setProgressSession({ isActive: true });
      return;
    }

    if (tab === 'progressTrends') {
      setProgressTrendsSession({ isActive: true });
      return;
    }

    transitionToTab(tab as MainTabKey, params, params === undefined);
  };

  const hasActiveOverlay =
    workoutSession.isActive ||
    mealSession.isActive ||
    cookingSession.isActive ||
    onboardingEditSession.isActive ||
    progressSession.isActive ||
    progressTrendsSession.isActive ||
    achievementsSession.isActive ||
    contributeFoodSession.isActive ||
    templateLibrarySession.isActive ||
    createWorkoutSession.isActive ||
    exerciseHistorySession.isActive ||
    scheduleBuilderSession.isActive ||
    weeklyBuilderSession.isActive ||
    buildMethodLandingSession.isActive ||
    workoutDetailSession.isActive ||
    templateShareSession.isActive ||
    fullPlanSession.isActive ||
    workoutHistorySession.isActive;

  const tabs = [
    {
      key: 'home',
      title: 'Home',
      icon: <HomeIcon />,
      activeIcon: <HomeIcon active />,
    },
    {
      key: 'fitness',
      title: 'Workout',
      icon: <FitnessIcon />,
      activeIcon: <FitnessIcon active />,
    },
    {
      key: 'diet',
      title: 'Diet',
      icon: <DietIcon />,
      activeIcon: <DietIcon active />,
    },
    {
      key: 'profile',
      title: 'Profile',
      icon: <ProfileIcon />,
      activeIcon: <ProfileIcon active />,
    },
    {
      key: 'analytics',
      title: 'Analytics',
      icon: <AnalyticsIcon />,
      activeIcon: <AnalyticsIcon active />,
    },
  ];

  const renderTabScreen = (tab: MainTabKey, child: React.ReactNode) => {
    if (!mountedTabs[tab]) return null;

    const isVisible = activeTab === tab && !hasActiveOverlay;

    return (
      <View
        key={tab}
        style={isVisible ? styles.tabScreenActive : styles.tabScreenHidden}
        pointerEvents={isVisible ? 'auto' : 'none'}
      >
        {child}
      </View>
    );
  };

  const renderRootScreens = () => (
    <>
      {renderTabScreen(
        'home',
        <ScreenErrorBoundary screenName="HomeScreen" onReset={() => transitionToTab('home', undefined, true)}>
          <HomeScreen onNavigateToTab={handleHomeNavigation} />
        </ScreenErrorBoundary>
      )}
      {renderTabScreen(
        'fitness',
        <ScreenErrorBoundary screenName="FitnessScreen" onReset={() => transitionToTab('fitness', undefined, true)}>
          <FitnessScreen navigation={navigation} />
        </ScreenErrorBoundary>
      )}
      {renderTabScreen(
        'diet',
        <ScreenErrorBoundary screenName="DietScreen" onReset={() => transitionToTab('diet', undefined, true)}>
          <DietScreen
            navigation={navigation}
            route={{ params: tabParams.diet }}
            isActive={activeTab === 'diet' && !hasActiveOverlay}
          />
        </ScreenErrorBoundary>
      )}
      {renderTabScreen(
        'profile',
        <ScreenErrorBoundary screenName="ProfileScreen" onReset={() => transitionToTab('profile', undefined, true)}>
          <ProfileScreen navigation={navigation} route={{ params: tabParams.profile }} />
        </ScreenErrorBoundary>
      )}
      {renderTabScreen(
        'analytics',
        <ScreenErrorBoundary screenName="AnalyticsScreen" onReset={() => transitionToTab('analytics', undefined, true)}>
          <AnalyticsScreen navigation={navigation} />
        </ScreenErrorBoundary>
      )}
    </>
  );

  const renderOverlayScreen = () => {
    // Mutually exclusive if/else if chain — only one overlay renders at a time
    if (onboardingEditSession.isActive) {
      return (
        <ScreenErrorBoundary
          screenName="OnboardingContainer"
          onReset={() => {
            onboardingEditSession.onEditCancel?.();
            clearTransientScreens();
          }}
        >
          <OnboardingContainer
            editMode={onboardingEditSession.editMode}
            initialTab={onboardingEditSession.initialTab}
            onEditComplete={() => {
              onboardingEditSession.onEditComplete?.();
              navigation.goBack();
            }}
            onEditCancel={() => {
              onboardingEditSession.onEditCancel?.();
              navigation.goBack();
            }}
            onComplete={() => {
              // This won't be called in edit mode, but required prop
            }}
          />
        </ScreenErrorBoundary>
      );
    } else if (workoutSession.isActive && workoutSession.workout) {
      return (
        <ScreenErrorBoundary screenName="WorkoutSessionScreen" onReset={clearTransientScreens}>
          <WorkoutSessionScreen
            route={{
              params: {
                workout: workoutSession.workout,
                sessionId: workoutSession.sessionId,
                resumeExerciseIndex: workoutSession.resumeExerciseIndex,
                isExtra: workoutSession.isExtra,
              },
            }}
            navigation={navigation}
          />
        </ScreenErrorBoundary>
      );
    } else if (cookingSession.isActive && cookingSession.meal) {
      return (
        <ScreenErrorBoundary screenName="CookingSessionScreen" onReset={clearTransientScreens}>
          <CookingSessionScreen
            route={{
              params: {
                meal: cookingSession.meal,
              },
            }}
            navigation={navigation}
          />
        </ScreenErrorBoundary>
      );
    } else if (mealSession.isActive && mealSession.meal) {
      return (
        <ScreenErrorBoundary screenName="MealSession" onReset={clearTransientScreens}>
          <MealSession route={{ params: { meal: mealSession.meal } }} navigation={navigation} />
        </ScreenErrorBoundary>
      );
    } else if (progressSession.isActive) {
      return (
        <ScreenErrorBoundary screenName="ProgressScreen" onReset={clearTransientScreens}>
          <ProgressScreen navigation={navigation} />
        </ScreenErrorBoundary>
      );
    } else if (progressTrendsSession.isActive) {
      return (
        <ScreenErrorBoundary screenName="ProgressTrendsScreen" onReset={clearTransientScreens}>
          <ProgressTrendsScreen navigation={navigation} />
        </ScreenErrorBoundary>
      );
    } else if (achievementsSession.isActive) {
      return (
        <ScreenErrorBoundary screenName="AchievementsScreen" onReset={clearTransientScreens}>
          <AchievementsScreen navigation={navigation} />
        </ScreenErrorBoundary>
      );
    } else if (contributeFoodSession.isActive) {
      if (!appConfig.featureFoodContributions) {
        return (
          <View style={styles.unavailableContainer}>
            <Text style={styles.unavailableTitle}>Feature Unavailable</Text>
            <Text style={styles.unavailableMessage}>
              Food contributions are currently disabled by the administrator.
            </Text>
          </View>
        );
      }
      return (
        <ScreenErrorBoundary screenName="ContributeFood" onReset={clearTransientScreens}>
          <ContributeFood
            route={{ params: { barcode: contributeFoodSession.barcode ?? '' } }}
            navigation={navigation}
          />
        </ScreenErrorBoundary>
      );
    } else if (templateLibrarySession.isActive) {
      return (
        <ScreenErrorBoundary screenName="TemplateLibraryScreen" onReset={clearTransientScreens}>
          <TemplateLibraryScreen
            navigation={navigation}
            route={
              templateLibrarySession.initialTab
                ? { params: { initialTab: templateLibrarySession.initialTab } }
                : undefined
            }
          />
        </ScreenErrorBoundary>
      );
    } else if (buildMethodLandingSession.isActive) {
      return (
        <ScreenErrorBoundary screenName="BuildMethodLandingScreen" onReset={clearTransientScreens}>
          <BuildMethodLandingScreen navigation={navigation} />
        </ScreenErrorBoundary>
      );
    } else if (scheduleBuilderSession.isActive) {
      return (
        <ScreenErrorBoundary screenName="ScheduleBuilderScreen" onReset={clearTransientScreens}>
          <ScheduleBuilderScreen navigation={navigation} />
        </ScreenErrorBoundary>
      );
    } else if (weeklyBuilderSession.isActive) {
      return (
        <ScreenErrorBoundary screenName="WeeklyBuilderScreen" onReset={clearTransientScreens}>
          <WeeklyBuilderScreen
            navigation={navigation}
            sourceTemplate={weeklyBuilderSession.sourceTemplate}
          />
        </ScreenErrorBoundary>
      );
    } else if (workoutDetailSession.isActive && workoutDetailSession.workout) {
      // Phase 8 — full-screen workout detail (replaces WorkoutDetailsDialog).
      return (
        <ScreenErrorBoundary screenName="WorkoutDetailScreen" onReset={clearTransientScreens}>
          <WorkoutDetailScreen
            workout={workoutDetailSession.workout}
            dayIndex={workoutDetailSession.dayIndex ?? 0}
            navigation={navigation}
          />
        </ScreenErrorBoundary>
      );
    } else if (fullPlanSession.isActive) {
      // Full week plan view (audit #2 — "View All" previously opened an Alert).
      return (
        <ScreenErrorBoundary screenName="FullPlanScreen" onReset={clearTransientScreens}>
          <FullPlanScreen navigation={navigation} />
        </ScreenErrorBoundary>
      );
    } else if (workoutHistorySession.isActive) {
      // Full workout history (audit #3 — "See all N workouts" previously opened
      // an Alert showing a single arbitrary workout).
      return (
        <ScreenErrorBoundary screenName="WorkoutHistoryScreen" onReset={clearTransientScreens}>
          <WorkoutHistoryScreen navigation={navigation} />
        </ScreenErrorBoundary>
      );
    } else if (createWorkoutSession.isActive) {
      return (
        <ScreenErrorBoundary screenName="CreateWorkoutScreen" onReset={clearTransientScreens}>
          <CreateWorkoutScreen
            navigation={navigation}
            route={
              createWorkoutSession.templateId
                ? { params: { templateId: createWorkoutSession.templateId } }
                : undefined
            }
          />
        </ScreenErrorBoundary>
      );
    } else if (templateShareSession.isActive && templateShareSession.templateId) {
      // Phase 10 — incoming template deep link. Render the TemplateLibraryScreen
      // with the linked templateId so it can fetch the public template and open
      // the TemplateDetailSheet for the user to review / fork.
      return (
        <ScreenErrorBoundary screenName="TemplateLibraryScreen (share import)" onReset={clearTransientScreens}>
          <TemplateLibraryScreen
            navigation={navigation}
            route={{
              params: { sharedTemplateId: templateShareSession.templateId },
            }}
          />
        </ScreenErrorBoundary>
      );
    }
    // NOTE: ExerciseHistory is NOT in this else-if chain. It renders as a
    // separate top-level overlay (see the return block below) so it can
    // appear on top of an active WorkoutSessionScreen without displacing it.

    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenContainer}>
        {renderRootScreens()}
        {hasActiveOverlay ? (
          <View style={styles.overlayScreen}>{renderOverlayScreen()}</View>
        ) : null}
        {/* ExerciseHistory renders as a SECOND overlay on top of the workout
            session so the user can view history mid-workout without losing
            their session state. The renderOverlayScreen else-if chain would
            otherwise hide WorkoutSessionScreen when ExerciseHistory activates. */}
        {exerciseHistorySession.isActive && exerciseHistorySession.exerciseId ? (
          <View style={styles.overlayScreen}>
            <ScreenErrorBoundary
              screenName="ExerciseHistoryScreen"
              onReset={() => setExerciseHistorySession({ isActive: false })}
            >
              <ExerciseHistoryScreen
                route={{
                  params: {
                    exerciseId: exerciseHistorySession.exerciseId,
                    exerciseName:
                      exerciseHistorySession.exerciseName || exerciseHistorySession.exerciseId,
                  },
                }}
                navigation={navigation}
              />
            </ScreenErrorBoundary>
          </View>
        ) : null}
      </View>

      {/* Hide tab bar when any session is active */}
      {!hasActiveOverlay && (
        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabPress={(tabKey) => {
            if (!isMainTabKey(tabKey)) {
              return;
            }
            transitionToTab(tabKey, undefined, true);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  screenContainer: {
    flex: 1,
    position: 'relative',
  },
  tabScreenActive: {
    ...StyleSheet.absoluteFillObject,
  },
  tabScreenHidden: {
    ...StyleSheet.absoluteFillObject,
    display: 'none',
  },
  overlayScreen: {
    ...StyleSheet.absoluteFillObject,
  },
  unavailableContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rw(24),
    backgroundColor: colors.background,
  },
  unavailableTitle: {
    fontSize: rf(22),
    fontWeight: '700',
    color: colors.text,
    marginBottom: rh(8),
    textAlign: 'center',
  },
  unavailableMessage: {
    fontSize: rf(14),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(20),
  },
});
