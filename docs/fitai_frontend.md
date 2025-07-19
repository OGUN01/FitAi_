# FitAI - Frontend Development Guide

## Overview

This document provides comprehensive guidance for building the FitAI mobile application frontend using React Native with Expo. The app follows a modern, AI-enhanced design with intuitive navigation and seamless user experience.

## Technology Stack

### Core Technologies

- **React Native**: 0.73+
- **Expo SDK**: 50+
- **TypeScript**: For type safety and better development experience
- **NativeWind**: Tailwind CSS for React Native styling

### Dependencies

```json
{
  "dependencies": {
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "@react-navigation/stack": "^6.3.20",
    "react-native-screens": "~3.29.0",
    "react-native-safe-area-context": "4.8.2",
    "zustand": "^4.4.7",
    "react-native-async-storage": "1.21.0",
    "expo-image-picker": "~14.7.1",
    "expo-camera": "~14.1.3",
    "expo-sqlite": "~13.4.0",
    "react-native-svg": "14.1.0",
    "react-native-reanimated": "~3.6.2",
    "react-native-gesture-handler": "~2.14.0",
    "nativewind": "^2.0.11",
    "expo-linear-gradient": "~12.7.2",
    "react-native-chart-kit": "^6.12.0",
    "expo-haptics": "~12.8.1",
    "expo-blur": "~12.9.2"
  },
  "devDependencies": {
    "@types/react": "~18.2.45",
    "@types/react-native": "~0.73.0",
    "tailwindcss": "3.3.2"
  }
}
```

## Project Structure

```
src/
├── components/              # Reusable UI components
│   ├── ui/                 # Base UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   └── LoadingSpinner.tsx
│   ├── forms/              # Form components
│   │   ├── OnboardingForm.tsx
│   │   ├── ProfileForm.tsx
│   │   └── MealLogForm.tsx
│   ├── charts/             # Data visualization
│   │   ├── ProgressChart.tsx
│   │   ├── CalorieChart.tsx
│   │   └── WeightChart.tsx
│   ├── workout/            # Workout-specific components
│   │   ├── ExerciseCard.tsx
│   │   ├── WorkoutTimer.tsx
│   │   └── SetCounter.tsx
│   ├── diet/               # Diet-specific components
│   │   ├── MealCard.tsx
│   │   ├── FoodScanner.tsx
│   │   └── NutritionSummary.tsx
│   └── common/             # Common components
│       ├── Header.tsx
│       ├── TabBar.tsx
│       └── StatusCard.tsx
├── screens/                # Screen components
│   ├── onboarding/         # Onboarding flow
│   │   ├── PersonalInfoScreen.tsx
│   │   ├── WorkoutPreferencesScreen.tsx
│   │   ├── DietPreferencesScreen.tsx
│   │   ├── BodyAnalysisScreen.tsx
│   │   └── ReviewScreen.tsx
│   ├── main/               # Main app screens
│   │   ├── HomeScreen.tsx
│   │   ├── WorkoutScreen.tsx
│   │   ├── DietScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── workout/            # Workout-related screens
│   │   ├── WorkoutDetailsScreen.tsx
│   │   ├── ExerciseScreen.tsx
│   │   └── WorkoutHistoryScreen.tsx
│   ├── diet/               # Diet-related screens
│   │   ├── MealLogScreen.tsx
│   │   ├── FoodDetailsScreen.tsx
│   │   └── NutritionScreen.tsx
│   └── profile/            # Profile and settings
│       ├── SettingsScreen.tsx
│       ├── ProgressScreen.tsx
│       └── BodyAnalysisHistoryScreen.tsx
├── navigation/             # Navigation configuration
│   ├── AppNavigator.tsx
│   ├── OnboardingNavigator.tsx
│   ├── MainTabNavigator.tsx
│   └── types.ts
├── stores/                 # State management
│   ├── userStore.ts
│   ├── workoutStore.ts
│   ├── dietStore.ts
│   └── appStore.ts
├── services/               # API and external services
│   ├── api/
│   ├── storage/
│   └── camera/
├── utils/                  # Utility functions
│   ├── constants.ts
│   ├── formatters.ts
│   ├── validators.ts
│   └── helpers.ts
├── hooks/                  # Custom React hooks
│   ├── useCamera.ts
│   ├── useOfflineSync.ts
│   └── usePerformance.ts
├── types/                  # TypeScript definitions
│   ├── user.ts
│   ├── workout.ts
│   ├── diet.ts
│   └── api.ts
└── assets/                 # Static assets
    ├── images/
    ├── icons/
    └── fonts/
```

## Design System

### Color Palette

```typescript
// utils/colors.ts
export const colors = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    900: '#0c4a6e',
  },
  secondary: {
    50: '#fdf4ff',
    100: '#fae8ff',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7c3aed',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
};
```

### Typography

```typescript
// utils/typography.ts
export const typography = {
  fonts: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};
```

### Component Specifications

#### Base Button Component

