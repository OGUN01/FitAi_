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
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Button, Card, THEME } from '../../components/ui';
import { Camera } from '../../components/advanced/Camera';
import { unifiedAIService } from '../../ai';
import { useUserStore } from '../../stores/userStore';
import { Meal, DailyMealPlan } from '../../types/ai';

export const DietScreen: React.FC = () => {
  const [showCamera, setShowCamera] = useState(false);
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    mealId: string | null;
    position: { x: number; y: number };
  }>({
    visible: false,
    mealId: null,
    position: { x: 0, y: 0 },
  });

  // AI Integration State
  const [aiMeals, setAiMeals] = useState<Meal[]>([]);
  const [isGeneratingMeal, setIsGeneratingMeal] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // User data for AI generation
  const { profile } = useUserStore();

  const handleCameraCapture = (imageUri: string) => {
    console.log('Food image captured:', imageUri);
    setShowCamera(false);
    // TODO: Process image with AI food recognition
    Alert.alert('Success', 'Food image captured! AI analysis coming soon.');
  };

  // AI Meal Generation Function
  const generateAIMeal = async (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    if (!profile?.personalInfo || !profile?.fitnessGoals) {
      Alert.alert(
        'Profile Incomplete',
        'Please complete your profile to generate personalized meals.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsGeneratingMeal(true);
    setAiError(null);

    try {
      const preferences = {
        dietaryRestrictions: [], // Could be expanded based on user preferences
        cuisinePreference: 'any',
        prepTimeLimit: 30,
      };

      const response = await unifiedAIService.generateMeal(
        profile.personalInfo,
        profile.fitnessGoals,
        mealType,
        preferences
      );

      if (response.success && response.data) {
        setAiMeals(prev => [response.data!, ...prev]);
        Alert.alert(
          'Meal Generated! 🍽️',
          `Your personalized ${mealType} is ready!`,
          [{ text: 'Great!' }]
        );
      } else {
        setAiError(response.error || 'Failed to generate meal');
        Alert.alert('Generation Failed', response.error || 'Failed to generate meal');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setAiError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsGeneratingMeal(false);
    }
  };

  // Generate Daily Meal Plan
  const generateDailyMealPlan = async () => {
    if (!profile?.personalInfo || !profile?.fitnessGoals) {
      Alert.alert(
        'Profile Incomplete',
        'Please complete your profile to generate meal plans.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsGeneratingMeal(true);
    setAiError(null);

    try {
      const preferences = {
        calorieTarget: 2000, // Could be calculated based on user goals
        dietaryRestrictions: [],
        cuisinePreferences: ['any'],
      };

      const response = await unifiedAIService.generateDailyMealPlan(
        profile.personalInfo,
        profile.fitnessGoals,
        preferences
      );

      if (response.success && response.data) {
        setAiMeals(prev => [...response.data!.meals, ...prev]);
        Alert.alert(
          'Daily Meal Plan Generated! 🗓️',
          `Your complete meal plan for today is ready!`,
          [{ text: 'Awesome!' }]
        );
      } else {
        setAiError(response.error || 'Failed to generate meal plan');
        Alert.alert('Generation Failed', response.error || 'Failed to generate meal plan');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setAiError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsGeneratingMeal(false);
    }
  };

  const handleSearchFood = () => {
    setShowFoodSearch(true);
    // TODO: Implement food search functionality
    Alert.alert('Coming Soon', 'Food search functionality will be available soon!');
  };

  const handleMealLongPress = (mealId: string, event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setContextMenu({
      visible: true,
      mealId,
      position: { x: pageX, y: pageY },
    });
  };

  const handleContextMenuAction = (action: string) => {
    const meal = todaysMeals.find(m => m.id === contextMenu.mealId);
    setContextMenu({ visible: false, mealId: null, position: { x: 0, y: 0 } });

    switch (action) {
      case 'edit':
        Alert.alert('Edit Meal', `Editing ${meal?.type}...`);
        break;
      case 'delete':
        Alert.alert('Delete Meal', `Deleting ${meal?.type}...`);
        break;
      case 'duplicate':
        Alert.alert('Duplicate', `Duplicating ${meal?.type}...`);
        break;
      case 'details':
        Alert.alert('Details', `Showing nutrition details for ${meal?.type}`);
        break;
    }
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, mealId: null, position: { x: 0, y: 0 } });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call to refresh data
    setTimeout(() => {
      setRefreshing(false);
      Alert.alert('Refreshed', 'Diet data has been updated!');
    }, 1500);
  };

  // Convert AI meals to display format
  const convertAIMealToDisplay = (aiMeal: Meal, index: number) => ({
    id: `ai-${index}`,
    type: aiMeal.type.charAt(0).toUpperCase() + aiMeal.type.slice(1),
    time: getMealTime(aiMeal.type),
    icon: getMealIcon(aiMeal.type),
    items: aiMeal.foods?.map(food => food.name) || [],
    calories: aiMeal.totalCalories || 0,
    isAIGenerated: true,
  });

  const getMealTime = (type: string) => {
    switch (type) {
      case 'breakfast': return '8:00 AM';
      case 'lunch': return '12:30 PM';
      case 'dinner': return '7:00 PM';
      case 'snack': return '3:00 PM';
      default: return '12:00 PM';
    }
  };

  const getMealIcon = (type: string) => {
    switch (type) {
      case 'breakfast': return '🥣';
      case 'lunch': return '🥗';
      case 'dinner': return '🍽️';
      case 'snack': return '🍎';
      default: return '🍽️';
    }
  };

  // Static demo meals (fallback)
  const staticMeals = [
    {
      id: 1,
      type: 'Breakfast',
      time: '8:00 AM',
      calories: 320,
      items: ['Oatmeal with berries', 'Greek yogurt', 'Coffee'],
      icon: '🥣',
      isAIGenerated: false,
    },
    {
      id: 2,
      type: 'Lunch',
      time: '12:30 PM',
      calories: 450,
      items: ['Grilled chicken salad', 'Quinoa', 'Avocado'],
      icon: '🥗',
      isAIGenerated: false,
    },
    {
      id: 3,
      type: 'Snack',
      time: '3:00 PM',
      calories: 150,
      items: ['Apple', 'Almonds'],
      icon: '🍎',
      isAIGenerated: false,
    },
    {
      id: 4,
      type: 'Dinner',
      time: '7:00 PM',
      calories: 0,
      items: [],
      icon: '🍽️',
      planned: true,
      isAIGenerated: false,
    },
  ];

  // Combine AI meals with static meals
  const aiMealsDisplay = aiMeals.map(convertAIMealToDisplay);
  const todaysMeals = [...aiMealsDisplay, ...staticMeals];

  const nutritionGoals = {
    calories: { current: 920, target: 2000 },
    protein: { current: 45, target: 120 },
    carbs: { current: 85, target: 250 },
    fat: { current: 32, target: 67 },
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.colors.primary}
            colors={[THEME.colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Nutrition</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[styles.aiButton, isGeneratingMeal && styles.aiButtonDisabled]}
              onPress={generateDailyMealPlan}
              disabled={isGeneratingMeal}
            >
              {isGeneratingMeal ? (
                <ActivityIndicator size="small" color={THEME.colors.white} />
              ) : (
                <Text style={styles.aiButtonText}>🤖 Plan</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton}>
              <Text style={styles.addIcon}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Progress</Text>
          <Card style={styles.overviewCard} variant="elevated">
            <View style={styles.caloriesSection}>
              <View style={styles.caloriesHeader}>
                <Text style={styles.caloriesConsumed}>{nutritionGoals.calories.current}</Text>
                <Text style={styles.caloriesTarget}>/ {nutritionGoals.calories.target} cal</Text>
              </View>
              <View style={styles.caloriesProgress}>
                <View style={styles.progressBar}>
                  <View style={[
                    styles.progressFill, 
                    { width: `${(nutritionGoals.calories.current / nutritionGoals.calories.target) * 100}%` }
                  ]} />
                </View>
                <Text style={styles.remainingText}>
                  {nutritionGoals.calories.target - nutritionGoals.calories.current} cal remaining
                </Text>
              </View>
            </View>
            
            <View style={styles.macrosGrid}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{nutritionGoals.protein.current}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
                <Text style={styles.macroTarget}>of {nutritionGoals.protein.target}g</Text>
              </View>
              
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{nutritionGoals.carbs.current}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
                <Text style={styles.macroTarget}>of {nutritionGoals.carbs.target}g</Text>
              </View>
              
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{nutritionGoals.fat.current}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
                <Text style={styles.macroTarget}>of {nutritionGoals.fat.target}g</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Today's Meals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Meals</Text>
          
          {todaysMeals.map((meal) => (
            <Card key={meal.id} style={styles.mealCard} variant="outlined">
              <TouchableOpacity
                style={styles.mealContent}
                onLongPress={(event) => handleMealLongPress(meal.id, event)}
              >
                <View style={styles.mealHeader}>
                  <View style={styles.mealInfo}>
                    <View style={styles.mealTitleRow}>
                      <Text style={styles.mealIcon}>{meal.icon}</Text>
                      <Text style={styles.mealType}>{meal.type}</Text>
                      <Text style={styles.mealTime}>{meal.time}</Text>
                      {meal.isAIGenerated && (
                        <View style={styles.aiGeneratedBadge}>
                          <Text style={styles.aiGeneratedText}>🤖 AI</Text>
                        </View>
                      )}
                      {meal.items.length === 0 && !meal.planned && (
                        <TouchableOpacity
                          style={styles.mealAIButton}
                          onPress={() => generateAIMeal(meal.type.toLowerCase() as any)}
                          disabled={isGeneratingMeal}
                        >
                          <Text style={styles.mealAIText}>🤖</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    {meal.items.length > 0 ? (
                      <View style={styles.mealItems}>
                        {meal.items.map((item, index) => (
                          <Text key={index} style={styles.mealItem}>• {item}</Text>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.plannedText}>Tap to plan your meal</Text>
                    )}
                  </View>
                  
                  <View style={styles.mealCalories}>
                    <Text style={styles.caloriesValue}>
                      {meal.calories > 0 ? `${meal.calories}` : '0'}
                    </Text>
                    <Text style={styles.caloriesLabel}>cal</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Card>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => setShowCamera(true)}
            >
              <Card style={styles.actionCard} variant="outlined">
                <Text style={styles.actionIcon}>📷</Text>
                <Text style={styles.actionText}>Scan Food</Text>
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleSearchFood}
            >
              <Card style={styles.actionCard} variant="outlined">
                <Text style={styles.actionIcon}>🔍</Text>
                <Text style={styles.actionText}>Search Food</Text>
              </Card>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionItem}>
              <Card style={styles.actionCard} variant="outlined">
                <Text style={styles.actionIcon}>📝</Text>
                <Text style={styles.actionText}>Create Recipe</Text>
              </Card>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionItem}>
              <Card style={styles.actionCard} variant="outlined">
                <Text style={styles.actionIcon}>💧</Text>
                <Text style={styles.actionText}>Log Water</Text>
              </Card>
            </TouchableOpacity>
          </View>
        </View>

        {/* Water Intake */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Water Intake</Text>
          <Card style={styles.waterCard} variant="elevated">
            <View style={styles.waterHeader}>
              <Text style={styles.waterIcon}>💧</Text>
              <View style={styles.waterInfo}>
                <Text style={styles.waterAmount}>6 / 8 glasses</Text>
                <Text style={styles.waterSubtext}>You're almost there!</Text>
              </View>
            </View>
            
            <View style={styles.waterProgress}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '75%' }]} />
              </View>
            </View>
            
            <Button
              title="Add Glass"
              onPress={() => {}}
              variant="outline"
              size="sm"
              style={styles.waterButton}
            />
          </Card>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Camera Modal */}
      {showCamera && (
        <Camera
          mode="food"
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
          style={styles.cameraModal}
        />
      )}

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
              onPress={() => handleContextMenuAction('edit')}
            >
              <Text style={styles.contextMenuText}>✏️ Edit Meal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => handleContextMenuAction('duplicate')}
            >
              <Text style={styles.contextMenuText}>📋 Duplicate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => handleContextMenuAction('details')}
            >
              <Text style={styles.contextMenuText}>📊 Nutrition Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => handleContextMenuAction('delete')}
            >
              <Text style={styles.contextMenuText}>🗑️ Delete Meal</Text>
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
    minWidth: 70,
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

  addButton: {
    width: 40,
    height: 40,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  addIcon: {
    fontSize: 24,
    color: THEME.colors.white,
    fontWeight: THEME.fontWeight.bold,
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
  
  overviewCard: {
    padding: THEME.spacing.lg,
  },
  
  caloriesSection: {
    marginBottom: THEME.spacing.lg,
  },
  
  caloriesHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: THEME.spacing.sm,
  },
  
  caloriesConsumed: {
    fontSize: THEME.fontSize.xxxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },
  
  caloriesTarget: {
    fontSize: THEME.fontSize.lg,
    color: THEME.colors.textSecondary,
    marginLeft: THEME.spacing.sm,
  },
  
  caloriesProgress: {
    marginBottom: THEME.spacing.md,
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
  
  remainingText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
  
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  
  macroValue: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  
  macroLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
  },
  
  macroTarget: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
  },
  
  mealCard: {
    marginBottom: THEME.spacing.md,
  },
  
  mealContent: {
    padding: THEME.spacing.lg,
  },
  
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  
  mealInfo: {
    flex: 1,
  },
  
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
    position: 'relative',
  },

  aiGeneratedBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },

  aiGeneratedText: {
    color: THEME.colors.white,
    fontSize: 9,
    fontWeight: '600',
  },

  mealAIButton: {
    position: 'absolute',
    right: 0,
    backgroundColor: THEME.colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  mealAIText: {
    fontSize: 8,
  },
  
  mealIcon: {
    fontSize: 20,
    marginRight: THEME.spacing.sm,
  },
  
  mealType: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    flex: 1,
  },
  
  mealTime: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textMuted,
  },
  
  mealItems: {
    marginLeft: THEME.spacing.lg,
  },
  
  mealItem: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.xs,
  },
  
  plannedText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
    marginLeft: THEME.spacing.lg,
  },
  
  mealCalories: {
    alignItems: 'center',
    marginLeft: THEME.spacing.md,
  },
  
  caloriesValue: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },
  
  caloriesLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
  },
  
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.md,
  },
  
  actionItem: {
    width: '47%',
  },
  
  actionCard: {
    padding: THEME.spacing.lg,
    alignItems: 'center',
  },
  
  actionIcon: {
    fontSize: 32,
    marginBottom: THEME.spacing.sm,
  },
  
  actionText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
    fontWeight: THEME.fontWeight.medium,
    textAlign: 'center',
  },
  
  waterCard: {
    padding: THEME.spacing.lg,
  },
  
  waterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  
  waterIcon: {
    fontSize: 32,
    marginRight: THEME.spacing.md,
  },
  
  waterInfo: {
    flex: 1,
  },
  
  waterAmount: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },
  
  waterSubtext: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
  },
  
  waterProgress: {
    marginBottom: THEME.spacing.lg,
  },
  
  waterButton: {
    alignSelf: 'flex-start',
  },
  
  bottomSpacing: {
    height: THEME.spacing.xl,
  },

  cameraModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
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
