/**
 * PersonalInfoEditModal - Edit Personal Information
 *
 * Fields:
 * - Name
 * - Age
 * - Gender (picker)
 * - Height
 * - Weight
 * - Activity Level (picker)
 *
 * Uses useProfileStore to save changes.
 */

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SettingsModalWrapper } from "../components/SettingsModalWrapper";
import { GlassFormInput } from "../components/GlassFormInput";
import { GlassFormPicker } from "../components/GlassFormPicker";
import { useProfileStore } from "../../../../stores/profileStore";
import { useUser } from "../../../../hooks/useUser";
import { ResponsiveTheme } from "../../../../utils/constants";
import { rf, rp, rbr } from "../../../../utils/responsive";
import { haptics } from "../../../../utils/haptics";

interface PersonalInfoEditModalProps {
  visible: boolean;
  onClose: () => void;
}

const GENDER_OPTIONS = [
  { value: "male", label: "Male", icon: "male" as const },
  { value: "female", label: "Female", icon: "female" as const },
  { value: "other", label: "Other", icon: "person" as const },
];

const ACTIVITY_LEVEL_OPTIONS = [
  {
    value: "sedentary",
    label: "Sedentary",
    icon: "bed-outline" as const,
    description: "Little to no exercise",
  },
  {
    value: "light",
    label: "Lightly Active",
    icon: "walk-outline" as const,
    description: "Light exercise 1-3 days/week",
  },
  {
    value: "moderate",
    label: "Moderately Active",
    icon: "bicycle-outline" as const,
    description: "Moderate exercise 3-5 days/week",
  },
  {
    value: "active",
    label: "Very Active",
    icon: "fitness-outline" as const,
    description: "Hard exercise 6-7 days/week",
  },
  {
    value: "extreme",
    label: "Extremely Active",
    icon: "barbell-outline" as const,
    description: "Athlete/physical job",
  },
];