```typescript
// components/ui/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { styled } from 'nativewind';

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledText = styled(Text);

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  disabled,
  className,
  ...props
}) => {
  const baseClasses = 'rounded-xl flex-row items-center justify-center';

  const variantClasses = {
    primary: 'bg-primary-500 active:bg-primary-600',
    secondary: 'bg-secondary-500 active:bg-secondary-600',
    outline: 'border-2 border-primary-500 bg-transparent active:bg-primary-50',
    ghost: 'bg-transparent active:bg-neutral-100'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 min-h-[32px]',
    md: 'px-4 py-3 min-h-[44px]',
    lg: 'px-6 py-4 min-h-[52px]'
  };

  const textVariantClasses = {
    primary: 'text-white font-semibold',
    secondary: 'text-white font-semibold',
    outline: 'text-primary-500 font-semibold',
    ghost: 'text-neutral-700 font-medium'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const disabledClasses = disabled || loading ? 'opacity-50' : '';

  const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className || ''}`;
  const textClasses = `${textVariantClasses[variant]} ${textSizeClasses[size]}`;

  return (
    <StyledTouchableOpacity
      className={buttonClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? '#0ea5e9' : '#ffffff'}
          className="mr-2"
        />
      )}
      <StyledText className={textClasses}>
        {children}
      </StyledText>
    </StyledTouchableOpacity>
  );
};
```

#### Input Component

```typescript
// components/ui/Input.tsx
import React, { forwardRef } from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledTextInput = styled(TextInput);
const StyledText = styled(Text);

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outline';
}

export const Input = forwardRef<TextInput, InputProps>(({
  label,
  error,
  leftIcon,
  rightIcon,
  variant = 'default',
  className,
  ...props
}, ref) => {
  const baseClasses = 'flex-1 text-base text-neutral-900 font-regular';

  const containerVariantClasses = {
    default: 'border-b border-neutral-200 focus:border-primary-500',
    filled: 'bg-neutral-100 rounded-xl px-4',
    outline: 'border border-neutral-300 rounded-xl px-4 focus:border-primary-500'
  };

  const containerClasses = `flex-row items-center min-h-[48px] ${containerVariantClasses[variant]}`;

  return (
    <StyledView className="w-full">
      {label && (
        <StyledText className="text-sm font-medium text-neutral-700 mb-2">
          {label}
        </StyledText>
      )}

      <StyledView className={containerClasses}>
        {leftIcon && (
          <StyledView className="mr-3">
            {leftIcon}
          </StyledView>
        )}

        <StyledTextInput
          ref={ref}
          className={`${baseClasses} ${className || ''}`}
          placeholderTextColor="#a3a3a3"
          {...props}
        />

        {rightIcon && (
          <StyledView className="ml-3">
            {rightIcon}
          </StyledView>
        )}
      </StyledView>

      {error && (
        <StyledText className="text-sm text-error-500 mt-1">
          {error}
        </StyledText>
      )}
    </StyledView>
  );
});
```

#### Card Component

```typescript
// components/ui/Card.tsx
import React from 'react';
import { View, ViewProps } from 'react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  children,
  className,
  ...props
}) => {
  const baseClasses = 'bg-white rounded-2xl';

  const variantClasses = {
    default: '',
    elevated: 'shadow-lg shadow-neutral-200',
    outlined: 'border border-neutral-200'
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const cardClasses = `${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className || ''}`;

  return (
    <StyledView className={cardClasses} {...props}>
      {children}
    </StyledView>
  );
};
```

## Screen Implementations

### Onboarding Screens

#### Personal Information Screen

```typescript
// screens/onboarding/PersonalInfoScreen.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { styled } from 'nativewind';
import { Button, Input, Card } from '../../components/ui';
import { useUserStore } from '../../stores/userStore';
import { PersonalInfoForm, FitnessGoals } from '../../types/user';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);

