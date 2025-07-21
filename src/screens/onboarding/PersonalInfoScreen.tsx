import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Button, Input, Card, THEME } from '../../components/ui';
import { PersonalInfo } from '../../types/user';

interface PersonalInfoScreenProps {
  onNext: (data: PersonalInfo) => void;
  onBack: () => void;
  initialData?: Partial<PersonalInfo>;
}

export const PersonalInfoScreen: React.FC<PersonalInfoScreenProps> = ({
  onNext,
  onBack,
  initialData = {},
}) => {
  const [formData, setFormData] = useState<PersonalInfo>({
    name: initialData.name || '',
    email: '', // Email not collected in onboarding - users can add later
    age: initialData.age || '',
    gender: initialData.gender || '',
    height: initialData.height || '',
    weight: initialData.weight || '',
    activityLevel: initialData.activityLevel || '',
  });

  const [errors, setErrors] = useState<Partial<PersonalInfo>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<PersonalInfo> = {};

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

    if (!formData.activityLevel) {
      newErrors.activityLevel = 'Please select your activity level';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext(formData);
    }
  };

  const updateField = (field: keyof PersonalInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
  ];

  const activityLevels = [
    { label: 'Sedentary', value: 'sedentary', description: 'Little to no exercise' },
    { label: 'Lightly Active', value: 'light', description: 'Light exercise 1-3 days/week' },
    { label: 'Moderately Active', value: 'moderate', description: 'Moderate exercise 3-5 days/week' },
    { label: 'Very Active', value: 'active', description: 'Hard exercise 6-7 days/week' },
    { label: 'Extremely Active', value: 'extreme', description: 'Very hard exercise, physical job' },
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
                    <Text style={[
                      styles.genderOptionText,
                      formData.gender === option.value && styles.genderOptionTextSelected,
                    ]}>
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

          <View style={styles.activitySection}>
            <Text style={styles.inputLabel}>Activity Level</Text>
            {activityLevels.map((level) => (
              <TouchableOpacity
                key={level.value}
                onPress={() => updateField('activityLevel', level.value)}
              >
                <Card
                  style={[
                    styles.activityCard,
                    formData.activityLevel === level.value && styles.activityCardSelected,
                  ]}
                  variant="outlined"
                >
                  <View style={styles.activityCardContent}>
                    <Text style={[
                      styles.activityTitle,
                      formData.activityLevel === level.value && styles.activityTitleSelected,
                    ]}>
                      {level.label}
                    </Text>
                    <Text style={styles.activityDescription}>
                      {level.description}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
            {errors.activityLevel && <Text style={styles.errorText}>{errors.activityLevel}</Text>}
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
  
  form: {
    paddingHorizontal: THEME.spacing.lg,
  },
  
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: THEME.spacing.md,
  },
  
  halfWidth: {
    flex: 1,
  },
  
  inputLabel: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  
  genderContainer: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
    marginBottom: THEME.spacing.md,
  },
  
  genderOption: {
    flex: 1,
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.backgroundTertiary,
    alignItems: 'center',
  },
  
  genderOptionSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: `${THEME.colors.primary}20`,
  },
  
  genderOptionText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },
  
  genderOptionTextSelected: {
    color: THEME.colors.primary,
  },
  
  activitySection: {
    marginTop: THEME.spacing.md,
  },
  
  activityCard: {
    marginBottom: THEME.spacing.sm,
  },
  
  activityCardSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: `${THEME.colors.primary}10`,
  },
  
  activityCardContent: {
    padding: THEME.spacing.md,
  },
  
  activityTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },
  
  activityTitleSelected: {
    color: THEME.colors.primary,
  },
  
  activityDescription: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
  
  errorText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.error,
    marginTop: THEME.spacing.xs,
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
