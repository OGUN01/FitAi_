import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { TabBar } from './TabBar';
import { HomeIcon, FitnessIcon, DietIcon, ProgressIcon, ProfileIcon, AnalyticsIcon } from '../icons/TabIcons';
import { HomeScreen } from '../../screens/main/HomeScreen';
import { FitnessScreen } from '../../screens/main/FitnessScreen';
import { DietScreen } from '../../screens/main/DietScreen';
import { ProgressScreen } from '../../screens/main/ProgressScreen';
import { ProfileScreen } from '../../screens/main/ProfileScreen';
import AnalyticsScreen from '../../screens/main/AnalyticsScreen';
import { WorkoutSessionScreen } from '../../screens/workout/WorkoutSessionScreen';
import { MealSession } from '../../screens/session/MealSession';
import CookingSessionScreen from '../../screens/cooking/CookingSessionScreen';
import { OnboardingContainer } from '../../screens/onboarding/OnboardingContainer';
import { THEME } from '../../utils/constants';
import { ResponsiveTheme } from '../../utils/constants';
import { DayWorkout, DayMeal } from '../../types/ai';

interface MainNavigationProps {
  initialTab?: string;
}

export const MainNavigation: React.FC<MainNavigationProps> = ({ initialTab = 'home' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [workoutSession, setWorkoutSession] = useState<{
    isActive: boolean;
    workout?: DayWorkout;
    sessionId?: string;
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

  // Navigation object to pass to screens
  const navigation = {
    navigate: (screen: string, params?: any) => {
      console.log(`🧭 NAVIGATION: Navigating to ${screen}`, { params });
      if (screen === 'WorkoutSession') {
        console.log(`🧭 Setting workout session:`, {
          workout: params?.workout?.title,
          sessionId: params?.sessionId,
        });
        setWorkoutSession({
          isActive: true,
          workout: params.workout,
          sessionId: params.sessionId,
        });
      } else if (screen === 'MealSession') {
        setMealSession({ isActive: true, meal: params.meal });
      } else if (screen === 'CookingSession') {
        console.log(`🧭 Setting cooking session:`, {
          meal: params?.meal?.name,
        });
        setCookingSession({ isActive: true, meal: params.meal });
      } else if (screen === 'OnboardingContainer') {
        console.log(`🧭 Setting onboarding edit session:`, {
          editMode: params?.editMode,
          initialTab: params?.initialTab,
        });
        setOnboardingEditSession({
          isActive: true,
          editMode: params?.editMode,
          initialTab: params?.initialTab,
          onEditComplete: params?.onEditComplete,
          onEditCancel: params?.onEditCancel,
        });
      }
    },
    goBack: () => {
      console.log(`🧭 NAVIGATION: Going back from session`);
      setWorkoutSession({ isActive: false });
      setMealSession({ isActive: false });
      setCookingSession({ isActive: false });
      setOnboardingEditSession({ isActive: false });
    },
  };

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
      key: 'analytics',
      title: 'Analytics',
      icon: <AnalyticsIcon />,
      activeIcon: <AnalyticsIcon active />,
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
  ];

  const renderScreen = () => {
    // If onboarding edit session is active, show OnboardingContainer in edit mode
    if (onboardingEditSession.isActive) {
      console.log(`🧭 RENDERING: OnboardingContainer in edit mode with:`, {
        editMode: onboardingEditSession.editMode,
        initialTab: onboardingEditSession.initialTab,
      });
      return (
        <OnboardingContainer
          editMode={onboardingEditSession.editMode}
          initialTab={onboardingEditSession.initialTab}
          onEditComplete={() => {
            console.log('✅ OnboardingContainer: Edit completed');
            onboardingEditSession.onEditComplete?.();
            navigation.goBack();
          }}
          onEditCancel={() => {
            console.log('❌ OnboardingContainer: Edit cancelled');
            onboardingEditSession.onEditCancel?.();
            navigation.goBack();
          }}
          onComplete={() => {
            // This won't be called in edit mode, but required prop
            console.log('OnboardingContainer: onComplete called (should not happen in edit mode)');
          }}
        />
      );
    }

    // If workout session is active, show workout session screen
    if (workoutSession.isActive && workoutSession.workout) {
      console.log(`🧭 RENDERING: WorkoutSessionScreen with:`, {
        workoutTitle: workoutSession.workout.title,
        sessionId: workoutSession.sessionId,
        exerciseCount: workoutSession.workout.exercises?.length,
      });
      return (
        <WorkoutSessionScreen
          route={{
            params: {
              workout: workoutSession.workout,
              sessionId: workoutSession.sessionId,
            },
          }}
          navigation={navigation}
        />
      );
    }

    // If cooking session is active, show cooking session screen
    if (cookingSession.isActive && cookingSession.meal) {
      console.log(`🧭 RENDERING: CookingSessionScreen with:`, {
        mealName: cookingSession.meal.name,
        cookingInstructions: cookingSession.meal.cookingInstructions?.length,
      });
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
    }

    // If meal session is active, show meal session screen
    if (mealSession.isActive && mealSession.meal) {
      return <MealSession route={{ params: { meal: mealSession.meal } }} navigation={navigation} />;
    }

    // Otherwise show normal tab screens
    switch (activeTab) {
      case 'home':
        return <HomeScreen onNavigateToTab={setActiveTab} />;
      case 'fitness':
        return <FitnessScreen navigation={navigation} />;
      case 'analytics':
        return <AnalyticsScreen />;
      case 'diet':
        return <DietScreen navigation={navigation} isActive={activeTab === 'diet'} />;
      case 'profile':
        return <ProfileScreen navigation={navigation} />;
      default:
        return <HomeScreen onNavigateToTab={setActiveTab} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenContainer}>{renderScreen()}</View>

      {/* Hide tab bar when any session is active */}
      {!workoutSession.isActive && !mealSession.isActive && !cookingSession.isActive && !onboardingEditSession.isActive && (
        <TabBar tabs={tabs} activeTab={activeTab} onTabPress={setActiveTab} />
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
  },
});