export const PersonalInfoScreen: React.FC = ({ navigation }) => {
  const { updatePersonalInfo } = useUserStore();
  const [formData, setFormData] = useState<PersonalInfoForm>({
    name: '',
    age: '',
    gender: '',
    height: '',
    currentWeight: '',
    targetWeight: '',
    fitnessGoals: [],
    activityLevel: ''
  });

  const [errors, setErrors] = useState<Partial<PersonalInfoForm>>({});

  const fitnessGoalOptions: { id: FitnessGoals; label: string; description: string }[] = [
    { id: 'weight_loss', label: 'Weight Loss', description: 'Lose weight and burn fat' },
    { id: 'muscle_gain', label: 'Muscle Gain', description: 'Build lean muscle mass' },
    { id: 'maintenance', label: 'Maintenance', description: 'Maintain current fitness' },
    { id: 'general_fitness', label: 'General Fitness', description: 'Overall health improvement' },
    { id: 'strength', label: 'Strength', description: 'Increase overall strength' },
    { id: 'endurance', label: 'Endurance', description: 'Improve cardiovascular health' }
  ];

  const activityLevels = [
    { id: 'sedentary', label: 'Sedentary', description: 'Little to no exercise' },
    { id: 'lightly_active', label: 'Lightly Active', description: 'Light exercise 1-3 days/week' },
    { id: 'moderately_active', label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week' },
    { id: 'very_active', label: 'Very Active', description: 'Heavy exercise 6-7 days/week' }
  ];

  const validateForm = (): boolean => {
    const newErrors: Partial<PersonalInfoForm> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.age || parseInt(formData.age) < 13 || parseInt(formData.age) > 100) {
      newErrors.age = 'Please enter a valid age (13-100)';
    }
    if (!formData.gender) newErrors.gender = 'Please select your gender';
    if (!formData.height || parseInt(formData.height) < 100 || parseInt(formData.height) > 250) {
      newErrors.height = 'Please enter a valid height (100-250 cm)';
    }
    if (!formData.currentWeight || parseInt(formData.currentWeight) < 30 || parseInt(formData.currentWeight) > 300) {
      newErrors.currentWeight = 'Please enter a valid weight (30-300 kg)';
    }
    if (!formData.targetWeight || parseInt(formData.targetWeight) < 30 || parseInt(formData.targetWeight) > 300) {
      newErrors.targetWeight = 'Please enter a valid target weight (30-300 kg)';
    }
    if (formData.fitnessGoals.length === 0) {
      newErrors.fitnessGoals = 'Please select at least one fitness goal';
    }
    if (!formData.activityLevel) newErrors.activityLevel = 'Please select your activity level';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      updatePersonalInfo(formData);
      navigation.navigate('WorkoutPreferences');
    }
  };

  const toggleFitnessGoal = (goal: FitnessGoals) => {
    setFormData(prev => ({
      ...prev,
      fitnessGoals: prev.fitnessGoals.includes(goal)
        ? prev.fitnessGoals.filter(g => g !== goal)
        : [...prev.fitnessGoals, goal]
    }));
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-neutral-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StyledScrollView className="flex-1 px-6 pt-12">
        {/* Header */}
        <StyledView className="mb-8">
          <StyledText className="text-3xl font-bold text-neutral-900 mb-2">
            Let's get to know you
          </StyledText>
          <StyledText className="text-lg text-neutral-600">
            Tell us about yourself so we can create your perfect fitness plan
          </StyledText>
        </StyledView>

        {/* Progress Indicator */}
        <StyledView className="flex-row mb-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <StyledView
              key={step}
              className={`flex-1 h-1 mx-1 rounded ${step === 1 ? 'bg-primary-500' : 'bg-neutral-200'}`}
            />
          ))}
        </StyledView>

        {/* Personal Information Form */}
        <Card className="mb-6">
          <StyledText className="text-xl font-semibold text-neutral-900 mb-4">
            Personal Information
          </StyledText>

          <Input
            label="Full Name"
            placeholder="Enter your full name"
            value={formData.name}
            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            error={errors.name}
            className="mb-4"
          />

          <StyledView className="flex-row space-x-4 mb-4">
            <StyledView className="flex-1">
              <Input
                label="Age"
                placeholder="25"
                keyboardType="numeric"
                value={formData.age}
                onChangeText={(text) => setFormData(prev => ({ ...prev, age: text }))}
                error={errors.age}
              />
            </StyledView>

            <StyledView className="flex-1">
              <StyledText className="text-sm font-medium text-neutral-700 mb-2">
                Gender
              </StyledText>
              <StyledView className="flex-row">
                {['Male', 'Female', 'Other'].map((gender) => (
                  <Button
                    key={gender}
                    variant={formData.gender === gender.toLowerCase() ? 'primary' : 'outline'}
                    size="sm"
                    onPress={() => setFormData(prev => ({ ...prev, gender: gender.toLowerCase() }))}
                    className="mr-2"
                  >
                    {gender}
                  </Button>
                ))}
              </StyledView>
              {errors.gender && (
                <StyledText className="text-sm text-error-500 mt-1">
                  {errors.gender}
                </StyledText>
              )}
            </StyledView>
          </StyledView>

          <StyledView className="flex-row space-x-4 mb-4">
            <StyledView className="flex-1">
              <Input
                label="Height (cm)"
                placeholder="170"
                keyboardType="numeric"
                value={formData.height}
                onChangeText={(text) => setFormData(prev => ({ ...prev, height: text }))}
                error={errors.height}
              />
            </StyledView>

            <StyledView className="flex-1">
              <Input
                label="Current Weight (kg)"
                placeholder="70"
                keyboardType="numeric"
                value={formData.currentWeight}
                onChangeText={(text) => setFormData(prev => ({ ...prev, currentWeight: text }))}
                error={errors.currentWeight}
              />
            </StyledView>
          </StyledView>

          <Input
            label="Target Weight (kg)"
            placeholder="65"
            keyboardType="numeric"
            value={formData.targetWeight}
            onChangeText={(text) => setFormData(prev => ({ ...prev, targetWeight: text }))}
            error={errors.targetWeight}
            className="mb-4"
          />
        </Card>

        {/* Fitness Goals */}
        <Card className="mb-6">
          <StyledText className="text-xl font-semibold text-neutral-900 mb-4">
            Fitness Goals
          </StyledText>
          <StyledText className="text-sm text-neutral-600 mb-4">
            Select all that apply to you
          </StyledText>

          <StyledView className="space-y-3">
            {fitnessGoalOptions.map((goal) => (
              <Button
                key={goal.id}
                variant={formData.fitnessGoals.includes(goal.id) ? 'primary' : 'outline'}
                onPress={() => toggleFitnessGoal(goal.id)}
                className="justify-start p-4"
              >
                <StyledView>
                  <StyledText className={`font-semibold ${
                    formData.fitnessGoals.includes(goal.id) ? 'text-white' : 'text-neutral-900'
                  }`}>
                    {goal.label}
                  </StyledText>
                  <StyledText className={`text-sm ${
                    formData.fitnessGoals.includes(goal.id) ? 'text-white opacity-80' : 'text-neutral-600'
                  }`}>
                    {goal.description}
                  </StyledText>
                </StyledView>
              </Button>
            ))}
          </StyledView>

          {errors.fitnessGoals && (
            <StyledText className="text-sm text-error-500 mt-2">
              {errors.fitnessGoals}
            </StyledText>
          )}
        </Card>

        {/* Activity Level */}
        <Card className="mb-8">
          <StyledText className="text-xl font-semibold text-neutral-900 mb-4">
            Current Activity Level
          </StyledText>

          <StyledView className="space-y-3">
            {activityLevels.map((level) => (
              <Button
                key={level.id}
                variant={formData.activityLevel === level.id ? 'primary' : 'outline'}
                onPress={() => setFormData(prev => ({ ...prev, activityLevel: level.id }))}
                className="justify-start p-4"
              >
                <StyledView>
                  <StyledText className={`font-semibold ${
                    formData.activityLevel === level.id ? 'text-white' : 'text-neutral-900'
                  }`}>
                    {level.label}
                  </StyledText>
                  <StyledText className={`text-sm ${
                    formData.activityLevel === level.id ? 'text-white opacity-80' : 'text-neutral-600'
                  }`}>
                    {level.description}
                  </StyledText>
                </StyledView>
              </Button>
            ))}
          </StyledView>

          {errors.activityLevel && (
            <StyledText className="text-sm text-error-500 mt-2">
              {errors.activityLevel}
            </StyledText>
          )}
        </Card>
      </StyledScrollView>

      {/* Continue Button */}
      <StyledView className="px-6 py-4 bg-white border-t border-neutral-200">
        <Button onPress={handleNext} size="lg">
          Continue
        </Button>
      </StyledView>
    </KeyboardAvoidingView>
  );
};
```

#### Body Analysis Screen

```typescript
// screens/onboarding/BodyAnalysisScreen.tsx
import React, { useState } from 'react';
import { View, Text, Image, Alert } from 'react-native';
import { styled } from 'nativewind';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CameraType } from 'expo-camera';
import { Button, Card } from '../../components/ui';
import { useUserStore } from '../../stores/userStore';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledImage = styled(Image);

