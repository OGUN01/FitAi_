import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Animated, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Button, THEME } from '../../components/ui';
import { CustomDialog, WorkoutStartDialog } from '../../components/ui/CustomDialog';
import { WeeklyCalendar } from '../../components/fitness/WeeklyCalendar';
import { DayWorkoutView } from '../../components/fitness/DayWorkoutView';
import { aiService } from '../../ai';
import { useUserStore } from '../../stores/userStore';
import { useFitnessStore } from '../../stores/fitnessStore';
import { useAuth } from '../../hooks/useAuth';
import { useFitnessData } from '../../hooks/useFitnessData';
import Constants from 'expo-constants';
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';
import { HeroSection } from '../../components/ui/aurora/HeroSection';
import { FeatureGrid } from '../../components/ui/aurora/FeatureGrid';
import { GlassCard } from '../../components/ui/aurora/GlassCard';
import { AnimatedPressable } from '../../components/ui/aurora/AnimatedPressable';
import { ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, toLinearGradientProps } from '../../theme/gradients';

// Simple Expo Go detection and safe loading
const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === 'storeClient' ||
  (__DEV__ && !Constants.isDevice && Constants.platform?.web !== true);

let useWorkoutReminders: any = null;
if (!isExpoGo) {
  try {
    const notificationStore = require('../../stores/notificationStore');
    useWorkoutReminders = notificationStore.useWorkoutReminders;
  } catch (error) {
    console.warn('Failed to load workout reminders:', error);
  }
}
import { DayWorkout, WeeklyWorkoutPlan } from '../../ai/weeklyContentGenerator';

interface FitnessScreenProps {
  navigation: any;
}

