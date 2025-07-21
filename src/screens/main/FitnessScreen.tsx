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
import { unifiedAIService } from '../../ai';
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

  const categories = [
    { id: 'all', label: 'All', icon: '🏋️' },
    { id: 'strength', label: 'Strength', icon: '💪' },
    { id: 'cardio', label: 'Cardio', icon: '🏃' },
    { id: 'flexibility', label: 'Flexibility', icon: '🧘' },
  ];

  // AI Workout Generation Function with real user preferences
  const generateAIWorkout = async (workoutType?: 'strength' | 'cardio' | 'flexibility' | 'hiit') => {
    if (!profile?.personalInfo || !profile?.fitnessGoals) {
      Alert.alert(
        'Profile Incomplete',
        'Please complete your profile to generate personalized workouts.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsGeneratingWorkout(true);
    setAiError(null);

    try {
      // Use real user preferences if available
      const preferences = {
        workoutType: workoutType || 'strength',
        duration: workoutPreferences?.time_preference || 45,
        equipment: workoutPreferences?.equipment || ['bodyweight', 'dumbbells'],
        location: workoutPreferences?.location || 'home',
        intensity: workoutPreferences?.intensity || fitnessGoals?.experience_level || 'intermediate',
      };

      const response = await unifiedAIService.generateWorkout(
        profile.personalInfo,
        profile.fitnessGoals,
        preferences
      );

      if (response.success && response.data) {
        setAiWorkouts(prev => [response.data!, ...prev]);

        // Optionally save the generated workout to the database
        if (user?.id) {
          await createWorkout({
            name: response.data.name,
            type: workoutType || 'strength',
            duration_minutes: response.data.duration,
            calories_burned: response.data.estimatedCalories,
            notes: `AI-generated ${workoutType || 'strength'} workout`,
          });
        }

        Alert.alert(
          'Workout Generated! 🎉',
          `Your personalized ${workoutType || 'strength'} workout is ready!`,
          [{ text: 'Great!' }]
        );
      } else {
        setAiError(response.error || 'Failed to generate workout');
        Alert.alert('Generation Failed', response.error || 'Failed to generate workout');
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

  // Convert real exercises to workout display format
  const convertExerciseToWorkout = (exercise: Exercise) => ({
    id: exercise.id,
    title: exercise.name,
    duration: '30 min', // Default duration
    difficulty: exercise.difficulty_level,
    calories: `${Math.round(exercise.calories_per_minute * 30)} cal`,
    category: exercise.category.toLowerCase(),
    icon: getWorkoutIcon(exercise.category.toLowerCase()),
    exercises: 1,
    isAIGenerated: false,
    description: `${exercise.category} exercise targeting ${exercise.muscle_groups.join(', ')}`,
    equipment: exercise.equipment,
    rating: 4.5, // Default rating
    completions: Math.floor(Math.random() * 1000) + 500, // Random completions for now
  });

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
    rating: 4.5,
    completions: 1,
    isUserWorkout: true,
    completed_at: workout.completed_at,
  });

  // Combine all workout sources
  const aiWorkoutsDisplay = aiWorkouts.map(convertAIWorkoutToDisplay);
  const exerciseWorkouts = exercises.map(convertExerciseToWorkout);
  const userWorkoutsDisplay = userWorkouts.map(convertUserWorkoutToDisplay);
  const allWorkouts = [...aiWorkoutsDisplay, ...userWorkoutsDisplay, ...exerciseWorkouts];

  // Filter workouts by category and search query
  const filteredWorkouts = allWorkouts.filter(workout => {
    const matchesCategory = selectedCategory === 'all' || workout.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      workout.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workout.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workout.difficulty.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Load exercises when category or search changes
  useEffect(() => {
    if (isAuthenticated) {
      const filters: any = {};

      if (selectedCategory !== 'all') {
        filters.category = selectedCategory;
      }

      if (searchQuery) {
        filters.search = searchQuery;
      }

      loadExercises(filters);
    }
  }, [selectedCategory, searchQuery, isAuthenticated, loadExercises]);

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
      // If it's an exercise, create a simple workout with that exercise
      if (workout.id && exercises.find(ex => ex.id === workout.id)) {
        const exercise = exercises.find(ex => ex.id === workout.id);
        if (exercise) {
          const success = await startWorkoutSession({
            name: `${exercise.name} Workout`,
            type: exercise.category.toLowerCase(),
            exercises: [{
              exercise_id: exercise.id,
              sets: 3,
              reps: exercise.category === 'Strength' ? 12 : undefined,
              duration_seconds: exercise.category !== 'Strength' ? 60 : undefined,
              rest_seconds: 60,
            }],
          });

          if (success) {
            Alert.alert(
              'Workout Started! 🎯',
              `Your ${exercise.name} workout has been created and is ready to begin.`,
              [{ text: 'Great!' }]
            );
          } else {
            Alert.alert('Error', 'Failed to start workout. Please try again.');
          }
        }
      } else {
        // For other workout types, show a placeholder
        Alert.alert(
          'Start Workout',
          `Starting ${workout.title}...`,
          [{ text: 'OK' }]
        );
      }
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
              onPress={() => generateAIWorkout()}
              disabled={isGeneratingWorkout}
            >
              {isGeneratingWorkout ? (
                <ActivityIndicator size="small" color={THEME.colors.white} />
              ) : (
                <Text style={styles.aiButtonText}>🤖 AI</Text>
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

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
          >
            {categories.map((category) => (
              <View key={category.id} style={styles.categoryItem}>
                <TouchableOpacity
                  onPress={() => setSelectedCategory(category.id)}
                  style={styles.categoryTouchable}
                >
                  <Card
                    style={[
                      styles.categoryCard,
                      selectedCategory === category.id && styles.categoryCardSelected,
                    ]}
                    variant="outlined"
                  >
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                    <Text style={[
                      styles.categoryLabel,
                      selectedCategory === category.id && styles.categoryLabelSelected,
                    ]}>
                      {category.label}
                    </Text>
                  </Card>
                </TouchableOpacity>
                {category.id !== 'all' && (
                  <TouchableOpacity
                    style={styles.categoryAIButton}
                    onPress={() => generateAIWorkout(category.id as any)}
                    disabled={isGeneratingWorkout}
                  >
                    <Text style={styles.categoryAIText}>🤖</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Workouts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory === 'all' ? 'All Workouts' : `${categories.find(c => c.id === selectedCategory)?.label} Workouts`}
            </Text>
            <TouchableOpacity onPress={refreshAll}>
              <Text style={styles.seeAllText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {/* Loading State */}
          {exercisesLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={THEME.colors.primary} />
              <Text style={styles.loadingText}>Loading workouts...</Text>
            </View>
          )}

          {/* Error State */}
          {exercisesError && (
            <Card style={styles.errorCard} variant="outlined">
              <Text style={styles.errorText}>⚠️ {exercisesError}</Text>
              <Button
                title="Retry"
                onPress={() => loadExercises()}
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

          {/* Workouts List */}
          {!exercisesLoading && !exercisesError && isAuthenticated && filteredWorkouts.map((workout, index) => (
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
                    {workout.rating && (
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
});