export const BodyAnalysisScreen: React.FC = ({ navigation }) => {
  const { updateBodyPhotos } = useUserStore();
  const [photos, setPhotos] = useState({
    front: null,
    side: null,
    back: null
  });

  const [currentPhotoType, setCurrentPhotoType] = useState<'front' | 'side' | 'back' | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = Camera.useCameraPermissions();

  const photoInstructions = {
    front: {
      title: 'Front View',
      description: 'Stand straight facing the camera with your arms at your sides',
      pose: '🧍‍♂️'
    },
    side: {
      title: 'Side View',
      description: 'Turn to your side, stand straight with arms at your sides',
      pose: '🚶‍♂️'
    },
    back: {
      title: 'Back View (Optional)',
      description: 'Turn around, stand straight with arms at your sides',
      pose: '🚶‍♂️'
    }
  };

  const takePhoto = async (type: 'front' | 'side' | 'back') => {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Camera permission is required for body analysis');
        return;
      }
    }

    setCurrentPhotoType(type);
    setShowCamera(true);
  };

  const selectFromGallery = async (type: 'front' | 'side' | 'back') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotos(prev => ({
        ...prev,
        [type]: result.assets[0].uri
      }));
    }
  };

  const handleCameraCapture = (photoUri: string) => {
    if (currentPhotoType) {
      setPhotos(prev => ({
        ...prev,
        [currentPhotoType]: photoUri
      }));
    }
    setShowCamera(false);
    setCurrentPhotoType(null);
  };

  const handleNext = () => {
    if (!photos.front || !photos.side) {
      Alert.alert('Photos Required', 'Please take front and side photos to continue');
      return;
    }

    updateBodyPhotos(photos);
    navigation.navigate('Review');
  };

  const PhotoCard = ({ type, required = false }: { type: 'front' | 'side' | 'back', required?: boolean }) => {
    const instruction = photoInstructions[type];
    const hasPhoto = photos[type];

    return (
      <Card className="mb-4">
        <StyledView className="items-center">
          <StyledText className="text-6xl mb-2">{instruction.pose}</StyledText>
          <StyledText className="text-lg font-semibold text-neutral-900 mb-1">
            {instruction.title} {required && <StyledText className="text-error-500">*</StyledText>}
          </StyledText>
          <StyledText className="text-sm text-neutral-600 text-center mb-4">
            {instruction.description}
          </StyledText>

          {hasPhoto ? (
            <StyledView className="items-center">
              <StyledImage
                source={{ uri: photos[type] }}
                className="w-24 h-32 rounded-xl mb-3"
                resizeMode="cover"
              />
              <StyledView className="flex-row space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => takePhoto(type)}
                >
                  Retake
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => selectFromGallery(type)}
                >
                  Choose from Gallery
                </Button>
              </StyledView>
            </StyledView>
          ) : (
            <StyledView className="flex-row space-x-2">
              <Button
                variant="primary"
                size="sm"
                onPress={() => takePhoto(type)}
              >
                Take Photo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onPress={() => selectFromGallery(type)}
              >
                Choose from Gallery
              </Button>
            </StyledView>
          )}
        </StyledView>
      </Card>
    );
  };

  if (showCamera) {
    return (
      <CameraView
        onCapture={handleCameraCapture}
        onClose={() => {
          setShowCamera(false);
          setCurrentPhotoType(null);
        }}
        instructions={currentPhotoType ? photoInstructions[currentPhotoType] : undefined}
      />
    );
  }

  return (
    <StyledView className="flex-1 bg-neutral-50">
      <StyledView className="px-6 pt-12 pb-6">
        {/* Header */}
        <StyledText className="text-3xl font-bold text-neutral-900 mb-2">
          Body Analysis
        </StyledText>
        <StyledText className="text-lg text-neutral-600 mb-6">
          Take photos to track your progress and get personalized insights
        </StyledText>

        {/* Progress Indicator */}
        <StyledView className="flex-row mb-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <StyledView
              key={step}
              className={`flex-1 h-1 mx-1 rounded ${step <= 4 ? 'bg-primary-500' : 'bg-neutral-200'}`}
            />
          ))}
        </StyledView>

        {/* Privacy Notice */}
        <Card className="mb-6 bg-primary-50 border border-primary-200">
          <StyledView className="flex-row items-start">
            <StyledText className="text-2xl mr-3">🔒</StyledText>
            <StyledView className="flex-1">
              <StyledText className="font-semibold text-primary-900 mb-1">
                Your Privacy Matters
              </StyledText>
              <StyledText className="text-sm text-primary-800">
                Photos are stored securely and encrypted. Only you can access them.
                They're used solely for your progress tracking and AI analysis.
              </StyledText>
            </StyledView>
          </StyledView>
        </Card>

        {/* Photo Cards */}
        <PhotoCard type="front" required />
        <PhotoCard type="side" required />
        <PhotoCard type="back" />

        {/* Tips */}
        <Card className="mb-6 bg-warning-50 border border-warning-200">
          <StyledText className="font-semibold text-warning-900 mb-2">
            📸 Photo Tips
          </StyledText>
          <StyledText className="text-sm text-warning-800">
            • Wear fitted clothing or workout attire{'\n'}
            • Use good lighting (natural light works best){'\n'}
            • Maintain good posture{'\n'}
            • Take photos from about 6 feet away{'\n'}
            • Keep the same time of day for consistency
          </StyledText>
        </Card>
      </StyledView>

      {/* Continue Button */}
      <StyledView className="px-6 py-4 bg-white border-t border-neutral-200">
        <Button onPress={handleNext} size="lg">
          Continue to Review
        </Button>

        <Button
          variant="ghost"
          onPress={() => navigation.navigate('Review')}
          className="mt-2"
        >
          Skip for Now
        </Button>
      </StyledView>
    </StyledView>
  );
};

