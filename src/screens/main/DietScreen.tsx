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
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Button, Card, THEME } from '../../components/ui';
import { Camera } from '../../components/advanced/Camera';
import { aiService } from '../../ai';
import { useUserStore } from '../../stores/userStore';
import { useNutritionStore } from '../../stores/nutritionStore';
import Constants from 'expo-constants';

// Simple Expo Go detection and safe loading
const isExpoGo = Constants.appOwnership === 'expo' || 
                 Constants.executionEnvironment === 'storeClient' ||
                 (__DEV__ && !Constants.isDevice && Constants.platform?.web !== true);

let useWaterReminders: any = null;
if (!isExpoGo) {
  try {
    const notificationStore = require('../../stores/notificationStore');
    useWaterReminders = notificationStore.useWaterReminders;
  } catch (error) {
    console.warn('Failed to load water reminders:', error);
  }
}
import { foodRecognitionService, MealType } from '../../services/foodRecognitionService';
import { useAuth } from '../../hooks/useAuth';
import { useNutritionData } from '../../hooks/useNutritionData';
import { Meal, DailyMealPlan } from '../../types/ai';
import { Food } from '../../services/nutritionData';
import { weeklyMealContentGenerator, WeeklyMealPlan, DayMeal } from '../../ai/weeklyMealGenerator';
import { MealCard } from '../../components/diet/MealCard';
import { completionTrackingService } from '../../services/completionTracking';
import FoodRecognitionTest from '../../components/debug/FoodRecognitionTest';
import MealTypeSelector from '../../components/diet/MealTypeSelector';
import AIMealsPanel from '../../components/diet/AIMealsPanel';
import CreateRecipeModal from '../../components/diet/CreateRecipeModal';
import { runQuickActionsTests, runFoodRecognitionE2ETests } from '../../utils/testQuickActions';
import { recognizedFoodLogger } from '../../services/recognizedFoodLogger';
import FoodRecognitionFeedback, { FoodFeedback } from '../../components/diet/FoodRecognitionFeedback';
import { foodRecognitionFeedbackService } from '../../services/foodRecognitionFeedbackService';
import PortionAdjustment from '../../components/diet/PortionAdjustment';

interface DietScreenProps {
  navigation?: any; // Navigation prop for routing
}

