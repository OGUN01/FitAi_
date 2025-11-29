import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { rf, rp, rh, rw } from '../../../utils/responsive';
import { ResponsiveTheme } from '../../../utils/constants';
import { Button, Card, Slider } from '../../../components/ui';
import { GlassCard, AnimatedPressable, AnimatedSection, HeroSection, ProgressRing } from '../../../components/ui/aurora';
import { gradients, toLinearGradientProps } from '../../../theme/gradients';
import { MultiSelect } from '../../../components/advanced/MultiSelect';
import { MultiSelectWithCustom } from '../../../components/advanced/MultiSelectWithCustom';
import { DietPreferencesData, TabValidationResult, HealthHabits } from '../../../types/onboarding';

// ============================================================================
// TYPES
// ============================================================================

interface DietPreferencesTabProps {
  data: DietPreferencesData | null;
  validationResult?: TabValidationResult;
  onNext: (currentData?: DietPreferencesData) => void;
  onBack: () => void;
  onUpdate: (data: Partial<DietPreferencesData>) => void;
  onNavigateToTab?: (tabNumber: number) => void;
  isLoading?: boolean;
  isAutoSaving?: boolean;
}

// ============================================================================
// DATA CONSTANTS
// ============================================================================

const DIET_TYPE_OPTIONS = [
  {
    id: 'non-veg',
    title: 'Non-Vegetarian',
    iconName: 'nutrition-outline',
    description: 'Includes all types of meat and fish',
  },
  {
    id: 'vegetarian',
    title: 'Vegetarian',
    iconName: 'leaf-outline',
    description: 'No meat or fish, includes dairy and eggs',
  },
  {
    id: 'vegan',
    title: 'Vegan',
    iconName: 'flower-outline',
    description: 'No animal products whatsoever',
  },
  {
    id: 'pescatarian',
    title: 'Pescatarian',
    iconName: 'fish-outline',
    description: 'Vegetarian diet that includes fish',
  },
];

const DIET_READINESS_OPTIONS = [
  {
    key: 'keto_ready',
    title: 'Ketogenic Diet',
    iconName: 'leaf-outline',
    description: 'High fat, very low carb diet (5% carbs, 70% fat, 25% protein)',
    benefits: ['Rapid weight loss', 'Mental clarity', 'Reduced appetite'],
  },
  {
    key: 'intermittent_fasting_ready',
    title: 'Intermittent Fasting',
    iconName: 'time-outline',
    description: 'Time-restricted eating patterns (16:8, 18:6, etc.)',
    benefits: ['Improved metabolism', 'Weight management', 'Cellular repair'],
  },
  {
    key: 'paleo_ready',
    title: 'Paleo Diet',
    iconName: 'flame-outline',
    description: 'Whole foods based on paleolithic era eating',
    benefits: ['Natural nutrition', 'Reduced inflammation', 'Better digestion'],
  },
  {
    key: 'mediterranean_ready',
    title: 'Mediterranean Diet',
    iconName: 'heart-outline',
    description: 'Rich in olive oil, fish, vegetables, and whole grains',
    benefits: ['Heart health', 'Brain function', 'Longevity'],
  },
  {
    key: 'low_carb_ready',
    title: 'Low Carb Diet',
    iconName: 'restaurant-outline',
    description: 'Reduced carbohydrate intake (under 100g daily)',
    benefits: ['Blood sugar control', 'Weight loss', 'Energy stability'],
  },
  {
    key: 'high_protein_ready',
    title: 'High Protein Diet',
    iconName: 'barbell-outline',
    description: 'Increased protein intake for muscle building',
    benefits: ['Muscle growth', 'Satiety', 'Recovery'],
  },
];

const COOKING_SKILL_LEVELS = [
  {
    level: 'beginner',
    title: 'Beginner',
    iconName: 'restaurant-outline',
    description: 'Simple recipes, basic cooking skills',
    timeRange: '15-30 minutes',
  },
  {
    level: 'intermediate',
    title: 'Intermediate',
    iconName: 'pizza-outline',
    description: 'Comfortable with various techniques',
    timeRange: '30-60 minutes',
  },
  {
    level: 'advanced',
    title: 'Advanced',
    iconName: 'flame-outline',
    description: 'Complex recipes, professional techniques',
    timeRange: '60+ minutes',
  },
  {
    level: 'not_applicable',
    title: 'Not Applicable',
    iconName: 'home-outline',
    description: 'Made/home food prepared by others',
    timeRange: 'N/A',
  },
];

const BUDGET_LEVELS = [
  {
    level: 'low',
    title: 'Budget-Friendly',
    iconName: 'cash-outline',
    description: 'Cost-effective ingredients and meals',
    range: '$50-100/week',
  },
  {
    level: 'medium',
    title: 'Moderate',
    iconName: 'wallet-outline',
    description: 'Balance of quality and affordability',
    range: '$100-200/week',
  },
  {
    level: 'high',
    title: 'Premium',
    iconName: 'diamond-outline',
    description: 'High-quality, organic ingredients',
    range: '$200+/week',
  },
];

