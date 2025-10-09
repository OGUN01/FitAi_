import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native';
import { rf, rp, rh, rw } from '../../../utils/responsive';
import { ResponsiveTheme } from '../../../utils/constants';
import { Button, Card } from '../../../components/ui';
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
    icon: '🍖',
    description: 'Includes all types of meat and fish',
  },
  {
    id: 'vegetarian',
    title: 'Vegetarian',
    icon: '🥬',
    description: 'No meat or fish, includes dairy and eggs',
  },
  {
    id: 'vegan',
    title: 'Vegan',
    icon: '🌱',
    description: 'No animal products whatsoever',
  },
  {
    id: 'pescatarian',
    title: 'Pescatarian',
    icon: '🐟',
    description: 'Vegetarian diet that includes fish',
  },
];

const DIET_READINESS_OPTIONS = [
  {
    key: 'keto_ready',
    title: 'Ketogenic Diet',
    icon: '🥑',
    description: 'High fat, very low carb diet (5% carbs, 70% fat, 25% protein)',
    benefits: ['Rapid weight loss', 'Mental clarity', 'Reduced appetite'],
  },
  {
    key: 'intermittent_fasting_ready',
    title: 'Intermittent Fasting',
    icon: '⏰',
    description: 'Time-restricted eating patterns (16:8, 18:6, etc.)',
    benefits: ['Improved metabolism', 'Weight management', 'Cellular repair'],
  },
  {
    key: 'paleo_ready',
    title: 'Paleo Diet',
    icon: '🦴',
    description: 'Whole foods based on paleolithic era eating',
    benefits: ['Natural nutrition', 'Reduced inflammation', 'Better digestion'],
  },
  {
    key: 'mediterranean_ready',
    title: 'Mediterranean Diet',
    icon: '🫒',
    description: 'Rich in olive oil, fish, vegetables, and whole grains',
    benefits: ['Heart health', 'Brain function', 'Longevity'],
  },
  {
    key: 'low_carb_ready',
    title: 'Low Carb Diet',
    icon: '🥖',
    description: 'Reduced carbohydrate intake (under 100g daily)',
    benefits: ['Blood sugar control', 'Weight loss', 'Energy stability'],
  },
  {
    key: 'high_protein_ready',
    title: 'High Protein Diet',
    icon: '💪',
    description: 'Increased protein intake for muscle building',
    benefits: ['Muscle growth', 'Satiety', 'Recovery'],
  },
];

const COOKING_SKILL_LEVELS = [
  {
    level: 'beginner',
    title: 'Beginner',
    icon: '🍳',
    description: 'Simple recipes, basic cooking skills',
    timeRange: '15-30 minutes',
  },
  {
    level: 'intermediate',
    title: 'Intermediate',
    icon: '👨‍🍳',
    description: 'Comfortable with various techniques',
    timeRange: '30-60 minutes',
  },
  {
    level: 'advanced',
    title: 'Advanced',
    icon: '👨‍🍳',
    description: 'Complex recipes, professional techniques',
    timeRange: '60+ minutes',
  },
  {
    level: 'not_applicable',
    title: 'Not Applicable',
    icon: '🏠',
    description: 'Made/home food prepared by others',
    timeRange: 'N/A',
  },
];

const BUDGET_LEVELS = [
  {
    level: 'low',
    title: 'Budget-Friendly',
    icon: '💰',
    description: 'Cost-effective ingredients and meals',
    range: '$50-100/week',
  },
  {
    level: 'medium',
    title: 'Moderate',
    icon: '💰💰',
    description: 'Balance of quality and affordability',
    range: '$100-200/week',
  },
  {
    level: 'high',
    title: 'Premium',
    icon: '💰💰💰',
    description: 'High-quality, organic ingredients',
    range: '$200+/week',
  },
];

