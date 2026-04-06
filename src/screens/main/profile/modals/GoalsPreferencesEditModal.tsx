/**
 * GoalsPreferencesEditModal - Edit Fitness Goals & Preferences
 *
 * Fields:
 * - Primary Goals (multi-select)
 * - Experience Level (picker)
 * - Time Commitment (picker)
 *
 * Uses useProfileStore.updateWorkoutPreferences() to save changes.
 */

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SettingsModalWrapper } from "../components/SettingsModalWrapper";
import { GlassFormPicker } from "../components/GlassFormPicker";
import { useProfileStore } from "../../../../stores/profileStore";
import { useUserStore } from "../../../../stores/userStore";
import { useUser } from "../../../../hooks/useUser";
import { useAuth } from "../../../../hooks/useAuth";
import { ResponsiveTheme } from "../../../../utils/constants";
import { rf } from "../../../../utils/responsive";
import { haptics } from "../../../../utils/haptics";
import { crossPlatformAlert } from "../../../../utils/crossPlatformAlert";
import { buildLegacyProfileAdapter } from "../../../../utils/profileLegacyAdapter";
import type { FitnessGoals } from "../../../../types/user";
import { supabase } from "../../../../services/supabase";

interface GoalsPreferencesEditModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRIMARY_GOALS_OPTIONS = [
  {
    value: "weight_loss",
    label: "Weight Loss",
    icon: "trending-down-outline" as const,
    description: "Burn fat and lose weight",
  },
  {
    value: "muscle_gain",
    label: "Muscle Gain",
    icon: "barbell-outline" as const,
    description: "Build lean muscle mass",
  },
  {
    value: "strength",
    label: "Strength",
    icon: "fitness-outline" as const,
    description: "Increase overall strength",
  },
  {
    value: "endurance",
    label: "Endurance",
    icon: "bicycle-outline" as const,
    description: "Improve stamina and cardio",
  },
  {
    value: "flexibility",
    label: "Flexibility",
    icon: "body-outline" as const,
    description: "Better mobility and stretch",
  },
  {
    value: "general_fitness",
    label: "General Fitness",
    icon: "heart-outline" as const,
    description: "Overall health improvement",
  },
];

const EXPERIENCE_OPTIONS = [
  {
    value: "beginner",
    label: "Beginner",
    icon: "leaf-outline" as const,
    description: "New to fitness",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    icon: "flame-outline" as const,
    description: "1-3 years experience",
  },
  {
    value: "advanced",
    label: "Advanced",
    icon: "trophy-outline" as const,
    description: "3+ years experience",
  },
];

const TIME_COMMITMENT_OPTIONS = [
  {
    value: "15-30",
    label: "15-30 min",
    icon: "time-outline" as const,
    description: "Quick workouts",
  },
  {
    value: "30-45",
    label: "30-45 min",
    icon: "timer-outline" as const,
    description: "Moderate sessions",
  },
  {
    value: "45-60",
    label: "45-60 min",
    icon: "hourglass-outline" as const,
    description: "Standard workouts",
  },
  {
    value: "60+",
    label: "60+ min",
    icon: "stopwatch-outline" as const,
    description: "Extended training",
  },
];

export const GoalsPreferencesEditModal: React.FC<
  GoalsPreferencesEditModalProps
