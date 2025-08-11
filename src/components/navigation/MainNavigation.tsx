import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { TabBar } from './TabBar';
import { HomeIcon, FitnessIcon, DietIcon, ProgressIcon, ProfileIcon } from '../icons/TabIcons';
import { HomeScreen } from '../../screens/main/HomeScreen';
import { FitnessScreen } from '../../screens/main/FitnessScreen';
import { DietScreen } from '../../screens/main/DietScreen';
import { ProgressScreen } from '../../screens/main/ProgressScreen';
import { ProfileScreen } from '../../screens/main/ProfileScreen';
import { WorkoutSessionScreen } from '../../screens/workout/WorkoutSessionScreen';
import { MealSession } from '../../screens/session/MealSession';
import { THEME } from '../../utils/constants';
import { ResponsiveTheme } from '../../utils/constants';
import { DayWorkout } from '../../ai/weeklyContentGenerator';
import { DayMeal } from '../../ai/weeklyMealGenerator';

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
      }
    },
    goBack: () => {
      console.log(`🧭 NAVIGATION: Going back from workout/meal session`);
      setWorkoutSession({ isActive: false });
      setMealSession({ isActive: false });
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
      title: 'Fitness',
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
      key: 'progress',
      title: 'Progress',
      icon: <ProgressIcon />,
      activeIcon: <ProgressIcon active />,
    },
    {
      key: 'profile',
      title: 'Profile',
      icon: <ProfileIcon />,
      activeIcon: <ProfileIcon active />,
    },
  ];

  const renderScreen = () => {
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
      case 'diet':
        return <DietScreen navigation={navigation} />;
      case 'progress':
        return <ProgressScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen onNavigateToTab={setActiveTab} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenContainer}>{renderScreen()}</View>

      {/* Hide tab bar when any session is active */}
      {!workoutSession.isActive && !mealSession.isActive && (
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