const HEALTH_HABITS = {
  hydration: [
    {
      key: 'drinks_enough_water',
      title: 'Drinks 3-4L Water Daily',
      iconName: 'water-outline',
      description: 'Maintains proper hydration levels',
    },
    {
      key: 'limits_sugary_drinks',
      title: 'Limits Sugary Drinks',
      iconName: 'warning-outline',
      description: 'Avoids sodas, juices with added sugar',
    },
  ],
  eating_patterns: [
    {
      key: 'eats_regular_meals',
      title: 'Eats Regular Meals',
      iconName: 'fast-food-outline',
      description: 'Consistent meal timing throughout day',
    },
    {
      key: 'avoids_late_night_eating',
      title: 'Avoids Late Night Eating',
      iconName: 'moon-outline',
      description: 'No eating 3 hours before bedtime',
    },
    {
      key: 'controls_portion_sizes',
      title: 'Controls Portion Sizes',
      iconName: 'scale-outline',
      description: 'Mindful of serving sizes',
    },
    {
      key: 'reads_nutrition_labels',
      title: 'Reads Nutrition Labels',
      iconName: 'document-text-outline',
      description: 'Checks food labels before purchasing',
    },
  ],
  food_choices: [
    {
      key: 'eats_processed_foods',
      title: 'Eats Processed Foods',
      iconName: 'cube-outline',
      description: 'Regularly consumes packaged/processed foods',
    },
    {
      key: 'eats_5_servings_fruits_veggies',
      title: 'Eats 5+ Servings Fruits/Vegetables',
      iconName: 'nutrition-outline',
      description: 'Daily fruit and vegetable intake',
    },
    {
      key: 'limits_refined_sugar',
      title: 'Limits Refined Sugar',
      iconName: 'close-circle-outline',
      description: 'Reduces added sugars in diet',
    },
    {
      key: 'includes_healthy_fats',
      title: 'Includes Healthy Fats',
      iconName: 'leaf-outline',
      description: 'Nuts, avocado, olive oil, etc.',
    },
  ],
  substances: [
    {
      key: 'drinks_alcohol',
      title: 'Drinks Alcohol',
      iconName: 'wine-outline',
      description: 'Regular alcohol consumption',
    },
    {
      key: 'smokes_tobacco',
      title: 'Smokes Tobacco',
      iconName: 'ban-outline',
      description: 'Tobacco use (any form)',
    },
    {
      key: 'drinks_coffee',
      title: 'Drinks Coffee',
      iconName: 'cafe-outline',
      description: 'Daily caffeine intake',
    },
    {
      key: 'takes_supplements',
      title: 'Takes Supplements',
      iconName: 'medkit-outline',
      description: 'Vitamins, protein powder, etc.',
    },
  ],
};

const ALLERGY_OPTIONS = [
  { id: 'nuts', label: 'Nuts', value: 'nuts', iconName: 'warning-outline' },
  { id: 'dairy', label: 'Dairy', value: 'dairy', iconName: 'warning-outline' },
  { id: 'eggs', label: 'Eggs', value: 'eggs', iconName: 'warning-outline' },
  { id: 'gluten', label: 'Gluten', value: 'gluten', iconName: 'warning-outline' },
  { id: 'soy', label: 'Soy', value: 'soy', iconName: 'warning-outline' },
  { id: 'shellfish', label: 'Shellfish', value: 'shellfish', iconName: 'warning-outline' },
  { id: 'fish', label: 'Fish', value: 'fish', iconName: 'warning-outline' },
  { id: 'sesame', label: 'Sesame', value: 'sesame', iconName: 'warning-outline' },
];


const RESTRICTION_OPTIONS = [
  { id: 'low-sodium', label: 'Low Sodium', value: 'low-sodium', iconName: 'remove-circle-outline' },
  { id: 'low-sugar', label: 'Low Sugar', value: 'low-sugar', iconName: 'close-circle-outline' },
  { id: 'low-carb', label: 'Low Carb', value: 'low-carb', iconName: 'restaurant-outline' },
  { id: 'high-protein', label: 'High Protein', value: 'high-protein', iconName: 'barbell-outline' },
  { id: 'diabetic-friendly', label: 'Diabetic Friendly', value: 'diabetic-friendly', iconName: 'pulse-outline' },
  { id: 'heart-healthy', label: 'Heart Healthy', value: 'heart-healthy', iconName: 'heart-outline' },
];

// ============================================================================
// ANIMATED GLOW CARD COMPONENT
// ============================================================================

interface AnimatedGlowCardProps {
  isSelected: boolean;
  children: React.ReactNode;
}

const AnimatedGlowCard: React.FC<AnimatedGlowCardProps> = ({ isSelected, children }) => {
  const glowAnimation = useSharedValue(0);

  useEffect(() => {
    glowAnimation.value = withTiming(isSelected ? 1 : 0, {
      duration: 300,
    });
  }, [isSelected]);

  const animatedGlowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(glowAnimation.value, [0, 1], [0, 0.4]);
    const shadowRadius = interpolate(glowAnimation.value, [0, 1], [0, 12]);

    return {
      shadowColor: ResponsiveTheme.colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity,
      shadowRadius,
      elevation: interpolate(glowAnimation.value, [0, 1], [0, 6]),
    };
  });

  return (
    <Animated.View style={animatedGlowStyle}>
      {children}
    </Animated.View>
  );
};

// ============================================================================
// ANIMATED TOGGLE COMPONENT
// ============================================================================

interface AnimatedToggleProps {
  isActive: boolean;
  disabled?: boolean;
}

