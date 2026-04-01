import React, { startTransition, useEffect, useState } from "react";
import { View, Text, StyleSheet, BackHandler, Platform } from "react-native";
import { rf, rh, rw } from "../../utils/responsive";
import { TabBar } from "./TabBar";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import {
  HomeIcon,
  FitnessIcon,
  DietIcon,
  ProfileIcon,
  AnalyticsIcon,
} from "../icons/TabIcons";
import { HomeScreen } from "../../screens/main/HomeScreen";
import { FitnessScreen } from "../../screens/main/FitnessScreen";
import { DietScreen } from "../../screens/main/DietScreen";
import { ProgressScreen } from "../../screens/main/ProgressScreen";
import { ProgressTrendsScreen } from "../../screens/main/ProgressTrendsScreen";
import { AchievementsScreen } from "../../screens/main/AchievementsScreen";
import { ProfileScreen } from "../../screens/main/ProfileScreen";
import AnalyticsScreen from "../../screens/main/AnalyticsScreen";
import { WorkoutSessionScreen } from "../../screens/workout/WorkoutSessionScreen";
import { MealSession } from "../../screens/session/MealSession";
import CookingSessionScreen from "../../screens/cooking/CookingSessionScreen";
import { OnboardingContainer } from "../../screens/onboarding/OnboardingContainer";
import { ContributeFood } from "../../screens/ContributeFood";
import TemplateLibraryScreen from "../../screens/workouts/TemplateLibraryScreen";
import CreateWorkoutScreen from "../../screens/workouts/CreateWorkoutScreen";
import ExerciseHistoryScreen from "../../screens/workouts/ExerciseHistoryScreen";
import ScheduleBuilderScreen from "../../screens/workouts/ScheduleBuilderScreen";
import { ResponsiveTheme } from "../../utils/constants";
import { DayWorkout, DayMeal } from "../../types/ai";
import { useAppConfig } from "../../hooks/useAppConfig";

type MainTabKey = "home" | "fitness" | "diet" | "profile" | "analytics";

const DEFAULT_TAB: MainTabKey = "home";
const isMainTabKey = (value: string): value is MainTabKey =>
  value === "home" ||
  value === "fitness" ||
  value === "diet" ||
  value === "profile" ||
  value === "analytics";

interface MainNavigationProps {
  initialTab?: string;
}

