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
} from 'react-native';
import { Button, Card, THEME } from '../../components/ui';
import { unifiedAIService } from '../../ai';
import { useUserStore } from '../../stores/userStore';
import { Workout } from '../../types/ai';

export const FitnessScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
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

  // User data for AI generation
  const { profile } = useUserStore();

  const categories = [
    { id: 'all', label: 'All', icon: '🏋️' },
    { id: 'strength', label: 'Strength', icon: '💪' },
    { id: 'cardio', label: 'Cardio', icon: '🏃' },
    { id: 'flexibility', label: 'Flexibility', icon: '🧘' },
  ];

  // AI Workout Generation Function
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
      const preferences = {
        workoutType: workoutType || 'strength',
        duration: 45, // Default 45 minutes
        equipment: ['bodyweight', 'dumbbells'], // Default equipment
      };

      const response = await unifiedAIService.generateWorkout(
        profile.personalInfo,
        profile.fitnessGoals,
        preferences
      );

      if (response.success && response.data) {
        setAiWorkouts(prev => [response.data!, ...prev]);
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

  // Static demo workouts (fallback)
  const staticWorkouts = [
    {
      id: 1,
      title: 'Upper Body Blast',
      duration: '45 min',
      difficulty: 'Intermediate',
      calories: '320 cal',
      category: 'strength',
      icon: '💪',
      exercises: 8,
      isAIGenerated: false,
    },
    {
      id: 2,
      title: 'HIIT Cardio',
      duration: '30 min',
      difficulty: 'Advanced',
      calories: '450 cal',
      category: 'cardio',
      icon: '🔥',
      exercises: 6,
      isAIGenerated: false,
    },
    {
      id: 3,
      title: 'Morning Yoga',
      duration: '25 min',
      difficulty: 'Beginner',
      calories: '120 cal',
      category: 'flexibility',
      icon: '🧘',
      exercises: 12,
      isAIGenerated: false,
    },
    {
      id: 4,
      title: 'Core Crusher',
      duration: '20 min',
      difficulty: 'Intermediate',
      calories: '180 cal',
      category: 'strength',
      icon: '⚡',
      exercises: 6,
      isAIGenerated: false,
    },
  ];

  // Combine AI workouts with static workouts
  const aiWorkoutsDisplay = aiWorkouts.map(convertAIWorkoutToDisplay);
  const allWorkouts = [...aiWorkoutsDisplay, ...staticWorkouts];

  const filteredWorkouts = selectedCategory === 'all'
    ? allWorkouts
    : allWorkouts.filter(workout => workout.category === selectedCategory);

  const handleWorkoutLongPress = (workoutId: string, event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setContextMenu({
      visible: true,
      workoutId,
      position: { x: pageX, y: pageY },
    });
  };

  const handleContextMenuAction = (action: string) => {
    const workout = workouts.find(w => w.id === contextMenu.workoutId);
    setContextMenu({ visible: false, workoutId: null, position: { x: 0, y: 0 } });

    switch (action) {
      case 'start':
        Alert.alert('Start Workout', `Starting ${workout?.title}...`);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Fitness</Text>
          <View style={styles.headerButtons}>
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
            <TouchableOpacity style={styles.searchButton}>
              <Text style={styles.searchIcon}>🔍</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Workout */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continue Your Workout</Text>
          <Card style={styles.currentWorkoutCard} variant="elevated">
            <View style={styles.workoutHeader}>
              <View style={styles.workoutInfo}>
                <Text style={styles.currentWorkoutTitle}>Upper Body Strength</Text>
                <Text style={styles.currentWorkoutProgress}>3 of 8 exercises completed</Text>
              </View>
              <View style={styles.workoutIconLarge}>
                <Text style={styles.workoutEmoji}>💪</Text>
              </View>
            </View>
            
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '37.5%' }]} />
              </View>
              <Text style={styles.progressText}>15 min remaining</Text>
            </View>
            
            <Button
              title="Continue Workout"
              onPress={() => {}}
              variant="primary"
              style={styles.continueButton}
            />
          </Card>
        </View>

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
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {filteredWorkouts.map((workout) => (
            <Card key={workout.id} style={styles.workoutCard} variant="outlined">
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
                    onPress={() => {}}
                    variant="outline"
                    size="sm"
                    style={styles.startButton}
                  />
                </View>
              </TouchableOpacity>
            </Card>
          ))}
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.statsGrid}>
            <Card style={styles.statCard} variant="elevated">
              <Text style={styles.statValue}>5</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </Card>
            
            <Card style={styles.statCard} variant="elevated">
              <Text style={styles.statValue}>3.2h</Text>
              <Text style={styles.statLabel}>Total Time</Text>
            </Card>
            
            <Card style={styles.statCard} variant="elevated">
              <Text style={styles.statValue}>1,240</Text>
              <Text style={styles.statLabel}>Calories</Text>
            </Card>
          </View>
        </View>

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
});
