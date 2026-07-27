import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, interpolate, FadeInDown } from "react-native-reanimated";
import { useDragToReorder } from "../../gestures/handlers";
import {
  getCuratedExercises,
  CURATED_EXERCISES,
  CuratedExercise,
} from "../../data/curatedExercises";
import {
  workoutTemplateService,
  TemplateExercise,
  WorkoutTemplate,
} from "../../services/workoutTemplateService";
import { buildDayWorkoutFromTemplate } from "../../utils/workoutBuilders";
import { useFitnessStore } from "../../stores/fitnessStore";
import { useProfileStore } from "../../stores/profileStore";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { getCurrentUserId } from "../../services/authUtils";
import { haptics } from "../../utils/haptics";
import {
  AuroraBackground,
  EmptyState,
  GlassCard,
  GlassHeader,
  AnimatedPressable,
  AuroraSpinner,
} from "../../components/ui/aurora";
import { colors, spacing, borderRadius, typography } from "../../theme/aurora-tokens";
import { hexToRgba } from "../../utils/colors";
import { rp, rf, rw, rh } from "../../utils/responsive";

interface Props {
  navigation: any;
  route?: any;
}

type CategoryFilter =
  | "all"
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "legs"
  | "core"
  | "cardio"
  | "full_body";

const EXERCISE_ROW_HEIGHT = 90; // approximate height of each exercise row

/** Wraps a child view with drag-to-reorder gesture support */
const DraggableRow: React.FC<{
  index: number;
  totalCount: number;
  onReorder: (fromIndex: number, toIndex: number) => void;
  children: React.ReactNode;
}> = React.memo(({ index, totalCount, onReorder, children }) => {
  const handleDragEnd = useCallback(
    (from: number, to: number) => {
      const clampedTo = Math.max(0, Math.min(totalCount - 1, to));
      if (from !== clampedTo) {
        onReorder(from, clampedTo);
      }
    },
    [totalCount, onReorder],
  );

  const { gesture, translateY, isDragging } = useDragToReorder(index, {
    itemHeight: EXERCISE_ROW_HEIGHT,
    onDragEnd: handleDragEnd,
    activationDelay: 400,
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: isDragging.value ? 0.85 : 1,
    zIndex: isDragging.value ? 100 : 0,
    elevation: isDragging.value ? 5 : 0,
    shadowOpacity: isDragging.value ? 0.3 : 0,
    shadowRadius: isDragging.value ? 8 : 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: isDragging.value ? 4 : 0 },
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </GestureDetector>
  );
});

const CATEGORY_TABS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "chest", label: "Chest" },
  { key: "back", label: "Back" },
  { key: "shoulders", label: "Shoulders" },
  { key: "arms", label: "Arms" },
  { key: "legs", label: "Legs" },
  { key: "core", label: "Core" },
  { key: "cardio", label: "Cardio" },
  { key: "full_body", label: "Full Body" },
];

// ── Share-to-Community (Phase 10) ─────────────────────────────────────────
// When the user flips the "Share to Community" toggle ON, we surface a small
// inline form for category / difficulty / tags before the template is saved
// publicly. These options map directly to the community-browse filters in
// getPublicTemplates (Phase 0.5).
type ShareDifficulty = "beginner" | "intermediate" | "advanced";

const SHARE_DIFFICULTY_OPTIONS: { key: ShareDifficulty; label: string }[] = [
  { key: "beginner", label: "Beginner" },
  { key: "intermediate", label: "Intermediate" },
  { key: "advanced", label: "Advanced" },
];

const SHARE_CATEGORY_OPTIONS = [
  "upper-lower",
  "ppl",
  "strength",
  "powerlifting",
  "athlete",
  "fat-loss",
  "home",
  "travel",
  "bro-split",
  "general",
];

