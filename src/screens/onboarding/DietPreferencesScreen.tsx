import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Button, Card, THEME } from '../../components/ui';
import { MultiSelect } from '../../components/advanced/MultiSelect';

export interface DietPreferences {
  dietType: 'vegetarian' | 'vegan' | 'non-veg' | 'pescatarian';
  allergies: string[];
  cuisinePreferences: string[];
  restrictions: string[];
}

interface DietPreferencesScreenProps {
  onNext: (data: DietPreferences) => void;
  onBack: () => void;
  initialData?: Partial<DietPreferences>;
}

export const DietPreferencesScreen: React.FC<DietPreferencesScreenProps> = ({
  onNext,
  onBack,
  initialData = {},
}) => {
  const [dietType, setDietType] = useState<DietPreferences['dietType']>(
    initialData.dietType || 'non-veg'
  );
  const [allergies, setAllergies] = useState<string[]>(
    initialData.allergies || []
  );
  const [cuisinePreferences, setCuisinePreferences] = useState<string[]>(
    initialData.cuisinePreferences || []
  );
  const [restrictions, setRestrictions] = useState<string[]>(
    initialData.restrictions || []
  );

  const [errors, setErrors] = useState<{
    dietType?: string;
    cuisinePreferences?: string;
  }>({});

  const dietTypeOptions = [
    { 
      id: 'non-veg', 
      title: 'Non-Vegetarian', 
      icon: '🍖', 
      description: 'Includes all types of meat and fish' 
    },
    { 
      id: 'vegetarian', 
      title: 'Vegetarian', 
      icon: '🥬', 
      description: 'No meat or fish, includes dairy and eggs' 
    },
    { 
      id: 'vegan', 
      title: 'Vegan', 
      icon: '🌱', 
      description: 'No animal products whatsoever' 
    },
    { 
      id: 'pescatarian', 
      title: 'Pescatarian', 
      icon: '🐟', 
      description: 'Vegetarian diet that includes fish' 
    },
  ];

  const allergyOptions = [
    { id: 'nuts', label: 'Nuts', value: 'nuts', icon: '🥜' },
    { id: 'dairy', label: 'Dairy', value: 'dairy', icon: '🥛' },
    { id: 'eggs', label: 'Eggs', value: 'eggs', icon: '🥚' },
    { id: 'gluten', label: 'Gluten', value: 'gluten', icon: '🌾' },
    { id: 'soy', label: 'Soy', value: 'soy', icon: '🫘' },
    { id: 'shellfish', label: 'Shellfish', value: 'shellfish', icon: '🦐' },
    { id: 'fish', label: 'Fish', value: 'fish', icon: '🐟' },
    { id: 'sesame', label: 'Sesame', value: 'sesame', icon: '🌰' },
  ];

  const cuisineOptions = [
    { id: 'indian', label: 'Indian', value: 'indian', icon: '🍛' },
    { id: 'mediterranean', label: 'Mediterranean', value: 'mediterranean', icon: '🫒' },
    { id: 'asian', label: 'Asian', value: 'asian', icon: '🍜' },
    { id: 'mexican', label: 'Mexican', value: 'mexican', icon: '🌮' },
    { id: 'italian', label: 'Italian', value: 'italian', icon: '🍝' },
    { id: 'american', label: 'American', value: 'american', icon: '🍔' },
    { id: 'middle-eastern', label: 'Middle Eastern', value: 'middle-eastern', icon: '🥙' },
    { id: 'japanese', label: 'Japanese', value: 'japanese', icon: '🍣' },
    { id: 'thai', label: 'Thai', value: 'thai', icon: '🍲' },
    { id: 'chinese', label: 'Chinese', value: 'chinese', icon: '🥢' },
  ];

  const restrictionOptions = [
    { id: 'low-sodium', label: 'Low Sodium', value: 'low-sodium', icon: '🧂' },
    { id: 'low-sugar', label: 'Low Sugar', value: 'low-sugar', icon: '🍯' },
    { id: 'low-carb', label: 'Low Carb', value: 'low-carb', icon: '🥖' },
    { id: 'high-protein', label: 'High Protein', value: 'high-protein', icon: '💪' },
    { id: 'keto', label: 'Keto', value: 'keto', icon: '🥑' },
    { id: 'paleo', label: 'Paleo', value: 'paleo', icon: '🦴' },
    { id: 'whole30', label: 'Whole30', value: 'whole30', icon: '🌿' },
    { id: 'intermittent-fasting', label: 'Intermittent Fasting', value: 'intermittent-fasting', icon: '⏰' },
  ];

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (cuisinePreferences.length === 0) {
      newErrors.cuisinePreferences = 'Please select at least one cuisine preference';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext({
        dietType,
        allergies,
        cuisinePreferences,
        restrictions,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>What are your diet preferences?</Text>
          <Text style={styles.subtitle}>
            Help us personalize your meal recommendations
          </Text>
        </View>

        <View style={styles.content}>
          {/* Diet Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diet Type</Text>
            <View style={styles.dietTypeGrid}>
              {dietTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => {
                    setDietType(option.id as DietPreferences['dietType']);
                    if (errors.dietType) {
                      setErrors(prev => ({ ...prev, dietType: undefined }));
                    }
                  }}
                  style={styles.dietTypeItem}
                >
                  <Card
                    style={[
                      styles.dietTypeCard,
                      dietType === option.id && styles.dietTypeCardSelected,
                    ]}
                    variant="outlined"
                  >
                    <View style={styles.dietTypeContent}>
                      <Text style={styles.dietTypeIcon}>{option.icon}</Text>
                      <Text style={[
                        styles.dietTypeTitle,
                        dietType === option.id && styles.dietTypeTitleSelected,
                      ]}>
                        {option.title}
                      </Text>
                      <Text style={styles.dietTypeDescription}>
                        {option.description}
                      </Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
            {errors.dietType && <Text style={styles.errorText}>{errors.dietType}</Text>}
          </View>

          {/* Allergies */}
          <View style={styles.section}>
            <MultiSelect
              options={allergyOptions}
              selectedValues={allergies}
              onSelectionChange={setAllergies}
              label="Food Allergies"
              placeholder="Select any food allergies"
              searchable={true}
            />
          </View>

          {/* Cuisine Preferences */}
          <View style={styles.section}>
            <MultiSelect
              options={cuisineOptions}
              selectedValues={cuisinePreferences}
              onSelectionChange={(values) => {
                setCuisinePreferences(values);
                if (errors.cuisinePreferences) {
                  setErrors(prev => ({ ...prev, cuisinePreferences: undefined }));
                }
              }}
              label="Cuisine Preferences"
              placeholder="Select your favorite cuisines"
              searchable={true}
              maxSelections={5}
            />
            {errors.cuisinePreferences && (
              <Text style={styles.errorText}>{errors.cuisinePreferences}</Text>
            )}
          </View>

          {/* Dietary Restrictions */}
          <View style={styles.section}>
            <MultiSelect
              options={restrictionOptions}
              selectedValues={restrictions}
              onSelectionChange={setRestrictions}
              label="Dietary Restrictions (Optional)"
              placeholder="Select any dietary restrictions"
              searchable={true}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <Button
            title="Back"
            onPress={onBack}
            variant="outline"
            style={styles.backButton}
          />
          <Button
            title="Next"
            onPress={handleNext}
            variant="primary"
            style={styles.nextButton}
          />
        </View>
      </View>
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
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.xl,
    paddingBottom: THEME.spacing.lg,
  },
  
  title: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  
  subtitle: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    lineHeight: 22,
  },
  
  content: {
    paddingHorizontal: THEME.spacing.lg,
  },
  
  section: {
    marginBottom: THEME.spacing.xl,
  },
  
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  
  dietTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.sm,
  },
  
  dietTypeItem: {
    width: '48%',
  },
  
  dietTypeCard: {
    marginBottom: THEME.spacing.sm,
  },
  
  dietTypeCardSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: `${THEME.colors.primary}10`,
  },
  
  dietTypeContent: {
    alignItems: 'center',
    padding: THEME.spacing.md,
  },
  
  dietTypeIcon: {
    fontSize: 32,
    marginBottom: THEME.spacing.sm,
  },
  
  dietTypeTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: THEME.spacing.xs,
  },
  
  dietTypeTitleSelected: {
    color: THEME.colors.primary,
  },
  
  dietTypeDescription: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  
  errorText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.error,
    marginTop: THEME.spacing.sm,
  },
  
  footer: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: THEME.colors.backgroundSecondary,
  },
  
  buttonRow: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
  },
  
  backButton: {
    flex: 1,
  },
  
  nextButton: {
    flex: 2,
  },
});