const AnimatedToggle: React.FC<AnimatedToggleProps> = ({ isActive, disabled = false }) => {
  const toggleAnimation = useSharedValue(0);

  useEffect(() => {
    toggleAnimation.value = withTiming(isActive ? 1 : 0, {
      duration: 250,
    });
  }, [isActive]);

  const animatedSwitchStyle = useAnimatedStyle(() => {
    // Interpolate background color from gray to primary
    const backgroundColor = interpolate(
      toggleAnimation.value,
      [0, 1],
      [0, 1]
    );

    return {
      backgroundColor: backgroundColor === 1
        ? ResponsiveTheme.colors.primary
        : ResponsiveTheme.colors.backgroundTertiary,
      borderColor: backgroundColor === 1
        ? ResponsiveTheme.colors.primary
        : ResponsiveTheme.colors.border,
    };
  });

  const animatedThumbStyle = useAnimatedStyle(() => {
    // Slide the thumb from left to right
    const translateX = interpolate(
      toggleAnimation.value,
      [0, 1],
      [0, rw(40) - rw(16) - rp(4)] // Full width minus thumb width minus padding
    );

    return {
      transform: [{ translateX }],
    };
  });

  return (
    <Animated.View style={[
      styles.toggleSwitch,
      animatedSwitchStyle,
      disabled && styles.toggleSwitchDisabled,
    ]}>
      <Animated.View style={[
        styles.toggleThumb,
        animatedThumbStyle,
      ]} />
    </Animated.View>
  );
};

// ============================================================================
// COMPONENT
// ============================================================================