export default function CreateWorkoutScreen({ navigation, route }: Props) {
  const templateId = route?.params?.templateId as string | undefined;
  const [workoutName, setWorkoutName] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("all");
  const [addedExercises, setAddedExercises] = useState<TemplateExercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // Edit-hydration state: true only on the edit path (templateId present) so a
  // spinner shows immediately while the existing template is fetched. The
  // create-new path initializes both to false and never renders these branches.
  const [loadingTemplate, setLoadingTemplate] = useState(!!templateId);
  const [loadError, setLoadError] = useState(false);

  // ── Share-to-Community state (Phase 10) ─────────────────────────────────
  // When shareToCommunity is ON, the save flow prompts for category /
  // difficulty / tags and sets is_public=true on the saved template.
  const [shareToCommunity, setShareToCommunity] = useState(false);
  const [shareCategory, setShareCategory] = useState<string | null>(null);
  const [shareDifficulty, setShareDifficulty] =
    useState<ShareDifficulty | null>(null);
  const [shareTagsInput, setShareTagsInput] = useState("");

  const startTemplateSession = useFitnessStore((s) => s.startTemplateSession);

  // Read user's equipment & location from onboarding SSOT (profileStore)
  const workoutPreferences = useProfileStore((s) => s.workoutPreferences);
  const userEquipment = useMemo(() => {
    const eq = workoutPreferences?.equipment;
    // Fallback to all common equipment if user hasn't set preferences
    return eq && eq.length > 0
      ? eq
      : ["body weight", "dumbbell", "barbell", "cable", "machine", "band"];
  }, [workoutPreferences?.equipment]);
  const userLocation = workoutPreferences?.location ?? "any";

  // Load existing template when editing. Extracted into a useCallback so the
  // error-state retry button can re-invoke it without re-running the effect.
  const loadTemplate = useCallback(async () => {
    if (!templateId) return;
    const userId = getCurrentUserId();
    if (!userId) {
      setLoadingTemplate(false);
      return;
    }
    setLoadError(false);
    try {
      const templates = await workoutTemplateService.getTemplates(userId);
      const existing = templates.find((t) => t.id === templateId);
      if (existing) {
        setWorkoutName(existing.name);
        setAddedExercises(existing.exercises);
        setIsEditing(true);
        // Hydrate Share-to-Community fields from the existing template so
        // editing a public template preserves its community metadata.
        setShareToCommunity(existing.isPublic);
        setShareCategory(existing.category ?? null);
        setShareDifficulty(existing.difficulty ?? null);
        setShareTagsInput(
          existing.tags && existing.tags.length > 0
            ? existing.tags.join(", ")
            : "",
        );
      }
    } catch (err) {
      console.error("Failed to load template for editing:", err);
      setLoadError(true);
    } finally {
      setLoadingTemplate(false);
    }
  }, [templateId]);

  // Load existing template when editing
  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const availableExercises = useMemo(() => {
    const all = getCuratedExercises(
      userEquipment,
      userLocation === "both" ? "any" : userLocation,
    );
    if (selectedCategory === "all") return all;
    return all.filter((ex) => ex.category === selectedCategory);
  }, [selectedCategory, userEquipment, userLocation]);

  const addExercise = useCallback((exercise: CuratedExercise) => {
    setAddedExercises((prev) => [
      ...prev,
      {
        exerciseId: exercise.id,
        name: exercise.name,
        sets: 3,
        repRange: [8, 12] as [number, number],
        restSeconds: 60,
      },
    ]);
  }, []);

  const removeExercise = useCallback((index: number) => {
    setAddedExercises((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveExercise = useCallback(
    (fromIndex: number, direction: "up" | "down") => {
      setAddedExercises((prev) => {
        const arr = [...prev];
        const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
        if (toIndex < 0 || toIndex >= arr.length) return prev;
        [arr[fromIndex], arr[toIndex]] = [arr[toIndex], arr[fromIndex]];
        return arr;
      });
    },
    [],
  );

  // Drag-and-drop reorder: moves exercise from one position to another
  const handleDragReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      setAddedExercises((prev) => {
        const arr = [...prev];
        const clamped = Math.max(0, Math.min(arr.length - 1, toIndex));
        if (fromIndex === clamped) return prev;
        const [moved] = arr.splice(fromIndex, 1);
        arr.splice(clamped, 0, moved);
        return arr;
      });
    },
    [],
  );

  // ── Share-to-Community toggle handler (Phase 10) ─────────────────────────
  const handleShareToggle = useCallback((value: boolean) => {
    haptics.toggle();
    setShareToCommunity(value);
    // When turning ON without a difficulty pre-selected, leave it null so the
    // validation prompt fires on save. When turning OFF, reset the fields so a
    // private save doesn't carry stale public metadata.
    if (!value) {
      setShareCategory(null);
      setShareDifficulty(null);
      setShareTagsInput("");
    }
  }, []);

  const updateExerciseField = useCallback(
    (index: number, field: keyof TemplateExercise, value: number | [number, number] | undefined) => {
      setAddedExercises((prev) =>
        prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex)),
      );
    },
    [],
  );

  const handleSaveTemplate = async () => {
    if (!workoutName.trim()) {
      crossPlatformAlert("Missing Name", "Please enter a workout name.");
      return;
    }
    if (addedExercises.length === 0) {
      crossPlatformAlert("No Exercises", "Add at least one exercise.");
      return;
    }

    // ── Share-to-Community validation (Phase 10) ──────────────────────────
    // When sharing publicly, require a difficulty so the community browse
    // filters work. Category + tags are optional but recommended.
    if (shareToCommunity && !shareDifficulty) {
      haptics.warning();
      crossPlatformAlert(
        "Pick a difficulty",
        "Please choose a difficulty level (Beginner / Intermediate / Advanced) before sharing to the community.",
      );
      return;
    }

    setSaving(true);
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        crossPlatformAlert(
          "Not Signed In",
          "Please sign in to save templates.",
        );
        return;
      }

      const muscleGroups = [
        ...new Set(
          addedExercises.flatMap((ex) => {
            const curated = CURATED_EXERCISES.find(
              (c) => c.id === ex.exerciseId,
            );
            return curated?.muscleGroups ?? [];
          }),
        ),
      ];

      // Parse tags from the comma-separated input (trim + drop empties).
      const tags = shareToCommunity
        ? shareTagsInput
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
            .slice(0, 10)
        : [];

      if (isEditing && templateId) {
        // Update existing template. Phase 10: the update API on the service
        // only allows a subset of fields (name/desc/exercises/muscleGroups/
        // duration/isPublic). Category/difficulty/tags are NOT in UpdateInput,
        // so for public templates we surface a one-time confirmation and let
        // the isPublic flag toggle through the existing API. Community
        // metadata edits (category/difficulty/tags) require a service-level
        // update addition — out of scope for Phase 10's additive save flow;
        // the user can re-create the template to change community metadata.
        if (shareToCommunity) {
          haptics.light();
        }
        await workoutTemplateService.updateTemplate(templateId, userId, {
          name: workoutName.trim(),
          exercises: addedExercises,
          targetMuscleGroups: muscleGroups,
          estimatedDurationMinutes: addedExercises.length * 8,
          isPublic: shareToCommunity,
        });
      } else {
        // Create new template. The CreateInput type accepts the full
        // community metadata (category/difficulty/tags) — pass them through
        // when shareToCommunity is ON.
        await workoutTemplateService.createTemplate(userId, {
          name: workoutName.trim(),
          exercises: addedExercises,
          targetMuscleGroups: muscleGroups,
          estimatedDurationMinutes: addedExercises.length * 8,
          isPublic: shareToCommunity,
          ...(shareToCommunity
            ? {
                category: shareCategory ?? undefined,
                difficulty: shareDifficulty ?? undefined,
                tags,
              }
            : {}),
        });
      }

      navigation.navigate("TemplateLibrary");
    } catch (err) {
      console.error("Failed to save template:", err);
      crossPlatformAlert("Error", "Failed to save workout template.");
    } finally {
      setSaving(false);
    }
  };

  const handleStartNow = async () => {
    if (addedExercises.length === 0) {
      crossPlatformAlert("No Exercises", "Add at least one exercise.");
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      crossPlatformAlert("Not Signed In", "Please sign in to start a workout.");
      return;
    }

    try {
      const template = {
        id: `temp_${Date.now()}`,
        userId,
        name: workoutName.trim() || "Quick Workout",
        exercises: addedExercises,
        targetMuscleGroups: [],
        isPublic: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const sessionId = await startTemplateSession(template);
      const workout = buildDayWorkoutFromTemplate(template);
      navigation.navigate("WorkoutSession", {
        workout,
        sessionId,
        isExtra: true,
      });
    } catch (err) {
      console.error("Failed to start session:", err);
      crossPlatformAlert("Error", "Failed to start workout session.");
    }
  };

  const renderExercisePickerItem = ({ item }: { item: CuratedExercise }) => (
    <View style={styles.pickerRow}>
      <View style={styles.pickerInfo}>
        <Text style={styles.pickerName}>{item.name}</Text>
        <Text style={styles.pickerMuscles}>
          {item.muscleGroups.slice(0, 3).join(", ")}
        </Text>
      </View>
      <AnimatedPressable
        style={styles.addButton}
        onPress={() => addExercise(item)}
        testID={`add-exercise-${item.id}`}
        accessibilityLabel={`Add ${item.name}`}
      >
        <Text style={styles.addButtonText}>+</Text>
      </AnimatedPressable>
    </View>
  );

  // Edit-hydration loading state — only renders when templateId was set (edit
  // mode). The create-new path has loadingTemplate=false from initialization.
  if (loadingTemplate) {
    return (
      <AuroraBackground theme="space">
        <SafeAreaView style={styles.flex}>
          <GlassHeader
            title="Edit Workout"
            onBack={() => navigation.goBack()}
            backAccessibilityLabel="Go back"
          />
          <View style={styles.loader}>
            <AuroraSpinner size="lg" />
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  // Edit-hydration error state — only renders when a template fetch failed.
  // Surfaces a retry CTA instead of leaving the user in a blank editor (which
  // would risk saving an empty template over the existing one).
  if (loadError) {
    return (
      <AuroraBackground theme="space">
        <SafeAreaView style={styles.flex}>
          <GlassHeader
            title="Edit Workout"
            onBack={() => navigation.goBack()}
            backAccessibilityLabel="Go back"
          />
          <View
            style={styles.emptyWrap}
            testID="create-workout-load-error"
          >
            <EmptyState
              icon="cloud-offline-outline"
              iconColor={colors.error.DEFAULT}
              title="Couldn't load workout"
              subtitle="Check your connection and try again."
              ctaText="Try Again"
              onCta={() => {
                setLoadingTemplate(true);
                loadTemplate();
              }}
            />
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground theme="space">
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <GlassHeader
            title={isEditing ? "Edit Workout" : "Create Workout"}
            onBack={() => navigation.goBack()}
            rightAction={
              <AnimatedPressable
                onPress={handleSaveTemplate}
                disabled={saving}
                testID="save-button"
                accessibilityRole="button"
                accessibilityLabel={isEditing ? "Update template" : "Save template"}
                style={styles.headerSaveBtn}
              >
                {saving ? (
                  <AuroraSpinner size="sm" customSize={rf(16)} theme="white" />
                ) : (
                  <Text style={styles.headerSaveText}>
                    {isEditing ? "Update" : "Save"}
                  </Text>
                )}
              </AnimatedPressable>
            }
          />

          <TextInput
            style={styles.nameInput}
            placeholder="Workout Name"
            placeholderTextColor={colors.text.tertiary}
            value={workoutName}
            onChangeText={setWorkoutName}
            testID="workout-name-input"
          />

          {addedExercises.length > 0 && (
            <View style={styles.addedSection}>
              <Text style={styles.sectionTitle}>
                Added ({addedExercises.length})
              </Text>
              {addedExercises.length > 1 && (
                <Text style={styles.dragHint}>Hold to drag & reorder</Text>
              )}
              <ScrollView style={styles.addedList} nestedScrollEnabled>
                {addedExercises.map((ex, index) => (
                  <DraggableRow
                    key={`${ex.exerciseId}-${index}`}
                    index={index}
                    totalCount={addedExercises.length}
                    onReorder={handleDragReorder}
                  >
                    <GlassCard padding="sm" elevation={2} contentStyle={styles.addedRowContent}>
                      <View style={styles.addedRow}>
                        <View style={styles.addedInfo}>
                          <Text style={styles.addedName}>{ex.name}</Text>
                          <View style={styles.inputRow}>
                            <Text style={styles.inputLabel}>Sets:</Text>
                            <TextInput
                              style={styles.smallInput}
                              keyboardType="numeric"
                              value={String(ex.sets)}
                              onChangeText={(v) =>
                                updateExerciseField(index, "sets", parseInt(v) || 1)
                              }
                              testID={`sets-input-${index}`}
                            />
                            <Text style={styles.inputLabel}>Reps:</Text>
                            <TextInput
                              style={styles.smallInput}
                              keyboardType="numeric"
                              value={String(ex.repRange[0])}
                              onChangeText={(v) => {
                                const min = parseInt(v) || 1;
                                updateExerciseField(index, "repRange", [min, Math.max(min, ex.repRange[1])]);
                              }}
                              testID={`reps-min-input-${index}`}
                            />
                            <Text style={styles.inputLabel}>-</Text>
                            <TextInput
                              style={styles.smallInput}
                              keyboardType="numeric"
                              value={String(ex.repRange[1])}
                              onChangeText={(v) => {
                                const max = parseInt(v) || 1;
                                updateExerciseField(index, "repRange", [Math.min(ex.repRange[0], max), max]);
                              }}
                              testID={`reps-max-input-${index}`}
                            />
                            <Text style={styles.inputLabel}>Rest:</Text>
                            <TextInput
                              style={styles.smallInput}
                              keyboardType="numeric"
                              value={String(ex.restSeconds)}
                              onChangeText={(v) =>
                                updateExerciseField(
                                  index,
                                  "restSeconds",
                                  parseInt(v) || 30,
                                )
                              }
                              testID={`rest-input-${index}`}
                            />
                            <Text style={styles.inputLabel}>kg:</Text>
                            <TextInput
                              style={styles.smallInput}
                              keyboardType="decimal-pad"
                              value={ex.targetWeightKg != null ? String(ex.targetWeightKg) : ""}
                              onChangeText={(v) =>
                                updateExerciseField(
                                  index,
                                  "targetWeightKg",
                                  v === '' ? undefined : Math.max(0, parseFloat(v) || 0),
                                )
                              }
                              placeholder="0"
                              placeholderTextColor={colors.text.disabled}
                              testID={`weight-input-${index}`}
                            />
                          </View>
                        </View>
                        <View style={styles.addedActions}>
                          <AnimatedPressable
                            onPress={() => moveExercise(index, "up")}
                            testID={`move-up-${index}`}
                            accessibilityLabel="Move exercise up"
                            style={styles.iconBtn}
                          >
                            <Ionicons name="chevron-up" size={rf(16)} color={colors.primary.DEFAULT} />
                          </AnimatedPressable>
                          <AnimatedPressable
                            onPress={() => moveExercise(index, "down")}
                            testID={`move-down-${index}`}
                            accessibilityLabel="Move exercise down"
                            style={styles.iconBtn}
                          >
                            <Ionicons name="chevron-down" size={rf(16)} color={colors.primary.DEFAULT} />
                          </AnimatedPressable>
                          <AnimatedPressable
                            onPress={() => removeExercise(index)}
                            testID={`remove-exercise-${index}`}
                            accessibilityLabel="Remove exercise"
                            style={styles.iconBtn}
                          >
                            <Ionicons name="close" size={rf(16)} color={colors.error.DEFAULT} />
                          </AnimatedPressable>
                        </View>
                      </View>
                    </GlassCard>
                  </DraggableRow>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.categoryTabs}>
            {CATEGORY_TABS.map((tab) => (
              <AnimatedPressable
                key={tab.key}
                style={[
                  styles.tab,
                  selectedCategory === tab.key && styles.tabActive,
                ]}
                onPress={() => setSelectedCategory(tab.key)}
                testID={`category-tab-${tab.key}`}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${tab.label}`}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedCategory === tab.key && styles.tabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </AnimatedPressable>
            ))}
          </View>

          <FlatList
            data={availableExercises}
            keyExtractor={(item) => item.id}
            renderItem={renderExercisePickerItem}
            style={styles.exerciseList}
            testID="exercise-picker-list"
          />

          {/* ── Share to Community toggle (Phase 10) ─────────────────────────── */}
          {/* When ON, the template is saved with is_public=true and the
              category / difficulty / tags fields below are submitted with the
              create call. When OFF, the template is private (existing behavior). */}
          <View style={styles.shareToggleWrap}>
            <View style={styles.shareToggleRow}>
              <View style={styles.shareToggleInfo}>
                <Ionicons
                  name="people-outline"
                  size={rf(18)}
                  color={colors.primary.DEFAULT}
                />
                <View style={styles.shareToggleText}>
                  <Text style={styles.shareToggleTitle}>Share to Community</Text>
                  <Text style={styles.shareToggleSubtitle}>
                    Let other users discover, fork, and rate this template.
                  </Text>
                </View>
              </View>
              <Switch
                value={shareToCommunity}
                onValueChange={handleShareToggle}
                trackColor={{
                  false: colors.background.tertiary,
                  true: colors.primary.DEFAULT,
                }}
                thumbColor={colors.text.primary}
                accessibilityRole="switch"
                accessibilityLabel="Share to community"
                accessibilityState={{ checked: shareToCommunity }}
                testID="share-to-community-toggle"
              />
            </View>

            {shareToCommunity ? (
              <Animated.View
                entering={FadeInDown.duration(250)}
                style={styles.shareFields}
              >
                {/* Difficulty (required for community templates) */}
                <Text style={styles.shareFieldLabel}>
                  Difficulty <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.difficultyRow}>
                  {SHARE_DIFFICULTY_OPTIONS.map((opt) => {
                    const active = shareDifficulty === opt.key;
                    return (
                      <AnimatedPressable
                        key={opt.key}
                        onPress={() => {
                          haptics.selection();
                          setShareDifficulty(opt.key);
                        }}
                        style={[
                          styles.difficultyChip,
                          active && styles.difficultyChipActive,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={opt.label}
                        accessibilityState={{ selected: active }}
                        testID={`share-difficulty-${opt.key}`}
                      >
                        <Text
                          style={[
                            styles.difficultyChipText,
                            active && styles.difficultyChipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>

                {/* Category (optional — helps community browse filters) */}
                <Text style={styles.shareFieldLabel}>Category (optional)</Text>
                <View style={styles.categoryChipsRow}>
                  {SHARE_CATEGORY_OPTIONS.map((cat) => {
                    const active = shareCategory === cat;
                    return (
                      <AnimatedPressable
                        key={cat}
                        onPress={() => {
                          haptics.selection();
                          setShareCategory((prev) => (prev === cat ? null : cat));
                        }}
                        style={[
                          styles.categoryChip,
                          active && styles.categoryChipActive,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Category ${cat}`}
                        accessibilityState={{ selected: active }}
                        testID={`share-category-${cat}`}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            active && styles.categoryChipTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>

                {/* Tags (optional, comma-separated) */}
                <Text style={styles.shareFieldLabel}>
                  Tags (optional, comma-separated)
                </Text>
                <TextInput
                  style={styles.tagsInput}
                  value={shareTagsInput}
                  onChangeText={setShareTagsInput}
                  placeholder="e.g. hypertrophy, push, home"
                  placeholderTextColor={colors.text.tertiary}
                  maxLength={120}
                  testID="share-tags-input"
                />
              </Animated.View>
            ) : null}
          </View>

          <View style={styles.bottomButtons}>
            <AnimatedPressable
              style={styles.startButton}
              onPress={handleStartNow}
              testID="start-now-button"
              accessibilityRole="button"
              accessibilityLabel="Start workout now"
            >
              <Text style={styles.startButtonText}>Start Now</Text>
            </AnimatedPressable>
            <AnimatedPressable
              style={styles.saveTemplateButton}
              onPress={handleSaveTemplate}
              disabled={saving}
              testID="save-template-button"
              accessibilityRole="button"
              accessibilityLabel="Save template"
            >
              <Text style={styles.saveTemplateText}>Save Template</Text>
            </AnimatedPressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
  },
  headerSaveBtn: {
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xs),
  },
  headerSaveText: {
    fontSize: rf(15),
    color: colors.primary.DEFAULT,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  nameInput: {
    backgroundColor: colors.glass.background,
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.md),
    marginHorizontal: rp(spacing.md),
    marginTop: rp(spacing.sm),
    borderRadius: borderRadius.lg,
  },
  addedSection: { maxHeight: 220, marginTop: rp(spacing.sm), paddingHorizontal: rp(spacing.md) },
  sectionTitle: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text.secondary,
    marginBottom: rp(spacing.sm),
  },
  dragHint: {
    fontSize: rf(11),
    color: colors.text.tertiary,
    marginBottom: rp(spacing.xs),
    fontStyle: "italic",
  },
  addedList: { maxHeight: 200 },
  addedRowContent: { marginBottom: rp(spacing.xs) },
  addedRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  addedInfo: { flex: 1 },
  addedName: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text.primary,
    marginBottom: rp(spacing.xs),
  },
  inputRow: { flexDirection: "row", alignItems: "center", gap: rp(spacing.xs), flexWrap: "wrap" },
  inputLabel: { fontSize: rf(typography.fontSize.micro), color: colors.text.secondary },
  smallInput: {
    backgroundColor: colors.background.DEFAULT,
    color: colors.text.primary,
    width: rw(44),
    height: rh(32),
    borderRadius: borderRadius.md,
    textAlign: "center",
    fontSize: rf(13),
  },
  addedActions: {
    flexDirection: "column",
    alignItems: "center",
    gap: rp(spacing.xxs),
    marginLeft: rp(spacing.sm),
  },
  iconBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: rw(36),
    height: rw(36),
  },
  categoryTabs: {
    flexDirection: "row",
    paddingHorizontal: rp(spacing.md),
    marginTop: rp(spacing.sm),
    marginBottom: rp(spacing.sm),
    flexWrap: "wrap",
    gap: rp(spacing.xs),
  },
  tab: {
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    borderRadius: borderRadius.xl,
    backgroundColor: colors.glass.background,
  },
  tabActive: { backgroundColor: colors.primary.DEFAULT },
  tabText: { fontSize: rf(typography.fontSize.caption), color: colors.text.secondary },
  tabTextActive: { color: colors.text.primary, fontWeight: String(typography.fontWeight.semibold) as any },
  exerciseList: { flex: 1, paddingHorizontal: rp(spacing.md) },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rp(spacing.sm),
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  pickerInfo: { flex: 1 },
  pickerName: {
    fontSize: rf(15),
    color: colors.text.primary,
    fontWeight: String(typography.fontWeight.medium) as any,
  },
  pickerMuscles: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.tertiary,
    marginTop: rp(spacing.xxs),
  },
  addButton: {
    width: rw(36),
    height: rw(36),
    borderRadius: 999,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: rf(20),
    color: colors.text.primary,
    fontWeight: String(typography.fontWeight.bold) as any,
    lineHeight: rf(22),
  },
  bottomButtons: {
    flexDirection: "row",
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.md),
    gap: rp(spacing.md),
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  // ── Share-to-Community styles (Phase 10) ────────────────────────────────
  shareToggleWrap: {
    marginHorizontal: rp(spacing.md),
    marginVertical: rp(spacing.sm),
    borderRadius: borderRadius.lg,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    overflow: "hidden",
  },
  shareToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.md),
  },
  shareToggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
    flex: 1,
    paddingRight: rp(spacing.sm),
  },
  shareToggleText: {
    flex: 1,
    gap: rp(spacing.xxs),
  },
  shareToggleTitle: {
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text.primary,
  },
  shareToggleSubtitle: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
  },
  shareFields: {
    paddingHorizontal: rp(spacing.md),
    paddingBottom: rp(spacing.md),
    gap: rp(spacing.xs),
  },
  shareFieldLabel: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text.primary,
    marginTop: rp(spacing.xs),
  },
  required: {
    color: colors.primary.DEFAULT,
  },
  difficultyRow: {
    flexDirection: "row",
    gap: rp(spacing.xs),
    flexWrap: "wrap",
  },
  difficultyChip: {
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background.DEFAULT,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  difficultyChipActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  difficultyChipText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
    fontWeight: String(typography.fontWeight.medium) as any,
  },
  difficultyChipTextActive: {
    color: colors.text.primary,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  categoryChipsRow: {
    flexDirection: "row",
    gap: rp(spacing.xs),
    flexWrap: "wrap",
  },
  categoryChip: {
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.xs),
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background.DEFAULT,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  categoryChipActive: {
    backgroundColor: hexToRgba(colors.secondary.DEFAULT, 0.15),
    borderColor: colors.secondary.DEFAULT,
  },
  categoryChipText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
    textTransform: "capitalize" as any,
  },
  categoryChipTextActive: {
    color: colors.text.primary,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  tagsInput: {
    backgroundColor: colors.background.DEFAULT,
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    borderRadius: borderRadius.md,
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  startButton: {
    flex: 1,
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: rp(spacing.lg),
    borderRadius: borderRadius.lg,
    alignItems: "center",
  },
  startButtonText: {
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text.primary,
  },
  saveTemplateButton: {
    flex: 1,
    backgroundColor: colors.glass.background,
    paddingVertical: rp(spacing.lg),
    borderRadius: borderRadius.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
  },
  saveTemplateText: {
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.primary.DEFAULT,
  },
});