// Camera View Component
const CameraView: React.FC<{
  onCapture: (uri: string) => void;
  onClose: () => void;
  instructions?: { title: string; description: string };
}> = ({ onCapture, onClose, instructions }) => {
  const [camera, setCamera] = useState<Camera | null>(null);

  const takePicture = async () => {
    if (camera) {
      const photo = await camera.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      onCapture(photo.uri);
    }
  };

  return (
    <StyledView className="flex-1">
      <Camera
        ref={setCamera}
        className="flex-1"
        type={CameraType.back}
      >
        {/* Instructions Overlay */}
        {instructions && (
          <StyledView className="absolute top-16 left-0 right-0 px-6">
            <Card className="bg-black/70">
              <StyledText className="text-white font-semibold text-center">
                {instructions.title}
              </StyledText>
              <StyledText className="text-white/80 text-sm text-center mt-1">
                {instructions.description}
              </StyledText>
            </Card>
          </StyledView>
        )}

        {/* Camera Controls */}
        <StyledView className="absolute bottom-8 left-0 right-0 px-6">
          <StyledView className="flex-row justify-center items-center">
            <Button
              variant="ghost"
              onPress={onClose}
              className="bg-black/50 mr-8"
            >
              <StyledText className="text-white">Cancel</StyledText>
            </Button>

            <StyledView className="w-20 h-20 rounded-full bg-white border-4 border-neutral-300 items-center justify-center">
              <Button
                onPress={takePicture}
                className="w-16 h-16 rounded-full bg-white"
              />
            </StyledView>

            <StyledView className="w-16 ml-8" />
          </StyledView>
        </StyledView>
      </Camera>
    </StyledView>
  );
};
```

### Main App Screens

#### Home Screen (Dashboard)

```typescript
// screens/main/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { styled } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Card } from '../../components/ui';
import { useUserStore, useWorkoutStore, useDietStore } from '../../stores';
import { formatDate, getGreeting } from '../../utils/formatters';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);

