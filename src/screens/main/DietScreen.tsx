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
  TextInput,
  Animated,
} from 'react-native';
import { Button, Card, THEME } from '../../components/ui';
import { Camera } from '../../components/advanced/Camera';
import { unifiedAIService } from '../../ai';
import { useUserStore } from '../../stores/userStore';
import { useAuth } from '../../hooks/useAuth';
import { useNutritionData } from '../../hooks/useNutritionData';
import { Meal, DailyMealPlan } from '../../types/ai';
import { Food } from '../../services/nutritionData';

export const DietScreen: React.FC = () => {
  const [showCamera, setShowCamera] = useState(false);
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Authentication and user data
  const { user, isAuthenticated } = useAuth();
  const { profile } = useUserStore();

  // Real nutrition data with Track B integration
  const {
    foods,
    foodsLoading,
    foodsError,
    loadFoods,
    userMeals,
    userMealsLoading,
    userMealsError,
    loadUserMeals,
    dietPreferences,
    nutritionGoals,
    dailyNutrition,
    loadDailyNutrition,
    logMeal,
    trackBStatus,
    refreshAll,
    clearErrors,
  } = useNutritionData();

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

  const handleCameraCapture = (imageUri: string) => {
    console.log('Food image captured:', imageUri);
    setShowCamera(false);
    // TODO: Process image with AI food recognition
    Alert.alert('Success', 'Food image captured! AI analysis coming soon.');
  };

  // AI Meal Generation Function with real user preferences
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
      // Use real user diet preferences if available
      const preferences = {
        dietaryRestrictions: dietPreferences?.allergies || [],
        cuisinePreference: 'any',
        prepTimeLimit: 30,
        calorieTarget: nutritionGoals?.daily_calories || 2000,
        dietType: dietPreferences?.diet_type || [],
        dislikes: dietPreferences?.dislikes || [],
      };

      const response = await unifiedAIService.generateMeal(
        profile.personalInfo,
        profile.fitnessGoals,
        mealType,
        preferences
      );

      if (response.success && response.data) {
        setAiMeals(prev => [response.data!, ...prev]);

        // Optionally save the generated meal to the database
        if (user?.id && response.data.ingredients && foods.length > 0) {
          // Convert AI meal to meal log format (simplified)
          const mealData = {
            name: response.data.name,
            type: mealType,
            foods: response.data.ingredients.slice(0, 3).map((ingredient: any, index: number) => ({
              food_id: foods[index % foods.length]?.id || foods[0]?.id,
              quantity_grams: 100, // Default quantity
            })).filter(f => f.food_id),
          };

          if (mealData.foods.length > 0) {
            await logMeal(mealData);
          }
        }

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
    setShowFoodSearch(!showFoodSearch);
  };

  // Convert real foods to display format for search
  const convertFoodToDisplay = (food: Food) => ({
    id: food.id,
    name: food.name,
    calories: Math.round(food.calories_per_100g),
    protein: Math.round(food.protein_per_100g * 10) / 10,
    carbs: Math.round(food.carbs_per_100g * 10) / 10,
    fat: Math.round(food.fat_per_100g * 10) / 10,
    category: food.category,
  });

  // Real food database from Supabase
  const foodDatabase = foods.map(convertFoodToDisplay);

  // Load foods when search query changes
  useEffect(() => {
    if (isAuthenticated) {
      const filters: any = {};

      if (searchQuery) {
        filters.search = searchQuery;
      }

      loadFoods(filters);
    }
  }, [searchQuery, isAuthenticated, loadFoods]);

  // Filter foods based on search query
  const filteredFoods = searchQuery
    ? foodDatabase.filter(food =>
        food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        food.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : foodDatabase;

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

  // Enhanced mock meals with detailed nutrition data
  const staticMeals = [
    {
      id: 1,
      type: 'Breakfast',
      time: '8:00 AM',
      calories: 385,
      items: ['Steel-cut oatmeal with blueberries', 'Greek yogurt (150g)', 'Black coffee', 'Honey (1 tbsp)'],
      icon: '🥣',
      isAIGenerated: false,
      nutrition: {
        protein: 18,
        carbs: 52,
        fat: 8,
        fiber: 7,
        sugar: 22,
      },
      prepTime: '10 min',
      difficulty: 'Easy',
      rating: 4.6,
    },
    {
      id: 2,
      type: 'Lunch',
      time: '12:30 PM',
      calories: 485,
      items: ['Grilled chicken breast (120g)', 'Quinoa salad', 'Mixed greens', 'Avocado (1/2)', 'Olive oil dressing'],
      icon: '🥗',
      isAIGenerated: false,
      nutrition: {
        protein: 35,
        carbs: 28,
        fat: 22,
        fiber: 8,
        sugar: 6,
      },
      prepTime: '15 min',
      difficulty: 'Medium',
      rating: 4.8,
    },
    {
      id: 3,
      type: 'Snack',
      time: '3:00 PM',
      calories: 180,
      items: ['Medium apple', 'Raw almonds (20g)', 'Water'],
      icon: '🍎',
      isAIGenerated: false,
      nutrition: {
        protein: 6,
        carbs: 18,
        fat: 12,
        fiber: 6,
        sugar: 14,
      },
      prepTime: '2 min',
      difficulty: 'Easy',
      rating: 4.3,
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
      nutrition: {
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
      },
      prepTime: '0 min',
      difficulty: 'N/A',
      rating: 0,
    },
  ];

  // Combine AI meals with static meals
  const aiMealsDisplay = aiMeals.map(convertAIMealToDisplay);
  const todaysMeals = [...aiMealsDisplay, ...staticMeals];

  // Use real daily nutrition data from Track B
  const currentNutrition = dailyNutrition || {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    mealsCount: 0,
  };

  // Use real nutrition goals or defaults
  const nutritionTargets = {
    calories: { current: currentNutrition.calories, target: nutritionGoals?.daily_calories || 2000 },
    protein: { current: currentNutrition.protein, target: nutritionGoals?.daily_protein || 120 },
    carbs: { current: currentNutrition.carbs, target: nutritionGoals?.daily_carbs || 250 },
    fat: { current: currentNutrition.fat, target: nutritionGoals?.daily_fat || 67 },
    fiber: { current: 0, target: 25 }, // Fiber not tracked yet
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
            {/* Track B Status Indicator */}
            <TouchableOpacity style={styles.statusButton}>
              <Text style={styles.statusIcon}>
                {trackBStatus.isConnected ? '🟢' : '🔴'}
              </Text>
            </TouchableOpacity>
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
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleSearchFood}
            >
              <Text style={styles.addIcon}>🔍</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading State */}
        {(foodsLoading || userMealsLoading) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Loading nutrition data...</Text>
          </View>
        )}

        {/* Error State */}
        {(foodsError || userMealsError) && (
          <Card style={styles.errorCard} variant="outlined">
            <Text style={styles.errorText}>
              ⚠️ {foodsError || userMealsError}
            </Text>
            <Button
              title="Retry"
              onPress={refreshAll}
              variant="outline"
              size="sm"
              style={styles.retryButton}
            />
          </Card>
        )}

        {/* No Authentication State */}
        {!isAuthenticated && (
          <Card style={styles.errorCard} variant="outlined">
            <Text style={styles.errorText}>🔐 Please sign in to track your nutrition</Text>
          </Card>
        )}

        {/* Food Search */}
        {showFoodSearch && (
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search foods..."
                placeholderTextColor={THEME.colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => {
                  setSearchQuery('');
                  setShowFoodSearch(false);
                }}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            </View>

            {searchQuery && (
              <ScrollView style={styles.foodResults} horizontal showsHorizontalScrollIndicator={false}>
                {filteredFoods.map((food) => (
                  <TouchableOpacity key={food.id} style={styles.foodItem}>
                    <Text style={styles.foodName}>{food.name}</Text>
                    <Text style={styles.foodCategory}>{food.category}</Text>
                    <Text style={styles.foodCalories}>{food.calories} cal</Text>
                    <View style={styles.foodMacros}>
                      <Text style={styles.foodMacro}>P: {food.protein}g</Text>
                      <Text style={styles.foodMacro}>C: {food.carbs}g</Text>
                      <Text style={styles.foodMacro}>F: {food.fat}g</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Daily Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Progress</Text>
          <Card style={styles.overviewCard} variant="elevated">
            <View style={styles.caloriesSection}>
              <View style={styles.caloriesHeader}>
                <Text style={styles.caloriesConsumed}>{nutritionTargets.calories.current}</Text>
                <Text style={styles.caloriesTarget}>/ {nutritionTargets.calories.target} cal</Text>
              </View>
              <View style={styles.caloriesProgress}>
                <View style={styles.progressBar}>
                  <View style={[
                    styles.progressFill,
                    { width: `${Math.min((nutritionTargets.calories.current / nutritionTargets.calories.target) * 100, 100)}%` }
                  ]} />
                </View>
                <Text style={styles.remainingText}>
                  {Math.max(nutritionTargets.calories.target - nutritionTargets.calories.current, 0)} cal remaining
                </Text>
              </View>
            </View>

            <View style={styles.macrosGrid}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{Math.round(nutritionTargets.protein.current)}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
                <Text style={styles.macroTarget}>of {nutritionTargets.protein.target}g</Text>
              </View>

              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{Math.round(nutritionTargets.carbs.current)}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
                <Text style={styles.macroTarget}>of {nutritionTargets.carbs.target}g</Text>
              </View>

              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{Math.round(nutritionTargets.fat.current)}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
                <Text style={styles.macroTarget}>of {nutritionTargets.fat.target}g</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Today's Meals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Meals</Text>
          
          {todaysMeals.map((meal, index) => (
            <Animated.View
              key={meal.id}
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
              <Card style={styles.mealCard} variant="outlined">
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
                      <View>
                        <View style={styles.mealItems}>
                          {meal.items.map((item, index) => (
                            <Text key={index} style={styles.mealItem}>• {item}</Text>
                          ))}
                        </View>
                        {meal.nutrition && (
                          <View style={styles.mealNutrition}>
                            <Text style={styles.nutritionText}>P: {meal.nutrition.protein}g</Text>
                            <Text style={styles.nutritionDot}>•</Text>
                            <Text style={styles.nutritionText}>C: {meal.nutrition.carbs}g</Text>
                            <Text style={styles.nutritionDot}>•</Text>
                            <Text style={styles.nutritionText}>F: {meal.nutrition.fat}g</Text>
                            {meal.prepTime && (
                              <>
                                <Text style={styles.nutritionDot}>•</Text>
                                <Text style={styles.nutritionText}>{meal.prepTime}</Text>
                              </>
                            )}
                          </View>
                        )}
                        {meal.rating && meal.rating > 0 && (
                          <View style={styles.mealRating}>
                            <Text style={styles.ratingStars}>⭐</Text>
                            <Text style={styles.ratingText}>{meal.rating}</Text>
                            <Text style={styles.difficultyText}>• {meal.difficulty}</Text>
                          </View>
                        )}
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
            </Animated.View>
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

  // Search styles
  searchSection: {
    marginHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
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

  foodResults: {
    marginTop: THEME.spacing.md,
    maxHeight: 120,
  },

  foodItem: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginRight: THEME.spacing.sm,
    minWidth: 140,
    ...THEME.shadows.sm,
  },

  foodName: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: 2,
  },

  foodCategory: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
    marginBottom: 4,
  },

  foodCalories: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.medium,
    marginBottom: 4,
  },

  foodMacros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  foodMacro: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
  },

  // Enhanced meal card styles
  mealNutrition: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: THEME.spacing.lg,
    marginTop: THEME.spacing.xs,
  },

  nutritionText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
  },

  nutritionDot: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
    marginHorizontal: 4,
  },

  mealRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: THEME.spacing.lg,
    marginTop: THEME.spacing.xs,
  },

  ratingStars: {
    fontSize: 12,
    marginRight: 4,
  },

  ratingText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.text,
    fontWeight: THEME.fontWeight.medium,
  },

  difficultyText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
    marginLeft: 4,
  },

  statusButton: {
    width: 32,
    height: 32,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statusIcon: {
    fontSize: 16,
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
