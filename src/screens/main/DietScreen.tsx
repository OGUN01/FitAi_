import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/responsiveTheme';
import { Button, Card, THEME } from '../../components/ui';
import { Camera } from '../../components/advanced/Camera';
import { aiService } from '../../ai';
import { useUserStore } from '../../stores/userStore';
import { useNutritionStore } from '../../stores/nutritionStore';
import { useAuth } from '../../hooks/useAuth';
import { useNutritionData } from '../../hooks/useNutritionData';
import { Meal, DailyMealPlan } from '../../types/ai';
import { Food } from '../../services/nutritionData';
import { weeklyMealContentGenerator, WeeklyMealPlan, DayMeal } from '../../ai/weeklyMealGenerator';
import { MealCard } from '../../components/diet/MealCard';
import { completionTrackingService } from '../../services/completionTracking';

interface DietScreenProps {
  navigation?: any; // Navigation prop for routing
}

export const DietScreen: React.FC<DietScreenProps> = ({ navigation }) => {
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

  // Use nutrition store for meal plan state
  const {
    weeklyMealPlan,
    isGeneratingPlan,
    mealProgress,
    saveWeeklyMealPlan,
    setWeeklyMealPlan,
    setGeneratingPlan,
    getMealProgress,
    updateMealProgress,
    completeMeal,
    loadWeeklyMealPlan,
    loadData,
  } = useNutritionStore();
  
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[today.getDay()] || 'monday'; // fallback to monday if undefined
    console.log(`🔍 Today is: ${todayName} (day ${today.getDay()})`);
    return todayName;
  });
  const [forceUpdate, setForceUpdate] = useState(0);

  // Debug: Monitor weeklyMealPlan changes
  useEffect(() => {
    console.log(`🔍 weeklyMealPlan changed:`, weeklyMealPlan ? `Plan: ${weeklyMealPlan.planTitle}, meals: ${weeklyMealPlan.meals?.length}` : 'null');
  }, [weeklyMealPlan]);

  // Load existing meal plan on component mount
  useEffect(() => {
    const loadExistingMealPlan = async () => {
      try {
        console.log('🔍 Loading existing meal plan from store...');
        await loadData(); // Load all nutrition data
        
        const existingPlan = await loadWeeklyMealPlan();
        if (existingPlan) {
          console.log('✅ Found existing meal plan:', existingPlan.planTitle);
          setWeeklyMealPlan(existingPlan);
          
          // Comprehensive retrieval test
          console.log('🧪 COMPREHENSIVE RETRIEVAL TEST:');
          const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          const mealAvailability = allDays.map(day => {
            const mealsForDay = existingPlan.meals.filter(meal => meal.dayOfWeek === day);
            return {
              day,
              mealCount: mealsForDay.length,
              mealTypes: mealsForDay.map(m => m.type)
            };
          });
          console.log('📊 Meal availability by day:', mealAvailability);
          
          const totalMeals = existingPlan.meals.length;
          const expectedMeals = 21; // 7 days × 3 meals
          console.log(`📈 Total meals: ${totalMeals}/${expectedMeals} (${Math.round(totalMeals/expectedMeals*100)}% complete)`);
          
        } else {
          console.log('📭 No existing meal plan found');
        }
      } catch (error) {
        console.error('❌ Error loading meal plan:', error);
      }
    };

    loadExistingMealPlan();
  }, []); // Run once on mount

  // Navigation helper for profile completion
  const navigateToProfileCompletion = async (missingSection: string) => {
    if (navigation) {
      // Try to navigate to profile screen
      try {
        // Store the intent to edit diet preferences
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem('profileEditIntent', JSON.stringify({
          section: 'dietPreferences',
          fromScreen: 'Diet',
          timestamp: Date.now()
        }));

        console.log('🎯 DietScreen: Stored edit intent and navigating to Profile');
        navigation.navigate('Profile');
      } catch (error) {
        console.log('Navigation not available, showing alternative');
        showProfileCompletionModal(missingSection);
      }
    } else {
      showProfileCompletionModal(missingSection);
    }
  };

  // Show modal when navigation is not available
  const showProfileCompletionModal = (missingSection: string) => {
    Alert.alert(
      'Complete Your Profile',
      `To generate personalized meal plans, please complete your ${missingSection}.\n\nYou can update your profile from the Profile tab.`,
      [
        { text: 'OK' },
        {
          text: 'Go to Profile',
          onPress: () => {
            // This will be enhanced when we implement profile editing
            Alert.alert('Profile', 'Profile editing functionality will be available soon!');
          }
        }
      ]
    );
  };

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
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete Profile',
            onPress: () => navigateToProfileCompletion('Personal Information')
          }
        ]
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

      const response = await aiService.generateMeal(
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
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete Profile',
            onPress: () => navigateToProfileCompletion('Personal Information')
          }
        ]
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

      const response = await aiService.generateDailyMealPlan(
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

  // Generate Weekly Meal Plan (similar to workout generation)
  const generateWeeklyMealPlan = async () => {
    // Check what's missing and provide specific guidance
    const missingItems = [];
    if (!profile?.personalInfo) missingItems.push('Personal Information');
    if (!profile?.fitnessGoals) missingItems.push('Fitness Goals');
    if (!profile?.dietPreferences && !dietPreferences) missingItems.push('Diet Preferences');

    if (missingItems.length > 0) {
      const primaryMissing = missingItems[0];
      Alert.alert(
        'Profile Incomplete',
        `Please complete the following to generate your meal plan:\n\n• ${missingItems.join('\n• ')}\n\nWould you like to complete your profile now?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete Profile',
            onPress: () => navigateToProfileCompletion(primaryMissing)
          }
        ]
      );
      return;
    }

    setGeneratingPlan(true);
    setAiError(null);

    try {
      console.log('🍽️ Generating weekly meal plan...');
      console.log('🔍 Profile data:', JSON.stringify(profile, null, 2));

      // Use diet preferences from profile or from nutrition data service
      const userDietPreferences = profile.dietPreferences || {
        dietType: dietPreferences?.diet_type?.[0] as any || 'non-veg',
        allergies: dietPreferences?.allergies || [],
        cuisinePreferences: [],
        restrictions: [],
        cookingSkill: 'intermediate',
        mealPrepTime: 'moderate',
        dislikes: dietPreferences?.dislikes || [],
      };

      console.log('🔍 Calling weeklyMealContentGenerator.generateWeeklyMealPlan...');
      console.log('🔍 Parameters:', {
        personalInfo: profile.personalInfo,
        fitnessGoals: profile.fitnessGoals,
        userDietPreferences
      });
      
      const response = await weeklyMealContentGenerator.generateWeeklyMealPlan(
        profile.personalInfo,
        profile.fitnessGoals,
        userDietPreferences
      );
      
      console.log('🔍 Response from generator:', response);

      if (response.success && response.data) {
        console.log('✅ Weekly meal plan generated successfully');
        // Save to store and database
        await saveWeeklyMealPlan(response.data);
        
        // Ensure state is updated (backup approach)
        setWeeklyMealPlan(response.data);
        
        setForceUpdate(prev => prev + 1); // Force re-render
        console.log(`🔍 Meal plan saved to store and database`);
        
        // COMPREHENSIVE GENERATION TEST
        console.log('🧪 COMPREHENSIVE GENERATION TEST:');
        const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const generatedMealsByDay = allDays.map(day => {
          const mealsForDay = response.data.meals.filter(meal => meal.dayOfWeek === day);
          return {
            day,
            mealCount: mealsForDay.length,
            mealTypes: mealsForDay.map(m => m.type)
          };
        });
        console.log('📊 Generated meals by day:', generatedMealsByDay);
        
        const totalGenerated = response.data.meals.length;
        const expectedTotal = 21; // 7 days × 3 meals
        console.log(`📈 Generation completeness: ${totalGenerated}/${expectedTotal} meals (${Math.round(totalGenerated/expectedTotal*100)}%)`);
        
        if (totalGenerated === expectedTotal) {
          console.log('✅ FULL WEEK MEAL PLAN GENERATED SUCCESSFULLY!');
        } else {
          console.warn(`⚠️ Incomplete meal plan: Missing ${expectedTotal - totalGenerated} meals`);
        }

        Alert.alert(
          '🎉 Meal Plan Generated!',
          `Your personalized 7-day meal plan "${response.data.planTitle}" is ready!`,
          [{ text: 'View Plan', onPress: () => {} }]
        );
      } else {
        throw new Error(response.error || 'Failed to generate meal plan');
      }
    } catch (error) {
      console.error('Error generating weekly meal plan:', error);
      setAiError(error instanceof Error ? error.message : 'Failed to generate meal plan');
      Alert.alert('Error', 'Failed to generate meal plan. Please try again.');
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Get meals for selected day
  const getTodaysMeals = (): DayMeal[] => {
    if (!weeklyMealPlan) {
      console.log('🔍 getTodaysMeals: No weekly meal plan available');
      return [];
    }
    const mealsForDay = weeklyMealPlan.meals.filter(meal => meal.dayOfWeek === selectedDay);
    console.log(`🔍 getTodaysMeals for ${selectedDay}:`, {
      mealsFound: mealsForDay.length,
      mealTypes: mealsForDay.map(m => m.type),
      mealNames: mealsForDay.map(m => m.name)
    });
    return mealsForDay;
  };

  // Handle meal start (similar to workout start)
  const handleStartMeal = (meal: DayMeal) => {
    if (!navigation) {
      Alert.alert('Error', 'Navigation not available');
      return;
    }

    Alert.alert(
      '🍽️ Start Meal Preparation',
      `Ready to prepare "${meal.name}"?\n\nEstimated time: ${meal.preparationTime} minutes\nDifficulty: ${meal.difficulty}\nIngredients: ${meal.items.length}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Cooking',
          onPress: () => {
            console.log('🍽️ Starting meal preparation:', meal.name);

            // Initialize progress using completion tracking service
            completionTrackingService.updateMealProgress(meal.id, 0, {
              source: 'diet_screen_start',
              startedAt: new Date().toISOString(),
            });

            // For demo: Add a "Mark Complete" option for testing
            setTimeout(() => {
              Alert.alert(
                'Meal Progress',
                `Preparing "${meal.name}"...\n\nTap "Mark Complete" when finished.`,
                [
                  { text: 'Still Cooking', style: 'cancel' },
                  {
                    text: 'Mark Complete',
                    onPress: async () => {
                      console.log('🍽️ Marking meal as complete:', meal.name);

                      try {
                        // Use completion tracking service for proper event emission
                        const success = await completionTrackingService.completeMeal(meal.id, {
                          completedAt: new Date().toISOString(),
                          source: 'diet_screen_manual',
                        }, user?.id || 'dev-user-001');

                        if (success) {
                          // Refresh nutrition data to update calorie display
                          try {
                            await loadDailyNutrition();
                            console.log('✅ Daily nutrition data refreshed after meal completion');
                          } catch (refreshError) {
                            console.warn('⚠️ Failed to refresh nutrition data:', refreshError);
                          }

                          Alert.alert('🎉 Meal Complete!', `You've completed "${meal.name}"!\n\nCheck the Progress tab to see your achievement!`);
                        } else {
                          Alert.alert('Error', 'Failed to mark meal as complete. Please try again.');
                        }
                      } catch (error) {
                        console.error('Error completing meal:', error);
                        Alert.alert('Error', 'Failed to mark meal as complete. Please try again.');
                      }
                    },
                  },
                ]
              );
            }, 1000);
          }
        }
      ]
    );
  };

  const handleSearchFood = () => {
    setShowFoodSearch(!showFoodSearch);
  };

  // Note: Removed static food database display to focus on AI-generated personalized meals
  // The foods from database were generic seed data that interfered with personalization

  // Note: Removed food loading and filtering as we now focus on AI-generated personalized meals
  // The app no longer loads generic foods from database

  const handleMealLongPress = (mealId: string, event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setContextMenu({
      visible: true,
      mealId,
      position: { x: pageX, y: pageY },
    });
  };

  const handleContextMenuAction = (action: string) => {
    setContextMenu({ visible: false, mealId: null, position: { x: 0, y: 0 } });

    switch (action) {
      case 'edit':
        Alert.alert('Edit Meal', 'Meal editing feature coming soon...');
        break;
      case 'delete':
        Alert.alert('Delete Meal', 'Meal deletion feature coming soon...');
        break;
      case 'duplicate':
        Alert.alert('Duplicate', 'Meal duplication feature coming soon...');
        break;
      case 'details':
        Alert.alert('Details', 'Meal details feature coming soon...');
        break;
    }
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, mealId: null, position: { x: 0, y: 0 } });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
      clearErrors();
    } catch (error) {
      console.warn('Failed to refresh nutrition data:', error);
    } finally {
      setRefreshing(false);
    }
  };







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
            tintColor={ResponsiveTheme.colors.primary}
            colors={[ResponsiveTheme.colors.primary]}
          />
        }
      >
        <View>
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
              style={[styles.aiButton, isGeneratingPlan && styles.aiButtonDisabled]}
              onPress={generateWeeklyMealPlan}
              disabled={isGeneratingPlan}
            >
              {isGeneratingPlan ? (
                <ActivityIndicator size="small" color={ResponsiveTheme.colors.white} />
              ) : (
                <Text style={styles.aiButtonText}>🍽️ Week</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.aiButton, isGeneratingMeal && styles.aiButtonDisabled]}
              onPress={generateDailyMealPlan}
              disabled={isGeneratingMeal}
            >
              {isGeneratingMeal ? (
                <ActivityIndicator size="small" color={ResponsiveTheme.colors.white} />
              ) : (
                <Text style={styles.aiButtonText}>🤖 Day</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleSearchFood}
            >
              <Text style={styles.addIcon}>🤖</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading State */}
        {(foodsLoading || userMealsLoading) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={ResponsiveTheme.colors.primary} />
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

        {/* Weekly Meal Plan Section */}
        {weeklyMealPlan && (
          <>
            {/* Day Selector */}
            <View style={styles.daySelector}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      selectedDay === day && styles.selectedDayButton
                    ]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      selectedDay === day && styles.selectedDayButtonText
                    ]}>
                      {day ? day.charAt(0).toUpperCase() + day.slice(1, 3) : 'Day'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Today's Meals from Weekly Plan */}
            <View style={styles.mealsSection}>
              <Text style={styles.sectionTitle}>
                {selectedDay ? `${selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}'s Meals` : "Today's Meals"}
              </Text>
              {getTodaysMeals().map((meal) => {
                const progress = getMealProgress(meal.id);
                return (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    onStartMeal={handleStartMeal}
                    progress={progress?.progress || 0}
                  />
                );
              })}
              {getTodaysMeals().length === 0 && (
                <Card style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    No meals planned for {selectedDay}
                  </Text>
                  <Button
                    title="Generate Meals"
                    onPress={generateWeeklyMealPlan}
                    variant="outline"
                    size="sm"
                  />
                </Card>
              )}
            </View>
          </>
        )}



        {/* Generate Weekly Plan Prompt */}
        {!weeklyMealPlan && isAuthenticated && (
          <Card style={styles.promptCard}>
            <Text style={styles.promptTitle}>🍽️ Weekly Meal Planning</Text>
            <Text style={styles.promptText}>
              Get a personalized 7-day meal plan with recipes tailored to your goals and preferences.
            </Text>
            <Button
              title={isGeneratingPlan ? "Generating..." : "Generate Weekly Plan"}
              onPress={generateWeeklyMealPlan}
              disabled={isGeneratingPlan}
              style={styles.promptButton}
            />
          </Card>
        )}

        {/* AI Meal Generation Panel */}
        {showFoodSearch && (
          <View style={styles.searchSection}>
            <Card style={styles.aiMealCard} variant="elevated">
              <View style={styles.aiMealContent}>
                <Text style={styles.aiMealIcon}>🤖</Text>
                <Text style={styles.aiMealTitle}>Generate AI Meals</Text>
                <Text style={styles.aiMealText}>
                  Create personalized meals based on your dietary preferences and nutrition goals.
                </Text>
                <View style={styles.mealTypeButtons}>
                  <TouchableOpacity 
                    style={styles.mealTypeButton} 
                    onPress={() => generateAIMeal('breakfast')}
                    disabled={isGeneratingMeal}
                  >
                    <Text style={styles.mealTypeEmoji}>🥣</Text>
                    <Text style={styles.mealTypeText}>Breakfast</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.mealTypeButton} 
                    onPress={() => generateAIMeal('lunch')}
                    disabled={isGeneratingMeal}
                  >
                    <Text style={styles.mealTypeEmoji}>🥗</Text>
                    <Text style={styles.mealTypeText}>Lunch</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.mealTypeButton} 
                    onPress={() => generateAIMeal('dinner')}
                    disabled={isGeneratingMeal}
                  >
                    <Text style={styles.mealTypeEmoji}>🍽️</Text>
                    <Text style={styles.mealTypeText}>Dinner</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.mealTypeButton} 
                    onPress={() => generateAIMeal('snack')}
                    disabled={isGeneratingMeal}
                  >
                    <Text style={styles.mealTypeEmoji}>🍎</Text>
                    <Text style={styles.mealTypeText}>Snack</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.closeSearchButton}
                  onPress={() => setShowFoodSearch(false)}
                >
                  <Text style={styles.closeSearchText}>Close</Text>
                </TouchableOpacity>
              </View>
            </Card>
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
                <Text style={styles.actionIcon}>🤖</Text>
                <Text style={styles.actionText}>AI Meals</Text>
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
                <Text style={styles.waterAmount}>0 / 8 glasses</Text>
                <Text style={styles.waterSubtext}>Start tracking your hydration!</Text>
              </View>
            </View>
            
            <View style={styles.waterProgress}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '0%' }]} />
              </View>
            </View>
            
            <Button
              title="Add Glass"
              onPress={() => Alert.alert('Water Tracking', 'Water tracking feature coming soon!')}
              variant="outline"
              size="sm"
              style={styles.waterButton}
            />
          </Card>
        </View>

        <View style={styles.bottomSpacing} />
        </View>
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
    backgroundColor: ResponsiveTheme.colors.background,
  },
  
  scrollView: {
    flex: 1,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.md,
  },
  
  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },
  
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(12),
  },

  aiButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: rp(12),
    paddingVertical: rp(8),
    borderRadius: rs(20),
    minWidth: rw(70),
    alignItems: 'center',
  },

  aiButtonDisabled: {
    backgroundColor: ResponsiveTheme.colors.textMuted,
  },

  aiButtonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: rf(12),
    fontWeight: '600',
  },

  addButton: {
    width: rw(40),
    height: rh(40),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  addIcon: {
    fontSize: rf(24),
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },
  
  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  
  overviewCard: {
    padding: ResponsiveTheme.spacing.lg,
  },
  
  caloriesSection: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  
  caloriesHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  
  caloriesConsumed: {
    fontSize: ResponsiveTheme.fontSize.xxxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },
  
  caloriesTarget: {
    fontSize: ResponsiveTheme.fontSize.lg,
    color: ResponsiveTheme.colors.textSecondary,
    marginLeft: ResponsiveTheme.spacing.sm,
  },
  
  caloriesProgress: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  
  progressBar: {
    height: rh(8),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  
  progressFill: {
    height: '100%',
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },
  
  remainingText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
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
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },
  
  macroLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  
  macroTarget: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },
  
  mealCard: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  
  mealContent: {
    padding: ResponsiveTheme.spacing.lg,
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
    marginBottom: ResponsiveTheme.spacing.sm,
    position: 'relative',
  },

  aiGeneratedBadge: {
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: rp(6),
    paddingVertical: rp(2),
    borderRadius: rs(8),
    marginLeft: rp(8),
  },

  aiGeneratedText: {
    color: ResponsiveTheme.colors.white,
    fontSize: rf(9),
    fontWeight: '600',
  },

  mealAIButton: {
    position: 'absolute',
    right: 0,
    backgroundColor: ResponsiveTheme.colors.primary,
    width: rw(20),
    height: rh(20),
    borderRadius: rs(10),
    justifyContent: 'center',
    alignItems: 'center',
  },

  mealAIText: {
    fontSize: rf(8),
  },
  
  mealIcon: {
    fontSize: rf(20),
    marginRight: ResponsiveTheme.spacing.sm,
  },
  
  mealType: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },
  
  mealTime: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textMuted,
  },
  
  mealItems: {
    marginLeft: ResponsiveTheme.spacing.lg,
  },
  
  mealItem: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  
  plannedText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textMuted,
    fontStyle: 'italic',
    marginLeft: ResponsiveTheme.spacing.lg,
  },
  
  mealCalories: {
    alignItems: 'center',
    marginLeft: ResponsiveTheme.spacing.md,
  },
  
  caloriesValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },
  
  caloriesLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },
  
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.md,
  },
  
  actionItem: {
    width: '47%',
  },
  
  actionCard: {
    padding: ResponsiveTheme.spacing.lg,
    alignItems: 'center',
  },
  
  actionIcon: {
    fontSize: rf(32),
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  
  actionText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    textAlign: 'center',
  },
  
  waterCard: {
    padding: ResponsiveTheme.spacing.lg,
  },
  
  waterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
  },
  
  waterIcon: {
    fontSize: rf(32),
    marginRight: ResponsiveTheme.spacing.md,
  },
  
  waterInfo: {
    flex: 1,
  },
  
  waterAmount: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },
  
  waterSubtext: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  
  waterProgress: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  
  waterButton: {
    alignSelf: 'flex-start',
  },
  
  bottomSpacing: {
    height: ResponsiveTheme.spacing.xl,
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
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    minWidth: rw(180),
    ...THEME.shadows.md,
  },

  contextMenuItem: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
  },

  contextMenuText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Search styles
  searchSection: {
    marginHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    ...THEME.shadows.sm,
  },

  searchInput: {
    flex: 1,
    height: rh(44),
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    paddingVertical: ResponsiveTheme.spacing.sm,
  },

  clearSearchButton: {
    padding: ResponsiveTheme.spacing.sm,
    marginLeft: ResponsiveTheme.spacing.sm,
  },

  clearSearchText: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.textSecondary,
  },

  foodResults: {
    marginTop: ResponsiveTheme.spacing.md,
    maxHeight: rh(120),
  },

  foodItem: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: ResponsiveTheme.spacing.md,
    marginRight: ResponsiveTheme.spacing.sm,
    minWidth: rw(140),
    ...THEME.shadows.sm,
  },

  foodName: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: rp(2),
  },

  foodCategory: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginBottom: rp(4),
  },

  foodCalories: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    marginBottom: rp(4),
  },

  foodMacros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  foodMacro: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },

  // Enhanced meal card styles
  mealNutrition: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: ResponsiveTheme.spacing.lg,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  nutritionText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },

  nutritionDot: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginHorizontal: rp(4),
  },

  mealRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: ResponsiveTheme.spacing.lg,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  ratingStars: {
    fontSize: rf(12),
    marginRight: rp(4),
  },

  ratingText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  difficultyText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginLeft: rp(4),
  },

  statusButton: {
    width: rw(32),
    height: rh(32),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statusIcon: {
    fontSize: rf(16),
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: ResponsiveTheme.spacing.xl,
  },

  loadingText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.md,
  },

  errorCard: {
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
    alignItems: 'center',
  },

  errorText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.error,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
  },

  retryButton: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  // Weekly Meal Plan Styles
  daySelector: {
    marginBottom: ResponsiveTheme.spacing.lg,
    paddingHorizontal: ResponsiveTheme.spacing.md,
  },

  dayButton: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    marginRight: ResponsiveTheme.spacing.sm,
    borderRadius: rs(20),
    backgroundColor: ResponsiveTheme.colors.background,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },

  selectedDayButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },

  dayButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
  },

  selectedDayButtonText: {
    color: ResponsiveTheme.colors.surface,
  },

  mealsSection: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  emptyCard: {
    padding: ResponsiveTheme.spacing.xl,
    alignItems: 'center',
  },

  emptyText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  promptCard: {
    margin: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.xl,
    alignItems: 'center',
  },

  promptTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  promptText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(22),
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  promptButton: {
    minWidth: rw(200),
  },

  // AI Meal Generation styles
  aiMealCard: {
    padding: ResponsiveTheme.spacing.lg,
  },

  aiMealContent: {
    alignItems: 'center',
  },

  aiMealIcon: {
    fontSize: rf(36),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  aiMealTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: 'center',
  },

  aiMealText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.lg,
    lineHeight: rf(20),
  },

  mealTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  mealTypeButton: {
    alignItems: 'center',
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    minWidth: rw(70),
  },

  mealTypeEmoji: {
    fontSize: rf(24),
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  mealTypeText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  closeSearchButton: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.sm,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  closeSearchText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
});
