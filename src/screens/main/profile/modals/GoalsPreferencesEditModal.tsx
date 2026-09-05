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
import { SettingsModalWrapper } from "../components/SettingsModalWrapper";
import { GlassFormPicker } from "../components/GlassFormPicker";
import { useProfileStore } from "../../../../stores/profileStore";
import { useAuth } from "../../../../hooks/useAuth";
import { colors } from "../../../../theme/aurora-tokens";
import { haptics } from "../../../../utils/haptics";
import { crossPlatformAlert } from "../../../../utils/crossPlatformAlert";
import { buildLegacyProfileAdapter } from "../../../../utils/profileLegacyAdapter";
import type { FitnessGoals } from "../../../../types/user";
import { supabase } from "../../../../services/supabase";
import { offlineService } from "../../../../services/offline";

interface GoalsPreferencesEditModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Goal values are stored with underscores (e.g. "weight_loss") but some
 * legacy/onboarding sources use hyphens (e.g. "weight-loss"). Normalize to
 * underscore form so state always matches PRIMARY_GOALS_OPTIONS' values.
 * Shared by the load effect and hasChanges() so the two never drift apart.
 */
const normalizeGoalList = (goals: string[] | undefined | null): string[] =>
  (goals || []).map((goal) => goal.replace(/-/g, "_"));

/**
 * Time commitment can arrive either as a range string ("15-30", "60+") or as
 * raw minutes (a plain number, e.g. from workout_preferences.time_preference).
 * Normalize both shapes to the range-bucket format TIME_COMMITMENT_OPTIONS
 * uses. Shared by the load effect and hasChanges() so the Save button's
 * enabled state can never diverge from what will actually be loaded/saved.
 */
const normalizeTimeCommitment = (raw: string | undefined | null): string => {
  if (!raw) return "";
  if (/^\d+-/.test(raw) || raw === "60+") {
    // Already a range format like "15-30", "30-45", "45-60", "60+"
    return raw;
  }
  if (/^\d+$/.test(raw)) {
    const minutes = parseInt(raw, 10);
    return minutes <= 30
      ? "15-30"
      : minutes <= 45
        ? "30-45"
        : minutes <= 60
          ? "45-60"
          : "60+";
  }
  return raw;
};

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
      bodyMetrics: bodyAnalysis,
      workoutPreferences,
      ...buildLegacyProfileAdapter({
        personalInfo,
        bodyAnalysis,
        workoutPreferences,
        dietPreferences,
        legacyProfile: null,
      }),
    }),
    [
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
        loadedGoals = normalizeGoalList(wpGoals);
      } else if (profileGoals) {
        const rawGoals =
          profileGoals.primaryGoals || profileGoals.primary_goals || [];
        loadedGoals = normalizeGoalList(rawGoals);
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
        loadedTime = normalizeTimeCommitment(wpTime);
      } else if (profileGoals) {
        const rawTime =
          profileGoals.timeCommitment || profileGoals.time_commitment || "";
        loadedTime = normalizeTimeCommitment(rawTime);
      }

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
        // Preserve existing optional fields. NOTE: preferred_equipment and
        // target_areas have no corresponding columns in the workout_preferences
        // table (verified against supabase/migrations) — they are intentionally
        // client-only. updateWorkoutPreferences() merges (spreads) into the
        // existing store object rather than replacing it, and no server
        // refetch is wired into this modal's onClose, so these fields survive
        // both this save and any later pull-to-refresh without being clobbered.
        preferred_equipment: profile?.fitnessGoals?.preferred_equipment,
        target_areas: profile?.fitnessGoals?.target_areas,
      };

      // Update profileStore (primary save target)
      updateWorkoutPreferences(updatedGoals);

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
          // ROOT CAUSE FIX: workout_preferences.location/equipment/user_id
          // are NOT NULL with no column default (see supabase/migrations/
          // 20250119000000_create_onboarding_tables.sql). Postgres validates
          // an upsert's tentative INSERT row against NOT NULL constraints
          // BEFORE resolving ON CONFLICT — confirmed live: `INSERT ...
          // ON CONFLICT (user_id) DO UPDATE` still throws 23502 even when a
          // matching row already exists, if the payload omits a NOT NULL
          // column. This upsert previously omitted both, meaning this
          // "Goals & Preferences" save has ALWAYS failed to sync to the
          // server 100% of the time (online or offline) — the local
          // profileStore update above always succeeded, so the UI looked
          // fine while the server-side row silently never changed. Carry
          // forward the already-loaded location/equipment unchanged
          // (falling back to onboardingService's own established defaults
          // only if genuinely never set).
          const workoutPreferencesPayload = {
            user_id: user.id,
            location: workoutPreferences?.location || "home",
            equipment: workoutPreferences?.equipment || ["bodyweight"],
            primary_goals: primaryGoals,
            time_preference: timePreferenceMinutes,
            intensity: experience,
            updated_at: new Date().toISOString(),
          };
          const { error: wpError } = await supabase
            .from("workout_preferences")
            .upsert(workoutPreferencesPayload, { onConflict: "user_id" });

          if (wpError) {
            console.error(
              "Failed to sync workout preferences to database:",
              wpError.message,
            );
            // Make the alert below true: actually queue the write for
            // offline retry (CLAUDE.md rule 6) instead of just claiming it
            // will happen. Previously nothing queued this, so a failed
            // sync (most commonly: genuinely offline) never synced even
            // after the connection was restored.
            await offlineService.queueAction({
              type: "CREATE",
              table: "workout_preferences",
              data: workoutPreferencesPayload,
              userId: user.id,
              maxRetries: 3,
            });
            crossPlatformAlert(
              "Saved Locally",
              "Your goals were saved locally but failed to sync to the server. They will sync automatically when connection is restored.",
            );
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
      currentGoals = normalizeGoalList(wpGoals);
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
      currentTime = normalizeTimeCommitment(wpTime);
    } else if (profileGoals) {
      const rawGoals =
        profileGoals.primaryGoals || profileGoals.primary_goals || [];
      currentGoals = normalizeGoalList(rawGoals);
      currentExperience =
        profileGoals.experience || profileGoals.experience_level || "";
      // Apply the same numeric-to-range conversion used during load so the
      // comparison is apples-to-apples with the timeCommitment state value.
      const rawTime =
        profileGoals.timeCommitment || profileGoals.time_commitment || "";
      currentTime = normalizeTimeCommitment(rawTime);
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
      iconColor={colors.success.DEFAULT}
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