export const PersonalInfoEditModal: React.FC<PersonalInfoEditModalProps> = ({
  visible,
  onClose,
}) => {
  const { profile } = useUser();

  const { updatePersonalInfo, updateBodyAnalysis, updateWorkoutPreferences } = useProfileStore();

  // Form state
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load current values when modal opens
  useEffect(() => {
    if (visible && profile) {
      const info = profile.personalInfo;
      const bodyMetrics = profile.bodyMetrics;
      const bodyAnalysisData = useProfileStore.getState().bodyAnalysis;
      const workoutPrefs = profile.workoutPreferences;
      setName(info?.name || "");
      // ✅ Convert number to string for input field
      setAge(info?.age?.toString() || "");
      setGender(info?.gender || "");
      // ✅ Get height/weight from bodyMetrics, fallback to profileStore bodyAnalysis
      // Note: bodyMetrics may have 0 values (never populated by onboarding), so check > 0
      setHeight((bodyMetrics?.height_cm && bodyMetrics.height_cm > 0) ? bodyMetrics.height_cm.toString() : (bodyAnalysisData?.height_cm?.toString() || ""));
      setWeight((bodyMetrics?.current_weight_kg && bodyMetrics.current_weight_kg > 0) ? bodyMetrics.current_weight_kg.toString() : (bodyAnalysisData?.current_weight_kg?.toString() || ""));
      // ✅ FIX: Get activity level from workoutPreferences, not personalInfo
      setActivityLevel(workoutPrefs?.activity_level || "");
      setErrors({});
    }
  }, [visible, profile]);

  // Validation - now also used for real-time validation
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!age || isNaN(Number(age)) || Number(age) < 13 || Number(age) > 120) {
      newErrors.age = "Enter a valid age (13-120)";
    }

    if (!gender) {
      newErrors.gender = "Please select your gender";
    }

    if (
      !height ||
      isNaN(Number(height)) ||
      Number(height) < 100 ||
      Number(height) > 250
    ) {
      newErrors.height = "Enter valid height in cm (100-250)";
    }

    if (
      !weight ||
      isNaN(Number(weight)) ||
      Number(weight) < 30 ||
      Number(weight) > 300
    ) {
      newErrors.weight = "Enter valid weight in kg (30-300)";
    }

    if (!activityLevel) {
      newErrors.activityLevel = "Please select your activity level";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, age, gender, height, weight, activityLevel]);

  // Real-time validation for individual fields
  const validateField = useCallback((field: string, value: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };

      switch (field) {
        case "name":
          if (!value.trim()) {
            newErrors.name = "Name is required";
          } else {
            delete newErrors.name;
          }
          break;
        case "age":
          if (
            !value ||
            isNaN(Number(value)) ||
            Number(value) < 13 ||
            Number(value) > 120
          ) {
            newErrors.age = "Enter a valid age (13-120)";
          } else {
            delete newErrors.age;
          }
          break;
        case "height":
          if (
            !value ||
            isNaN(Number(value)) ||
            Number(value) < 100 ||
            Number(value) > 250
          ) {
            newErrors.height = "Enter valid height in cm (100-250)";
          } else {
            delete newErrors.height;
          }
          break;
        case "weight":
          if (
            !value ||
            isNaN(Number(value)) ||
            Number(value) < 30 ||
            Number(value) > 300
          ) {
            newErrors.weight = "Enter valid weight in kg (30-300)";
          } else {
            delete newErrors.weight;
          }
          break;
      }

      return newErrors;
    });
  }, []);

  // Wrapped setters with real-time validation
  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      validateField("name", value);
    },
    [validateField],
  );

  const handleAgeChange = useCallback(
    (value: string) => {
      setAge(value);
      validateField("age", value);
    },
    [validateField],
  );

  const handleHeightChange = useCallback(
    (value: string) => {
      setHeight(value);
      validateField("height", value);
    },
    [validateField],
  );

  const handleWeightChange = useCallback(
    (value: string) => {
      setWeight(value);
      validateField("weight", value);
    },
    [validateField],
  );

  // Save handler
  const handleSave = useCallback(async () => {
    if (!validate()) {
      haptics.light();
      return;
    }

    setIsSaving(true);
    try {
      // ✅ PersonalInfo only includes basic profile fields (NOT height/weight, NOT activityLevel)
      // Split name into first_name and last_name
      const nameParts = name.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Update personal info via profileStore
      updatePersonalInfo({
        first_name: firstName,
        last_name: lastName,
        name: name.trim(),
        age: parseInt(age, 10),
        gender: gender as "male" | "female" | "other" | "prefer_not_to_say",
        email: profile?.personalInfo?.email || "",
        country: profile?.personalInfo?.country || "",
        state: profile?.personalInfo?.state || "",
        region: profile?.personalInfo?.region || "",
        wake_time: profile?.personalInfo?.wake_time || "",
        sleep_time: profile?.personalInfo?.sleep_time || "",
        occupation_type: profile?.personalInfo?.occupation_type as any,
      });

      // ✅ Update body measurements via profileStore's bodyAnalysis
      if (height && weight) {
        updateBodyAnalysis({
          height_cm: parseFloat(height),
          current_weight_kg: parseFloat(weight),
        });
      }

      // ✅ Update activity level in workoutPreferences if changed
      if (
        activityLevel &&
        activityLevel !== profile?.workoutPreferences?.activity_level
      ) {
        updateWorkoutPreferences({
          activity_level: activityLevel as any,
        });
      }

      // Height/weight changes handled by BodyMeasurementsEditModal

      haptics.success();
      onClose();
    } catch (error) {
      console.error("Error saving personal info:", error);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [
    name,
    age,
    gender,
    height,
    weight,
    activityLevel,
    profile,
    updatePersonalInfo,
    updateBodyAnalysis,
    updateWorkoutPreferences,
    onClose,
    validate,
  ]);

  const hasChanges = useCallback(() => {
    if (!profile?.personalInfo) return true;
    const info = profile.personalInfo;
    const bodyMetrics = profile.bodyMetrics;
    const bodyAnalysisData = useProfileStore.getState().bodyAnalysis;
    const workoutPrefs = profile.workoutPreferences;
    return (
      name !== (info?.name || "") ||
      age !== (info?.age?.toString() || "") ||
      gender !== (info?.gender || "") ||
      height !== ((bodyMetrics?.height_cm && bodyMetrics.height_cm > 0) ? bodyMetrics.height_cm.toString() : (bodyAnalysisData?.height_cm?.toString() || "")) ||
      weight !== ((bodyMetrics?.current_weight_kg && bodyMetrics.current_weight_kg > 0) ? bodyMetrics.current_weight_kg.toString() : (bodyAnalysisData?.current_weight_kg?.toString() || "")) ||
      activityLevel !== (workoutPrefs?.activity_level || "")
    );
  }, [name, age, gender, height, weight, activityLevel, profile]);

  return (
    <SettingsModalWrapper
      visible={visible}
      title="Personal Information"
      subtitle="Update your profile details"
      icon="person-outline"
      iconColor={ResponsiveTheme.colors.errorLight}
      onClose={onClose}
      onSave={handleSave}
      isSaving={isSaving}
      saveDisabled={!hasChanges()}
    >
      {/* Name */}
      <GlassFormInput
        label="Full Name"
        icon="person-outline"
      iconColor={ResponsiveTheme.colors.errorLight}
        value={name}
        onChangeText={handleNameChange}
        placeholder="Enter your name"
        autoCapitalize="words"
        autoComplete="name"
        error={errors.name}
      />

      {/* Age */}
      <GlassFormInput
        label="Age"
        icon="calendar-outline"
        iconColor={ResponsiveTheme.colors.success}
        value={age}
        onChangeText={handleAgeChange}
        placeholder="Enter your age"
        keyboardType="numeric"
        maxLength={3}
        suffix="years"
        error={errors.age}
      />

      {/* Gender */}
      <GlassFormPicker
        label="Gender"
        options={GENDER_OPTIONS}
        value={gender}
        onChange={(val) => setGender(val as string)}
        columns={3}
        error={errors.gender}
      />

      {/* Height */}
      <GlassFormInput
        label="Height"
        icon="resize-outline"
        iconColor={ResponsiveTheme.colors.info}
        value={height}
        onChangeText={handleHeightChange}
        placeholder="Enter your height"
        keyboardType="numeric"
        maxLength={3}
        suffix="cm"
        error={errors.height}
        hint="Height in centimeters"
      />

      {/* Weight */}
      <GlassFormInput
        label="Weight"
        icon="scale-outline"
        iconColor={ResponsiveTheme.colors.primary}
        value={weight}
        onChangeText={handleWeightChange}
        placeholder="Enter your weight"
        keyboardType="decimal-pad"
        maxLength={5}
        suffix="kg"
        error={errors.weight}
        hint="Weight in kilograms"
      />

      {/* Activity Level */}
      <GlassFormPicker
        label="Activity Level"
        options={ACTIVITY_LEVEL_OPTIONS}
        value={activityLevel}
        onChange={(val) => setActivityLevel(val as string)}
        columns={1}
        error={errors.activityLevel}
      />
    </SettingsModalWrapper>
  );
};

export default PersonalInfoEditModal;