export const DietScreen: React.FC<DietScreenProps> = ({ navigation }) => {
  const [showCamera, setShowCamera] = useState(false);
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [showTestComponent, setShowTestComponent] = useState(false);
  const [showMealTypeSelector, setShowMealTypeSelector] = useState(false);
  const [showAIMealsPanel, setShowAIMealsPanel] = useState(false);
  const [showCreateRecipe, setShowCreateRecipe] = useState(false);
  const [userRecipes, setUserRecipes] = useState<any[]>([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackData, setFeedbackData] = useState<{
    recognizedFoods: any[];
    imageUri: string;
    mealId: string;
  } | null>(null);
  const [showPortionAdjustment, setShowPortionAdjustment] = useState(false);
  const [portionData, setPortionData] = useState<{
    recognizedFoods: any[];
    imageUri: string;
  } | null>(null);
  const [showMealPreparationModal, setShowMealPreparationModal] = useState(false);
  const [selectedMealForPreparation, setSelectedMealForPreparation] = useState<DayMeal | null>(null);
  const [waterConsumed, setWaterConsumed] = useState(0); // in liters
  const waterReminders = useWaterReminders ? useWaterReminders() : null;
  const waterGoal = waterReminders?.config?.dailyGoalLiters || 4; // Default to 4L if no reminders
  const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch');
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

  const handleCameraCapture = async (imageUri: string) => {
    console.log('🍽️ NEW Food Recognition System - Image captured:', imageUri);
    console.log('🔑 Selected meal type:', selectedMealType);
    console.log('👤 Profile available:', !!profile);
    
    setShowCamera(false);
    
    // Check if we have the food recognition service
    if (!foodRecognitionService) {
      Alert.alert('Error', 'Food recognition service not available. Please check your setup.');
      return;
    }
    
    try {
      setIsGeneratingMeal(true);
      setAiError(null);
      
      // Show processing alert
      Alert.alert(
        '🔍 Revolutionary AI Food Recognition',
        `Our advanced AI is analyzing your ${selectedMealType} with 90%+ accuracy using Indian cuisine specialization...`,
        [{ text: 'Processing...', style: 'cancel' }]
      );
      
      // Check if we have API keys available
      const hasApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || 
                       process.env.EXPO_PUBLIC_GEMINI_KEY_1;
      
      if (!hasApiKey) {
        // Demo mode without API keys
        Alert.alert(
          '🧪 Demo Mode - Food Recognition',
          'API keys not configured. This is a demo of what the food recognition would show:\n\n• Detected: Rice Bowl with Curry (345 cal)\n• Detected: Mixed Vegetables (120 cal)\n• Total: 465 calories\n• Accuracy: 92%\n\nTo enable real recognition, add your Gemini API key to environment variables.',
          [
            { text: 'OK' },
            { text: 'Setup Guide', onPress: () => {
              Alert.alert('Setup', 'Add your Gemini API key to EXPO_PUBLIC_GEMINI_API_KEY in your .env file or use the test-api-keys.js script for setup.');
            }}
          ]
        );
        return;
      }
      
      // Analyze food with the selected meal type
      console.log('🔍 Calling food recognition service...');
      const result = await foodRecognitionService.recognizeFood(
        imageUri, 
        selectedMealType,
        profile ? { personalInfo: profile.personalInfo, fitnessGoals: profile.fitnessGoals } : undefined
      );
      console.log('📊 Food recognition result:', result);
      
      if (result.success && result.data) {
        const recognizedFoods = result.data;
        const totalCalories = recognizedFoods.reduce((sum, food) => sum + food.nutrition.calories, 0);
        
        // Show success result with feedback option
        Alert.alert(
          '✅ Food Recognition Complete!',
          `Recognized ${recognizedFoods.length} food item(s):\n\n` +
          `${recognizedFoods.map(food => `• ${food.name} (${Math.round(food.nutrition.calories)} cal)`).join('\n')}\n\n` +
          `Total: ${Math.round(totalCalories)} calories\n` +
          `Accuracy: ${result.accuracy}% | Confidence: ${result.confidence}%`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Adjust Portions',
              onPress: () => {
                setPortionData({
                  recognizedFoods,
                  imageUri
                });
                setShowPortionAdjustment(true);
              }
            },
            {
              text: 'Give Feedback',
              onPress: () => {
                setFeedbackData({
                  recognizedFoods,
                  imageUri,
                  mealId: `temp_${Date.now()}` // Temporary ID, will be updated after logging
                });
                setShowFeedbackModal(true);
              }
            },
            {
              text: 'Log Meal',
              onPress: async () => {
                try {
                  console.log('🍽️ Starting meal logging process...');
                  
                  // Use the recognized food logger service
                  const logResult = await recognizedFoodLogger.logRecognizedFoods(
                    user?.id || 'dev-user-001',
                    recognizedFoods,
                    selectedMealType
                  );
                  
                  if (logResult.success) {
                    // Show success with detailed information
                    Alert.alert(
                      '🎉 Meal Logged Successfully!',
                      `✅ ${recognizedFoods.length} food item${recognizedFoods.length !== 1 ? 's' : ''} logged\n` +
                      `📊 Total: ${logResult.totalCalories} calories\n` +
                      `🍽️ Meal Type: ${selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}\n` +
                      `📱 Meal ID: ${logResult.mealId?.slice(-8)}\n\n` +
                      `Your nutrition tracking has been updated!`,
                      [{ text: 'Awesome!' }]
                    );
                    
                    console.log('✅ Meal logged successfully:', {
                      mealId: logResult.mealId,
                      totalCalories: logResult.totalCalories,
                      foodCount: recognizedFoods.length
                    });
                    
                    // Update feedback data with real meal ID
                    if (feedbackData) {
                      setFeedbackData(prev => prev ? { ...prev, mealId: logResult.mealId! } : null);
                    }
                    
                    // Refresh nutrition data to show updated totals
                    await loadDailyNutrition();
                    await refreshAll(); // Refresh all nutrition data
                    
                  } else {
                    throw new Error(logResult.error || 'Failed to log meal');
                  }
                  
                } catch (logError) {
                  console.error('❌ Failed to log meal:', logError);
                  
                  const errorMessage = logError instanceof Error ? logError.message : 'Unknown error occurred';
                  Alert.alert(
                    '❌ Meal Logging Failed',
                    `Error: ${errorMessage}\n\nThe food was recognized successfully, but we couldn't save it to your meal log. Please try again or check your connection.`,
                    [
                      { text: 'OK' },
                      { text: 'Retry', onPress: async () => {
                        // Retry the logging process
                        try {
                          const retryResult = await recognizedFoodLogger.logRecognizedFoods(
                            user?.id || 'dev-user-001',
                            recognizedFoods,
                            selectedMealType
                          );
                          
                          if (retryResult.success) {
                            Alert.alert('✅ Success!', 'Meal logged successfully on retry!');
                            await loadDailyNutrition();
                            await refreshAll();
                          } else {
                            Alert.alert('❌ Still Failed', 'Please try again later or contact support.');
                          }
                        } catch (retryError) {
                          Alert.alert('❌ Retry Failed', 'Please try again later.');
                        }
                      }}
                    ]
                  );
                }
              }
            }
          ]
        );
        
      } else {
        throw new Error(result.error || 'Food recognition failed');
      }
      
    } catch (error) {
      console.error('❌ Food recognition failed:', error);
      console.error('📊 Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      
      setAiError(error instanceof Error ? error.message : 'Food recognition failed');
      
      // Check if it's an API key issue
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('API key') || errorMessage.includes('key')) {
        Alert.alert(
          '🔑 API Key Required',
          'The food recognition system needs a Gemini API key to work. Please add your API key to the environment variables.\n\nFor now, you can test the UI components without API calls.',
          [
            { text: 'OK' },
            { text: 'See Setup Guide', onPress: () => {
              Alert.alert('Setup Guide', 'Check the ENVIRONMENT_SETUP.md file in the docs folder for instructions on setting up API keys.');
            }}
          ]
        );
      } else {
        Alert.alert(
          '❌ Recognition Failed',
          `Error: ${errorMessage}\n\nThis could be due to:\n• Missing API keys\n• Network issues\n• Invalid image format\n\nCheck the console for detailed error information.`,
          [
            { text: 'OK' },
            { text: 'Try Again', onPress: () => setShowCamera(true) }
          ]
        );
      }
    } finally {
      setIsGeneratingMeal(false);
    }
  };

  // Enhanced scan food handler with meal type selection
  const handleScanFood = () => {
    setShowMealTypeSelector(true);
  };

  const handleMealTypeSelected = (mealType: MealType) => {
    setSelectedMealType(mealType);
    setShowMealTypeSelector(false);
    
    // Small delay for smooth transition
    setTimeout(() => {
      setShowCamera(true);
    }, 300);
  };

  // Enhanced AI Meal Generation Function with comprehensive options
  const generateAIMeal = async (mealType: string, options?: any) => {
    // Handle different action types
    if (mealType === 'daily_plan') {
      return generateDailyMealPlan();
    }
    
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
      // Enhanced preferences with options
      const preferences = {
        dietaryRestrictions: dietPreferences?.allergies || [],
        cuisinePreference: options?.cuisinePreference || 'any',
        prepTimeLimit: options?.quickEasy ? 20 : 30,
        calorieTarget: nutritionGoals?.daily_calories || 2000,
        dietType: dietPreferences?.diet_type || [],
        dislikes: dietPreferences?.dislikes || [],
        customOptions: options?.customOptions || {},
        suggestions: options?.suggestions || [],
      };

      // Handle special action types
      let actualMealType = mealType;
      if (['meal_prep', 'goal_focused', 'quick_easy'].includes(mealType)) {
        actualMealType = 'lunch'; // Default to lunch for special actions
        preferences.specialAction = mealType;
      }

      const response = await aiService.generateMeal(
        profile.personalInfo,
        profile.fitnessGoals,
        actualMealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
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
    console.log('🍽️ Generate Weekly Plan button pressed!');
    console.log('🔍 Profile check:', {
      personalInfo: !!profile?.personalInfo,
      fitnessGoals: !!profile?.fitnessGoals,
      dietPreferences: !!profile?.dietPreferences || !!dietPreferences
    });

    // Check what's missing and provide specific guidance
    const missingItems = [];
    if (!profile?.personalInfo) missingItems.push('Personal Information');
    if (!profile?.fitnessGoals) missingItems.push('Fitness Goals');
    if (!profile?.dietPreferences && !dietPreferences) missingItems.push('Diet Preferences');

    if (missingItems.length > 0) {
      const primaryMissing = missingItems[0];
      console.log('❌ Profile incomplete:', missingItems);
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
      console.log('🔑 API Key available:', !!process.env.EXPO_PUBLIC_GEMINI_API_KEY);
      console.log('🤖 weeklyMealContentGenerator available:', !!weeklyMealContentGenerator);

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
    console.log('🍽️ handleStartMeal called with meal:', meal.name);
    console.log('🍽️ Navigation available:', !!navigation);
    
    if (!navigation) {
      console.error('❌ Navigation not available for meal start');
      Alert.alert('Error', 'Navigation not available');
      return;
    }

    // For web platform, use modal instead of Alert.alert
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform detected - showing meal preparation modal');
      setSelectedMealForPreparation(meal);
      setShowMealPreparationModal(true);
      return;
    }

    // For mobile platforms, use Alert.alert
    Alert.alert(
      '🍽️ Start Meal Preparation',
      `Ready to prepare "${meal.name}"?\n\nEstimated time: ${meal.preparationTime} minutes\nDifficulty: ${meal.difficulty}\nIngredients: ${meal.items.length}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Cooking',
          onPress: () => startMealPreparation(meal)
        }
      ]
    );
  };

  // Separate function for meal preparation logic
  const startMealPreparation = async (meal: DayMeal) => {
    console.log('🍽️ Starting meal preparation:', meal.name);

    // Initialize progress using completion tracking service
    completionTrackingService.updateMealProgress(meal.id, 0, {
      source: 'diet_screen_start',
      startedAt: new Date().toISOString(),
    });

    // For demo: Add a "Mark Complete" option for testing
    setTimeout(() => {
      if (Platform.OS === 'web') {
        // For web, we'll handle this in the modal
        console.log('🍽️ Meal preparation started on web platform');
      } else {
        Alert.alert(
          'Meal Progress',
          `Preparing "${meal.name}"...\n\nTap "Mark Complete" when finished.`,
          [
            { text: 'Still Cooking', style: 'cancel' },
            {
              text: 'Mark Complete',
              onPress: () => completeMealPreparation(meal)
            }
          ]
        );
      }
    }, 1000);
  };

  // Separate function for meal completion logic
  const completeMealPreparation = async (meal: DayMeal) => {
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

        if (Platform.OS === 'web') {
          setShowMealPreparationModal(false);
          setSelectedMealForPreparation(null);
          // You could show a success toast here for web
          console.log(`🎉 Meal completed: ${meal.name}`);
        } else {
          Alert.alert('🎉 Meal Complete!', `You've completed "${meal.name}"!\n\nCheck the Progress tab to see your achievement!`);
        }
      } else {
        Alert.alert('Error', 'Failed to mark meal as complete. Please try again.');
      }
    } catch (error) {
      console.error('Error completing meal:', error);
      Alert.alert('Error', 'Failed to mark meal as complete. Please try again.');
    }
  };

  const handleSearchFood = () => {
    setShowAIMealsPanel(true);
  };

  const handleCreateRecipe = () => {
    setShowCreateRecipe(true);
  };

  const handleRecipeCreated = (recipe: any) => {
    setUserRecipes(prev => [recipe, ...prev]);
    setShowCreateRecipe(false);
    
    // You could save the recipe to the database here
    console.log('New recipe created:', recipe);
  };

  // Water tracking handlers with liters
  const handleAddWater = () => {
    const incrementAmount = 0.25; // 250ml increment
    
    if (waterConsumed >= waterGoal) {
      Alert.alert(
        '🎉 Daily Goal Achieved!',
        `You've already reached your daily water goal of ${waterGoal}L! Great job staying hydrated!`,
        [{ text: 'Awesome!' }]
      );
      return;
    }

    const newAmount = Math.min(waterConsumed + incrementAmount, waterGoal + 1);
    setWaterConsumed(Math.round(newAmount * 100) / 100); // Round to 2 decimal places

    // Show celebration when goal is reached
    if (newAmount >= waterGoal && waterConsumed < waterGoal) {
      setTimeout(() => {
        Alert.alert(
          '🏆 Hydration Goal Achieved!',
          `Congratulations! You've reached your daily water goal of ${waterGoal}L!`,
          [
            { text: 'Keep it up!', style: 'default' },
            {
              text: 'Adjust Goal',
              onPress: () => {
                if (navigation) {
                  navigation.navigate('Settings', { screen: 'Notifications' });
                } else {
                  Alert.alert('Water Settings', 'Navigate to Settings > Notifications to adjust your water goal and reminder schedule.');
                }
              }
            }
          ]
        );
      }, 500);
    } else {
      // Show encouraging message
      const remaining = Math.max(waterGoal - newAmount, 0);
      Alert.alert(
        '💧 Water Added!',
        `Great job! ${remaining.toFixed(1)}L more to reach your goal.`
      );
    }
  };

  const handleRemoveWater = () => {
    if (waterConsumed > 0) {
      const decrementAmount = 0.25;
      setWaterConsumed(Math.max(0, Math.round((waterConsumed - decrementAmount) * 100) / 100));
    }
  };

  const handleLogWater = () => {
    Alert.alert(
      '💧 Log Water Intake',
      'Choose how to log your water consumption:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add 250ml',
          onPress: () => handleAddWater()
        },
        {
          text: 'Add 500ml',
          onPress: () => {
            const newAmount = Math.min(waterConsumed + 0.5, waterGoal + 1);
            setWaterConsumed(Math.round(newAmount * 100) / 100);
            Alert.alert('Water Added!', 'Added 500ml to your daily intake.');
          }
        },
        {
          text: 'Custom Amount',
          onPress: () => {
            Alert.prompt(
              'Water Amount (Liters)',
              'How many liters did you drink?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel'
                },
                {
                  text: 'Add',
                  onPress: (value) => {
                    const amount = parseFloat(value || '0');
                    if (amount > 0 && amount <= 3) {
                      const newTotal = Math.min(waterConsumed + amount, waterGoal + 2);
                      setWaterConsumed(Math.round(newTotal * 100) / 100);
                      Alert.alert('Water Added!', `Added ${amount}L to your daily intake.`);
                    } else {
                      Alert.alert('Invalid Amount', 'Please enter a number between 0.1 and 3.0 liters.');
                    }
                  }
                }
              ],
              'plain-text',
              '',
              'decimal-pad'
            );
          }
        }
      ]
    );
  };

  // Handle feedback submission
  const handleFeedbackSubmit = async (feedback: FoodFeedback[]) => {
    if (!feedbackData) return;

    try {
      const result = await foodRecognitionFeedbackService.submitFeedback(
        user?.id || 'dev-user-001',
        feedbackData.mealId,
        feedback,
        feedbackData.imageUri,
        feedbackData.recognizedFoods
      );

      if (result.success) {
        console.log('✅ Feedback submitted successfully:', result.feedbackId);
      } else {
        console.error('❌ Failed to submit feedback:', result.error);
        Alert.alert('Error', 'Failed to submit feedback. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    }
  };

  // Handle portion adjustment completion
  const handlePortionAdjustmentComplete = (adjustedFoods: any[]) => {
    setShowPortionAdjustment(false);
    
    // Show updated recognition results with adjusted portions
    const totalCalories = adjustedFoods.reduce((sum, food) => sum + food.nutrition.calories, 0);
    const adjustedCount = adjustedFoods.filter(food => 
      food.portionSize.estimatedGrams !== portionData?.recognizedFoods.find(orig => orig.id === food.id)?.portionSize.estimatedGrams
    ).length;
    
    Alert.alert(
      '✅ Portions Updated!',
      `${adjustedCount > 0 ? `Updated ${adjustedCount} portion size${adjustedCount !== 1 ? 's' : ''}!\n\n` : ''}` +
      `${adjustedFoods.map(food => `• ${food.name} (${food.portionSize.estimatedGrams}g - ${Math.round(food.nutrition.calories)} cal)`).join('\n')}\n\n` +
      `Total: ${Math.round(totalCalories)} calories`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Give Feedback',
          onPress: () => {
            setFeedbackData({
              recognizedFoods: adjustedFoods,
              imageUri: portionData?.imageUri || '',
              mealId: `temp_${Date.now()}`
            });
            setShowFeedbackModal(true);
          }
        },
        {
          text: 'Log Meal',
          onPress: async () => {
            try {
              console.log('🍽️ Starting meal logging process with adjusted portions...');
              
              const logResult = await recognizedFoodLogger.logRecognizedFoods(
                user?.id || 'dev-user-001',
                adjustedFoods,
                selectedMealType
              );
              
              if (logResult.success) {
                Alert.alert(
                  '🎉 Meal Logged Successfully!',
                  `✅ ${adjustedFoods.length} food item${adjustedFoods.length !== 1 ? 's' : ''} logged\n` +
                  `📊 Total: ${logResult.totalCalories} calories\n` +
                  `🍽️ Meal Type: ${selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}\n` +
                  `📱 Meal ID: ${logResult.mealId?.slice(-8)}\n\n` +
                  `Your nutrition tracking has been updated!`,
                  [{ text: 'Awesome!' }]
                );
                
                await loadDailyNutrition();
                await refreshAll();
              } else {
                throw new Error(logResult.error || 'Failed to log meal');
              }
            } catch (error) {
              console.error('❌ Failed to log adjusted meal:', error);
              Alert.alert('Error', 'Failed to log meal. Please try again.');
            }
          }
        }
      ]
    );
    
    setPortionData(null);
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
              style={[styles.aiButton, { backgroundColor: '#f59e0b' }]}
              onPress={() => setShowTestComponent(true)}
            >
              <Text style={styles.aiButtonText}>🧪 Test</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.aiButton, { backgroundColor: '#10b981' }]}
              onPress={runQuickActionsTests}
            >
              <Text style={styles.aiButtonText}>✅ Quick</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.aiButton, { backgroundColor: '#8b5cf6' }]}
              onPress={runFoodRecognitionE2ETests}
            >
              <Text style={styles.aiButtonText}>🧪 E2E</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.aiButton, { backgroundColor: '#ef4444' }]}
              onPress={() => {
                console.log('🧪 Test button pressed - bypassing profile checks');
                Alert.alert('Test Button', 'This button works! Check console for Generate Weekly Plan button logs.');
              }}
            >
              <Text style={styles.aiButtonText}>🧪 Test</Text>
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
              onPress={handleScanFood}
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
            
            <TouchableOpacity style={styles.actionItem} onPress={handleCreateRecipe}>
              <Card style={styles.actionCard} variant="outlined">
                <Text style={styles.actionIcon}>📝</Text>
                <Text style={styles.actionText}>Create Recipe</Text>
              </Card>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionItem} onPress={handleLogWater}>
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
                <Text style={styles.waterAmount}>{waterConsumed}L / {waterGoal}L</Text>
                <Text style={styles.waterSubtext}>
                  {waterConsumed === 0 ? 'Start tracking your hydration!' :
                   waterConsumed >= waterGoal ? '🎉 Daily goal achieved!' :
                   `${(waterGoal - waterConsumed).toFixed(1)}L more to reach your goal!`}
                </Text>
              </View>
            </View>
            
            <View style={styles.waterProgress}>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill, 
                  { 
<<<<<<< HEAD
                    width: `${Math.min((waterGlasses / waterGoal) * 100, 100)}%`,
                    backgroundColor: waterGlasses >= waterGoal ? '#10b981' : ResponsiveTheme.colors.primary
=======
                    width: `${Math.max(0, Math.min((waterConsumed / waterGoal) * 100, 100)) || 0}%`,
                    backgroundColor: waterConsumed >= waterGoal ? '#10b981' : ResponsiveTheme.colors.primary
>>>>>>> bd00862 (🚀 MAJOR UPDATE: Complete FitAI Enhancement Package)
                  }
                ]} />
              </View>
            </View>
            
            <View style={styles.waterButtons}>
              <Button
                title="+ 250ml"
                onPress={handleAddWater}
                variant={waterConsumed >= waterGoal ? "solid" : "outline"}
                size="sm"
                style={[styles.waterButton, { flex: 1, marginRight: ResponsiveTheme.spacing.sm }]}
              />
              <Button
                title="Custom"
                onPress={handleLogWater}
                variant="outline"
                size="sm"
                style={[styles.waterButton, { flex: 0.7, marginRight: ResponsiveTheme.spacing.sm }]}
              />
              {waterConsumed > 0 && (
                <Button
                  title="- 250ml"
                  onPress={handleRemoveWater}
                  variant="outline"
                  size="sm"
                  style={[styles.waterButton, { flex: 0.8 }]}
                />
              )}
            </View>
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

      {/* Test Component Modal */}
      <Modal
        visible={showTestComponent}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTestComponent(false)}
      >
        <View style={styles.testContainer}>
          <View style={styles.testHeader}>
            <Text style={styles.testTitle}>🧪 Food Recognition Test</Text>
            <TouchableOpacity
              onPress={() => setShowTestComponent(false)}
              style={styles.testCloseButton}
            >
              <Text style={styles.testCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <FoodRecognitionTest />
        </View>
      </Modal>

      {/* Meal Type Selector Modal */}
      <MealTypeSelector
        visible={showMealTypeSelector}
        onSelect={handleMealTypeSelected}
        onClose={() => setShowMealTypeSelector(false)}
      />

      {/* AI Meals Panel */}
      <AIMealsPanel
        visible={showAIMealsPanel}
        onClose={() => setShowAIMealsPanel(false)}
        onGenerateMeal={generateAIMeal}
        isGenerating={isGeneratingMeal}
        profile={profile}
      />

      {/* Create Recipe Modal */}
      <CreateRecipeModal
        visible={showCreateRecipe}
        onClose={() => setShowCreateRecipe(false)}
        onRecipeCreated={handleRecipeCreated}
        profile={profile}
      />

      {/* Portion Adjustment Modal */}
      {portionData && (
        <PortionAdjustment
          visible={showPortionAdjustment}
          recognizedFoods={portionData.recognizedFoods}
          onClose={() => {
            setShowPortionAdjustment(false);
            setPortionData(null);
          }}
          onAdjustmentComplete={handlePortionAdjustmentComplete}
        />
      )}

      {/* Food Recognition Feedback Modal */}
      {feedbackData && (
        <FoodRecognitionFeedback
          visible={showFeedbackModal}
          recognizedFoods={feedbackData.recognizedFoods}
          onClose={() => {
            setShowFeedbackModal(false);
            setFeedbackData(null);
          }}
          onSubmitFeedback={handleFeedbackSubmit}
          originalImageUri={feedbackData.imageUri}
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

      {/* Meal Preparation Modal */}
      <Modal
        visible={showMealPreparationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMealPreparationModal(false)}
      >
        <View style={styles.mealModalOverlay}>
          <View style={styles.mealModal}>
            {selectedMealForPreparation && (
              <>
                <View style={styles.mealModalHeader}>
                  <Text style={styles.mealModalTitle}>🍽️ Start Meal Preparation</Text>
                  <TouchableOpacity
                    onPress={() => setShowMealPreparationModal(false)}
                    style={styles.mealModalCloseButton}
                  >
                    <Text style={styles.mealModalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.mealModalContent}>
                  <Text style={styles.mealModalMealName}>
                    {selectedMealForPreparation.name}
                  </Text>
                  
                  <View style={styles.mealModalDetails}>
                    <View style={styles.mealModalDetailItem}>
                      <Text style={styles.mealModalDetailLabel}>⏱️ Estimated Time:</Text>
                      <Text style={styles.mealModalDetailValue}>{selectedMealForPreparation.preparationTime} minutes</Text>
                    </View>
                    
                    <View style={styles.mealModalDetailItem}>
                      <Text style={styles.mealModalDetailLabel}>🥘 Difficulty:</Text>
                      <Text style={styles.mealModalDetailValue}>{selectedMealForPreparation.difficulty}</Text>
                    </View>
                    
                    <View style={styles.mealModalDetailItem}>
                      <Text style={styles.mealModalDetailLabel}>🛒 Ingredients:</Text>
                      <Text style={styles.mealModalDetailValue}>{selectedMealForPreparation.items.length} items</Text>
                    </View>
                  </View>

                  <Text style={styles.mealModalDescription}>
                    {selectedMealForPreparation.description}
                  </Text>
                </View>

                <View style={styles.mealModalActions}>
                  <TouchableOpacity
                    style={styles.mealModalCancelButton}
                    onPress={() => setShowMealPreparationModal(false)}
                  >
                    <Text style={styles.mealModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.mealModalStartButton}
                    onPress={() => {
                      startMealPreparation(selectedMealForPreparation);
                      setShowMealPreparationModal(false);
                    }}
                  >
                    <Text style={styles.mealModalStartText}>Start Cooking</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
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

  waterButtons: {
    flexDirection: 'row',
    alignItems: 'center',
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

  // Test component styles
  testContainer: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },

  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },

  testTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  testCloseButton: {
    width: rw(32),
    height: rh(32),
    borderRadius: rs(16),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  testCloseText: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  // Meal Preparation Modal Styles
  mealModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: ResponsiveTheme.spacing.lg,
  },

  mealModal: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.xl,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },

  mealModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: ResponsiveTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },

  mealModalTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  mealModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  mealModalCloseText: {
    fontSize: 16,
    color: ResponsiveTheme.colors.text,
    fontWeight: 'bold',
  },

  mealModalContent: {
    padding: ResponsiveTheme.spacing.lg,
  },

  mealModalMealName: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.lg,
    textAlign: 'center',
  },

  mealModalDetails: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  mealModalDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
  },

  mealModalDetailLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: '500',
  },

  mealModalDetailValue: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  mealModalDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },

  mealModalActions: {
    flexDirection: 'row',
    padding: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    gap: ResponsiveTheme.spacing.md,
  },

  mealModalCancelButton: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    alignItems: 'center',
  },

  mealModalCancelText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  mealModalStartButton: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    backgroundColor: ResponsiveTheme.colors.primary,
    alignItems: 'center',
  },

  mealModalStartText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.surface,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
});