export const MainNavigation: React.FC<MainNavigationProps> = ({
  initialTab = "home",
}) => {
  const { config: appConfig } = useAppConfig();
  const initialResolvedTab = isMainTabKey(initialTab)
    ? initialTab
    : DEFAULT_TAB;
  const [activeTab, setActiveTab] = useState<MainTabKey>(initialResolvedTab);

  const [mountedTabs, setMountedTabs] = useState<Record<MainTabKey, boolean>>({
    home: initialResolvedTab === "home",
    fitness: initialResolvedTab === "fitness",
    diet: initialResolvedTab === "diet",
    profile: initialResolvedTab === "profile",
    analytics: initialResolvedTab === "analytics",
  });
  const [tabParams, setTabParams] = useState<Partial<Record<MainTabKey, any>>>(
    {},
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

  // Template Library overlay state
  const [templateLibrarySession, setTemplateLibrarySession] = useState<{
    isActive: boolean;
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
  };
  const resolveTabKey = (screen: string): MainTabKey | null => {
    switch (screen) {
      case "Home":
        return "home";
      case "Workout":
      case "Fitness":
        return "fitness";
      case "Diet":
        return "diet";
      case "Profile":
        return "profile";
      case "Analytics":
        return appConfig.featureAnalytics ? "analytics" : "home";
      default:
        return null;
    }
  };
  const normalizeSettingsScreen = (screen?: string) => {
    if (!screen) return undefined;
    return screen.trim().toLowerCase();
  };
  const transitionToTab = (
    tab: MainTabKey,
    params?: any,
    resetWhenParamsMissing = false,
  ) => {
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
  // Navigation object to pass to screens
  const navigation = {
    navigate: (screen: string, params?: any) => {
      const tabKey = resolveTabKey(screen);
      if (tabKey) {
        clearTransientScreens();
        transitionToTab(tabKey, params, true);
        return;
      }
      if (screen === "WorkoutSession") {
        setWorkoutSession({
          isActive: true,
          workout: params.workout,
          sessionId: params.sessionId,
          resumeExerciseIndex: params.resumeExerciseIndex,
          isExtra: params.isExtra,
        });
      } else if (screen === "MealSession") {
        setMealSession({ isActive: true, meal: params.meal });
      } else if (screen === "CookingSession") {
        setCookingSession({ isActive: true, meal: params.meal });
      } else if (screen === "OnboardingContainer") {
        setOnboardingEditSession({
          isActive: true,
          editMode: params?.editMode,
          initialTab: params?.initialTab,
          onEditComplete: params?.onEditComplete,
          onEditCancel: params?.onEditCancel,
        });
      } else if (screen === "Progress") {
        setProgressSession({ isActive: true });
      } else if (screen === "ProgressTrends") {
        setProgressTrendsSession({ isActive: true });
      } else if (screen === "Achievements") {
        setAchievementsSession({ isActive: true });
      } else if (screen === "Settings") {
        clearTransientScreens();
        startTransition(() => {
          ensureTabMounted("profile");
          setActiveTab("profile");
          setTabParams((prev) => ({
            ...prev,
            profile: {
              ...(prev.profile || {}),
              settingsScreen: normalizeSettingsScreen(params?.screen),
            },
          }));
        });
      } else if (screen === "ContributeFood") {
        if (!appConfig.featureFoodContributions) {
          crossPlatformAlert(
            "Feature Unavailable",
            "Food contributions are currently disabled.",
            [{ text: "OK" }],
          );
          return;
        }
        setContributeFoodSession({ isActive: true, barcode: params?.barcode });
      } else if (screen === "TemplateLibrary") {
        setCreateWorkoutSession({ isActive: false });
        setExerciseHistorySession({ isActive: false });
        setScheduleBuilderSession({ isActive: false });
        setTemplateLibrarySession({ isActive: true });
      } else if (screen === "CreateWorkout") {
        setTemplateLibrarySession({ isActive: false });
        setExerciseHistorySession({ isActive: false });
        setScheduleBuilderSession({ isActive: false });
        setCreateWorkoutSession({
          isActive: true,
          templateId: params?.templateId,
        });
      } else if (screen === "ExerciseHistory") {
        setTemplateLibrarySession({ isActive: false });
        setCreateWorkoutSession({ isActive: false });
        setScheduleBuilderSession({ isActive: false });
        setExerciseHistorySession({
          isActive: true,
          exerciseId: params?.exerciseId,
          exerciseName: params?.exerciseName,
        });
      } else if (screen === "ScheduleBuilder") {
        setTemplateLibrarySession({ isActive: false });
        setCreateWorkoutSession({ isActive: false });
        setExerciseHistorySession({ isActive: false });
        setScheduleBuilderSession({ isActive: true });
      }
    },
    goBack: () => {
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

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
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
          scheduleBuilderSession.isActive
        ) {
          navigation.goBack();
          return true; // Prevent default behavior
        }

        // On root screen, show exit confirmation
        crossPlatformAlert("Exit App", "Are you sure you want to exit?", [
          { text: "Cancel", style: "cancel" },
          { text: "Exit", onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      },
    );

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
  ]);

  useEffect(() => {
    if (activeTab === "analytics" && !appConfig.featureAnalytics) {
      startTransition(() => {
        ensureTabMounted("home");
        setActiveTab("home");
      });
    }
  }, [activeTab, appConfig.featureAnalytics]);

  useEffect(() => {
    if (!contributeFoodSession.isActive || appConfig.featureFoodContributions) {
      return;
    }

    crossPlatformAlert(
      "Feature Unavailable",
      "Food contributions were disabled while this screen was open. Returning to the previous screen.",
      [{ text: "OK" }],
    );
    setContributeFoodSession({ isActive: false });
  }, [appConfig.featureFoodContributions, contributeFoodSession.isActive]);

  const handleHomeNavigation = (
    tab: string,
    params?: Record<string, unknown>,
  ) => {
    if (tab === "achievements") {
      setAchievementsSession({ isActive: true });
      return;
    }

    if (tab === "progress") {
      setProgressSession({ isActive: true });
      return;
    }

    if (tab === "progressTrends") {
      setProgressTrendsSession({ isActive: true });
      return;
    }

    if (tab === "analytics" && !appConfig.featureAnalytics) {
      crossPlatformAlert(
        "Feature Unavailable",
        "Analytics are currently disabled.",
        [{ text: "OK" }],
      );
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
    scheduleBuilderSession.isActive;

  const tabs = [
    {
      key: "home",
      title: "Home",
      icon: <HomeIcon />,
      activeIcon: <HomeIcon active />,
    },
    {
      key: "fitness",
      title: "Workout",
      icon: <FitnessIcon />,
      activeIcon: <FitnessIcon active />,
    },
    {
      key: "diet",
      title: "Diet",
      icon: <DietIcon />,
      activeIcon: <DietIcon active />,
    },
    {
      key: "profile",
      title: "Profile",
      icon: <ProfileIcon />,
      activeIcon: <ProfileIcon active />,
    },
  ].concat(
    appConfig.featureAnalytics
      ? [
          {
            key: "analytics",
            title: "Analytics",
            icon: <AnalyticsIcon />,
            activeIcon: <AnalyticsIcon active />,
          },
        ]
      : [],
  );

  const renderTabScreen = (tab: MainTabKey, child: React.ReactNode) => {
    if (!mountedTabs[tab]) return null;

    const isVisible = activeTab === tab && !hasActiveOverlay;

    return (
      <View
        key={tab}
        style={isVisible ? styles.tabScreenActive : styles.tabScreenHidden}
        pointerEvents={isVisible ? "auto" : "none"}
      >
        {child}
      </View>
    );
  };

  const renderRootScreens = () => (
    <>
      {renderTabScreen(
        "home",
        <HomeScreen onNavigateToTab={handleHomeNavigation} />,
      )}
      {renderTabScreen("fitness", <FitnessScreen navigation={navigation} />)}
      {renderTabScreen(
        "diet",
        <DietScreen
          navigation={navigation}
          route={{ params: tabParams.diet }}
          isActive={activeTab === "diet" && !hasActiveOverlay}
        />,
      )}
      {renderTabScreen(
        "profile",
        <ProfileScreen
          navigation={navigation}
          route={{ params: tabParams.profile }}
        />,
      )}
      {renderTabScreen(
        "analytics",
        appConfig.featureAnalytics ? (
          <AnalyticsScreen navigation={navigation} />
        ) : (
          <View style={styles.unavailableContainer}>
            <Text style={styles.unavailableTitle}>Feature Unavailable</Text>
            <Text style={styles.unavailableMessage}>
              Analytics are currently disabled by the administrator.
            </Text>
          </View>
        ),
      )}
    </>
  );

  const renderOverlayScreen = () => {
    // Mutually exclusive if/else if chain — only one overlay renders at a time
    if (onboardingEditSession.isActive) {
      return (
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
      );
    } else if (workoutSession.isActive && workoutSession.workout) {
      return (
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
      );
    } else if (cookingSession.isActive && cookingSession.meal) {
      return (
        <CookingSessionScreen
          route={{
            params: {
              meal: cookingSession.meal,
            },
          }}
          navigation={navigation}
        />
      );
    } else if (mealSession.isActive && mealSession.meal) {
      return (
        <MealSession
          route={{ params: { meal: mealSession.meal } }}
          navigation={navigation}
        />
      );
    } else if (progressSession.isActive) {
      return <ProgressScreen navigation={navigation} />;
    } else if (progressTrendsSession.isActive) {
      return <ProgressTrendsScreen navigation={navigation} />;
    } else if (achievementsSession.isActive) {
      return <AchievementsScreen navigation={navigation} />;
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
        <ContributeFood
          route={{ params: { barcode: contributeFoodSession.barcode ?? "" } }}
          navigation={navigation}
        />
      );
    } else if (templateLibrarySession.isActive) {
      return <TemplateLibraryScreen navigation={navigation} />;
    } else if (scheduleBuilderSession.isActive) {
      return <ScheduleBuilderScreen navigation={navigation} />;
    } else if (createWorkoutSession.isActive) {
      return (
        <CreateWorkoutScreen
          navigation={navigation}
          route={
            createWorkoutSession.templateId
              ? { params: { templateId: createWorkoutSession.templateId } }
              : undefined
          }
        />
      );
    } else if (exerciseHistorySession.isActive && exerciseHistorySession.exerciseId) {
      return (
        <ExerciseHistoryScreen
          route={{
            params: {
              exerciseId: exerciseHistorySession.exerciseId,
              exerciseName:
                exerciseHistorySession.exerciseName ||
                exerciseHistorySession.exerciseId,
            },
          }}
          navigation={navigation}
        />
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Hidden accessibility marker for guest-mode detection */}
      <View
        testID="guest-option"
        accessibilityLabel="Continue as guest"
        accessible={false}
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      />
      <View style={styles.screenContainer}>
        {renderRootScreens()}
        {hasActiveOverlay ? (
          <View style={styles.overlayScreen}>{renderOverlayScreen()}</View>
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
    backgroundColor: ResponsiveTheme.colors.background,
  },

  screenContainer: {
    flex: 1,
    position: "relative",
  },
  tabScreenActive: {
    ...StyleSheet.absoluteFillObject,
  },
  tabScreenHidden: {
    ...StyleSheet.absoluteFillObject,
    display: "none",
  },
  overlayScreen: {
    ...StyleSheet.absoluteFillObject,
  },
  unavailableContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: rw(24),
    backgroundColor: ResponsiveTheme.colors.background,
  },
  unavailableTitle: {
    fontSize: rf(22),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: rh(8),
    textAlign: "center",
  },
  unavailableMessage: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(20),
  },
});