export const HomeScreen: React.FC = ({ navigation }) => {
  const { user } = useUserStore();
  const { todaysWorkout, weeklyProgress } = useWorkoutStore();
  const { todaysMeals, dailyNutrition } = useDietStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh data from API
    await Promise.all([
      // refreshWorkoutData(),
      // refreshDietData(),
      // refreshProgressData()
    ]);
    setRefreshing(false);
  };

  const QuickActionButton = ({ icon, label, onPress, variant = 'primary' }: {
    icon: string;
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary';
  }) => (
    <Button
      variant={variant}
      onPress={onPress}
      className="flex-1 h-20 mx-1"
    >
      <StyledView className="items-center">
        <StyledText className="text-2xl mb-1">{icon}</StyledText>
        <StyledText className="text-xs font-medium text-center">
          {label}
        </StyledText>
      </StyledView>
    </Button>
  );

  const MealStatusCard = ({ mealType, meal, onPress }: {
    mealType: string;
    meal: any;
    onPress: () => void;
  }) => (
    <StyledView className="flex-row items-center justify-between py-3 border-b border-neutral-100 last:border-b-0">
      <StyledView className="flex-row items-center flex-1">
        <StyledView className={`w-3 h-3 rounded-full mr-3 ${
          meal ? 'bg-success-500' : 'bg-neutral-300'
        }`} />
        <StyledView className="flex-1">
          <StyledText className="font-medium text-neutral-900 capitalize">
            {mealType}
          </StyledText>
          <StyledText className="text-sm text-neutral-600">
            {meal ? `${meal.calories} cal` : 'Not logged'}
          </StyledText>
        </StyledView>
      </StyledView>
      <Button variant="ghost" size="sm" onPress={onPress}>
        {meal ? 'View' : 'Log'}
      </Button>
    </StyledView>
  );

  return (
    <StyledView className="flex-1 bg-neutral-50">
      <StyledScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={['#0ea5e9', '#0284c7']}
          className="px-6 pt-16 pb-8 rounded-b-3xl"
        >
          <StyledView className="flex-row items-center justify-between mb-6">
            <StyledView>
              <StyledText className="text-white text-lg">
                {getGreeting()}, {user?.name || 'User'}! 👋
              </StyledText>
              <StyledText className="text-white/80 text-sm">
                {formatDate(new Date())}
              </StyledText>
            </StyledView>

            <Button
              variant="ghost"
              onPress={() => navigation.navigate('Profile')}
              className="bg-white/10"
            >
              <StyledText className="text-2xl">👤</StyledText>
            </Button>
          </StyledView>

          {/* Daily Summary */}
          <Card className="bg-white/10 border-white/20">
            <StyledView className="flex-row items-center justify-between">
              <StyledView className="items-center flex-1">
                <StyledText className="text-white text-2xl font-bold">
                  {dailyNutrition?.consumed || 0}
                </StyledText>
                <StyledText className="text-white/80 text-xs">
                  Calories Consumed
                </StyledText>
              </StyledView>

              <StyledView className="w-px h-8 bg-white/20" />

              <StyledView className="items-center flex-1">
                <StyledText className="text-white text-2xl font-bold">
                  {dailyNutrition?.remaining || dailyNutrition?.target || 0}
                </StyledText>
                <StyledText className="text-white/80 text-xs">
                  Calories Remaining
                </StyledText>
              </StyledView>

              <StyledView className="w-px h-8 bg-white/20" />

              <StyledView className="items-center flex-1">
                <StyledText className="text-white text-2xl font-bold">
                  {todaysWorkout?.completed ? '✅' : '⏱️'}
                </StyledText>
                <StyledText className="text-white/80 text-xs">
                  Today's Workout
                </StyledText>
              </StyledView>
            </StyledView>
          </Card>
        </LinearGradient>

        <StyledView className="px-6 -mt-4">
          {/* Quick Actions */}
          <Card className="mb-6">
            <StyledText className="text-lg font-semibold text-neutral-900 mb-4">
              Quick Actions
            </StyledText>
            <StyledView className="flex-row space-x-2">
              <QuickActionButton
                icon="📸"
                label="Log Meal"
                onPress={() => navigation.navigate('MealLog')}
              />
              <QuickActionButton
                icon="💪"
                label="Start Workout"
                onPress={() => navigation.navigate('Workout')}
                variant={todaysWorkout?.completed ? 'secondary' : 'primary'}
              />
              <QuickActionButton
                icon="💧"
                label="Log Water"
                onPress={() => {/* Handle water logging */}}
                variant="secondary"
              />
              <QuickActionButton
                icon="📊"
                label="Body Check"
                onPress={() => navigation.navigate('BodyAnalysis')}
                variant="secondary"
              />
            </StyledView>
          </Card>

          {/* Today's Workout Status */}
          <Card className="mb-6">
            <StyledView className="flex-row items-center justify-between mb-4">
              <StyledText className="text-lg font-semibold text-neutral-900">
                Today's Workout
              </StyledText>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => navigation.navigate('Workout')}
              >
                View All
              </Button>
            </StyledView>

            {todaysWorkout ? (
              <StyledView>
                <StyledView className="flex-row items-center justify-between mb-3">
                  <StyledView className="flex-1">
                    <StyledText className="font-medium text-neutral-900">
                      {todaysWorkout.name}
                    </StyledText>
                    <StyledText className="text-sm text-neutral-600">
                      {todaysWorkout.duration} min • {todaysWorkout.exercises?.length} exercises
                    </StyledText>
                  </StyledView>
                  <StyledView className={`px-3 py-1 rounded-full ${
                    todaysWorkout.completed ? 'bg-success-100' : 'bg-primary-100'
                  }`}>
                    <StyledText className={`text-xs font-medium ${
                      todaysWorkout.completed ? 'text-success-700' : 'text-primary-700'
                    }`}>
                      {todaysWorkout.completed ? 'Completed' : 'Pending'}
                    </StyledText>
                  </StyledView>
                </StyledView>

                {!todaysWorkout.completed && (
                  <Button
                    onPress={() => navigation.navigate('WorkoutSession', { workoutId: todaysWorkout.id })}
                  >
                    Start Workout
                  </Button>
                )}
              </StyledView>
            ) : (
              <StyledView className="items-center py-6">
                <StyledText className="text-4xl mb-2">🏃‍♂️</StyledText>
                <StyledText className="text-neutral-600 text-center">
                  No workout scheduled for today
                </StyledText>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => navigation.navigate('WorkoutGeneration')}
                  className="mt-3"
                >
                  Generate Workout Plan
                </Button>
              </StyledView>
            )}
          </Card>

          {/* Diet Status */}
          <Card className="mb-6">
            <StyledView className="flex-row items-center justify-between mb-4">
              <StyledText className="text-lg font-semibold text-neutral-900">
                Today's Meals
              </StyledText>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => navigation.navigate('Diet')}
              >
                View All
              </Button>
            </StyledView>

            <StyledView>
              <MealStatusCard
                mealType="breakfast"
                meal={todaysMeals?.breakfast}
                onPress={() => navigation.navigate('MealLog', { mealType: 'breakfast' })}
              />
              <MealStatusCard
                mealType="lunch"
                meal={todaysMeals?.lunch}
                onPress={() => navigation.navigate('MealLog', { mealType: 'lunch' })}
              />
              <MealStatusCard
                mealType="snack"
                meal={todaysMeals?.snack}
                onPress={() => navigation.navigate('MealLog', { mealType: 'snack' })}
              />
              <MealStatusCard
                mealType="dinner"
                meal={todaysMeals?.dinner}
                onPress={() => navigation.navigate('MealLog', { mealType: 'dinner' })}
              />
            </StyledView>

            {/* Calorie Progress Bar */}
            <StyledView className="mt-4 pt-4 border-t border-neutral-100">
              <StyledView className="flex-row items-center justify-between mb-2">
                <StyledText className="text-sm font-medium text-neutral-700">
                  Daily Calorie Goal
                </StyledText>
                <StyledText className="text-sm text-neutral-600">
                  {dailyNutrition?.consumed || 0} / {dailyNutrition?.target || 0} cal
                </StyledText>
              </StyledView>

              <StyledView className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                <StyledView
                  className="h-full bg-primary-500 rounded-full"
                  style={{
                    width: `${Math.min((dailyNutrition?.consumed || 0) / (dailyNutrition?.target || 1) * 100, 100)}%`
                  }}
                />
              </StyledView>
            </StyledView>
          </Card>

          {/* Weekly Progress */}
          <Card className="mb-8">
            <StyledView className="flex-row items-center justify-between mb-4">
              <StyledText className="text-lg font-semibold text-neutral-900">
                This Week's Progress
              </StyledText>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => navigation.navigate('Progress')}
              >
                View Details
              </Button>
            </StyledView>

            <StyledView className="flex-row justify-between">
              <StyledView className="items-center">
                <StyledText className="text-2xl font-bold text-primary-600">
                  {weeklyProgress?.workoutsCompleted || 0}
                </StyledText>
                <StyledText className="text-xs text-neutral-600 text-center">
                  Workouts{'\n'}Completed
                </StyledText>
              </StyledView>

              <StyledView className="items-center">
                <StyledText className="text-2xl font-bold text-success-600">
                  {weeklyProgress?.avgCalorieAdherence || 0}%
                </StyledText>
                <StyledText className="text-xs text-neutral-600 text-center">
                  Diet Goal{'\n'}Adherence
                </StyledText>
              </StyledView>

              <StyledView className="items-center">
                <StyledText className="text-2xl font-bold text-secondary-600">
                  {weeklyProgress?.bodyPhotos || 0}
                </StyledText>
                <StyledText className="text-xs text-neutral-600 text-center">
                  Progress{'\n'}Photos
                </StyledText>
              </StyledView>
            </StyledView>
          </Card>
        </StyledView>
      </StyledScrollView>
    </StyledView>
  );
};
```

## State Management with Zustand

### User Store

```typescript
// stores/userStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  PersonalInfoForm,
  WorkoutPreferences,
  DietPreferences,
} from '../types/user';