const HEALTH_HABITS = {
  hydration: [
    {
      key: 'drinks_enough_water',
      title: 'Drinks 3-4L Water Daily',
      icon: '💧',
      description: 'Maintains proper hydration levels',
    },
    {
      key: 'limits_sugary_drinks',
      title: 'Limits Sugary Drinks',
      icon: '🥤',
      description: 'Avoids sodas, juices with added sugar',
    },
  ],
  eating_patterns: [
    {
      key: 'eats_regular_meals',
      title: 'Eats Regular Meals',
      icon: '🍽️',
      description: 'Consistent meal timing throughout day',
    },
    {
      key: 'avoids_late_night_eating',
      title: 'Avoids Late Night Eating',
      icon: '🌙',
      description: 'No eating 3 hours before bedtime',
    },
    {
      key: 'controls_portion_sizes',
      title: 'Controls Portion Sizes',
      icon: '⚖️',
      description: 'Mindful of serving sizes',
    },
    {
      key: 'reads_nutrition_labels',
      title: 'Reads Nutrition Labels',
      icon: '🏷️',
      description: 'Checks food labels before purchasing',
    },
  ],
  food_choices: [
    {
      key: 'eats_processed_foods',
      title: 'Eats Processed Foods',
      icon: '📦',
      description: 'Regularly consumes packaged/processed foods',
    },
    {
      key: 'eats_5_servings_fruits_veggies',
      title: 'Eats 5+ Servings Fruits/Vegetables',
      icon: '🥕',
      description: 'Daily fruit and vegetable intake',
    },
    {
      key: 'limits_refined_sugar',
      title: 'Limits Refined Sugar',
      icon: '🍯',
      description: 'Reduces added sugars in diet',
    },
    {
      key: 'includes_healthy_fats',
      title: 'Includes Healthy Fats',
      icon: '🥑',
      description: 'Nuts, avocado, olive oil, etc.',
    },
  ],
  substances: [
    {
      key: 'drinks_alcohol',
      title: 'Drinks Alcohol',
      icon: '🍷',
      description: 'Regular alcohol consumption',
    },
    {
      key: 'smokes_tobacco',
      title: 'Smokes Tobacco',
      icon: '🚬',
      description: 'Tobacco use (any form)',
    },
    {
      key: 'drinks_coffee',
      title: 'Drinks Coffee',
      icon: '☕',
      description: 'Daily caffeine intake',
    },
    {
      key: 'takes_supplements',
      title: 'Takes Supplements',
      icon: '💊',
      description: 'Vitamins, protein powder, etc.',
    },
  ],
};

const ALLERGY_OPTIONS = [
  { id: 'nuts', label: 'Nuts', value: 'nuts', icon: '🥜' },
  { id: 'dairy', label: 'Dairy', value: 'dairy', icon: '🥛' },
  { id: 'eggs', label: 'Eggs', value: 'eggs', icon: '🥚' },
  { id: 'gluten', label: 'Gluten', value: 'gluten', icon: '🌾' },
  { id: 'soy', label: 'Soy', value: 'soy', icon: '🫘' },
  { id: 'shellfish', label: 'Shellfish', value: 'shellfish', icon: '🦐' },
  { id: 'fish', label: 'Fish', value: 'fish', icon: '🐟' },
  { id: 'sesame', label: 'Sesame', value: 'sesame', icon: '🌰' },
];


