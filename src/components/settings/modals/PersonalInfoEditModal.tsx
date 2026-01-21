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
 * Uses useUserStore.updatePersonalInfo() to save changes.
 */

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SettingsModalWrapper } from "../SettingsModalWrapper";
import { GlassFormInput } from "../../form/GlassFormInput";
import { GlassFormPicker } from "../../form/GlassFormPicker";
import { useUserStore } from "../../../stores/userStore";
import { useUser } from "../../../hooks/useUser";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";
import type { PersonalInfo } from "../../../types/user";

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
  const { updatePersonalInfo } = useUserStore();

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
      setAge(info.age || "");
      setGender(info.gender || "");
      setHeight(info.height || "");
      setWeight(info.weight || "");
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
      const updatedInfo: PersonalInfo = {
        name: name.trim(),
        age,
        gender,
        height,
        weight,
        activityLevel,
        // Preserve existing optional fields
        email: profile?.personalInfo?.email,
        country: profile?.personalInfo?.country,
        state: profile?.personalInfo?.state,
        region: profile?.personalInfo?.region,
        wake_time: profile?.personalInfo?.wake_time,
        sleep_time: profile?.personalInfo?.sleep_time,
        occupation_type: profile?.personalInfo?.occupation_type,
      };

      updatePersonalInfo(updatedInfo);
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
    onClose,
    validate,
  ]);

  const hasChanges = useCallback(() => {
    if (!profile?.personalInfo) return true;
    const info = profile.personalInfo;
    return (
      name !== (info.name || "") ||
      age !== (info.age || "") ||
      gender !== (info.gender || "") ||
      height !== (info.height || "") ||
      weight !== (info.weight || "") ||
      activityLevel !== (info.activityLevel || "")
    );
  }, [name, age, gender, height, weight, activityLevel, profile]);

  return (
    <SettingsModalWrapper
      visible={visible}
      title="Personal Information"
      subtitle="Update your profile details"
      icon="person-outline"
      iconColor="#FF6B6B"
      onClose={onClose}
      onSave={handleSave}
      isSaving={isSaving}
      saveDisabled={!hasChanges()}
    >
      {/* Name */}
      <GlassFormInput
        label="Full Name"
        icon="person-outline"
        iconColor="#FF6B6B"
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
        iconColor="#4CAF50"
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
        iconColor="#2196F3"
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
        iconColor="#9C27B0"
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