interface UserState {
  // User data
  user: User | null;
  isOnboarded: boolean;
  isAuthenticated: boolean;

  // Onboarding data
  personalInfo: PersonalInfoForm | null;
  workoutPreferences: WorkoutPreferences | null;
  dietPreferences: DietPreferences | null;
  bodyPhotos: {
    front: string | null;
    side: string | null;
    back: string | null;
  } | null;

  // Actions
  setUser: (user: User) => void;
  updatePersonalInfo: (info: PersonalInfoForm) => void;
  updateWorkoutPreferences: (prefs: WorkoutPreferences) => void;
  updateDietPreferences: (prefs: DietPreferences) => void;
  updateBodyPhotos: (photos: {
    front: string | null;
    side: string | null;
    back: string | null;
  }) => void;
  completeOnboarding: () => void;
  logout: () => void;
  clearOnboardingData: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isOnboarded: false,
      isAuthenticated: false,
      personalInfo: null,
      workoutPreferences: null,
      dietPreferences: null,
      bodyPhotos: null,

      // Actions
      setUser: user => set({ user, isAuthenticated: true }),

      updatePersonalInfo: info => set({ personalInfo: info }),

      updateWorkoutPreferences: prefs => set({ workoutPreferences: prefs }),

      updateDietPreferences: prefs => set({ dietPreferences: prefs }),

      updateBodyPhotos: photos => set({ bodyPhotos: photos }),

      completeOnboarding: () => {
        const { personalInfo, workoutPreferences, dietPreferences } = get();

        if (personalInfo && workoutPreferences && dietPreferences) {
          const user: User = {
            id: Date.now().toString(), // Temporary ID
            email: '', // Will be set after authentication
            ...personalInfo,
            workoutPreferences,
            dietPreferences,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          set({
            user,
            isOnboarded: true,
            // Keep onboarding data for potential API sync
          });
        }
      },

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isOnboarded: false,
        }),

      clearOnboardingData: () =>
        set({
          personalInfo: null,
          workoutPreferences: null,
          dietPreferences: null,
          bodyPhotos: null,
        }),
    }),
    {
      name: 'user-storage',
      storage: {
        getItem: async name => {
          const value = await AsyncStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name, value) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async name => {
          await AsyncStorage.removeItem(name);
        },
      },
    }
  )
);
```

### Workout Store

```typescript
// stores/workoutStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Workout, WorkoutPlan, WorkoutSession } from '../types/workout';

interface WorkoutState {
  // Current data
  currentWeekPlan: WorkoutPlan | null;
  todaysWorkout: Workout | null;
  activeSession: WorkoutSession | null;
  weeklyProgress: {
    workoutsCompleted: number;
    totalWorkouts: number;
    streakDays: number;
  } | null;

  // History
  completedWorkouts: WorkoutSession[];
  workoutHistory: WorkoutPlan[];

  // Loading states
  isGenerating: boolean;
  isLoading: boolean;

  // Actions
  setCurrentWeekPlan: (plan: WorkoutPlan) => void;
  setTodaysWorkout: (workout: Workout) => void;
  startWorkoutSession: (workout: Workout) => void;
  updateActiveSession: (updates: Partial<WorkoutSession>) => void;
  completeWorkoutSession: (session: WorkoutSession) => void;
  generateWeeklyPlan: () => Promise<void>;
  updateWeeklyProgress: () => void;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentWeekPlan: null,
      todaysWorkout: null,
      activeSession: null,
      weeklyProgress: null,
      completedWorkouts: [],
      workoutHistory: [],
      isGenerating: false,
      isLoading: false,

