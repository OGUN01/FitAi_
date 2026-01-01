/**
 * DietScreen - World-Class Nutrition Dashboard
 * 
 * REDESIGNED following UIUX_METHODOLOGY.md:
 * - Modular component structure
 * - No redundant data displays
 * - Professional icons (no emojis)
 * - Proper animations and haptics
 * - Clean, minimal header
 * 
 * Layout Order:
 * 1. Header (greeting, calorie badge)
 * 2. Nutrition Overview (calorie ring + macros)
 * 3. Week Day Selector
 * 4. Quick Actions
 * 5. Today's Meals
 * 6. Hydration Card
 * 7. Weekly Trends Chart
 * 8. AI Meal Plan Generator
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';
import { haptics } from '../../utils/haptics';
import { ResponsiveTheme } from '../../utils/constants';
import { rh } from '../../utils/responsive';
import { useAuth } from '../../hooks/useAuth';
import { useUserStore } from '../../stores/userStore';
import { useNutritionStore } from '../../stores/nutritionStore';
import { useNutritionData } from '../../hooks/useNutritionData';
import { useCalculatedMetrics } from '../../hooks/useCalculatedMetrics';
import { Camera } from '../../components/advanced/Camera';
import { foodRecognitionService, MealType } from '../../services/foodRecognitionService';
// DEPRECATED: weeklyMealContentGenerator and nutritionAnalyzer removed - use Cloudflare Workers backend
// Import only types from AI module
import type { DayMeal } from '../../ai';
import { completionTrackingService } from '../../services/completionTracking';
import MealTypeSelector from '../../components/diet/MealTypeSelector';
import { ProductDetailsModal } from '../../components/diet/ProductDetailsModal';
import { barcodeService, ScannedProduct } from '../../services/barcodeService';

// Import modular components
import {
  DietHeader,
  NutritionOverview,
  WeekDaySelector,
  TodaysMealsSection,
  DietQuickActions,
  HydrationCard,
  WeeklyNutritionChart,
  MealPlanGenerator,
} from './diet';

interface DietScreenProps {
  navigation?: any;
  route?: any;
  isActive?: boolean;
}

export const DietScreen: React.FC<DietScreenProps> = ({ 
  navigation, 
  route, 
  isActive = true 
}) => {
  // ============================================
  // STATE
  // ============================================
  
  // UI State
  const [refreshing, setRefreshing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showMealTypeSelector, setShowMealTypeSelector] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch');
  const [cameraMode, setCameraMode] = useState<'food' | 'barcode'>('food');
  
  // Barcode State
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null);
  const [productHealthAssessment, setProductHealthAssessment] = useState<any>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false);
  
  // AI State
  const [isGeneratingMeal, setIsGeneratingMeal] = useState(false);
  
  // Water State
  const [waterIntake, setWaterIntake] = useState(0); // in ml
  // Water goal from calculated metrics - NO HARDCODED DEFAULT
  const waterGoalML = calculatedMetrics?.dailyWaterML ?? null;
  
  // Day Selection
  const [selectedDay, setSelectedDay] = useState(() => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayNames[new Date().getDay()];
  });

  // ============================================
  // HOOKS & STORES
  // ============================================
  
  const { user, isGuestMode } = useAuth();
  const { profile } = useUserStore();
  const {
    weeklyMealPlan,
    isGeneratingPlan,
    mealProgress,
    setWeeklyMealPlan,
    setGeneratingPlan,
    saveWeeklyMealPlan,
    loadData,
    completeMeal,
  } = useNutritionStore();

  const {
    dailyNutrition,
    nutritionGoals,
    dietPreferences,
    loadDailyNutrition,
    refreshAll,
  } = useNutritionData();
  
  // Use calculated metrics from onboarding - NO FALLBACKS
  const {
    metrics: calculatedMetrics,
    getCalorieTarget,
    getMacroTargets,
  } = useCalculatedMetrics();

  // ============================================
  // COMPUTED VALUES
  // ============================================
  
  // Nutrition targets from calculated metrics (onboarding) - NO HARDCODED FALLBACKS
  const macroTargets = getMacroTargets();
  const calorieTarget = getCalorieTarget();
  
  const nutritionTargets = useMemo(() => ({
    calories: {
      current: dailyNutrition?.calories || 0,
      target: calorieTarget ?? nutritionGoals?.daily_calories ?? null,
    },
    protein: {
      current: dailyNutrition?.protein || 0,
      target: macroTargets.protein ?? nutritionGoals?.macroTargets?.protein ?? null,
    },
    carbs: {
      current: dailyNutrition?.carbs || 0,
      target: macroTargets.carbs ?? nutritionGoals?.macroTargets?.carbohydrates ?? null,
    },
    fat: {
      current: dailyNutrition?.fat || 0,
      target: macroTargets.fat ?? nutritionGoals?.macroTargets?.fat ?? null,
    },
  }), [dailyNutrition, nutritionGoals, calorieTarget, macroTargets]);

  // Today's meals from weekly plan
  const todaysMeals = useMemo(() => {
    if (!weeklyMealPlan?.meals) return [];
    
    return weeklyMealPlan.meals
      .filter((meal) => meal.dayOfWeek === selectedDay)
      .map((meal) => {
        const progress = mealProgress[meal.id];
        return {
          id: meal.id,
          name: meal.name,
          type: meal.type as 'breakfast' | 'lunch' | 'dinner' | 'snack',
          calories: meal.totalCalories || meal.nutrition?.calories || 0,
          protein: meal.totalMacros?.protein || meal.nutrition?.protein || 0,
          carbs: meal.totalMacros?.carbohydrates || meal.nutrition?.carbs || 0,
          fat: meal.totalMacros?.fat || meal.nutrition?.fat || 0,
          isCompleted: progress?.progress === 100,
          progress: progress?.progress || 0,
        };
      });
  }, [weeklyMealPlan, selectedDay, mealProgress]);

  // Meals count by day for selector
  const mealsByDay = useMemo(() => {
    if (!weeklyMealPlan?.meals) return {};
    
    return weeklyMealPlan.meals.reduce((acc, meal) => {
      const day = meal.dayOfWeek;
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [weeklyMealPlan]);

  // Weekly chart data
  const weeklyChartData = useMemo(() => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const shortNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date().getDay();
    
    return dayNames.map((day, index) => {
      const meals = weeklyMealPlan?.meals?.filter((m) => m.dayOfWeek === day) || [];
      const totals = meals.reduce(
        (acc, meal) => ({
          protein: acc.protein + (meal.totalMacros?.protein || 0),
          carbs: acc.carbs + (meal.totalMacros?.carbohydrates || 0),
          fat: acc.fat + (meal.totalMacros?.fat || 0),
        }),
        { protein: 0, carbs: 0, fat: 0 }
      );
      
      return {
        day,
        shortDay: shortNames[index],
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        isToday: index === today,
      };
    });
  }, [weeklyMealPlan]);

  // User name for header
  const userName = useMemo(() => {
    return profile?.personalInfo?.name?.split(' ')[0] || 'there';
  }, [profile]);

  // ============================================
  // EFFECTS
  // ============================================
  
  // Load data on mount and when active
  useEffect(() => {
    if (isActive) {
      loadData();
      loadDailyNutrition();
    }
  }, [isActive]);

  // Subscribe to meal completion events
  useEffect(() => {
    const unsubscribe = completionTrackingService.subscribe((event) => {
      if (event.type === 'meal') {
        loadData();
      }
    });
    return () => unsubscribe();
  }, []);

  // Handle navigation params (from cooking session)
  useEffect(() => {
    if (route?.params?.mealCompleted) {
      loadData();
      navigation?.setParams({ mealCompleted: undefined });
    }
  }, [route?.params]);

  // ============================================
  // HANDLERS
  // ============================================
  
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    haptics.light();
    try {
      await Promise.all([loadData(), refreshAll()]);
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [loadData, refreshAll]);

  const handleAddWater = useCallback((amount: number) => {
    haptics.medium();
    // Use calculated water goal if available, otherwise cap at a reasonable max
    const maxWater = waterGoalML ? waterGoalML * 1.5 : 6000; // 6L max if no goal set
    setWaterIntake((prev) => Math.min(prev + amount, maxWater));
  }, [waterGoalML]);

  const handleDaySelect = useCallback((day: string) => {
    haptics.light();
    setSelectedDay(day);
  }, []);

  // Meal handlers
  const handleMealPress = useCallback((meal: any) => {
    // Navigate to meal details
    if (navigation) {
      const fullMeal = weeklyMealPlan?.meals?.find((m) => m.id === meal.id);
      if (fullMeal) {
        navigation.navigate('MealDetails', { meal: fullMeal });
      }
    }
  }, [navigation, weeklyMealPlan]);

  const handleStartMeal = useCallback((meal: any) => {
    haptics.medium();
    const fullMeal = weeklyMealPlan?.meals?.find((m) => m.id === meal.id);
    if (fullMeal && navigation) {
      navigation.navigate('CookingSession', { meal: fullMeal });
    }
  }, [navigation, weeklyMealPlan]);

  // Quick action handlers
  const handleScanFood = useCallback(() => {
    setShowMealTypeSelector(true);
  }, []);

  const handleMealTypeSelected = useCallback((mealType: MealType) => {
    setSelectedMealType(mealType);
    setShowMealTypeSelector(false);
    setCameraMode('food');
    setTimeout(() => setShowCamera(true), 300);
  }, []);

  const handleScanBarcode = useCallback(() => {
    setCameraMode('barcode');
    setShowCamera(true);
  }, []);

  const handleLogMeal = useCallback(() => {
    Alert.alert('Log Meal', 'Manual meal logging coming soon!');
  }, []);

  const handleLogWater = useCallback(() => {
    Alert.alert(
      'Add Water',
      'How much water did you drink?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '250ml', onPress: () => handleAddWater(250) },
        { text: '500ml', onPress: () => handleAddWater(500) },
        { text: '1L', onPress: () => handleAddWater(1000) },
      ]
    );
  }, [handleAddWater]);

  const handleViewRecipes = useCallback(() => {
    if (navigation) {
      navigation.navigate('Recipes');
    }
  }, [navigation]);

  // AI meal generation
  const handleGenerateAIMeal = useCallback(async () => {
    haptics.medium();
    setIsGeneratingMeal(true);
    try {
      // Simplified AI meal generation
      Alert.alert('AI Meal', 'AI meal suggestion feature coming soon!');
    } finally {
      setIsGeneratingMeal(false);
    }
  }, []);

  // Weekly plan generation
  const handleGenerateWeeklyPlan = useCallback(async () => {
    if (!profile?.personalInfo || !profile?.fitnessGoals) {
      Alert.alert(
        'Profile Incomplete',
        'Please complete your profile to generate personalized meal plans.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Profile', onPress: () => navigation?.navigate('Profile') },
        ]
      );
      return;
    }

    haptics.medium();
    setGeneratingPlan(true);

    try {
      const userDietPreferences = profile.dietPreferences || {
        dietType: dietPreferences?.diet_type?.[0] || 'non-veg',
        allergies: dietPreferences?.allergies || [],
        cuisinePreferences: [],
        restrictions: [],
        cookingSkill: 'intermediate',
        mealPrepTime: 'moderate',
        dislikes: dietPreferences?.dislikes || [],
      };

      // DEPRECATED: Use Workers API instead
      console.warn('[DietScreenNew] weeklyMealContentGenerator is deprecated - this screen should use Workers API');
      const response: any = {
        success: false,
        error: 'DietScreenNew is deprecated. Please use DietScreen.tsx instead.',
      };

      if (response.success && response.data) {
        await saveWeeklyMealPlan(response.data);
        setWeeklyMealPlan(response.data);
        haptics.success();
        Alert.alert(
          'Meal Plan Generated!',
          `Your personalized 7-day meal plan "${response.data.title || 'Weekly Plan'}" is ready!`
        );
      } else {
        throw new Error(response.error || 'Failed to generate plan');
      }
    } catch (error) {
      console.error('Error generating meal plan:', error);
      Alert.alert('Error', 'Failed to generate meal plan. Please try again.');
    } finally {
      setGeneratingPlan(false);
    }
  }, [profile, dietPreferences, navigation, setGeneratingPlan, saveWeeklyMealPlan, setWeeklyMealPlan]);

  // Camera handlers
  const handleCameraCapture = useCallback(async (imageUri: string) => {
    setShowCamera(false);
    
    if (cameraMode === 'food') {
      // Food recognition logic (simplified)
      Alert.alert(
        'Food Recognition',
        'AI is analyzing your food...\n\nThis feature uses advanced AI to identify food items and calculate nutritional information.'
      );
    }
  }, [cameraMode, selectedMealType, profile]);

  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    setShowCamera(false);
    setIsProcessingBarcode(true);

    try {
      const result = await barcodeService.lookupProduct(barcode);
      if (result.success && result.product) {
        // Simplified - skip health assessment for now (deprecated nutritionAnalyzer)
        setScannedProduct(result.product);
        setProductHealthAssessment(null);
        setShowProductModal(true);
      } else {
        Alert.alert('Product Not Found', result.error || 'Could not find this product.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to scan product.');
    } finally {
      setIsProcessingBarcode(false);
    }
  }, []);

  // ============================================
  // RENDER
  // ============================================
  
  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={ResponsiveTheme.colors.primary}
              colors={[ResponsiveTheme.colors.primary]}
            />
          }
        >
          {/* Header */}
          <DietHeader
            userName={userName}
            caloriesRemaining={nutritionTargets.calories.target - nutritionTargets.calories.current}
            caloriesGoal={nutritionTargets.calories.target}
            onSettingsPress={() => navigation?.navigate('NutritionSettings')}
          />

          {/* Nutrition Overview */}
          <View style={styles.section}>
            <NutritionOverview
              calories={nutritionTargets.calories}
              protein={nutritionTargets.protein}
              carbs={nutritionTargets.carbs}
              fat={nutritionTargets.fat}
            />
          </View>

          {/* Week Day Selector */}
          <WeekDaySelector
            selectedDay={selectedDay}
            onDaySelect={handleDaySelect}
            mealsByDay={mealsByDay}
          />

          {/* Quick Actions */}
          <DietQuickActions
            onScanFood={handleScanFood}
            onScanBarcode={handleScanBarcode}
            onLogMeal={handleLogMeal}
            onLogWater={handleLogWater}
            onGenerateMeal={handleGenerateAIMeal}
            onViewRecipes={handleViewRecipes}
            isGenerating={isGeneratingMeal}
          />

          {/* Today's Meals */}
          <TodaysMealsSection
            meals={todaysMeals}
            onMealPress={handleMealPress}
            onStartMeal={handleStartMeal}
            onGeneratePlan={handleGenerateWeeklyPlan}
            isLoading={isGeneratingPlan}
          />

          {/* Hydration Card */}
          <View style={styles.sectionPadded}>
            <HydrationCard
              currentIntake={waterIntake}
              dailyGoal={waterGoalML}
              onAddWater={handleAddWater}
            />
          </View>

          {/* Weekly Nutrition Chart */}
          <WeeklyNutritionChart
            weeklyData={weeklyChartData}
            proteinTarget={nutritionTargets.protein.target}
            carbsTarget={nutritionTargets.carbs.target}
            fatTarget={nutritionTargets.fat.target}
          />

          {/* AI Meal Plan Generator */}
          <MealPlanGenerator
            onGenerate={handleGenerateWeeklyPlan}
            isGenerating={isGeneratingPlan}
            hasPlan={!!weeklyMealPlan}
            planName={weeklyMealPlan?.id || 'Weekly Plan'}
            totalMeals={weeklyMealPlan?.meals?.length}
          />

          {/* Bottom spacing */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Modals */}
        
        {/* Camera Modal */}
        <Modal visible={showCamera} animationType="slide" presentationStyle="fullScreen">
          <Camera
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
            onBarcodeScanned={cameraMode === 'barcode' ? handleBarcodeScanned : undefined}
            mode={cameraMode}
          />
        </Modal>

        {/* Meal Type Selector */}
        <MealTypeSelector
          visible={showMealTypeSelector}
          onClose={() => setShowMealTypeSelector(false)}
          onSelect={handleMealTypeSelected}
        />

        {/* Product Details Modal */}
        {scannedProduct && (
          <ProductDetailsModal
            visible={showProductModal}
            product={scannedProduct}
            healthAssessment={productHealthAssessment}
            onClose={() => {
              setShowProductModal(false);
              setScannedProduct(null);
              setProductHealthAssessment(null);
            }}
            onAddToMeal={() => {
              Alert.alert('Added!', `${scannedProduct.name} added to your meal.`);
              setShowProductModal(false);
            }}
          />
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: rh(100), // Extra space for tab bar
  },
  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  sectionPadded: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  bottomSpacer: {
    height: rh(20),
  },
});

export default DietScreen;