export const FitnessScreen: React.FC<FitnessScreenProps> = ({ navigation }) => {
  // State management
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[today.getDay()];
    console.log(`[FITNESS] Today is: ${todayName} (day ${today.getDay()})`);
    return todayName;
  });
  const [weekOffset, setWeekOffset] = useState(0);
  const [forceUpdate, setForceUpdate] = useState<number>(0); // Force re-render
  const [fadeAnim] = useState(new Animated.Value(1));
  const [showWorkoutStartDialog, setShowWorkoutStartDialog] = useState(false);

  // Micro-interaction animation refs
  const featureIcon1Scale = useRef(new Animated.Value(0)).current;
  const featureIcon2Scale = useRef(new Animated.Value(0)).current;
  const featureIcon3Scale = useRef(new Animated.Value(0)).current;
  const featureIcon4Scale = useRef(new Animated.Value(0)).current;
  const expandableCardHeight = useRef(new Animated.Value(0)).current;
  const historyCard1Opacity = useRef(new Animated.Value(0)).current;
  const historyCard1TranslateY = useRef(new Animated.Value(30)).current;
  const startButtonPulse = useRef(new Animated.Value(1)).current;
  const heroFloating = useRef(new Animated.Value(0)).current;
  const chevronRotation = useRef(new Animated.Value(0)).current;
  const [selectedWorkout, setSelectedWorkout] = useState<DayWorkout | null>(null);
  const [todaysWorkoutExpanded, setTodaysWorkoutExpanded] = useState(false);
  const [showGenerationSuccessDialog, setShowGenerationSuccessDialog] = useState(false);
  const [generationSuccessData, setGenerationSuccessData] = useState<{
    planTitle: string;
    workoutCount: number;
    duration: string;
  } | null>(null);

  // Swipe State for History Cards
  const [historySwipePositions, setHistorySwipePositions] = useState<Record<number, Animated.Value>>({});

  // Hooks
  const { user, isAuthenticated, isGuestMode } = useAuth();
  const { profile } = useUserStore();
  const { createWorkout, startWorkoutSession } = useFitnessData();
  const workoutReminders = useWorkoutReminders ? useWorkoutReminders() : null;

  // Fitness store
  const {
    weeklyWorkoutPlan: weeklyPlan,
    isGeneratingPlan,
    workoutProgress,
    setWeeklyWorkoutPlan,
    saveWeeklyWorkoutPlan,
    loadWeeklyWorkoutPlan,
    setGeneratingPlan,
    updateWorkoutProgress,
    completeWorkout,
    getWorkoutProgress,
    startWorkoutSession: startStoreWorkoutSession,
    loadData: loadFitnessData,
  } = useFitnessStore();

  // Load existing workout data on mount
  useEffect(() => {
    loadFitnessData();
  }, []);

  // Animation when changing days
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [selectedDay]);

  // Micro-interaction: Feature grid icons scale pulse on mount
  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(featureIcon1Scale, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.spring(featureIcon2Scale, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.spring(featureIcon3Scale, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.spring(featureIcon4Scale, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Micro-interaction: History cards entrance animation from bottom
  useEffect(() => {
    Animated.parallel([
      Animated.timing(historyCard1Opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(historyCard1TranslateY, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Micro-interaction: START button continuous pulse animation
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(startButtonPulse, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(startButtonPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, []);

  // Micro-interaction: Hero card floating animation (3D effect)
  useEffect(() => {
    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(heroFloating, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(heroFloating, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );
    floatingAnimation.start();
    return () => floatingAnimation.stop();
  }, []);

  // Micro-interaction: Expandable card height animation + chevron rotation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(expandableCardHeight, {
        toValue: todaysWorkoutExpanded ? 1 : 0,
        tension: 100,
        friction: 10,
        useNativeDriver: false, // height cannot use native driver
      }),
      Animated.spring(chevronRotation, {
        toValue: todaysWorkoutExpanded ? 1 : 0,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [todaysWorkoutExpanded]);

  // Generate workout data for calendar
  const getWorkoutData = () => {
    if (!weeklyPlan) return {};

    const workoutData: Record<
      string,
      { hasWorkout: boolean; isCompleted: boolean; isRestDay: boolean }
    > = {};

    // Initialize all days as rest days
    const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    allDays.forEach((day) => {
      workoutData[day] = { hasWorkout: false, isCompleted: false, isRestDay: true };
    });

    // Mark workout days
    if (weeklyPlan.workouts && Array.isArray(weeklyPlan.workouts)) {
      weeklyPlan.workouts.forEach((workout) => {
        const progress = getWorkoutProgress(workout.id);
        workoutData[workout.dayOfWeek] = {
          hasWorkout: true,
          isCompleted: progress?.progress === 100,
          isRestDay: false,
        };
      });
    }

    // Mark actual rest days
    if (weeklyPlan.restDays && Array.isArray(weeklyPlan.restDays)) {
      weeklyPlan.restDays.forEach((day) => {
        workoutData[day] = { hasWorkout: false, isCompleted: false, isRestDay: true };
      });
    }

    return workoutData;
  };

  // Get workouts for selected day
  const getWorkoutsForDay = (day: string): DayWorkout[] => {
    if (!weeklyPlan || !weeklyPlan.workouts || !Array.isArray(weeklyPlan.workouts)) return [];
    return weeklyPlan.workouts.filter((workout) => workout.dayOfWeek === day);
  };

  // Get workout progress for display
  const getDisplayWorkoutProgress = () => {
    const progressMap: Record<string, number> = {};
    Object.entries(workoutProgress).forEach(([workoutId, progress]) => {
      progressMap[workoutId] = progress.progress;
    });
    return progressMap;
  };

  // Check if selected day is a rest day
  const isRestDay = (day: string): boolean => {
    if (!weeklyPlan || !weeklyPlan.restDays || !Array.isArray(weeklyPlan.restDays)) return false;
    return weeklyPlan.restDays.includes(day);
  };

  // Schedule workout reminders based on generated plan
  const scheduleWorkoutRemindersFromPlan = async (plan: WeeklyWorkoutPlan) => {
    try {
      if (!workoutReminders?.config?.enabled) {
        console.log('[REMINDERS] Workout reminders are disabled, skipping scheduling');
        return;
      }

      // Extract workout times from the plan
      const workoutTimes: string[] = [];

      // Generate default workout times based on plan structure
      const defaultTimes = generateDefaultWorkoutTimes(plan);
      workoutTimes.push(...defaultTimes);

      // Schedule the reminders using the notification service
      if (workoutReminders) {
        await workoutReminders.scheduleFromWorkoutPlan(workoutTimes);
      }

      console.log(
        `[REMINDERS] Scheduled workout reminders for ${workoutTimes.length} workouts:`,
        workoutTimes
      );
    } catch (error) {
      console.error('[REMINDERS] Failed to schedule workout reminders:', error);
      // Don't block the main workflow if reminder scheduling fails
    }
  };

  // Generate smart default workout times based on user preferences and workout intensity
  const generateDefaultWorkoutTimes = (plan: WeeklyWorkoutPlan): string[] => {
    if (!plan.workouts) return [];

    const times: string[] = [];
    const dayMapping = {
      monday: 0,
      tuesday: 1,
      wednesday: 2,
      thursday: 3,
      friday: 4,
      saturday: 5,
      sunday: 6,
    };

    plan.workouts.forEach((workout) => {
      const dayIndex = dayMapping[workout.dayOfWeek as keyof typeof dayMapping];
      let defaultTime = '18:00'; // Default evening workout

      // Smart time assignment based on workout type and day
      if (dayIndex <= 4) {
        // Weekdays
        if (workout.category === 'cardio' || workout.category === 'hiit') {
          defaultTime = '07:00'; // Morning cardio
        } else if (workout.category === 'strength') {
          defaultTime = '18:30'; // Evening strength
        } else if (workout.category === 'yoga' || workout.category === 'flexibility') {
          defaultTime = '19:30'; // Evening relaxation
        }
      } else {
        // Weekends
        if (workout.category === 'cardio' || workout.category === 'hiit') {
          defaultTime = '09:00'; // Weekend morning
        } else {
          defaultTime = '10:00'; // Weekend mid-morning
        }
      }

      times.push(defaultTime);
    });

    return times;
  };

  // Generate weekly workout plan
  const generateWeeklyWorkoutPlan = async () => {
    if (!profile?.personalInfo || !profile?.fitnessGoals) {
      Alert.alert(
        'Profile Incomplete',
        'Please complete your profile to generate your personalized weekly workout plan.',
        [{ text: 'OK' }]
      );
      return;
    }

    setGeneratingPlan(true);

    try {
      console.log('[WORKOUT] Generating weekly workout plan...');

      const response = await aiService.generateWeeklyWorkoutPlan(
        profile.personalInfo,
        profile.fitnessGoals,
        1 // Week 1
      );

      if (response.success && response.data) {
        console.log(`[WORKOUT] Generated weekly plan: ${response.data.planTitle}`);
        console.log(`[WORKOUT] Weekly plan data:`, JSON.stringify(response.data, null, 2));
        console.log(`[WORKOUT] Workouts count: ${response.data.workouts?.length || 0}`);
        console.log(`[WORKOUT] Rest days: ${response.data.restDays?.join(', ') || 'none'}`);

        // Debug: Check data structure before saving
        console.log('[WORKOUT] Debug - Data structure validation:');
        console.log('  - planTitle:', response.data.planTitle ? 'YES' : 'NO');
        console.log('  - workouts array:', Array.isArray(response.data.workouts) ? 'YES' : 'NO');
        console.log('  - workouts length:', response.data.workouts?.length || 0);
        console.log('  - first workout:', response.data.workouts?.[0] ? 'YES' : 'NO');
        if (response.data.workouts?.[0]) {
          console.log('  - first workout dayOfWeek:', response.data.workouts[0].dayOfWeek);
          console.log(
            '  - first workout exercises:',
            response.data.workouts[0].exercises?.length || 0
          );
        }

        // CRITICAL FIX: Set state immediately and verify it takes effect
        console.log('[WORKOUT] Debug - Setting workout plan state immediately...');
        setWeeklyWorkoutPlan(response.data);

        // Force immediate re-render to ensure UI updates
        setForceUpdate((prev) => prev + 1);

        // Verify state was set correctly
        console.log('[WORKOUT] Debug - State set, verifying...', {
          planTitle: response.data.planTitle,
          workoutsCount: response.data.workouts?.length,
          firstWorkout: response.data.workouts?.[0]?.title,
        });

        // Save to store and database (async, don't block UI)
        console.log('[WORKOUT] Debug - Saving to store/database...');
        try {
          await saveWeeklyWorkoutPlan(response.data);
          console.log('[WORKOUT] Debug - Save completed successfully');

          // Schedule workout reminders automatically
          await scheduleWorkoutRemindersFromPlan(response.data);
        } catch (saveError) {
          console.error('[WORKOUT] Debug - Save failed (but UI state is set):', saveError);
        }

        // Final verification with timeout to check React state update
        setTimeout(() => {
          const currentState = useFitnessStore.getState().weeklyWorkoutPlan;
          console.log('[WORKOUT] Final State Check:', {
            reactState: weeklyPlan ? 'Present' : 'Null',
            zustandState: currentState ? 'Present' : 'Null',
            workoutsInState: weeklyPlan?.workouts?.length || 0,
          });
        }, 200);

        console.log(`[WORKOUT] Workout plan saved to store and database`);

        // Also save individual workouts to legacy system for compatibility
        if (user?.id) {
          for (const workout of response.data.workouts) {
            await createWorkout({
              name: workout.title,
              type: workout.category,
              duration_minutes: workout.duration,
              calories_burned: workout.estimatedCalories,
              notes: `${workout.dayOfWeek} - ${workout.description}`,
            });
          }
        }

        const experienceLevel = profile.fitnessGoals.experience_level;
        const planDuration =
          experienceLevel === 'beginner'
            ? '1 week'
            : experienceLevel === 'intermediate'
              ? '1.5 weeks'
              : '2 weeks';

        Alert.alert(
          'Weekly Plan Generated!',
          `Your personalized ${planDuration} workout plan "${response.data.planTitle}" is ready! ${response.data.workouts.length} workouts scheduled across the week.`,
          [{ text: "Let's Start!" }]
        );
      } else {
        Alert.alert(
          'Generation Failed',
          response.error || 'Failed to generate weekly workout plan'
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', errorMessage);
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Handle starting a workout
  const handleStartWorkout = async (workout: DayWorkout) => {
    console.log('[WORKOUT] DEBUG: handleStartWorkout called with:', {
      workoutTitle: workout?.title,
      workoutId: workout?.id,
      hasWorkout: !!workout,
      hasExercises: workout?.exercises?.length > 0,
      user: !!user?.id,
      isGuestMode,
      isAuthenticated,
    });

    // Allow both authenticated users and guest users to start workouts
    if (!user?.id && !isGuestMode) {
      console.log('[WORKOUT] Blocking workout - no user and not guest mode');
      Alert.alert('Authentication Required', 'Please sign in to start workouts.');
      return;
    }

    console.log('[WORKOUT] Authentication check passed - proceeding with workout start');
    console.log('[WORKOUT] Starting workout session for:', {
      workoutTitle: workout.title,
      userType: user?.id ? 'authenticated' : 'guest',
      exerciseCount: workout.exercises?.length || 0,
    });

    try {
      let sessionId = '';
      let legacySessionSuccess = false;

      // 1. Try to start workout session using store (primary)
      try {
        sessionId = await startStoreWorkoutSession(workout);
        console.log('[WORKOUT] Store workout session started:', sessionId);
      } catch (storeError) {
        console.warn('[WORKOUT] Store workout session failed:', storeError);
        // Generate fallback session ID
        sessionId = `fallback_session_${workout.id}_${Date.now()}`;
        console.log('[WORKOUT] Using fallback session ID:', sessionId);
      }

      // 2. Try to start legacy workout session (secondary, for compatibility)
      try {
        const workoutData = {
          name: workout.title,
          type: workout.category,
          exercises: workout.exercises.map((exercise) => ({
            exercise_id: exercise.exerciseId,
            sets: exercise.sets,
            reps: typeof exercise.reps === 'string' ? exercise.reps : exercise.reps.toString(),
            weight: exercise.weight || 0,
            rest_seconds: exercise.restTime,
          })),
        };
        legacySessionSuccess = await startWorkoutSession(workoutData);
        console.log('[WORKOUT] Legacy workout session started:', legacySessionSuccess);
      } catch (legacyError) {
        console.warn('[WORKOUT] Legacy workout session failed:', legacyError);
        // Continue anyway - not critical for workout to start
      }

      // 3. Always show the workout dialog, even if background services failed
      const workoutWithSession = { ...workout, sessionId };
      console.log('[WORKOUT] Showing workout start dialog:', {
        sessionId,
        workout: workout.title,
        exercises: workout.exercises?.length || 0,
        storeSessionWorked: sessionId.includes('fallback') ? false : true,
        legacySessionWorked: legacySessionSuccess,
      });

      console.log('[WORKOUT] DEBUG: Setting selectedWorkout and showing dialog:', {
        selectedWorkout: !!workoutWithSession,
        dialogVisible: true,
        workoutTitle: workoutWithSession?.title,
      });

      setSelectedWorkout(workoutWithSession);
      setShowWorkoutStartDialog(true);

      // Force a small delay to ensure state updates
      setTimeout(() => {
        console.log('[WORKOUT] DEBUG: Dialog state after timeout:', {
          showWorkoutStartDialog,
          selectedWorkout: !!selectedWorkout,
        });
      }, 100);

    } catch (error) {
      console.error('[WORKOUT] Critical error in handleStartWorkout:', error);

      // Even if everything fails, still try to show the workout
      try {
        const fallbackSessionId = `emergency_session_${workout.id}_${Date.now()}`;
        const workoutWithSession = { ...workout, sessionId: fallbackSessionId };

        console.log('[WORKOUT] Using emergency fallback for workout session');
        console.log('[WORKOUT] DEBUG: Emergency fallback - setting dialog:', {
          workoutTitle: workoutWithSession?.title,
          sessionId: fallbackSessionId,
        });

        setSelectedWorkout(workoutWithSession);
        setShowWorkoutStartDialog(true);
      } catch (fallbackError) {
        console.error('[WORKOUT] Complete failure - cannot start workout:', fallbackError);
        Alert.alert('Error', 'Failed to start workout. Please try restarting the app.');
      }
    }
  };

  // Handle workout start confirmation
  const handleWorkoutStartConfirm = () => {
    if (selectedWorkout) {
      setShowWorkoutStartDialog(false);

      // Debug: Log the workout data being passed
      console.log('[NAVIGATION] Navigating to WorkoutSession', {
        params: {
          workout: selectedWorkout,
          sessionId: (selectedWorkout as any).sessionId,
          exerciseCount: selectedWorkout.exercises?.length || 0,
          hasExercises: !!selectedWorkout.exercises,
        },
      });

      // Log the exercises array for debugging
      if (selectedWorkout.exercises) {
        console.log('[NAVIGATION] Exercises being passed:', selectedWorkout.exercises);
      } else {
        console.error('[NAVIGATION] No exercises in selectedWorkout!');
      }

      // Ensure exercises are included in the workout object
      const workoutWithExercises = {
        ...selectedWorkout,
        exercises: selectedWorkout.exercises || [],
      };

      navigation.navigate('WorkoutSession', {
        workout: workoutWithExercises,
        sessionId: (selectedWorkout as any).sessionId,
      });
    }
  };

  // Handle workout start cancel
  const handleWorkoutStartCancel = () => {
    setShowWorkoutStartDialog(false);
    setSelectedWorkout(null);
  };

  // Handle viewing workout details
  const handleViewWorkoutDetails = (workout: DayWorkout) => {
    Alert.alert(
      workout.title,
      `${workout.description}\n\nDuration: ${workout.duration} min\nCalories: ${workout.estimatedCalories}\nExercises: ${workout.exercises?.length ?? 0}\n\nTarget: ${workout.targetMuscleGroups?.join(', ') ?? 'Various'}`,
      [{ text: 'OK' }]
    );
  };

  // Get or create swipe position for history card
  const getHistorySwipePosition = (workoutId: number): Animated.Value => {
    if (!historySwipePositions[workoutId]) {
      const newPosition = new Animated.Value(0);
      setHistorySwipePositions(prev => ({ ...prev, [workoutId]: newPosition }));
      return newPosition;
    }
    return historySwipePositions[workoutId];
  };

  // Create PanResponder for history card swipe
  const createHistoryPanResponder = (workoutId: number) => {
    const swipePosition = getHistorySwipePosition(workoutId);
    const SWIPE_THRESHOLD = -120; // Minimum swipe distance to reveal actions

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          swipePosition.setValue(gestureState.dx);
        } else if (gestureState.dx > 0 && swipePosition._value < 0) {
          swipePosition.setValue(Math.max(SWIPE_THRESHOLD, gestureState.dx));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < SWIPE_THRESHOLD / 2) {
          Animated.spring(swipePosition, {
            toValue: SWIPE_THRESHOLD,
            tension: 100,
            friction: 10,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(swipePosition, {
            toValue: 0,
            tension: 100,
            friction: 10,
            useNativeDriver: true,
          }).start();
        }
      },
    });
  };

  // Handle refreshing data
  const handleRefresh = async () => {
    // Refresh weekly plan if needed
    if (weeklyPlan) {
      console.log('Refreshing workout data...');
    }
  };

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header - Aurora Design */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Your Smart Workout Plan</Text>
              <Text style={styles.subtitle}>Week {weekOffset + 1}</Text>
            </View>
          </View>

          {/* HeroCard - Workout Plan Preview */}
          <View style={styles.section}>
            <Animated.View
              style={{
                transform: [
                  {
                    translateY: heroFloating.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -8],
                    }),
                  },
                  {
                    rotateX: heroFloating.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '2deg'],
                    }),
                  },
                ],
              }}
            >
              <HeroSection
                image={{ uri: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80' }}
                overlayGradient={{
                  colors: ['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)'],
                  start: { x: 0, y: 1 },
                  end: { x: 0, y: 0 },
                }}
                contentPosition="center"
                height={200}
                parallaxEnabled={false}
              >
                <Text style={styles.heroText}>AI-Optimized for Your Goals</Text>
              </HeroSection>
            </Animated.View>
          </View>

          {/* FeatureGrid - Cult.fit Style */}
          <View style={styles.section}>
            <FeatureGrid
              features={[
                {
                  icon: <Ionicons name="timer-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} />,
                  title: '50 mins dedicated',
                  description: 'Focused workout sessions',
                  onPress: () => {},
                },
                {
                  icon: <Ionicons name="target-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} />,
                  title: 'Goal-based workouts',
                  description: 'Tailored to your targets',
                  onPress: () => {},
                },
                {
                  icon: <Ionicons name="flash-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} />,
                  title: 'Faster results',
                  description: 'Science-backed training',
                  onPress: () => {},
                },
                {
                  icon: <Ionicons name="shield-checkmark-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} />,
                  title: 'Reduced injury risk',
                  description: 'Safe progression',
                  onPress: () => {},
                },
              ]}
              columns={2}
              itemAnimation="stagger"
              glassEffect={true}
            />
          </View>

          {/* Today's Workout - Expandable Card */}
          {weeklyPlan && getWorkoutsForDay(selectedDay).length > 0 && (
            <View style={styles.section}>
              <GlassCard elevation={2} blurIntensity="light" padding="none" borderRadius="lg" style={styles.expandableCard}>
                {/* Header - Collapsed State */}
                <AnimatedPressable
                  style={styles.expandableHeader}
                  onPress={() => setTodaysWorkoutExpanded(!todaysWorkoutExpanded)}
                  scaleValue={0.98}
                  hapticFeedback={true}
                  hapticType="light"
                >
                  <View style={styles.expandableHeaderContent}>
                    <View>
                      <Text style={styles.expandableTitle}>
                        {getWorkoutsForDay(selectedDay)[0]?.title || 'Today\'s Workout'}
                      </Text>
                      <Text style={styles.expandableCaption}>
                        {getWorkoutsForDay(selectedDay)[0]?.duration || '45'} mins •{' '}
                        {getWorkoutsForDay(selectedDay)[0]?.difficulty || 'Intermediate'}
                      </Text>
                    </View>
                    <Animated.Text
                      style={[
                        styles.chevronIcon,
                        {
                          transform: [
                            {
                              rotate: chevronRotation.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '180deg'],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      ▼
                    </Animated.Text>
                  </View>
                </AnimatedPressable>

                {/* Content - Expanded State */}
                <Animated.View
                  style={[
                    styles.expandableContent,
                    {
                      maxHeight: expandableCardHeight.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1000], // Max height when expanded
                      }),
                      opacity: expandableCardHeight,
                      overflow: 'hidden',
                    },
                  ]}
                >
                    {/* Exercise List */}
                    {getWorkoutsForDay(selectedDay)[0]?.exercises?.slice(0, 5).map((exercise: any, index: number) => (
                      <View key={index} style={styles.exerciseRow}>
                        {/* Exercise Thumbnail */}
                        <View style={styles.exerciseThumbnail}>
                          <Ionicons
                            name={['barbell-outline', 'walk-outline', 'body-outline', 'fitness-outline', 'accessibility-outline'][index % 5] as any}
                            size={rf(24)}
                            color={ResponsiveTheme.colors.primary}
                          />
                        </View>

                        {/* Exercise Info */}
                        <View style={styles.exerciseInfo}>
                          <Text style={styles.exerciseName}>{exercise.name}</Text>
                          <Text style={styles.exerciseDetails}>
                            {exercise.sets} sets × {exercise.reps} reps
                          </Text>
                        </View>

                        {/* Info Button */}
                        <AnimatedPressable
                          style={styles.exerciseInfoButton}
                          onPress={() => Alert.alert('Exercise Info', `Details for ${exercise.name}`)}
                          scaleValue={0.9}
                        >
                          <Ionicons name="information-circle-outline" size={rf(20)} color={ResponsiveTheme.colors.textSecondary} />
                        </AnimatedPressable>
                      </View>
                    ))}

                    {/* Start Workout Button */}
                    <Animated.View style={{ transform: [{ scale: startButtonPulse }] }}>
                      <AnimatedPressable
                        style={styles.startWorkoutButton}
                        onPress={() => handleStartWorkout(getWorkoutsForDay(selectedDay)[0])}
                        scaleValue={0.95}
                        hapticFeedback={true}
                        hapticType="medium"
                      >
                        <LinearGradient
                          {...(toLinearGradientProps(gradients.button.primary) as any)}
                          style={styles.startWorkoutButtonGradient}
                        >
                          <Text style={styles.startWorkoutButtonText}>START WORKOUT</Text>
                        </LinearGradient>
                      </AnimatedPressable>
                    </Animated.View>
                </Animated.View>
              </GlassCard>
            </View>
          )}

          {/* Workout History - Aurora Design */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Workout History</Text>

            {/* Mock history data - in production this would come from store */}
            {[
              {
                id: 1,
                date: 'Yesterday',
                name: 'Upper Body Strength',
                duration: '45 mins',
                calories: 320,
                completed: true,
              },
              {
                id: 2,
                date: '2 days ago',
                name: 'Cardio HIIT',
                duration: '30 mins',
                calories: 280,
                completed: true,
              },
              {
                id: 3,
                date: '3 days ago',
                name: 'Full Body Workout',
                duration: '50 mins',
                calories: 380,
                completed: false,
              },
            ].map((workout) => {
              const panResponder = createHistoryPanResponder(workout.id);
              const swipePosition = getHistorySwipePosition(workout.id);

              return (
                <View key={workout.id} style={styles.swipeableHistoryContainer}>
                  {/* Action Buttons (revealed on swipe) */}
                  <View style={styles.historySwipeActions}>
                    <AnimatedPressable
                      style={styles.historySwipeActionRepeat}
                      onPress={() => {
                        Alert.alert('Repeat Workout', `Repeat ${workout.name}?`);
                        Animated.spring(swipePosition, { toValue: 0, useNativeDriver: true }).start();
                      }}
                      scaleValue={0.9}
                      hapticFeedback={true}
                      hapticType="medium"
                    >
                      <Ionicons name="repeat-outline" size={rf(24)} color={ResponsiveTheme.colors.white} />
                      <Text style={styles.historySwipeActionText}>Repeat</Text>
                    </AnimatedPressable>
                    <AnimatedPressable
                      style={styles.historySwipeActionDelete}
                      onPress={() => {
                        Alert.alert('Delete Workout', `Delete ${workout.name}?`);
                        Animated.spring(swipePosition, { toValue: 0, useNativeDriver: true }).start();
                      }}
                      scaleValue={0.9}
                      hapticFeedback={true}
                      hapticType="medium"
                    >
                      <Ionicons name="trash-outline" size={rf(24)} color={ResponsiveTheme.colors.white} />
                      <Text style={styles.historySwipeActionText}>Delete</Text>
                    </AnimatedPressable>
                  </View>

                  {/* Swipeable Card */}
                  <Animated.View
                    {...panResponder.panHandlers}
                    style={[
                      styles.swipeableHistoryCard,
                      {
                        transform: [{ translateX: swipePosition }],
                      },
                    ]}
                  >
                    <GlassCard
                      elevation={1}
                      blurIntensity="light"
                      padding="md"
                      borderRadius="lg"
                      style={styles.historyCard}
                    >
                <View style={styles.historyCardContent}>
                  {/* Left: Date and Workout Info */}
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyDate}>{workout.date}</Text>
                    <Text style={styles.historyName}>{workout.name}</Text>
                    <Text style={styles.historyDetails}>
                      {workout.duration} • {workout.calories} calories
                    </Text>
                    <View style={styles.historyStatus}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: rp(4) }}>
                        <Ionicons
                          name={workout.completed ? 'checkmark-circle' : 'ellipse-outline'}
                          size={rf(16)}
                          color={workout.completed ? ResponsiveTheme.colors.success : ResponsiveTheme.colors.textSecondary}
                        />
                        <Text style={[
                          styles.historyStatusText,
                          workout.completed ? styles.historyStatusCompleted : styles.historyStatusIncomplete
                        ]}>
                          {workout.completed ? 'Completed' : 'Incomplete'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                    </GlassCard>
                  </Animated.View>
                </View>
              );
            })}
          </View>

          {/* Suggested Workouts - Aurora Design */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suggested Workouts</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestedScrollContent}
            >
              {[
                {
                  id: 1,
                  name: 'HIIT Cardio',
                  iconName: 'walk-outline',
                  duration: '30 mins',
                  difficulty: 'Advanced',
                  calories: '350 cal',
                  gradient: ['#FF6B6B', '#FF8E53'],
                },
                {
                  id: 2,
                  name: 'Strength Training',
                  iconName: 'barbell-outline',
                  duration: '45 mins',
                  difficulty: 'Intermediate',
                  calories: '280 cal',
                  gradient: ['#4ECDC4', '#44A08D'],
                },
                {
                  id: 3,
                  name: 'Yoga Flow',
                  iconName: 'body-outline',
                  duration: '40 mins',
                  difficulty: 'Beginner',
                  calories: '150 cal',
                  gradient: ['#A8E6CF', '#56C596'],
                },
              ].map((workout) => (
                <GlassCard
                  key={workout.id}
                  elevation={2}
                  blurIntensity="medium"
                  padding="lg"
                  borderRadius="xl"
                  style={styles.suggestedCard}
                >
                  {/* Workout Icon */}
                  <View style={styles.suggestedIconContainer}>
                    <LinearGradient
                      colors={workout.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.suggestedIconGradient}
                    >
                      <Ionicons name={workout.iconName as any} size={rf(40)} color={ResponsiveTheme.colors.white} />
                    </LinearGradient>
                  </View>

                  {/* Workout Info */}
                  <Text style={styles.suggestedName}>{workout.name}</Text>
                  <Text style={styles.suggestedDuration}>{workout.duration}</Text>
                  <Text style={styles.suggestedDifficulty}>{workout.difficulty}</Text>
                  <Text style={styles.suggestedCalories}>{workout.calories}</Text>

                  {/* Start Button */}
                  <AnimatedPressable
                    style={styles.suggestedStartButton}
                    onPress={() => Alert.alert('Start Workout', `Start ${workout.name}?`)}
                    scaleValue={0.95}
                    hapticFeedback={true}
                    hapticType="medium"
                  >
                    <LinearGradient
                      colors={workout.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.suggestedStartGradient}
                    >
                      <Text style={styles.suggestedStartText}>START</Text>
                    </LinearGradient>
                  </AnimatedPressable>
                </GlassCard>
              ))}
            </ScrollView>
          </View>

          {/* Loading State */}
          {isGeneratingPlan && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={ResponsiveTheme.colors.primary} />
              <Text style={styles.loadingText}>Creating your personalized weekly plan...</Text>
            </View>
          )}

          {/* Weekly Calendar */}
          {weeklyPlan && weeklyPlan.workouts && weeklyPlan.workouts.length > 0 && (
            <WeeklyCalendar
              selectedDay={selectedDay}
              onDaySelect={setSelectedDay}
              weekOffset={weekOffset}
              onWeekChange={setWeekOffset}
              workoutData={getWorkoutData()}
            />
          )}

          {/* Day Workout View */}
          <Animated.View style={[styles.dayViewContainer, { opacity: fadeAnim }]}>
            {weeklyPlan && weeklyPlan.workouts ? (
              <DayWorkoutView
                selectedDay={selectedDay}
                workouts={getWorkoutsForDay(selectedDay)}
                isLoading={isGeneratingPlan}
                onRefresh={handleRefresh}
                onStartWorkout={handleStartWorkout}
                onViewWorkoutDetails={handleViewWorkoutDetails}
                onGenerateWorkout={generateWeeklyWorkoutPlan}
                isRestDay={isRestDay(selectedDay)}
                workoutProgress={getDisplayWorkoutProgress()}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={rf(64)} color={ResponsiveTheme.colors.textSecondary} style={{ marginBottom: ResponsiveTheme.spacing.lg }} />
                <Text style={styles.emptyStateTitle}>No Weekly Plan</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Generate your personalized weekly workout plan to get started with day-by-day fitness guidance.
                </Text>
                {profile?.fitnessGoals && (
                  <Text style={styles.emptyStateInfo}>
                    Based on your {profile.fitnessGoals.experience_level} level, you'll get:
                    {'\n'}•{' '}
                    {profile.fitnessGoals.experience_level === 'beginner'
                      ? '3 workouts over 1 week'
                      : profile.fitnessGoals.experience_level === 'intermediate'
                        ? '5 workouts over 1.5 weeks'
                        : '6 workouts over 2 weeks'}
                    {'\n'}• Workouts tailored to: {profile.fitnessGoals.primaryGoals.join(', ')}
                  </Text>
                )}
                <Button
                  title={isGeneratingPlan ? 'Generating...' : 'Generate Your Weekly Plan'}
                  onPress={generateWeeklyWorkoutPlan}
                  variant="primary"
                  style={styles.emptyStateButton}
                  disabled={isGeneratingPlan}
                />
              </View>
            )}
          </Animated.View>

          {/* Compact Plan Summary */}
          {weeklyPlan && weeklyPlan.workouts && weeklyPlan.restDays && (
            <View style={styles.compactPlanSummary}>
              <View style={styles.planHeader}>
                <View style={styles.planTitleContainer}>
                  <Text style={styles.planTitle} numberOfLines={1}>
                    {weeklyPlan.planTitle}
                  </Text>
                  <Text style={styles.planDescription} numberOfLines={1}>
                    {weeklyPlan.planDescription}
                  </Text>
                </View>
              </View>

              <View style={styles.horizontalStats}>
                <View style={styles.compactStatItem}>
                  <Text style={styles.compactStatValue}>{weeklyPlan.workouts?.length ?? 0}</Text>
                  <Text style={styles.compactStatLabel}>Workouts</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.compactStatItem}>
                  <Text style={styles.compactStatValue}>
                    {Math.round(weeklyPlan.totalEstimatedCalories || 0)}
                  </Text>
                  <Text style={styles.compactStatLabel}>Total Calories</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.compactStatItem}>
                  <Text style={styles.compactStatValue}>{weeklyPlan.restDays?.length ?? 0}</Text>
                  <Text style={styles.compactStatLabel}>Rest Days</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <WorkoutStartDialog
          visible={showWorkoutStartDialog}
          workoutTitle={selectedWorkout?.title || ''}
          onCancel={handleWorkoutStartCancel}
          onConfirm={handleWorkoutStartConfirm}
        />
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },

  scrollView: {
    flex: 1,
  },

  // Aurora Header
  header: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.md,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  subtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  // Aurora Sections
  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  heroText: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
    textAlign: 'center',
  },

  generateButtonLarge: {
    marginTop: ResponsiveTheme.spacing.md,
  },

  // Old Header (kept for backward compatibility)
  headerOld: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.md,
  },

  titleOld: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },

  generateButton: {
    minWidth: rw(120),
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: ResponsiveTheme.spacing.xl,
  },

  loadingText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.md,
    textAlign: 'center',
  },

  dayViewContainer: {
    flex: 1,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.xl,
  },

  emptyStateEmoji: {
    fontSize: rf(64),
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  emptyStateTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: 'center',
  },

  emptyStateSubtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.lg,
    lineHeight: rf(22),
  },

  emptyStateInfo: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.xl,
    lineHeight: rf(20),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  emptyStateButton: {
    minWidth: rw(200),
  },

  // Compact Plan Summary Styles
  compactPlanSummary: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  planHeader: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  planTitleContainer: {
    flex: 1,
  },

  planTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  planDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },

  horizontalStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: ResponsiveTheme.spacing.sm,
  },

  compactStatItem: {
    alignItems: 'center',
    flex: 1,
  },

  compactStatValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs / 2,
  },

  compactStatLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },

  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: ResponsiveTheme.colors.border,
    marginHorizontal: ResponsiveTheme.spacing.sm,
  },

  // Legacy styles (keeping for compatibility)
  planSummary: {
    backgroundColor: ResponsiveTheme.colors.surface,
    padding: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  planStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  statItem: {
    alignItems: 'center',
  },

  statValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  statLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  // Expandable Card Styles
  expandableCard: {
    overflow: 'hidden',
  },

  expandableHeader: {
    padding: ResponsiveTheme.spacing.lg,
  },

  expandableHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  expandableTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  expandableCaption: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  chevronIcon: {
    fontSize: rf(20),
    color: ResponsiveTheme.colors.textSecondary,
    transform: [{ rotate: '0deg' }],
  },

  chevronIconExpanded: {
    transform: [{ rotate: '180deg' }],
  },

  expandableContent: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.lg,
  },

  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
    opacity: 0.6,
  },

  exerciseThumbnail: {
    width: rw(50),
    height: rh(50),
    borderRadius: ResponsiveTheme.borderRadius.md,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ResponsiveTheme.spacing.md,
  },

  exerciseThumbnailIcon: {
    fontSize: rf(24),
  },

  exerciseInfo: {
    flex: 1,
  },

  exerciseName: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  exerciseDetails: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  exerciseInfoButton: {
    width: rw(36),
    height: rh(36),
    borderRadius: ResponsiveTheme.borderRadius.full,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  exerciseInfoIcon: {
    fontSize: rf(18),
  },

  startWorkoutButton: {
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: 'hidden',
    marginTop: ResponsiveTheme.spacing.md,
  },

  startWorkoutButtonGradient: {
    paddingVertical: ResponsiveTheme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  startWorkoutButtonText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
    letterSpacing: 1,
  },

  // Workout History Styles
  historyCard: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  // Swipeable History Container Styles
  swipeableHistoryContainer: {
    marginBottom: ResponsiveTheme.spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },

  swipeableHistoryCard: {
    width: '100%',
  },

  historySwipeActions: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.xs,
    paddingRight: ResponsiveTheme.spacing.md,
  },

  historySwipeActionRepeat: {
    width: rw(80),
    height: '100%',
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  historySwipeActionDelete: {
    width: rw(80),
    height: '100%',
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  historySwipeActionIcon: {
    fontSize: rf(24),
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  historySwipeActionText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.white,
  },

  historyCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  historyInfo: {
    flex: 1,
  },

  historyDate: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  historyName: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  historyDetails: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  historyStatus: {
    marginTop: ResponsiveTheme.spacing.xs,
  },

  historyStatusText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  historyStatusCompleted: {
    color: '#10b981',
  },

  historyStatusIncomplete: {
    color: ResponsiveTheme.colors.textMuted,
  },

  historyActions: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.sm,
  },

  historyActionButton: {
    // No additional styles needed
  },

  historyActionIcon: {
    width: rw(40),
    height: rh(40),
    borderRadius: ResponsiveTheme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Suggested Workouts Styles
  suggestedScrollContent: {
    paddingRight: ResponsiveTheme.spacing.lg,
  },

  suggestedCard: {
    width: rw(180),
    marginRight: ResponsiveTheme.spacing.md,
    alignItems: 'center',
  },

  suggestedIconContainer: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  suggestedIconGradient: {
    width: rw(80),
    height: rh(80),
    borderRadius: ResponsiveTheme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },

  suggestedEmoji: {
    fontSize: rf(40),
  },

  suggestedName: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
    textAlign: 'center',
  },

  suggestedDuration: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  suggestedDifficulty: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  suggestedCalories: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  suggestedStartButton: {
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: 'hidden',
    width: '100%',
  },

  suggestedStartGradient: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  suggestedStartText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
    letterSpacing: 1,
  },
});
