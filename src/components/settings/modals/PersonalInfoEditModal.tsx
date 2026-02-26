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
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SettingsModalWrapper } from "../SettingsModalWrapper";
import { GlassFormInput } from "../../form/GlassFormInput";
import { GlassFormPicker } from "../../form/GlassFormPicker";
import { useProfileStore } from "../../../stores/profileStore";
import { useUser } from "../../../hooks/useUser";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";

import { crossPlatformAlert } from "../../../utils/crossPlatformAlert";
import type { WorkoutPreferencesData } from "../../../types/onboarding";

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
    if (visible && profile?.personalInfo) {
      const info = profile.personalInfo;
      setName(info.name || "");
      setAge(String(info.age || ""));
      setGender(info.gender || "");
      setHeight(String(info.height || ""));
      setWeight(String(info.weight || ""));
      setActivityLevel(info.activityLevel || "");
      setErrors({});
    }
  }, [visible, profile]);

  // Validation
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

  // Save handler
  const handleSave = useCallback(async () => {
    if (!validate()) {
      haptics.light();
      return;
    }

    setIsSaving(true);
    try {
      // Split name into first_name and last_name
      const nameParts = name.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // ✅ Update personal info via profileStore (snake_case fields)
      updatePersonalInfo({
        first_name: firstName,
        last_name: lastName,
        name: name.trim(),
        age: parseFloat(age),
        gender: gender as "male" | "female" | "other" | "prefer_not_to_say",
        country: profile?.personalInfo?.country || "",
        state: profile?.personalInfo?.state || "",
        wake_time: profile?.personalInfo?.wake_time || "07:00",
        sleep_time: profile?.personalInfo?.sleep_time || "23:00",
        occupation_type: profile?.personalInfo?.occupation_type || "desk_job",
        email: profile?.personalInfo?.email ?? undefined,
        region: profile?.personalInfo?.region ?? undefined,
      });

      // ✅ Update body measurements via profileStore's bodyAnalysis
      if (height && weight) {
        updateBodyAnalysis({
          height_cm: parseFloat(height),
          current_weight_kg: parseFloat(weight),
        });
      }

      // ✅ Update activity level in workoutPreferences if changed
      if (activityLevel && activityLevel !== profile?.personalInfo?.activityLevel) {
        updateWorkoutPreferences({
          activity_level: activityLevel as WorkoutPreferencesData['activity_level'],
        });
      }
      haptics.success();
      onClose();
    } catch (error) {
      console.error("Error saving personal info:", error);
      crossPlatformAlert("Error", "Failed to save changes. Please try again.");
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
    return (
      name !== (info.name || "") ||
      age !== String(info.age || "") ||
      gender !== (info.gender || "") ||
      height !== String(info.height || "") ||
      weight !== String(info.weight || "") ||
      activityLevel !== (info.activityLevel || "")
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
        onChangeText={setName}
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
        onChangeText={setAge}
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
        onChangeText={setHeight}
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
        onChangeText={setWeight}
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