const RESTRICTION_OPTIONS = [
  { id: 'low-sodium', label: 'Low Sodium', value: 'low-sodium', icon: '🧂' },
  { id: 'low-sugar', label: 'Low Sugar', value: 'low-sugar', icon: '🍯' },
  { id: 'low-carb', label: 'Low Carb', value: 'low-carb', icon: '🥖' },
  { id: 'high-protein', label: 'High Protein', value: 'high-protein', icon: '💪' },
  { id: 'diabetic-friendly', label: 'Diabetic Friendly', value: 'diabetic-friendly', icon: '📊' },
  { id: 'heart-healthy', label: 'Heart Healthy', value: 'heart-healthy', icon: '❤️' },
];

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
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Current Diet Type</Text>
      <Text style={styles.sectionSubtitle}>What best describes your current eating habits?</Text>
      
      <View style={styles.dietTypeGrid}>
        {DIET_TYPE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            onPress={() => updateField('diet_type', option.id as DietPreferencesData['diet_type'])}
            style={styles.dietTypeItem}
          >
            <Card
              style={StyleSheet.flatten([
                styles.dietTypeCard,
                formData.diet_type === option.id && styles.dietTypeCardSelected,
              ])}
              variant="outlined"
            >
              <View style={styles.dietTypeContent}>
                <Text style={styles.dietTypeIcon}>{option.icon}</Text>
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
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
  
  const renderDietReadinessSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Diet Readiness</Text>
      <Text style={styles.sectionSubtitle}>
        Are you ready to try any of these specialized diets? (Optional)
      </Text>
      
      <View style={styles.dietReadinessGrid}>
        {DIET_READINESS_OPTIONS.map((option) => {
          const isReady = formData[option.key as keyof DietPreferencesData] as boolean;
          
          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => toggleDietReadiness(option.key as keyof DietPreferencesData)}
              style={styles.dietReadinessItem}
            >
              <Card
                style={StyleSheet.flatten([
                  styles.dietReadinessCard,
                  isReady && styles.dietReadinessCardSelected,
                ])}
                variant="outlined"
              >
                <View style={styles.dietReadinessContent}>
                  <View style={styles.dietReadinessHeader}>
                    <Text style={styles.dietReadinessIcon}>{option.icon}</Text>
                    <View style={styles.dietReadinessToggle}>
                      <View style={[
                        styles.toggleSwitch,
                        isReady && styles.toggleSwitchActive,
                      ]}>
                        <View style={[
                          styles.toggleThumb,
                          isReady && styles.toggleThumbActive,
                        ]} />
                      </View>
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
              </Card>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
  
  const renderMealPreferencesSection = () => {
    const enabledCount = getEnabledMealsCount();
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meal Preferences</Text>
        <Text style={styles.sectionSubtitle}>
          Which meals would you like us to plan for you? ({enabledCount}/4 enabled)
        </Text>
        
        {enabledCount === 1 && (
          <Card style={styles.warningCard}>
            <Text style={styles.warningText}>
              ⚠️ At least one meal type must remain enabled
            </Text>
          </Card>
        )}
        
        <View style={styles.mealPreferencesGrid}>
          {[
            { key: 'breakfast_enabled', title: 'Breakfast', icon: '🌅', description: 'Start your day right' },
            { key: 'lunch_enabled', title: 'Lunch', icon: '☀️', description: 'Midday fuel' },
            { key: 'dinner_enabled', title: 'Dinner', icon: '🌆', description: 'Evening nourishment' },
            { key: 'snacks_enabled', title: 'Snacks', icon: '🍎', description: 'Healthy snacking' },
          ].map((meal) => {
            const isEnabled = formData[meal.key as keyof DietPreferencesData] as boolean;
            const isLastEnabled = enabledCount === 1 && isEnabled;
            
            return (
              <TouchableOpacity
                key={meal.key}
                onPress={() => !isLastEnabled && toggleMealPreference(meal.key as keyof DietPreferencesData)}
                style={[
                  styles.mealPreferenceItem,
                  isLastEnabled && styles.mealPreferenceItemDisabled,
                ]}
                disabled={isLastEnabled}
              >
                <Card
                  style={StyleSheet.flatten([
                    styles.mealPreferenceCard,
                    isEnabled && styles.mealPreferenceCardSelected,
                    isLastEnabled && styles.mealPreferenceCardDisabled,
                  ])}
                  variant="outlined"
                >
                  <View style={styles.mealPreferenceContent}>
                    <Text style={styles.mealPreferenceIcon}>{meal.icon}</Text>
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
                      <View style={[
                        styles.toggleSwitch,
                        isEnabled && styles.toggleSwitchActive,
                        isLastEnabled && styles.toggleSwitchDisabled,
                      ]}>
                        <View style={[
                          styles.toggleThumb,
                          isEnabled && styles.toggleThumbActive,
                        ]} />
                      </View>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
        
        {!formData.breakfast_enabled && (
          <Card style={styles.infoCard}>
            <Text style={styles.infoText}>
              💡 Meal plans will only include lunch and dinner
            </Text>
          </Card>
        )}
      </View>
    );
  };
  
  const renderCookingPreferencesSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Cooking Preferences</Text>
      <Text style={styles.sectionSubtitle}>Help us suggest recipes that match your cooking style</Text>
      
      {/* Cooking Skill Level */}
      <View style={styles.cookingField}>
        <Text style={styles.fieldLabel}>Cooking Skill Level</Text>
        <View style={styles.skillLevelGrid}>
          {COOKING_SKILL_LEVELS.map((skill) => (
            <TouchableOpacity
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
            >
              <Card
                style={StyleSheet.flatten([
                  styles.skillLevelCard,
                  formData.cooking_skill_level === skill.level && styles.skillLevelCardSelected,
                ])}
                variant="outlined"
              >
                <View style={styles.skillLevelContent}>
                  <Text style={styles.skillLevelIcon}>{skill.icon}</Text>
                  <Text style={[
                    styles.skillLevelTitle,
                    formData.cooking_skill_level === skill.level && styles.skillLevelTitleSelected,
                  ]}>
                    {skill.title}
                  </Text>
                  <Text style={styles.skillLevelDescription}>{skill.description}</Text>
                  <Text style={styles.skillLevelTime}>{skill.timeRange}</Text>
                </View>
              </Card>
            </TouchableOpacity>
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
          <Card style={styles.disabledCard} variant="outlined">
            <Text style={styles.disabledText}>
              ℹ️ This field is not applicable since your meals are prepared by others. 
              We'll suggest meals based on your dietary preferences without cooking time constraints.
            </Text>
          </Card>
        ) : (
          <View style={styles.prepTimeContainer}>
            <View style={styles.prepTimeSlider}>
              {[15, 30, 45, 60, 90, 120].map((time) => (
                <TouchableOpacity
                  key={time}
                  style={StyleSheet.flatten([
                    styles.prepTimeOption,
                    formData.max_prep_time_minutes === time && styles.prepTimeOptionSelected,
                  ])}
                  onPress={() => updateField('max_prep_time_minutes', time)}
                >
                  <Text style={StyleSheet.flatten([
                    styles.prepTimeText,
                    formData.max_prep_time_minutes === time && styles.prepTimeTextSelected,
                  ])}>
                    {time}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
      
      {/* Budget Level */}
      <View style={styles.cookingField}>
        <Text style={styles.fieldLabel}>Food Budget</Text>
        <View style={styles.budgetGrid}>
          {BUDGET_LEVELS.map((budget) => (
            <TouchableOpacity
              key={budget.level}
              onPress={() => updateField('budget_level', budget.level as DietPreferencesData['budget_level'])}
              style={styles.budgetItem}
            >
              <Card
                style={StyleSheet.flatten([
                  styles.budgetCard,
                  formData.budget_level === budget.level && styles.budgetCardSelected,
                ])}
                variant="outlined"
              >
                <View style={styles.budgetContent}>
                  <Text style={styles.budgetIcon}>{budget.icon}</Text>
                  <Text style={StyleSheet.flatten([
                    styles.budgetTitle,
                    formData.budget_level === budget.level && styles.budgetTitleSelected,
                  ])}>
                    {budget.title}
                  </Text>
                  <Text style={styles.budgetDescription}>{budget.description}</Text>
                  <Text style={styles.budgetRange}>{budget.range}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
  
  const renderHealthHabitsSection = () => (
    <View style={styles.section}>
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
                <TouchableOpacity
                  key={habit.key}
                  onPress={() => toggleHealthHabit(habit.key as keyof DietPreferencesData)}
                  style={styles.habitItem}
                >
                  <Card
                    style={StyleSheet.flatten([
                      styles.habitCard,
                      isActive && styles.habitCardSelected,
                    ])}
                    variant="outlined"
                  >
                    <View style={styles.habitContent}>
                      <View style={styles.habitHeader}>
                        <Text style={styles.habitIcon}>{habit.icon}</Text>
                        <View style={styles.habitToggle}>
                          <View style={StyleSheet.flatten([
                            styles.toggleSwitch,
                            isActive && styles.toggleSwitchActive,
                          ])}>
                            <View style={StyleSheet.flatten([
                              styles.toggleThumb,
                              isActive && styles.toggleThumbActive,
                            ])} />
                          </View>
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
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
  
  const renderAllergiesAndRestrictionsSection = () => (
    <View style={styles.section}>
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
    </View>
  );
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>What are your diet preferences?</Text>
          <Text style={styles.subtitle}>
            Help us personalize your meal recommendations and nutrition plan
          </Text>
          
          {/* Auto-save Indicator */}
          {isAutoSaving && (
            <View style={styles.autoSaveIndicator}>
              <Text style={styles.autoSaveText}>💾 Saving...</Text>
            </View>
          )}
        </View>
        
        {/* Form Sections */}
        <View style={styles.content}>
          {renderCurrentDietSection()}
          {renderDietReadinessSection()}
          {renderMealPreferencesSection()}
          {renderCookingPreferencesSection()}
          {renderHealthHabitsSection()}
          {renderAllergiesAndRestrictionsSection()}
        </View>
        
        {/* Validation Summary */}
        {validationResult && (
          <View style={styles.validationSummary}>
            <Card style={styles.validationCard}>
              <Text style={styles.validationTitle}>
                {validationResult.is_valid ? '✅ Ready to Continue' : '⚠️ Please Complete'}
              </Text>
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
            </Card>
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
    backgroundColor: ResponsiveTheme.colors.background,
  },

  scrollView: {
    flex: 1,
  },

  header: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.xl,
    paddingBottom: ResponsiveTheme.spacing.lg,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  subtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(22),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  autoSaveIndicator: {
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
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  sectionSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: rf(18),
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
  disabledText: {
    fontSize: rf(14),
    color: '#666666',
    lineHeight: rp(20),
    textAlign: 'center',
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

  warningText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.warning,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    textAlign: 'center',
  },

  infoCard: {
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
    borderColor: ResponsiveTheme.colors.primary,
    borderWidth: 1,
    marginTop: ResponsiveTheme.spacing.md,
  },

  infoText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    textAlign: 'center',
  },

  // Validation Section
  validationSummary: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  validationCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  validationTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
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
