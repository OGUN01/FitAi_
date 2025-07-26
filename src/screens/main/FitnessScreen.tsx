import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  TextInput,
  Animated,
} from 'react-native';
import { Button, Card, THEME } from '../../components/ui';
import { aiService } from '../../ai';
import { useUserStore } from '../../stores/userStore';
import { useAuth } from '../../hooks/useAuth';
import { useFitnessData } from '../../hooks/useFitnessData';
import { WorkoutAnalytics } from '../../components/fitness/WorkoutAnalytics';
import { AchievementSystem } from '../../components/fitness/AchievementSystem';
import { Workout } from '../../types/ai';
import { Exercise } from '../../services/fitnessData';

export const FitnessScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    workoutId: string | null;
    position: { x: number; y: number };
  }>({
    visible: false,
    workoutId: null,
    position: { x: 0, y: 0 },
  });

  // AI Integration State
  const [aiWorkouts, setAiWorkouts] = useState<Workout[]>([]);
  const [isGeneratingWorkout, setIsGeneratingWorkout] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Authentication and user data
  const { user, isAuthenticated } = useAuth();
  const { profile } = useUserStore();

  // Real fitness data
  const {
    exercises,
    exercisesLoading,
    exercisesError,
    loadExercises,
    userWorkouts,
    workoutPreferences,
    fitnessGoals,
    workoutStats,
    createWorkout,
    completeWorkout,
    startWorkoutSession,
    getRecommendedExercises,
    refreshAll,
  } = useFitnessData();

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Animate in on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Removed manual categories - using AI-generated weekly plans instead
  // Categories are now determined by AI based on user's onboarding data

  // Generate Weekly Workout Plan based on user experience level
  const generateWeeklyWorkoutPlan = async () => {
    if (!profile?.personalInfo || !profile?.fitnessGoals) {
      Alert.alert(
        'Profile Incomplete',
        'Please complete your profile to generate your personalized weekly workout plan.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsGeneratingWorkout(true);
    setAiError(null);

    try {
      console.log('🏋️ Generating weekly workout plan...');
      
      const response = await aiService.generateWeeklyWorkoutPlan(
        profile.personalInfo,
        profile.fitnessGoals,
        1 // Week 1
      );

      if (response.success && response.data) {
        console.log(`✅ Generated ${response.data.workouts.length} workouts for Week 1`);
        
        // Set AI workouts to the weekly plan workouts
        setAiWorkouts(response.data.workouts);

        // Save workouts to database
        if (user?.id) {
          for (const workout of response.data.workouts) {
            await createWorkout({
              name: workout.title,
              type: workout.category,
              duration_minutes: workout.duration,
              calories_burned: workout.estimatedCalories,
              notes: `Week 1 - ${workout.description}`,
            });
          }
        }

        const experienceLevel = profile.fitnessGoals.experience_level;
        const planDuration = experienceLevel === 'beginner' ? '1 week' : 
                           experienceLevel === 'intermediate' ? '1.5 weeks' : '2 weeks';

        Alert.alert(
          'Weekly Plan Generated! 🎉',
          `Your personalized ${planDuration} workout plan is ready! Based on your ${experienceLevel} level and ${profile.fitnessGoals.primaryGoals.join(', ')} goals.`,
          [{ text: 'Let\'s Start!' }]
        );
      } else {
        setAiError(response.error || 'Failed to generate weekly workout plan');
        Alert.alert('Generation Failed', response.error || 'Failed to generate weekly workout plan');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setAiError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsGeneratingWorkout(false);
    }
  };

  // Convert AI workouts to display format
  const convertAIWorkoutToDisplay = (aiWorkout: Workout, index: number) => ({
    id: `ai-${index}`,
    title: aiWorkout.name,
    duration: `${aiWorkout.duration} min`,
    difficulty: aiWorkout.difficulty || 'Intermediate',
    calories: `${aiWorkout.estimatedCalories || 300} cal`,
    category: aiWorkout.type || 'strength',
    icon: getWorkoutIcon(aiWorkout.type || 'strength'),
    exercises: aiWorkout.exercises?.length || 0,
    isAIGenerated: true,
  });

  const getWorkoutIcon = (type: string) => {
    switch (type) {
      case 'strength': return '💪';
      case 'cardio': return '🏃';
      case 'flexibility': return '🧘';
      case 'hiit': return '🔥';
      default: return '🏋️';
    }
  };

  // Note: Removed static exercise display to focus on AI-generated personalized workouts
  // The exercises from database were generic seed data that interfered with personalization

  // Convert user workouts to display format
  const convertUserWorkoutToDisplay = (workout: any) => ({
    id: workout.id,
    title: workout.name,
    duration: workout.duration_minutes ? `${workout.duration_minutes} min` : '30 min',
    difficulty: 'Intermediate', // Default for now
    calories: workout.calories_burned ? `${workout.calories_burned} cal` : '200 cal',
    category: workout.type.toLowerCase(),
    icon: getWorkoutIcon(workout.type.toLowerCase()),
    exercises: workout.exercises?.length || 0,
    isAIGenerated: false,
    description: workout.notes || `${workout.type} workout`,
    equipment: ['mixed'],
    rating: null, // No rating system yet
    completions: null, // No completion tracking yet
    isUserWorkout: true,
    completed_at: workout.completed_at,
  });

  // Combine all workout sources (AI-generated and user workouts only)
  const aiWorkoutsDisplay = aiWorkouts.map(convertAIWorkoutToDisplay);
  const userWorkoutsDisplay = userWorkouts.map(convertUserWorkoutToDisplay);
  const allWorkouts = [...aiWorkoutsDisplay, ...userWorkoutsDisplay];

  // Filter workouts by category and search query
  const filteredWorkouts = allWorkouts.filter(workout => {
    const matchesCategory = selectedCategory === 'all' || workout.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      workout.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workout.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workout.difficulty.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Note: Removed exercise loading as we now focus on AI-generated personalized workouts
  // The app no longer loads generic exercises from database

  const handleWorkoutLongPress = (workoutId: string, event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setContextMenu({
      visible: true,
      workoutId,
      position: { x: pageX, y: pageY },
    });
  };

  const handleContextMenuAction = (action: string) => {
    const workout = filteredWorkouts.find(w => w.id === contextMenu.workoutId);
    setContextMenu({ visible: false, workoutId: null, position: { x: 0, y: 0 } });

    switch (action) {
      case 'start':
        if (workout) {
          handleStartWorkout(workout);
        }
        break;
      case 'favorite':
        Alert.alert('Favorite', `Added ${workout?.title} to favorites!`);
        break;
      case 'share':
        Alert.alert('Share', `Sharing ${workout?.title}...`);
        break;
      case 'details':
        Alert.alert('Details', `Showing details for ${workout?.title}`);
        break;
    }
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, workoutId: null, position: { x: 0, y: 0 } });
  };

  // Handle starting a workout
  const handleStartWorkout = async (workout: any) => {
    if (!user?.id) {
      Alert.alert('Authentication Required', 'Please sign in to start workouts.');
      return;
    }

    try {
      // Start the workout (AI-generated or user workout)
      Alert.alert(
        'Start Workout',
        `Starting ${workout.title}...`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Start', 
            onPress: () => {
              Alert.alert(
                'Workout Started! 🎯',
                `Your ${workout.title} workout is ready to begin. Track your progress as you go!`,
                [{ text: 'Great!' }]
              );
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to start workout. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Fitness</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[styles.headerButton, showAnalytics && styles.headerButtonActive]}
              onPress={() => setShowAnalytics(!showAnalytics)}
            >
              <Text style={styles.headerButtonIcon}>📊</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, showAchievements && styles.headerButtonActive]}
              onPress={() => setShowAchievements(!showAchievements)}
            >
              <Text style={styles.headerButtonIcon}>🏆</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.aiButton, isGeneratingWorkout && styles.aiButtonDisabled]}
              onPress={generateWeeklyWorkoutPlan}
              disabled={isGeneratingWorkout}
            >
              {isGeneratingWorkout ? (
                <ActivityIndicator size="small" color={THEME.colors.white} />
              ) : (
                <Text style={styles.aiButtonText}>📅 Plan</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Text style={styles.searchIcon}>🔍</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Input */}
        {showSearch && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search workouts..."
              placeholderTextColor={THEME.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => {
                setSearchQuery('');
                setShowSearch(false);
              }}
            >
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Current Workout */}
        {userWorkouts.length > 0 && !userWorkouts[0].completed_at && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Continue Your Workout</Text>
            <Card style={styles.currentWorkoutCard} variant="elevated">
              <View style={styles.workoutHeader}>
                <View style={styles.workoutInfo}>
                  <Text style={styles.currentWorkoutTitle}>{userWorkouts[0].name}</Text>
                  <Text style={styles.currentWorkoutProgress}>
                    {userWorkouts[0].exercises?.length || 0} exercises planned
                  </Text>
                </View>
                <View style={styles.workoutIconLarge}>
                  <Text style={styles.workoutEmoji}>
                    {getWorkoutIcon(userWorkouts[0].type)}
                  </Text>
                </View>
              </View>

              <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: '0%' }]} />
                </View>
                <Text style={styles.progressText}>
                  {userWorkouts[0].duration_minutes || 30} min planned
                </Text>
              </View>

              <Button
                title="Start Workout"
                onPress={() => {
                  Alert.alert(
                    'Start Workout',
                    `Starting ${userWorkouts[0].name}...`,
                    [{ text: 'OK' }]
                  );
                }}
                variant="primary"
                style={styles.continueButton}
              />
            </Card>
          </View>
        )}

        {/* Weekly Plan Generation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Weekly Plan</Text>
          <Card style={styles.weeklyPlanCard} variant="elevated">
            <View style={styles.weeklyPlanContent}>
              <Text style={styles.weeklyPlanIcon}>📅</Text>
              <View style={styles.weeklyPlanText}>
                <Text style={styles.weeklyPlanTitle}>Generate Your Personalized Plan</Text>
                <Text style={styles.weeklyPlanSubtitle}>
                  {profile?.fitnessGoals?.experience_level === 'beginner' && 'Get 1 week of beginner-friendly workouts'}
                  {profile?.fitnessGoals?.experience_level === 'intermediate' && 'Get 1.5 weeks of progressive intermediate workouts'}
                  {profile?.fitnessGoals?.experience_level === 'advanced' && 'Get 2 weeks of intensive advanced workouts'}
                  {!profile?.fitnessGoals?.experience_level && 'Complete your profile to see your plan duration'}
                </Text>
                {profile?.fitnessGoals?.primaryGoals && (
                  <Text style={styles.weeklyPlanGoals}>
                    Goals: {profile.fitnessGoals.primaryGoals.join(', ')}
                  </Text>
                )}
              </View>
            </View>
            <Button
              title="Generate Weekly Plan"
              onPress={generateWeeklyWorkoutPlan}
              variant="primary"
              style={styles.weeklyPlanButton}
              disabled={isGeneratingWorkout}
            />
          </Card>
        </View>

        {/* Workouts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Your Workouts
            </Text>
            <TouchableOpacity onPress={refreshAll}>
              <Text style={styles.seeAllText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {/* Loading State */}
          {isGeneratingWorkout && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={THEME.colors.primary} />
              <Text style={styles.loadingText}>Generating your personalized workout...</Text>
            </View>
          )}

          {/* AI Error State */}
          {aiError && (
            <Card style={styles.errorCard} variant="outlined">
              <Text style={styles.errorText}>⚠️ {aiError}</Text>
              <Button
                title="Try Again"
                onPress={() => generateAIWorkout()}
                variant="outline"
                size="sm"
                style={styles.retryButton}
              />
            </Card>
          )}

          {/* No Authentication State */}
          {!isAuthenticated && (
            <Card style={styles.errorCard} variant="outlined">
              <Text style={styles.errorText}>🔐 Please sign in to view personalized workouts</Text>
            </Card>
          )}

          {/* Empty State - Encourage Weekly Plan Generation */}
          {!isGeneratingWorkout && isAuthenticated && filteredWorkouts.length === 0 && (
            <Card style={styles.emptyStateCard} variant="elevated">
              <View style={styles.emptyStateContent}>
                <Text style={styles.emptyStateIcon}>📅</Text>
                <Text style={styles.emptyStateTitle}>Start Your Fitness Journey</Text>
                <Text style={styles.emptyStateText}>
                  Generate your personalized weekly workout plan based on your experience level and goals. 
                  {profile?.fitnessGoals?.experience_level === 'beginner' && ' You\'ll get 1 week of beginner-friendly workouts.'}
                  {profile?.fitnessGoals?.experience_level === 'intermediate' && ' You\'ll get 1.5 weeks of progressive workouts.'}
                  {profile?.fitnessGoals?.experience_level === 'advanced' && ' You\'ll get 2 weeks of intensive workouts.'}
                </Text>
                <Button
                  title="Generate Weekly Plan"
                  onPress={generateWeeklyWorkoutPlan}
                  variant="primary"
                  style={styles.emptyStateButton}
                  disabled={isGeneratingWorkout}
                />
              </View>
            </Card>
          )}

          {/* Workouts List */}
          {!isGeneratingWorkout && isAuthenticated && filteredWorkouts.length > 0 && filteredWorkouts.map((workout, index) => (
            <Animated.View
              key={workout.id}
              style={{
                opacity: fadeAnim,
                transform: [{
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                }],
              }}
            >
              <Card style={styles.workoutCard} variant="outlined">
                <TouchableOpacity
                  style={styles.workoutContent}
                  onLongPress={(event) => handleWorkoutLongPress(workout.id, event)}
                >
                <View style={styles.workoutHeader}>
                  <View style={styles.workoutInfo}>
                    <View style={styles.workoutTitleRow}>
                      <Text style={styles.workoutTitle}>{workout.title}</Text>
                      {workout.isAIGenerated && (
                        <View style={styles.aiGeneratedBadge}>
                          <Text style={styles.aiGeneratedText}>🤖 AI</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.workoutMeta}>
                      <Text style={styles.workoutMetaText}>{workout.duration}</Text>
                      <Text style={styles.workoutMetaDot}>•</Text>
                      <Text style={styles.workoutMetaText}>{workout.difficulty}</Text>
                      <Text style={styles.workoutMetaDot}>•</Text>
                      <Text style={styles.workoutMetaText}>{workout.exercises} exercises</Text>
                    </View>
                    {workout.description && (
                      <Text style={styles.workoutDescription}>{workout.description}</Text>
                    )}
                    {workout.rating && workout.completions && (
                      <View style={styles.workoutRating}>
                        <Text style={styles.ratingStars}>⭐</Text>
                        <Text style={styles.ratingText}>{workout.rating}</Text>
                        <Text style={styles.completionsText}>({workout.completions} completed)</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.workoutIcon}>
                    <Text style={styles.workoutEmoji}>{workout.icon}</Text>
                  </View>
                </View>
                
                <View style={styles.workoutFooter}>
                  <View style={styles.caloriesContainer}>
                    <Text style={styles.caloriesText}>🔥 {workout.calories}</Text>
                  </View>
                  <Button
                    title="Start"
                    onPress={() => handleStartWorkout(workout)}
                    variant="outline"
                    size="sm"
                    style={styles.startButton}
                  />
                </View>
              </TouchableOpacity>
            </Card>
            </Animated.View>
          ))}
        </View>

        {/* Analytics Component */}
        {showAnalytics && (
          <WorkoutAnalytics />
        )}

        {/* Achievements Component */}
        {showAchievements && (
          <AchievementSystem workoutStats={workoutStats} />
        )}

        {/* Quick Stats */}
        {!showAnalytics && !showAchievements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>This Week</Text>
            <View style={styles.statsGrid}>
              <Card style={styles.statCard} variant="elevated">
                <Text style={styles.statValue}>
                  {workoutStats?.totalWorkouts || 0}
                </Text>
                <Text style={styles.statLabel}>Workouts</Text>
              </Card>

              <Card style={styles.statCard} variant="elevated">
                <Text style={styles.statValue}>
                  {workoutStats?.totalDuration
                    ? `${(workoutStats.totalDuration / 60).toFixed(1)}h`
                    : '0h'
                  }
                </Text>
                <Text style={styles.statLabel}>Total Time</Text>
              </Card>

              <Card style={styles.statCard} variant="elevated">
                <Text style={styles.statValue}>
                  {workoutStats?.totalCalories?.toLocaleString() || '0'}
                </Text>
                <Text style={styles.statLabel}>Calories</Text>
              </Card>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Context Menu Modal */}
      <Modal
        visible={contextMenu.visible}
        transparent
        animationType="fade"
        onRequestClose={closeContextMenu}
      >
        <TouchableOpacity
          style={styles.contextMenuOverlay}
          activeOpacity={1}
          onPress={closeContextMenu}
        >
          <View
            style={[
              styles.contextMenu,
              {
                left: Math.min(contextMenu.position.x, 300),
                top: Math.min(contextMenu.position.y, 600),
              }
            ]}
          >
            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => handleContextMenuAction('start')}
            >
              <Text style={styles.contextMenuText}>🏃 Start Workout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => handleContextMenuAction('favorite')}
            >
              <Text style={styles.contextMenuText}>❤️ Add to Favorites</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => handleContextMenuAction('share')}
            >
              <Text style={styles.contextMenuText}>📤 Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => handleContextMenuAction('details')}
            >
              <Text style={styles.contextMenuText}>ℹ️ View Details</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  
  scrollView: {
    flex: 1,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.lg,
    paddingBottom: THEME.spacing.md,
  },
  
  title: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerButtonActive: {
    backgroundColor: THEME.colors.primary,
  },

  headerButtonIcon: {
    fontSize: 20,
  },

  aiButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },

  aiButtonDisabled: {
    backgroundColor: THEME.colors.textMuted,
  },

  aiButtonText: {
    color: THEME.colors.white,
    fontSize: 12,
    fontWeight: '600',
  },

  searchButton: {
    width: 40,
    height: 40,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  searchIcon: {
    fontSize: 20,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    marginHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.md,
    ...THEME.shadows.sm,
  },

  searchInput: {
    flex: 1,
    height: 44,
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    paddingVertical: THEME.spacing.sm,
  },

  clearSearchButton: {
    padding: THEME.spacing.sm,
    marginLeft: THEME.spacing.sm,
  },

  clearSearchText: {
    fontSize: 16,
    color: THEME.colors.textSecondary,
  },
  
  section: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.xl,
  },
  
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  
  seeAllText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.medium,
  },
  
  currentWorkoutCard: {
    padding: THEME.spacing.lg,
  },
  
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  
  workoutInfo: {
    flex: 1,
  },
  
  currentWorkoutTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },
  
  currentWorkoutProgress: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
  },
  
  workoutIconLarge: {
    width: 56,
    height: 56,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  workoutEmoji: {
    fontSize: 28,
  },
  
  progressSection: {
    marginBottom: THEME.spacing.lg,
  },
  
  progressBar: {
    height: 8,
    backgroundColor: THEME.colors.backgroundSecondary,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: THEME.spacing.sm,
  },
  
  progressFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.sm,
  },
  
  progressText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
  
  continueButton: {
    marginTop: THEME.spacing.sm,
  },
  
  categoriesScroll: {
    marginHorizontal: -THEME.spacing.lg,
    paddingHorizontal: THEME.spacing.lg,
  },
  
  categoryItem: {
    marginRight: THEME.spacing.md,
    position: 'relative',
  },

  categoryTouchable: {
    flex: 1,
  },

  categoryAIButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: THEME.colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },

  categoryAIText: {
    fontSize: 10,
  },
  
  categoryCard: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    alignItems: 'center',
    minWidth: 80,
  },
  
  categoryCardSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: `${THEME.colors.primary}10`,
  },
  
  categoryIcon: {
    fontSize: 24,
    marginBottom: THEME.spacing.xs,
  },
  
  categoryLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },
  
  categoryLabelSelected: {
    color: THEME.colors.primary,
  },
  
  workoutCard: {
    marginBottom: THEME.spacing.md,
  },
  
  workoutContent: {
    padding: THEME.spacing.lg,
  },
  
  workoutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },

  workoutTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    flex: 1,
  },

  aiGeneratedBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },

  aiGeneratedText: {
    color: THEME.colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  
  workoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  workoutMetaText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
  
  workoutMetaDot: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textMuted,
    marginHorizontal: THEME.spacing.xs,
  },

  workoutDescription: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
    lineHeight: 18,
  },

  workoutRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: THEME.spacing.xs,
  },

  ratingStars: {
    fontSize: 14,
    marginRight: 4,
  },

  ratingText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
    fontWeight: THEME.fontWeight.medium,
    marginRight: 4,
  },

  completionsText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
  },
  
  workoutIcon: {
    width: 48,
    height: 48,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  workoutFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: THEME.spacing.md,
  },
  
  caloriesContainer: {
    flex: 1,
  },
  
  caloriesText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
  
  startButton: {
    paddingHorizontal: THEME.spacing.lg,
  },
  
  statsGrid: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
  },
  
  statCard: {
    flex: 1,
    padding: THEME.spacing.lg,
    alignItems: 'center',
  },
  
  statValue: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
    marginBottom: THEME.spacing.xs,
  },
  
  statLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },
  
  bottomSpacing: {
    height: THEME.spacing.xl,
  },

  contextMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },

  contextMenu: {
    position: 'absolute',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: THEME.spacing.sm,
    minWidth: 180,
    ...THEME.shadows.md,
  },

  contextMenuItem: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
  },

  contextMenuText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    fontWeight: THEME.fontWeight.medium,
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.xl,
  },

  loadingText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.md,
  },

  errorCard: {
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
    alignItems: 'center',
  },

  errorText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.error,
    textAlign: 'center',
    marginBottom: THEME.spacing.md,
  },

  retryButton: {
    paddingHorizontal: THEME.spacing.lg,
  },

  // Weekly plan styles
  weeklyPlanCard: {
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
  },

  weeklyPlanContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },

  weeklyPlanIcon: {
    fontSize: 32,
    marginRight: THEME.spacing.md,
  },

  weeklyPlanText: {
    flex: 1,
  },

  weeklyPlanTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  weeklyPlanSubtitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginBottom: THEME.spacing.xs,
  },

  weeklyPlanGoals: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.medium,
  },

  weeklyPlanButton: {
    minWidth: '100%',
  },

  // Empty state styles
  emptyStateCard: {
    padding: THEME.spacing.xl,
    marginBottom: THEME.spacing.lg,
  },

  emptyStateContent: {
    alignItems: 'center',
  },

  emptyStateIcon: {
    fontSize: 48,
    marginBottom: THEME.spacing.md,
  },

  emptyStateTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
    textAlign: 'center',
  },

  emptyStateText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.lg,
    lineHeight: 22,
  },

  emptyStateButton: {
    minWidth: 180,
  },
});