      // Actions
      setCurrentWeekPlan: plan => {
        set({ currentWeekPlan: plan });
        // Update today's workout based on current day
        const today = new Date().getDay();
        const todaysWorkout = plan.workouts.find(w => w.dayOfWeek === today);
        set({ todaysWorkout });
      },

      setTodaysWorkout: workout => set({ todaysWorkout: workout }),

      startWorkoutSession: workout => {
        const session: WorkoutSession = {
          id: Date.now().toString(),
          workoutId: workout.id,
          startedAt: new Date().toISOString(),
          workout,
          exercises: workout.exercises.map(ex => ({
            exerciseId: ex.id,
            planned: ex,
            actual: { sets: [], completed: false },
          })),
          status: 'active',
        };
        set({ activeSession: session });
      },

      updateActiveSession: updates => {
        const { activeSession } = get();
        if (activeSession) {
          set({ activeSession: { ...activeSession, ...updates } });
        }
      },

      completeWorkoutSession: session => {
        const completed = {
          ...session,
          completedAt: new Date().toISOString(),
          status: 'completed' as const,
        };

        set(state => ({
          activeSession: null,
          completedWorkouts: [...state.completedWorkouts, completed],
        }));

        // Update today's workout as completed
        const { todaysWorkout } = get();
        if (todaysWorkout) {
          set({ todaysWorkout: { ...todaysWorkout, completed: true } });
        }

        // Update weekly progress
        get().updateWeeklyProgress();
      },

      generateWeeklyPlan: async () => {
        set({ isGenerating: true });
        try {
          // Call AI service to generate workout plan
          // const plan = await generateWorkoutPlan(userPreferences);
          // set({ currentWeekPlan: plan });
        } catch (error) {
          console.error('Failed to generate workout plan:', error);
        } finally {
          set({ isGenerating: false });
        }
      },

      updateWeeklyProgress: () => {
        const { completedWorkouts, currentWeekPlan } = get();

        if (!currentWeekPlan) return;

        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

        const thisWeekCompleted = completedWorkouts.filter(session => {
          const sessionDate = new Date(session.startedAt);
          return sessionDate >= startOfWeek;
        });

        const progress = {
          workoutsCompleted: thisWeekCompleted.length,
          totalWorkouts: currentWeekPlan.workouts.length,
          streakDays: calculateStreakDays(completedWorkouts),
        };

        set({ weeklyProgress: progress });
      },
    }),
    {
      name: 'workout-storage',
      partialize: state => ({
        currentWeekPlan: state.currentWeekPlan,
        completedWorkouts: state.completedWorkouts,
        workoutHistory: state.workoutHistory,
        weeklyProgress: state.weeklyProgress,
      }),
    }
  )
);

function calculateStreakDays(completedWorkouts: WorkoutSession[]): number {
  // Implementation for calculating workout streak
  return 0; // Placeholder
}
```

## Navigation Setup

### App Navigator

```typescript
// navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useUserStore } from '../stores/userStore';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { LoadingScreen } from '../screens/LoadingScreen';

const Stack = createStackNavigator();

export const AppNavigator: React.FC = () => {
  const { isOnboarded, isAuthenticated } = useUserStore();
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate loading check
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isOnboarded ? (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

### Main Tab Navigator

```typescript
// navigation/MainTabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { HomeScreen } from '../screens/main/HomeScreen';
import { WorkoutScreen } from '../screens/main/WorkoutScreen';
import { DietScreen } from '../screens/main/DietScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { PlusMenuModal } from '../components/PlusMenuModal';

const Tab = createBottomTabNavigator();
const StyledView = styled(View);
const StyledText = styled(Text);

const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  const icons = {
    Home: focused ? '🏠' : '🏡',
    Workout: focused ? '💪' : '🏋️',
    Plus: '➕',
    Diet: focused ? '🍽️' : '🍽️',
    Profile: focused ? '👤' : '👤',
  };

  return (
    <StyledView className="items-center">
      <StyledText className="text-xl">{icons[name]}</StyledText>
      <StyledText className={`text-xs mt-1 ${
        focused ? 'text-primary-600 font-medium' : 'text-neutral-400'
      }`}>
        {name === 'Plus' ? '' : name}
      </StyledText>
    </StyledView>
  );
};

const PlusButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity onPress={onPress}>
    <StyledView className="w-14 h-14 bg-primary-500 rounded-full items-center justify-center shadow-lg">
      <StyledText className="text-white text-2xl">+</StyledText>
    </StyledView>
  </TouchableOpacity>
);

export const MainTabNavigator: React.FC = () => {
  const [showPlusMenu, setShowPlusMenu] = React.useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#f5f5f5',
            paddingBottom: 8,
            paddingTop: 8,
            height: 80,
          },
          tabBarShowLabel: false,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} />,
          }}
        />

        <Tab.Screen
          name="Workout"
          component={WorkoutScreen}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon name="Workout" focused={focused} />,
          }}
        />

        <Tab.Screen
          name="Plus"
          component={View} // Dummy component
          options={{
            tabBarButton: () => (
              <PlusButton onPress={() => setShowPlusMenu(true)} />
            ),
          }}
        />

        <Tab.Screen
          name="Diet"
          component={DietScreen}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon name="Diet" focused={focused} />,
          }}
        />

        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} />,
          }}
        />
      </Tab.Navigator>

      <PlusMenuModal
        visible={showPlusMenu}
        onClose={() => setShowPlusMenu(false)}
      />
    </>
  );
};
```

This comprehensive frontend guide provides a solid foundation for building the FitAI mobile application. The modular component structure, proper state management, and well-defined navigation flow ensure a scalable and maintainable codebase. The design system ensures consistency across the entire application while providing flexibility for future enhancements.
