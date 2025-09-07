import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Button, Input, Card, THEME } from '../../components/ui';
import { PersonalInfo } from '../../types/user';
import {
  useEditContext,
  useEditMode,
  useEditData,
  useEditActions,
} from '../../contexts/EditContext';

interface PersonalInfoScreenProps {
  onNext?: (data: PersonalInfo) => void;
  onBack?: () => void;
  initialData?: Partial<PersonalInfo>;
  // Edit mode props
  isEditMode?: boolean;
  onEditComplete?: () => void;
  onEditCancel?: () => void;
}

export const PersonalInfoScreen: React.FC<PersonalInfoScreenProps> = ({
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

  const [formData, setFormData] = useState<Omit<PersonalInfo, 'activityLevel'>>(() => {
    const data = getInitialData();
    return {
      name: data.name || '',
      email: data.email || '',
      age: data.age || '',
      gender: data.gender || '',
      height: data.height || '',
      weight: data.weight || '',
    };
  });

  const [errors, setErrors] = useState<Partial<Omit<PersonalInfo, 'activityLevel'>>>({});

  // Track if data has been populated to prevent loops
  const [isDataPopulated, setIsDataPopulated] = useState(false);

  // Update form data when edit context data is loaded (only once)
  useEffect(() => {
    if (
      isEditMode &&
      editContextData?.currentData &&
      Object.keys(editContextData.currentData).length > 0 &&
      !isDataPopulated
    ) {
      const data = editContextData.currentData;
      const newFormData = {
        name: data.name || '',
        email: data.email || '',
        age: data.age?.toString() || '',
        gender: data.gender || '',
        height: data.height?.toString() || '',
        weight: data.weight?.toString() || '',
      };
      setFormData(newFormData);
      setIsDataPopulated(true);
    }
  }, [isEditMode, editContextData?.currentData, isDataPopulated]);

  // Sync form data with edit context (but not on initial load)
  useEffect(() => {
    if (isEditMode && editContextData?.updateData && isDataPopulated) {
      // Throttle updates to avoid excessive calls
      const timeoutId = setTimeout(() => {
        editContextData.updateData(formData);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [formData, isEditMode, isDataPopulated]); // Removed editContextData?.updateData from deps

  const validateForm = (): boolean => {
    const newErrors: Partial<Omit<PersonalInfo, 'activityLevel'>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Email is optional during onboarding - users can add it later

    // Improved age validation - use parseInt for consistency with backend
    const age = parseInt(formData.age);
    if (!formData.age.trim() || isNaN(age) || age < 13 || age > 120) {
      newErrors.age = 'Please enter a valid age (13-120)';
    }

    if (!formData.gender) {
      newErrors.gender = 'Please select your gender';
    }

    // Improved height validation
    const height = parseFloat(formData.height);
    if (!formData.height.trim() || isNaN(height) || height < 100 || height > 250) {
      newErrors.height = 'Please enter a valid height (100-250 cm)';
    }

    // Improved weight validation
    const weight = parseFloat(formData.weight);
    if (!formData.weight.trim() || isNaN(weight) || weight < 30 || weight > 300) {
      newErrors.weight = 'Please enter a valid weight (30-300 kg)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateForm()) {
      return;
    }

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
        // Add placeholder activityLevel for backward compatibility
        onNext({ ...formData, activityLevel: '' } as PersonalInfo);
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

  const updateField = (field: keyof Omit<PersonalInfo, 'activityLevel'>, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
  ];


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Tell us about yourself</Text>
          <Text style={styles.subtitle}>
            This helps us create a personalized fitness plan for you
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Full Name"
            placeholder="Enter your full name"
            value={formData.name}
            onChangeText={(value) => updateField('name', value)}
            error={errors.name}
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="Age"
                placeholder="25"
                value={formData.age}
                onChangeText={(value) => updateField('age', value)}
                keyboardType="numeric"
                error={errors.age}
              />
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderContainer}>
                {genderOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.genderOption,
                      formData.gender === option.value && styles.genderOptionSelected,
                    ]}
                    onPress={() => updateField('gender', option.value)}
                  >
                    <Text
                      style={[
                        styles.genderOptionText,
                        formData.gender === option.value && styles.genderOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="Height (cm)"
                placeholder="170"
                value={formData.height}
                onChangeText={(value) => updateField('height', value)}
                keyboardType="numeric"
                error={errors.height}
              />
            </View>

            <View style={styles.halfWidth}>
              <Input
                label="Weight (kg)"
                placeholder="70"
                value={formData.weight}
                onChangeText={(value) => updateField('weight', value)}
                keyboardType="numeric"
                error={errors.weight}
              />
            </View>
          </View>

        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <Button
            title={isEditMode ? 'Cancel' : 'Back'}
            onPress={handleBack}
            variant="outline"
            style={styles.backButton}
          />
          <Button
            title={isEditMode ? 'Save Changes' : 'Next'}
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

  form: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: ResponsiveTheme.spacing.md,
  },

  halfWidth: {
    flex: 1,
  },

  inputLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  genderContainer: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  genderOption: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    alignItems: 'center',
  },

  genderOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}20`,
  },

  genderOptionText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  genderOptionTextSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  activitySection: {
    marginTop: ResponsiveTheme.spacing.md,
  },

  activityCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  activityCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  activityCardContent: {
    padding: ResponsiveTheme.spacing.md,
  },

  activityTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  activityTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  activityDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  errorText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.error,
    marginTop: ResponsiveTheme.spacing.xs,
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