> = ({ visible, onClose }) => {
  const { profile: rawProfile } = useUser();
  const { user } = useAuth();
  const {
    updateWorkoutPreferences,
    workoutPreferences,
    personalInfo,
    bodyAnalysis,
    dietPreferences,
  } = useProfileStore();
  const profile = React.useMemo(
    () => ({
      ...rawProfile,
      bodyMetrics: bodyAnalysis,
      workoutPreferences,
      ...buildLegacyProfileAdapter({
        personalInfo,
        bodyAnalysis,
        workoutPreferences,
        dietPreferences,
        legacyProfile: rawProfile,
      }),
    }),
    [
      rawProfile,
      personalInfo,
      bodyAnalysis,
      workoutPreferences,
      dietPreferences,
    ],
  );

  // Form state
  const [primaryGoals, setPrimaryGoals] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [timeCommitment, setTimeCommitment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load current values when modal opens
  // Prefer profileStore.workoutPreferences (where saves go) over userStore.profile.fitnessGoals
  useEffect(() => {
    if (visible) {
      // Primary source: profileStore.workoutPreferences (persisted save target)
      // Fallback source: userStore.profile.fitnessGoals (populated from Supabase/onboarding)
      const wpGoals = workoutPreferences?.primary_goals;
      // The modal saves experience/time_commitment (FitnessGoals fields) into workoutPreferences
      // These are stored alongside native WorkoutPreferencesData fields
      const wp = workoutPreferences as Record<string, unknown> | null;
      const wpExperience =
        (wp?.experience as string) ||
        (wp?.experience_level as string) ||
        workoutPreferences?.intensity;
      const wpTime =
        (wp?.time_commitment as string) ||
        (workoutPreferences?.time_preference
          ? String(workoutPreferences.time_preference)
          : undefined);
      const profileGoals = profile?.fitnessGoals;

      // Goals: prefer profileStore, fall back to userStore
      let loadedGoals: string[] = [];
      if (wpGoals && wpGoals.length > 0) {
        loadedGoals = wpGoals.map((goal: string) => goal.replace(/-/g, "_"));
      } else if (profileGoals) {
        const rawGoals =
          profileGoals.primaryGoals || profileGoals.primary_goals || [];
        loadedGoals = rawGoals.map((goal: string) => goal.replace(/-/g, "_"));
      }

      // Experience: prefer profileStore, fall back to userStore
      let loadedExperience = "";
      if (wpExperience) {
        loadedExperience = wpExperience;
      } else if (profileGoals) {
        loadedExperience =
          profileGoals.experience || profileGoals.experience_level || "";
      }

      // Time: prefer profileStore, fall back to userStore
      let loadedTime = "";
      if (wpTime) {
        // wpTime could be a range string ("15-30") or a number from time_preference
        if (/^\d+-/.test(wpTime) || wpTime === "60+") {
          // Already a range format like "15-30", "30-45", "45-60", "60+"
          loadedTime = wpTime;
        } else {
          // Numeric minutes format - convert to range
          const minutes = parseInt(wpTime);
          if (!isNaN(minutes)) {
            loadedTime =
              minutes <= 30
                ? "15-30"
                : minutes <= 45
                  ? "30-45"
                  : minutes <= 60
                    ? "45-60"
                    : "60+";
          } else {
            loadedTime = wpTime;
          }
        }
      } else if (profileGoals) {
        const rawTime =
          profileGoals.timeCommitment || profileGoals.time_commitment || "";
        loadedTime = /^\d+$/.test(rawTime)
          ? parseInt(rawTime) <= 30
            ? "15-30"
            : parseInt(rawTime) <= 45
              ? "30-45"
              : parseInt(rawTime) <= 60
                ? "45-60"
                : "60+"
          : rawTime;
      }

      console.log("📊 [GoalsModal] Loading from sources:", {
        fromProfileStore: { wpGoals, wpExperience, wpTime },
        fromUserStore: profileGoals ? "available" : "none",
        resolved: { loadedGoals, loadedExperience, loadedTime },
      });

      setPrimaryGoals(loadedGoals);
      setExperience(loadedExperience);
      setTimeCommitment(loadedTime);
      setErrors({});
    }
  }, [visible, workoutPreferences, profile]);

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (primaryGoals.length === 0) {
      newErrors.primaryGoals = "Select at least one goal";
    }

    if (!experience) {
      newErrors.experience = "Please select your experience level";
    }

    if (!timeCommitment) {
      newErrors.timeCommitment = "Please select your time commitment";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [primaryGoals, experience, timeCommitment]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!validate()) {
      haptics.light();
      return;
    }

    setIsSaving(true);
    try {
      const updatedGoals: FitnessGoals = {
        primary_goals: primaryGoals,
        time_commitment: timeCommitment,
        experience,
        experience_level: experience, // For backward compatibility
        // Also set camelCase aliases for read-back compatibility
        primaryGoals: primaryGoals,
        timeCommitment: timeCommitment,
        // Preserve existing optional fields
        preferred_equipment: profile?.fitnessGoals?.preferred_equipment,
        target_areas: profile?.fitnessGoals?.target_areas,
      };

      // Update profileStore (primary save target)
      updateWorkoutPreferences(updatedGoals);

      // Also update userStore so reads from profile.fitnessGoals stay in sync
      const currentProfile = useUserStore.getState().profile;
      if (currentProfile) {
        useUserStore.getState().setProfile({
          ...currentProfile,
          fitnessGoals: {
            ...currentProfile.fitnessGoals,
            ...updatedGoals,
          },
        });
      }

      // Sync to Supabase (workout_preferences table — SSOT)
      if (user?.id) {
        try {
          const timePreferenceMinutes =
            timeCommitment === "60+"
              ? 60
              : (() => {
                  const m = timeCommitment.match(/(\d+)\s*-\s*(\d+)/);
                  return m ? parseInt(m[2], 10) : 45;
                })();
          const { error: wpError } = await supabase
            .from("workout_preferences")
            .upsert(
              {
                user_id: user.id,
                primary_goals: primaryGoals,
                time_preference: timePreferenceMinutes,
                intensity: experience,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" },
            );

          if (wpError) {
            console.error(
              "Failed to sync workout preferences to database:",
              wpError.message,
            );
            crossPlatformAlert(
              "Saved Locally",
              "Your goals were saved locally but failed to sync to the server. They will sync automatically when connection is restored.",
            );
          } else {
            console.log("✅ Workout preferences synced to database");
          }
        } catch (syncError) {
          console.error("Error syncing workout preferences:", syncError);
          // Don't fail the save - local update succeeded
        }
      }

      haptics.success();
      onClose();
    } catch (error) {
      console.error("Error saving fitness goals:", error);
      crossPlatformAlert("Error", "Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [
    primaryGoals,
    experience,
    timeCommitment,
    profile,
    updateWorkoutPreferences,

    onClose,
    validate,
    user,
  ]);

  const hasChanges = useCallback(() => {
    // Check against profileStore first (primary source), then userStore
    const wpGoals = workoutPreferences?.primary_goals;
    const profileGoals = profile?.fitnessGoals;
    const wp = workoutPreferences as Record<string, unknown> | null;

    // Get current goals from the same source hierarchy as loading
    let currentGoals: string[] = [];
    let currentExperience = "";
    let currentTime = "";

    if (wpGoals && wpGoals.length > 0) {
      currentGoals = wpGoals.map((g: string) => g.replace(/-/g, "_"));
      currentExperience =
        (wp?.experience as string) ||
        (wp?.experience_level as string) ||
        workoutPreferences?.intensity ||
        "";
      const wpTime =
        (wp?.time_commitment as string) ||
        (workoutPreferences?.time_preference
          ? String(workoutPreferences.time_preference)
          : "");
      if (wpTime) {
        if (/^\d+-/.test(wpTime) || wpTime === "60+") {
          currentTime = wpTime;
        } else {
          const minutes = parseInt(wpTime);
          if (!isNaN(minutes)) {
            currentTime =
              minutes <= 30
                ? "15-30"
                : minutes <= 45
                  ? "30-45"
                  : minutes <= 60
                    ? "45-60"
                    : "60+";
          } else {
            currentTime = wpTime;
          }
        }
      }
    } else if (profileGoals) {
      const rawGoals =
        profileGoals.primaryGoals || profileGoals.primary_goals || [];
      currentGoals = rawGoals.map((g: string) => g.replace(/-/g, "_"));
      currentExperience =
        profileGoals.experience || profileGoals.experience_level || "";
      // Apply the same numeric-to-range conversion used during load so the
      // comparison is apples-to-apples with the timeCommitment state value.
      const rawTime =
        profileGoals.timeCommitment || profileGoals.time_commitment || "";
      if (/^\d+-/.test(rawTime) || rawTime === "60+") {
        currentTime = rawTime;
      } else if (/^\d+$/.test(rawTime)) {
        const minutes = parseInt(rawTime);
        currentTime = minutes <= 30 ? "15-30" : minutes <= 45 ? "30-45" : minutes <= 60 ? "45-60" : "60+";
      } else {
        currentTime = rawTime;
      }
    } else {
      return true; // No saved data yet, always allow save
    }

    const currentGoalsSet = new Set(currentGoals);
    const newGoalsSet = new Set(primaryGoals);
    const goalsChanged =
      currentGoalsSet.size !== newGoalsSet.size ||
      [...currentGoalsSet].some((g) => !newGoalsSet.has(g));

    return (
      goalsChanged ||
      experience !== currentExperience ||
      timeCommitment !== currentTime
    );
  }, [primaryGoals, experience, timeCommitment, workoutPreferences, profile]);

  return (
    <SettingsModalWrapper
      visible={visible}
      title="Goals & Preferences"
      subtitle="Customize your fitness journey"
      icon="flag-outline"
      iconColor="#4CAF50"
      onClose={onClose}
      onSave={handleSave}
      isSaving={isSaving}
      saveDisabled={!hasChanges()}
    >
      {/* Primary Goals - Multi-select */}
      <GlassFormPicker
        label="Primary Goals"
        options={PRIMARY_GOALS_OPTIONS}
        value={primaryGoals}
        onChange={(val) => setPrimaryGoals(val as string[])}
        multiSelect={true}
        columns={2}
        error={errors.primaryGoals}
        hint="Select all that apply"
      />

      {/* Experience Level */}
      <GlassFormPicker
        label="Experience Level"
        options={EXPERIENCE_OPTIONS}
        value={experience}
        onChange={(val) => setExperience(val as string)}
        columns={3}
        error={errors.experience}
      />

      {/* Time Commitment */}
      <GlassFormPicker
        label="Time Per Workout"
        options={TIME_COMMITMENT_OPTIONS}
        value={timeCommitment}
        onChange={(val) => setTimeCommitment(val as string)}
        columns={2}
        error={errors.timeCommitment}
        hint="Average time you can dedicate per session"
      />
    </SettingsModalWrapper>
  );
};

export default GoalsPreferencesEditModal;
