import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Button, Card, THEME } from '../../components/ui';
import { MultiSelect } from '../../components/advanced/MultiSelect';
import { useEditMode, useEditData, useEditActions } from '../../contexts/EditContext';

export interface DietPreferences {
  dietType: 'vegetarian' | 'vegan' | 'non-veg' | 'pescatarian';
  allergies: string[];
  cuisinePreferences: string[];
  restrictions: string[];
}

interface DietPreferencesScreenProps {
  onNext?: (data: DietPreferences) => void;
  onBack?: () => void;
  initialData?: Partial<DietPreferences>;
  // Edit mode props
  isEditMode?: boolean;
  onEditComplete?: () => void;
  onEditCancel?: () => void;
}

export const DietPreferencesScreen: React.FC<DietPreferencesScreenProps> = ({
  onNext,
  onBack,
  initialData = {},
  isEditMode: propIsEditMode = false,
  onEditComplete,
  onEditCancel,
}) => {
  // Detect edit mode from context or props
  const isInEditContext = (() => {
    try {
      const { isEditMode } = useEditMode();
      return isEditMode;
    } catch {
      return false;
    }
  })();

  const isEditMode = isInEditContext || propIsEditMode;

  // Get edit data if in edit context
  const editContextData = (() => {
    try {
      const { currentData, updateData } = useEditData();
      const { saveChanges, cancelEdit } = useEditActions();
      return { currentData, updateData, saveChanges, cancelEdit };
    } catch {
      return null;
    }
  })();

  // Determine initial data source
  const getInitialData = () => {
    if (isEditMode && editContextData?.currentData) {
      return editContextData.currentData;
    }
    return initialData;
  };

  const data = getInitialData();
  const [dietType, setDietType] = useState<DietPreferences['dietType']>(
    data.dietType || 'non-veg'
  );
  const [allergies, setAllergies] = useState<string[]>(
    data.allergies || []
  );
  const [cuisinePreferences, setCuisinePreferences] = useState<string[]>(
    data.cuisinePreferences || []
  );
  const [restrictions, setRestrictions] = useState<string[]>(
    data.restrictions || []
  );

  const [errors, setErrors] = useState<{
    dietType?: string;
    cuisinePreferences?: string;
  }>({});

  // Track if data has been populated to prevent loops
  const [isDataPopulated, setIsDataPopulated] = useState(false);

  // Create form data object for syncing
  const formData = {
    dietType,
    allergies,
    cuisinePreferences,
    restrictions,
  };

  // Update form data when edit context data changes (only once)
  useEffect(() => {
    if (isEditMode && editContextData?.currentData && Object.keys(editContextData.currentData).length > 0 && !isDataPopulated) {
      const data = editContextData.currentData;
      setDietType(data.dietType || 'non-veg');
      setAllergies(data.allergies || []);
      setCuisinePreferences(data.cuisinePreferences || []);
      setRestrictions(data.restrictions || []);
      setIsDataPopulated(true);
    }
  }, [isEditMode, editContextData?.currentData, isDataPopulated]);

  // Sync form data with edit context (but not on initial load)
  useEffect(() => {
    if (isEditMode && editContextData?.updateData && isDataPopulated) {
      const timeoutId = setTimeout(() => {
        editContextData.updateData(formData);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [dietType, allergies, cuisinePreferences, restrictions, isEditMode, isDataPopulated]);

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

  const handleNext = async () => {
    if (!validateForm()) {
      return;
    }

    const dietData = {
      dietType,
      allergies,
      cuisinePreferences,
      restrictions,
    };

    if (isEditMode) {
      // In edit mode, save the changes
      if (editContextData?.saveChanges) {
        const success = await editContextData.saveChanges();
        if (success && onEditComplete) {
          onEditComplete();
        }
      }
    } else {
      // In onboarding mode, proceed to next step
      if (onNext) {
        onNext(dietData);
      }
    }
  };

  const handleBack = () => {
    if (isEditMode) {
      // In edit mode, cancel the edit
      if (editContextData?.cancelEdit) {
        editContextData.cancelEdit();
      } else if (onEditCancel) {
        onEditCancel();
      }
    } else {
      // In onboarding mode, go back
      if (onBack) {
        onBack();
      }
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
            title={isEditMode ? "Cancel" : "Back"}
            onPress={handleBack}
            variant="outline"
            style={styles.backButton}
          />
          <Button
            title={isEditMode ? "Save Changes" : "Next"}
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
    marginBottom: ResponsiveTheme.spacing.md,
  },
  
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
  
  errorText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.error,
    marginTop: ResponsiveTheme.spacing.sm,
  },
  
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
  
  nextButton: {
    flex: 2,
  },
});