const DietPreferencesTab: React.FC<DietPreferencesTabProps> = ({
  data,
  validationResult,
  onNext,
  onBack,
  onUpdate,
  onNavigateToTab,
  isLoading = false,
  isAutoSaving = false,
}) => {
  // No longer creating separate state instances - using props from parent
  
  // Form state - initialize with data or defaults
  const [formData, setFormData] = useState<DietPreferencesData>({
    // Existing diet data
    diet_type: data?.diet_type || 'non-veg',
    allergies: data?.allergies || [],
    restrictions: data?.restrictions || [],
    
    // NEW: Diet readiness toggles
    keto_ready: data?.keto_ready || false,
    intermittent_fasting_ready: data?.intermittent_fasting_ready || false,
    paleo_ready: data?.paleo_ready || false,
    mediterranean_ready: data?.mediterranean_ready || false,
    low_carb_ready: data?.low_carb_ready || false,
    high_protein_ready: data?.high_protein_ready || false,
    
    // NEW: Meal preferences
    breakfast_enabled: data?.breakfast_enabled ?? true,
    lunch_enabled: data?.lunch_enabled ?? true,
    dinner_enabled: data?.dinner_enabled ?? true,
    snacks_enabled: data?.snacks_enabled ?? true,
    
    // NEW: Cooking preferences
    cooking_skill_level: data?.cooking_skill_level || 'beginner',
    max_prep_time_minutes: data?.max_prep_time_minutes ?? 30,
    budget_level: data?.budget_level || 'medium',
    
    // NEW: Health habits (14 boolean fields)
    drinks_enough_water: data?.drinks_enough_water || false,
    limits_sugary_drinks: data?.limits_sugary_drinks || false,
    eats_regular_meals: data?.eats_regular_meals || false,
    avoids_late_night_eating: data?.avoids_late_night_eating || false,
    controls_portion_sizes: data?.controls_portion_sizes || false,
    reads_nutrition_labels: data?.reads_nutrition_labels || false,
    eats_processed_foods: data?.eats_processed_foods ?? true,
    eats_5_servings_fruits_veggies: data?.eats_5_servings_fruits_veggies || false,
    limits_refined_sugar: data?.limits_refined_sugar || false,
    includes_healthy_fats: data?.includes_healthy_fats || false,
    drinks_alcohol: data?.drinks_alcohol || false,
    smokes_tobacco: data?.smokes_tobacco || false,
    drinks_coffee: data?.drinks_coffee || false,
    takes_supplements: data?.takes_supplements || false,
  });
  
  // Sync formData with data prop when it changes (e.g., when navigating back to this tab)
  useEffect(() => {
    if (data) {
      setFormData({
        diet_type: data.diet_type || 'non-veg',
        allergies: data.allergies || [],
        restrictions: data.restrictions || [],
        keto_ready: data.keto_ready || false,
        intermittent_fasting_ready: data.intermittent_fasting_ready || false,
        paleo_ready: data.paleo_ready || false,
        mediterranean_ready: data.mediterranean_ready || false,
        low_carb_ready: data.low_carb_ready || false,
        high_protein_ready: data.high_protein_ready || false,
        breakfast_enabled: data.breakfast_enabled ?? true,
        lunch_enabled: data.lunch_enabled ?? true,
        dinner_enabled: data.dinner_enabled ?? true,
        snacks_enabled: data.snacks_enabled ?? true,
        cooking_skill_level: data.cooking_skill_level || 'beginner',
        max_prep_time_minutes: data.max_prep_time_minutes ?? 30,
        budget_level: data.budget_level || 'medium',
        drinks_enough_water: data.drinks_enough_water || false,
        limits_sugary_drinks: data.limits_sugary_drinks || false,
        eats_regular_meals: data.eats_regular_meals || false,
        avoids_late_night_eating: data.avoids_late_night_eating || false,
        controls_portion_sizes: data.controls_portion_sizes || false,
        reads_nutrition_labels: data.reads_nutrition_labels || false,
        eats_processed_foods: data.eats_processed_foods ?? true,
        eats_5_servings_fruits_veggies: data.eats_5_servings_fruits_veggies || false,
        limits_refined_sugar: data.limits_refined_sugar || false,
        includes_healthy_fats: data.includes_healthy_fats || false,
        drinks_alcohol: data.drinks_alcohol || false,
        smokes_tobacco: data.smokes_tobacco || false,
        drinks_coffee: data.drinks_coffee || false,
        takes_supplements: data.takes_supplements || false,
      });
    }
  }, [data]);
  
  // Note: We no longer auto-update parent on every formData change to avoid infinite loops
  // Updates happen via onUpdate in the Next button handler
  
  // Validate when formData changes to enable/disable Next button
  useEffect(() => {
    // Only trigger validation if validationResult exists (means we're tracking validation)
    if (validationResult !== undefined) {
      // Debounce validation to avoid excessive calls
      const timer = setTimeout(() => {
        onUpdate(formData);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData, validationResult, onUpdate]);
  
  // ============================================================================
  // FORM HANDLERS
  // ============================================================================
  
  const updateField = <K extends keyof DietPreferencesData>(
    field: K,
    value: DietPreferencesData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const toggleHealthHabit = (habitKey: keyof DietPreferencesData) => {
    setFormData(prev => ({
      ...prev,
      [habitKey]: !prev[habitKey],
    }));
  };
  
  const toggleDietReadiness = (dietKey: keyof DietPreferencesData) => {
    setFormData(prev => ({
      ...prev,
      [dietKey]: !prev[dietKey],
    }));
  };
  
  const toggleMealPreference = (mealKey: keyof DietPreferencesData) => {
    const newValue = !formData[mealKey];
    
    // Ensure at least one meal is enabled
    const otherMeals = ['breakfast_enabled', 'lunch_enabled', 'dinner_enabled', 'snacks_enabled']
      .filter(key => key !== mealKey)
      .some(key => formData[key as keyof DietPreferencesData]);
    
    if (!newValue && !otherMeals) {
      // Don't allow disabling the last meal
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [mealKey]: newValue,
    }));
  };
  
  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================
  
  const getFieldError = (fieldName: string): string | undefined => {
    return validationResult?.errors.find(error => 
      error.toLowerCase().includes(fieldName.toLowerCase())
    );
  };
  
  const hasFieldError = (fieldName: string): boolean => {
    return !!getFieldError(fieldName);
  };
  
  const getEnabledMealsCount = (): number => {
    return [
      formData.breakfast_enabled,
      formData.lunch_enabled,
      formData.dinner_enabled,
      formData.snacks_enabled,
    ].filter(Boolean).length;
  };
  
  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const renderCurrentDietSection = () => (
    <GlassCard
      style={styles.section}
      elevation={2}
      blurIntensity="medium"
      padding="lg"
      borderRadius="lg"
    >
      <Text style={styles.sectionTitle}>Current Diet Type</Text>
      <Text style={styles.sectionSubtitle}>What best describes your current eating habits?</Text>
      
      <View style={styles.dietTypeGrid}>
        {DIET_TYPE_OPTIONS.map((option) => (
          <AnimatedGlowCard key={option.id} isSelected={formData.diet_type === option.id}>
            <AnimatedPressable
              onPress={() => updateField('diet_type', option.id as DietPreferencesData['diet_type'])}
              style={styles.dietTypeItem}
              scaleValue={0.95}
            >
              <GlassCard
                elevation={formData.diet_type === option.id ? 3 : 2}
                blurIntensity="default"
                padding="md"
                borderRadius="lg"
                style={StyleSheet.flatten([
                  styles.dietTypeCard,
                  ...(formData.diet_type === option.id ? [styles.dietTypeCardSelected] : []),
                ])}
              >
                <View style={styles.dietTypeContent}>
                  <Ionicons name={option.iconName as any} size={rf(32)} color={formData.diet_type === option.id ? ResponsiveTheme.colors.primary : ResponsiveTheme.colors.textSecondary} />
                  <Text
                    style={[
                      styles.dietTypeTitle,
                      formData.diet_type === option.id && styles.dietTypeTitleSelected,
                    ]}
                  >
                    {option.title}
                  </Text>
                  <Text style={styles.dietTypeDescription}>{option.description}</Text>
                </View>
              </GlassCard>
            </AnimatedPressable>
          </AnimatedGlowCard>
        ))}
      </View>
    </GlassCard>
  );

  const renderDietReadinessSection = () => (
    <GlassCard
      style={styles.section}
      elevation={2}
      blurIntensity="medium"
      padding="lg"
      borderRadius="lg"
    >
      <Text style={styles.sectionTitle}>Diet Readiness</Text>
      <Text style={styles.sectionSubtitle}>
        Are you ready to try any of these specialized diets? (Optional)
      </Text>
      
      <View style={styles.dietReadinessGrid}>
        {DIET_READINESS_OPTIONS.map((option) => {
          const isReady = formData[option.key as keyof DietPreferencesData] as boolean;
          
          return (
            <AnimatedPressable
              key={option.key}
              onPress={() => toggleDietReadiness(option.key as keyof DietPreferencesData)}
              style={styles.dietReadinessItem}
              scaleValue={0.95}
            >
              <GlassCard
                elevation={isReady ? 3 : 2}
                blurIntensity="default"
                padding="md"
                borderRadius="lg"
                style={StyleSheet.flatten([
                  styles.dietReadinessCard,
                  ...(isReady ? [styles.dietReadinessCardSelected] : []),
                ])}
              >
                <View style={styles.dietReadinessContent}>
                  <View style={styles.dietReadinessHeader}>
                    {/* Progress Ring Indicator */}
                    <View style={styles.dietReadinessProgressContainer}>
                      <ProgressRing
                        progress={isReady ? 100 : 0}
                        size={rf(60)}
                        strokeWidth={rf(6)}
                        gradient={true}
                        gradientColors={isReady ? ['#4ECDC4', '#44A08D'] : ['#E0E0E0', '#BDBDBD']}
                        duration={800}
                        showText={false}
                      />
                      <View style={styles.dietReadinessProgressIconContainer}>
                        <Ionicons name={option.iconName as any} size={rf(24)} color={isReady ? ResponsiveTheme.colors.primary : ResponsiveTheme.colors.textSecondary} />
                      </View>
                    </View>

                    <View style={styles.dietReadinessToggle}>
                      <AnimatedToggle isActive={isReady} />
                    </View>
                  </View>

                  <Text style={[
                    styles.dietReadinessTitle,
                    isReady && styles.dietReadinessTitleSelected,
                  ]}>
                    {option.title}
                  </Text>

                  <Text style={styles.dietReadinessDescription}>
                    {option.description}
                  </Text>

                  <View style={styles.dietReadinessBenefits}>
                    {option.benefits.map((benefit, index) => (
                      <Text key={index} style={styles.dietReadinessBenefit}>
                        • {benefit}
                      </Text>
                    ))}
                  </View>
                </View>
              </GlassCard>
            </AnimatedPressable>
          );
        })}
      </View>
    </GlassCard>
  );

  const renderMealPreferencesSection = () => {
    const enabledCount = getEnabledMealsCount();
    
    return (
      <GlassCard
        style={styles.section}
        elevation={2}
        blurIntensity="medium"
        padding="lg"
        borderRadius="lg"
      >
        <Text style={styles.sectionTitle}>Meal Preferences</Text>
        <Text style={styles.sectionSubtitle}>
          Which meals would you like us to plan for you? ({enabledCount}/4 enabled)
        </Text>
        
        {enabledCount === 1 && (
          <GlassCard
            elevation={2}
            blurIntensity="light"
            padding="md"
            borderRadius="md"
            style={styles.warningCard}
          >
            <View style={styles.warningContent}>
              <Ionicons name="alert-circle-outline" size={rf(18)} color={ResponsiveTheme.colors.warning} />
              <Text style={styles.warningText}>
                At least one meal type must remain enabled
              </Text>
            </View>
          </GlassCard>
        )}
        
        <View style={styles.mealPreferencesGrid}>
          {[
            { key: 'breakfast_enabled', title: 'Breakfast', iconName: 'sunny-outline', description: 'Start your day right' },
            { key: 'lunch_enabled', title: 'Lunch', iconName: 'partly-sunny-outline', description: 'Midday fuel' },
            { key: 'dinner_enabled', title: 'Dinner', iconName: 'moon-outline', description: 'Evening nourishment' },
            { key: 'snacks_enabled', title: 'Snacks', iconName: 'fast-food-outline', description: 'Healthy snacking' },
          ].map((meal) => {
            const isEnabled = formData[meal.key as keyof DietPreferencesData] as boolean;
            const isLastEnabled = enabledCount === 1 && isEnabled;
            
            return (
              <AnimatedPressable
                key={meal.key}
                onPress={() => !isLastEnabled && toggleMealPreference(meal.key as keyof DietPreferencesData)}
                style={[
                  styles.mealPreferenceItem,
                  ...(isLastEnabled ? [styles.mealPreferenceItemDisabled] : []),
                ]}
                disabled={isLastEnabled}
                scaleValue={0.95}
              >
                <GlassCard
                  elevation={isEnabled ? 3 : 2}
                  blurIntensity="default"
                  padding="md"
                  borderRadius="lg"
                  style={StyleSheet.flatten([
                    styles.mealPreferenceCard,
                    ...(isEnabled ? [styles.mealPreferenceCardSelected] : []),
                    ...(isLastEnabled ? [styles.mealPreferenceCardDisabled] : []),
                  ])}
                >
                  <View style={styles.mealPreferenceContent}>
                    <Ionicons name={meal.iconName as any} size={rf(24)} color={isEnabled ? ResponsiveTheme.colors.primary : ResponsiveTheme.colors.textSecondary} />
                    <Text style={[
                      styles.mealPreferenceTitle,
                      isEnabled && styles.mealPreferenceTitleSelected,
                    ]}>
                      {meal.title}
                    </Text>
                    <Text style={styles.mealPreferenceDescription}>
                      {meal.description}
                    </Text>

                    <View style={styles.mealPreferenceToggle}>
                      <AnimatedToggle isActive={isEnabled} disabled={isLastEnabled} />
                    </View>
                  </View>
                </GlassCard>
              </AnimatedPressable>
            );
          })}
        </View>
        
        {!formData.breakfast_enabled && (
          <GlassCard
            elevation={2}
            blurIntensity="light"
            padding="md"
            borderRadius="md"
            style={styles.infoCard}
          >
            <View style={styles.infoContent}>
              <Ionicons name="bulb-outline" size={rf(18)} color={ResponsiveTheme.colors.primary} />
              <Text style={styles.infoText}>
                Meal plans will only include lunch and dinner
              </Text>
            </View>
          </GlassCard>
        )}
      </GlassCard>
    );
  };

  const renderCookingPreferencesSection = () => (
    <GlassCard
      style={styles.section}
      elevation={2}
      blurIntensity="medium"
      padding="lg"
      borderRadius="lg"
    >
      <Text style={styles.sectionTitle}>Cooking Preferences</Text>
      <Text style={styles.sectionSubtitle}>Help us suggest recipes that match your cooking style</Text>
      
      {/* Cooking Skill Level */}
      <View style={styles.cookingField}>
        <Text style={styles.fieldLabel}>Cooking Skill Level</Text>
        <View style={styles.skillLevelGrid}>
          {COOKING_SKILL_LEVELS.map((skill) => (
            <AnimatedPressable
              key={skill.level}
              onPress={() => {
                updateField('cooking_skill_level', skill.level as DietPreferencesData['cooking_skill_level']);
                // Set max_prep_time_minutes to null if not_applicable is selected
                if (skill.level === 'not_applicable') {
                  updateField('max_prep_time_minutes', null);
                } else if (formData.max_prep_time_minutes === null) {
                  // Reset to default if switching from not_applicable
                  updateField('max_prep_time_minutes', 30);
                }
              }}
              style={styles.skillLevelItem}
              scaleValue={0.95}
            >
              <GlassCard
                elevation={formData.cooking_skill_level === skill.level ? 3 : 2}
                blurIntensity="default"
                padding="md"
                borderRadius="lg"
                style={StyleSheet.flatten([
                  styles.skillLevelCard,
                  ...(formData.cooking_skill_level === skill.level ? [styles.skillLevelCardSelected] : []),
                ])}
              >
                <View style={styles.skillLevelContent}>
                  <Ionicons name={skill.iconName as any} size={rf(20)} color={formData.cooking_skill_level === skill.level ? ResponsiveTheme.colors.primary : ResponsiveTheme.colors.textSecondary} />
                  <Text style={[
                    styles.skillLevelTitle,
                    formData.cooking_skill_level === skill.level && styles.skillLevelTitleSelected,
                  ]}>
                    {skill.title}
                  </Text>
                  <Text style={styles.skillLevelDescription}>{skill.description}</Text>
                  <Text style={styles.skillLevelTime}>{skill.timeRange}</Text>
                </View>
              </GlassCard>
            </AnimatedPressable>
          ))}
        </View>
      </View>
      
      {/* Max Prep Time */}
      <View style={styles.cookingField}>
        <Text style={styles.fieldLabel}>
          {formData.cooking_skill_level === 'not_applicable' 
            ? 'Maximum Cooking Time: Not Applicable'
            : `Maximum Cooking Time: ${formData.max_prep_time_minutes} minutes`}
        </Text>
        {formData.cooking_skill_level === 'not_applicable' ? (
          <GlassCard
            elevation={1}
            blurIntensity="light"
            padding="md"
            borderRadius="md"
            style={styles.disabledCard}
          >
            <View style={styles.disabledContent}>
              <Ionicons name="information-circle-outline" size={rf(16)} color={ResponsiveTheme.colors.textSecondary} />
              <Text style={styles.disabledText}>
                This field is not applicable since your meals are prepared by others.
                We'll suggest meals based on your dietary preferences without cooking time constraints.
              </Text>
            </View>
          </GlassCard>
        ) : (
          <Slider
            value={formData.max_prep_time_minutes || 30}
            onValueChange={(value) => updateField('max_prep_time_minutes', value)}
            minimumValue={15}
            maximumValue={120}
            step={15}
            showTooltip={true}
            formatValue={(val) => `${val} min`}
            style={styles.prepTimeSlider}
          />
        )}
      </View>
      
      {/* Budget Level */}
      <View style={styles.cookingField}>
        <Slider
          value={formData.budget_level === 'low' ? 1 : formData.budget_level === 'medium' ? 2 : 3}
          onValueChange={(value) => {
            const budgetLevel = value === 1 ? 'low' : value === 2 ? 'medium' : 'high';
            updateField('budget_level', budgetLevel as DietPreferencesData['budget_level']);
          }}
          minimumValue={1}
          maximumValue={3}
          step={1}
          label="Food Budget"
          showTooltip={true}
          formatValue={(val) => {
            if (val === 1) return 'Budget ($50-100/wk)';
            if (val === 2) return 'Moderate ($100-200/wk)';
            return 'Premium ($200+/wk)';
          }}
          style={styles.budgetSlider}
        />
      </View>
    </GlassCard>
  );

  const renderHealthHabitsSection = () => (
    <GlassCard
      style={styles.section}
      elevation={2}
      blurIntensity="medium"
      padding="lg"
      borderRadius="lg"
    >
      <Text style={styles.sectionTitle}>Health Habits</Text>
      <Text style={styles.sectionSubtitle}>
        Tell us about your current habits to personalize your recommendations
      </Text>
      
      {Object.entries(HEALTH_HABITS).map(([category, habits]) => (
        <View key={category} style={styles.habitCategory}>
          <Text style={styles.habitCategoryTitle}>
            {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
          
          <View style={styles.habitsList}>
            {habits.map((habit) => {
              const isActive = formData[habit.key as keyof DietPreferencesData] as boolean;
              
              return (
                <AnimatedPressable
                  key={habit.key}
                  onPress={() => toggleHealthHabit(habit.key as keyof DietPreferencesData)}
                  style={styles.habitItem}
                  scaleValue={0.95}
                >
                  <GlassCard
                    elevation={isActive ? 3 : 2}
                    blurIntensity="default"
                    padding="md"
                    borderRadius="lg"
                    style={StyleSheet.flatten([
                      styles.habitCard,
                      ...(isActive ? [styles.habitCardSelected] : []),
                    ])}
                  >
                    <View style={styles.habitContent}>
                      <View style={styles.habitHeader}>
                        <Ionicons name={habit.iconName as any} size={rf(20)} color={isActive ? ResponsiveTheme.colors.primary : ResponsiveTheme.colors.textSecondary} />
                        <View style={styles.habitToggle}>
                          <AnimatedToggle isActive={isActive} />
                        </View>
                      </View>

                      <Text style={StyleSheet.flatten([
                        styles.habitTitle,
                        isActive && styles.habitTitleSelected,
                      ])}>
                        {habit.title}
                      </Text>

                      <Text style={styles.habitDescription}>
                        {habit.description}
                      </Text>
                    </View>
                  </GlassCard>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
      ))}
    </GlassCard>
  );

  const renderAllergiesAndRestrictionsSection = () => (
    <GlassCard
      style={styles.section}
      elevation={2}
      blurIntensity="medium"
      padding="lg"
      borderRadius="lg"
    >
      <Text style={styles.sectionTitle}>Allergies & Dietary Restrictions</Text>
      
      {/* Allergies */}
      <View style={styles.allergyField}>
        <MultiSelectWithCustom
          options={ALLERGY_OPTIONS}
          selectedValues={formData.allergies}
          onSelectionChange={(values) => updateField('allergies', values)}
          label="Food Allergies"
          placeholder="Select any food allergies"
          searchable={true}
          allowCustom={true}
          customLabel="Add Custom Allergy"
          customPlaceholder="Enter your specific allergy"
        />
      </View>
      
      {/* Dietary Restrictions */}
      <View style={styles.allergyField}>
        <MultiSelectWithCustom
          options={RESTRICTION_OPTIONS}
          selectedValues={formData.restrictions}
          onSelectionChange={(values) => updateField('restrictions', values)}
          label="Dietary Restrictions (Optional)"
          placeholder="Select any dietary restrictions"
          searchable={true}
          allowCustom={true}
          customLabel="Add Custom Restriction"
          customPlaceholder="Enter your specific dietary need"
        />
      </View>
    </GlassCard>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section with Background Image */}
        <HeroSection
          image={{ uri: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80' }}
          overlayGradient={gradients.overlay.dark}
          contentPosition="center"
          height={rh(200)}
        >
          <Text style={styles.title}>What are your diet preferences?</Text>
          <Text style={styles.subtitle}>
            Help us personalize your meal recommendations and nutrition plan
          </Text>

          {/* Auto-save Indicator */}
          {isAutoSaving && (
            <View style={styles.autoSaveIndicator}>
              <Ionicons name="cloud-upload-outline" size={rf(16)} color={ResponsiveTheme.colors.success} />
              <Text style={styles.autoSaveText}>Saving...</Text>
            </View>
          )}
        </HeroSection>
        
        {/* Form Sections */}
        <View style={styles.content}>
          <AnimatedSection delay={0}>
            {renderCurrentDietSection()}
          </AnimatedSection>

          <AnimatedSection delay={100}>
            {renderDietReadinessSection()}
          </AnimatedSection>

          <AnimatedSection delay={200}>
            {renderMealPreferencesSection()}
          </AnimatedSection>

          <AnimatedSection delay={300}>
            {renderCookingPreferencesSection()}
          </AnimatedSection>

          <AnimatedSection delay={400}>
            {renderHealthHabitsSection()}
          </AnimatedSection>

          <AnimatedSection delay={500}>
            {renderAllergiesAndRestrictionsSection()}
          </AnimatedSection>
        </View>
        
        {/* Validation Summary */}
        {validationResult && (
          <View style={styles.validationSummary}>
            <GlassCard
              elevation={3}
              blurIntensity="default"
              padding="md"
              borderRadius="lg"
              style={styles.validationCard}
            >
              <View style={styles.validationTitleContainer}>
                <Ionicons
                  name={validationResult.is_valid ? 'checkmark-circle' : 'alert-circle'}
                  size={rf(20)}
                  color={validationResult.is_valid ? ResponsiveTheme.colors.success : ResponsiveTheme.colors.warning}
                />
                <Text style={styles.validationTitle}>
                  {validationResult.is_valid ? 'Ready to Continue' : 'Please Complete'}
                </Text>
              </View>
              <Text style={styles.validationPercentage}>
                {validationResult.completion_percentage}% Complete
              </Text>

              {validationResult.errors.length > 0 && (
                <View style={styles.validationErrors}>
                  <Text style={styles.validationErrorTitle}>Required:</Text>
                  {validationResult.errors.map((error, index) => (
                    <Text key={index} style={styles.validationErrorText}>
                      • {error}
                    </Text>
                  ))}
                </View>
              )}

              {validationResult.warnings.length > 0 && (
                <View style={styles.validationWarnings}>
                  <Text style={styles.validationWarningTitle}>Recommendations:</Text>
                  {validationResult.warnings.map((warning, index) => (
                    <Text key={index} style={styles.validationWarningText}>
                      • {warning}
                    </Text>
                  ))}
                </View>
              )}
            </GlassCard>
          </View>
        )}
      </ScrollView>
      
      {/* Footer Navigation */}
      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <Button
            title="Back"
            onPress={onBack}
            variant="outline"
            style={styles.backButton}
          />
          {onNavigateToTab && (
            <Button
              title="Jump to Review"
              onPress={() => {
                // Save current changes before navigating
                onUpdate(formData);
                onNavigateToTab(5);
              }}
              variant="outline"
              style={styles.jumpButton}
            />
          )}
          <Button
            title="Next: Body Analysis"
            onPress={() => {
              // Update parent state and pass current form data to validation
              onUpdate(formData);
              // Small delay to ensure state is updated before validation
              setTimeout(() => {
                onNext(formData);
              }, 100);
            }}
            variant="primary"
            style={styles.nextButton}
            loading={isLoading}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  scrollView: {
    flex: 1,
  },

  header: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  headerGradient: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.xl,
    paddingBottom: ResponsiveTheme.spacing.lg,
    borderBottomLeftRadius: ResponsiveTheme.borderRadius.xxl,
    borderBottomRightRadius: ResponsiveTheme.borderRadius.xxl,
  },

  title: {
    fontSize: rf(32),
    fontWeight: '700' as const,
    color: ResponsiveTheme.colors.white,
    marginBottom: ResponsiveTheme.spacing.sm,
    letterSpacing: -0.5,
    textAlign: 'center' as const,
  },

  subtitle: {
    fontSize: rf(16),
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: rf(24),
    marginBottom: ResponsiveTheme.spacing.md,
    textAlign: 'center' as const,
  },

  autoSaveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: `${ResponsiveTheme.colors.success}20`,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  autoSaveText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.success,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  content: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  section: {
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  sectionTitle: {
    fontSize: rf(20),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    letterSpacing: -0.3,
  },

  sectionSubtitle: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: rf(20),
  },

  fieldLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  // Diet Type Section
  dietTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.sm,
  },

  dietTypeItem: {
    width: '48%',
  },

  dietTypeCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  dietTypeCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  dietTypeContent: {
    alignItems: 'center',
    padding: ResponsiveTheme.spacing.md,
  },

  dietTypeIcon: {
    fontSize: rf(32),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  dietTypeTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  dietTypeTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  dietTypeDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },

  // Diet Readiness Section
  dietReadinessGrid: {
    gap: ResponsiveTheme.spacing.md,
  },

  dietReadinessItem: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  dietReadinessCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  dietReadinessCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  dietReadinessContent: {
    flex: 1,
  },

  dietReadinessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  dietReadinessProgressContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dietReadinessProgressIconContainer: {
    position: 'absolute',
  },

  dietReadinessIcon: {
    fontSize: rf(24),
  },

  dietReadinessToggle: {
    marginLeft: ResponsiveTheme.spacing.md,
  },

  dietReadinessTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  dietReadinessTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  dietReadinessDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
    lineHeight: rf(18),
  },

  dietReadinessBenefits: {
    marginTop: ResponsiveTheme.spacing.xs,
  },

  dietReadinessBenefit: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    lineHeight: rf(16),
  },

  // Meal Preferences Section
  mealPreferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.sm,
  },

  mealPreferenceItem: {
    width: '48%',
  },

  mealPreferenceItemDisabled: {
    opacity: 0.6,
  },

  mealPreferenceCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  mealPreferenceCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  mealPreferenceCardDisabled: {
    borderColor: ResponsiveTheme.colors.textMuted,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  mealPreferenceContent: {
    alignItems: 'center',
  },

  mealPreferenceIcon: {
    fontSize: rf(24),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  mealPreferenceTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  mealPreferenceTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  mealPreferenceDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  mealPreferenceToggle: {
    marginTop: ResponsiveTheme.spacing.xs,
  },

  // Cooking Preferences Section
  cookingField: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  skillLevelGrid: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.sm,
  },

  skillLevelItem: {
    flex: 1,
  },

  skillLevelCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  skillLevelCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  skillLevelContent: {
    alignItems: 'center',
  },

  skillLevelIcon: {
    fontSize: rf(20),
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  skillLevelTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  skillLevelTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  skillLevelDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  skillLevelTime: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    fontStyle: 'italic',
  },

  // Prep Time Section
  prepTimeContainer: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  prepTimeSlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: ResponsiveTheme.spacing.xs,
  },

  prepTimeOption: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    alignItems: 'center',
  },

  prepTimeOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  prepTimeText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  prepTimeTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
  disabledCard: {
    padding: rp(15),
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    marginTop: rp(10),
  },
  disabledContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ResponsiveTheme.spacing.xs,
  },
  disabledText: {
    flex: 1,
    fontSize: rf(14),
    color: '#666666',
    lineHeight: rp(20),
  },

  // Budget Section
  budgetGrid: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.sm,
  },

  budgetItem: {
    flex: 1,
  },

  budgetCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  budgetCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  budgetContent: {
    alignItems: 'center',
  },

  budgetIcon: {
    fontSize: rf(20),
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  budgetTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  budgetTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  budgetDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  budgetRange: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    fontStyle: 'italic',
  },

  // Health Habits Section
  habitCategory: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  habitCategoryTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
    textTransform: 'capitalize',
  },

  habitsList: {
    gap: ResponsiveTheme.spacing.sm,
  },

  habitItem: {
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  habitCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  habitCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  habitContent: {
    flex: 1,
  },

  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  habitIcon: {
    fontSize: rf(20),
  },

  habitToggle: {
    marginLeft: ResponsiveTheme.spacing.md,
  },

  habitTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  habitTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  habitDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },

  // Toggle Switch Styles
  toggleSwitch: {
    width: rw(40),
    height: rh(20),
    borderRadius: rh(10),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    justifyContent: 'center',
    paddingHorizontal: rp(2),
  },

  toggleSwitchActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },

  toggleSwitchDisabled: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderColor: ResponsiveTheme.colors.textMuted,
    opacity: 0.5,
  },

  toggleThumb: {
    width: rw(16),
    height: rh(16),
    borderRadius: rh(8),
    backgroundColor: ResponsiveTheme.colors.white,
    alignSelf: 'flex-start',
  },

  toggleThumbActive: {
    alignSelf: 'flex-end',
  },

  // Allergies Section
  allergyField: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  // Warning and Info Cards
  warningCard: {
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.warning}10`,
    borderColor: ResponsiveTheme.colors.warning,
    borderWidth: 1,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.xs,
    justifyContent: 'center',
  },

  warningText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.warning,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  infoCard: {
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
    borderColor: ResponsiveTheme.colors.primary,
    borderWidth: 1,
    marginTop: ResponsiveTheme.spacing.md,
  },

  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.xs,
    justifyContent: 'center',
  },

  infoText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Validation Section
  validationSummary: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  validationCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  validationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  validationTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  validationPercentage: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  validationErrors: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  validationErrorTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.error,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  validationErrorText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.error,
    lineHeight: rf(18),
  },

  validationWarnings: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  validationWarningTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.warning,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  validationWarningText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.warning,
    lineHeight: rf(18),
  },

  errorText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.error,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  // Footer
  footer: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.md,
  },

  backButton: {
    flex: 1,
  },

  jumpButton: {
    flex: 1.5,
  },

  nextButton: {
    flex: 2,
  },
});

export default DietPreferencesTab;
