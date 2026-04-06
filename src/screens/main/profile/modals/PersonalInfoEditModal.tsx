/**
 * PersonalInfoEditModal - Edit Personal Information
 *
 * Fields:
 * - Name
 * - Age
 * - Gender (picker)
 * - Activity Level (picker)
 *
 * Uses useProfileStore to save changes.
 */

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SettingsModalWrapper } from "../components/SettingsModalWrapper";
import { GlassFormInput } from "../components/GlassFormInput";
import { GlassFormPicker } from "../components/GlassFormPicker";
import { useProfileStore } from "../../../../stores/profileStore";
import { useUser } from "../../../../hooks/useUser";
import { useAuth } from "../../../../hooks/useAuth";
import { useUserStore } from "../../../../stores/userStore";
import { userProfileService } from "../../../../services/userProfile";
import { supabase } from "../../../../services/supabase";
import { buildLegacyProfileAdapter } from "../../../../utils/profileLegacyAdapter";
import { ResponsiveTheme } from "../../../../utils/constants";
import { rf, rp, rbr } from "../../../../utils/responsive";
import { haptics } from "../../../../utils/haptics";
import { crossPlatformAlert } from "../../../../utils/crossPlatformAlert";

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
  const { profile: rawProfile } = useUser();
  const { user } = useAuth();
  const {
    updatePersonalInfo,
    updateWorkoutPreferences,
    bodyAnalysis,
    dietPreferences,
  } = useProfileStore();
  // SSOT: profileStore.personalInfo is authoritative (onboarding_data table); userStore.profile is legacy fallback
  const profilePersonalInfo = useProfileStore((s) => s.personalInfo);
  // SSOT: profileStore.workoutPreferences is authoritative for activity_level (onboarding_data table)
  const profileWorkoutPreferences = useProfileStore(
    (s) => s.workoutPreferences,
  );
  const profile = React.useMemo(
    () => ({
      ...rawProfile,
      bodyMetrics: bodyAnalysis,
      workoutPreferences: profileWorkoutPreferences,
      ...buildLegacyProfileAdapter({
        personalInfo: profilePersonalInfo,
        bodyAnalysis,
        workoutPreferences: profileWorkoutPreferences,
        dietPreferences,
        legacyProfile: rawProfile,
      }),
    }),
    [
      rawProfile,
      profilePersonalInfo,
      bodyAnalysis,
      profileWorkoutPreferences,
      dietPreferences,
    ],
  );

  // Form state
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load current values when modal opens
  useEffect(() => {
    if (visible) {
      const info = profile?.personalInfo;
      // ✅ SSOT: profileStore.personalInfo is authoritative; compute name from first+last, fallback to userStore
      const profileName =
        `${profilePersonalInfo?.first_name || ""} ${profilePersonalInfo?.last_name || ""}`.trim();
      setName(profileName || profilePersonalInfo?.name || info?.name || "");
      // ✅ SSOT: profileStore.personalInfo.age is authoritative; userStore is legacy fallback
      setAge((profilePersonalInfo?.age ?? info?.age)?.toString() || "");
      setGender(profilePersonalInfo?.gender || info?.gender || "");
      // ✅ SSOT: profileStore.workoutPreferences is authoritative (onboarding_data table); userStore.profile is legacy fallback
      setActivityLevel(
        profileWorkoutPreferences?.activity_level ||
          profile?.workoutPreferences?.activity_level ||
          "",
      );
      setErrors({});
    }
  }, [visible, profile, profilePersonalInfo, profileWorkoutPreferences]);

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

    if (!activityLevel) {
      newErrors.activityLevel = "Please select your activity level";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, age, gender, activityLevel]);

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

      // Sync to userStore so header/display components pick up the change immediately
      const currentProfile = useUserStore.getState().profile;
      if (currentProfile) {
        useUserStore.getState().setProfile({
          ...currentProfile,
          personalInfo: {
            ...currentProfile.personalInfo,
            name: name.trim(),
            first_name: firstName,
            last_name: lastName,
            age: parseInt(age, 10),
            gender: gender as "male" | "female" | "other" | "prefer_not_to_say",
          },
          workoutPreferences: {
            // Spread existing to preserve all required fields, then override activity_level
            ...(currentProfile.workoutPreferences ?? {
              location: "home" as const,
              equipment: [],
              time_preference: 30,
              intensity: "beginner" as const,
              workout_types: [],
              primary_goals: [],
              activity_level: "moderate",
            }),
            activity_level:
              activityLevel ||
              currentProfile.workoutPreferences?.activity_level ||
              "moderate",
          } as import("../../../../types/user").WorkoutPreferences,
        });
      }

      // ✅ SSOT: profileStore.workoutPreferences is authoritative for activity_level
      if (
        activityLevel &&
        activityLevel !==
          (profileWorkoutPreferences?.activity_level ||
            profile?.workoutPreferences?.activity_level)
      ) {
        updateWorkoutPreferences({
          activity_level: activityLevel as any,
        });
      }

      // Height/weight changes handled by BodyMeasurementsEditModal

      haptics.success();

      // ✅ Sync to Supabase profiles table
      if (user?.id) {
        try {
          const result = await userProfileService.updateProfile(user.id, {
            first_name: firstName,
            last_name: lastName,
            age: parseInt(age, 10),
            gender: gender as "male" | "female" | "other" | "prefer_not_to_say",
          } as any);
          if (!result.success) {
            console.error(
              "[PersonalInfoModal] Failed to sync to Supabase:",
              result.error,
            );
          } else {
            console.log("✅ Personal info synced to Supabase");
          }

          // ✅ Sync activity_level to workout_preferences table
          if (activityLevel) {
            try {
              const { error: wpError } = await supabase
                .from("workout_preferences")
                .upsert({ user_id: user.id, activity_level: activityLevel }, { onConflict: "user_id" });
              if (wpError) {
                console.error(
                  "[PersonalInfoModal] Activity level sync error:",
                  wpError,
                );
              } else {
                console.log("✅ Activity level synced to workout_preferences");
              }
            } catch (activitySyncError) {
              console.error(
                "[PersonalInfoModal] Activity level sync error:",
                activitySyncError,
              );
            }
          }
        } catch (syncError) {
          console.error("[PersonalInfoModal] Sync error:", syncError);
          // Don't fail the save - local update succeeded
        }
      }

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
    activityLevel,
    profile,
    user,
    updatePersonalInfo,
    updateWorkoutPreferences,
    onClose,
    validate,
  ]);

  const hasChanges = useCallback(() => {
    const info = profile?.personalInfo;
    const bodyMetrics = profile?.bodyMetrics;
    const bodyAnalysisData = useProfileStore.getState().bodyAnalysis;
    // SSOT: use profileStore.personalInfo for original name comparison
    const profileName =
      `${profilePersonalInfo?.first_name || ""} ${profilePersonalInfo?.last_name || ""}`.trim();
    const origName =
      profileName || profilePersonalInfo?.name || info?.name || "";
    const origAge = (profilePersonalInfo?.age ?? info?.age)?.toString() || "";
    const origGender = profilePersonalInfo?.gender || info?.gender || "";
    return (
      name !== origName ||
      age !== origAge ||
      gender !== origGender ||
      // SSOT: profileStore.workoutPreferences is authoritative; userStore.profile is legacy fallback
      activityLevel !==
        (profileWorkoutPreferences?.activity_level ||
          profile?.workoutPreferences?.activity_level ||
          "")
    );
  }, [
    name,
    age,
    gender,
    activityLevel,
    profile,
    profilePersonalInfo,
    profileWorkoutPreferences,
  ]);

  return (
    <SettingsModalWrapper
      visible={visible}
      title="Personal Information"
      subtitle="Update your basic profile details"
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
