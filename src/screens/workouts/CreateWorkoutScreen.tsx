import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, FadeInUp, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
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
  AuroraSpinner,
  AnimatedPressable,
  GlassHeader,
} from "../../components/ui/aurora";
import {
  flatColors as colors,
  spacing,
  borderRadius,
} from "../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../theme/fonts";
import { hexToRgba } from "../../utils/colors";
import { rf, rw, rh, rp } from "../../utils/responsive";

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
  const [signInRequired, setSignInRequired] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");

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
      // Distinct from a fetch failure — the real problem is an expired/missing
      // session, so the user needs to sign in again rather than retry.
      setSignInRequired(true);
      setLoadingTemplate(false);
      return;
    }
    setSignInRequired(false);
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
    let list =
      selectedCategory === "all"
        ? all
        : all.filter((ex) => ex.category === selectedCategory);
    const q = exerciseSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((ex) => ex.name.toLowerCase().includes(q));
    }
    return list;
  }, [selectedCategory, userEquipment, userLocation, exerciseSearch]);

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
        // Update existing template. UpdateInput accepts the full community
        // metadata (category/difficulty/tags) — pass it through when sharing
        // so edit-mode inputs actually persist.
        if (shareToCommunity) {
          haptics.light();
        }
        await workoutTemplateService.updateTemplate(templateId, userId, {
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

  const renderExercisePickerItem = ({ item }: { item: CuratedExercise }) => {
    const isAdded = addedExercises.some((ex) => ex.exerciseId === item.id);
    return (
      <AnimatedPressable
        onPress={() => addExercise(item)}
        testID={`add-exercise-${item.id}`}
        accessibilityLabel={`Add ${item.name}`}
        scaleValue={0.98}
        springConfig="smooth"
        hapticType="light"
        style={styles.pickerRow}
      >
        <View style={styles.pickerInfo}>
          <Text style={styles.pickerName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.pickerMuscles} numberOfLines={1}>
            {item.muscleGroups.slice(0, 3).join(", ")}
          </Text>
        </View>
        <View
          style={[
            styles.pickerCircle,
            isAdded ? styles.pickerCircleSelected : styles.pickerCircleUnselected,
          ]}
        >
          <Ionicons
            name={isAdded ? "checkmark" : "add"}
            size={rf(16)}
            color={isAdded ? colors.white : colors.primary}
          />
        </View>
      </AnimatedPressable>
    );
  };

  // Edit-hydration loading state — only renders when templateId was set (edit
  // mode). The create-new path has loadingTemplate=false from initialization.
  if (loadingTemplate) {
    return (
      <AuroraBackground theme="space" animated intensity={0.3}>
        <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
          <GlassHeader
            eyebrow={isEditing ? "EDIT WORKOUT" : "NEW WORKOUT"}
            onBack={() => navigation.goBack()}
          />
          <View style={styles.loader}>
            <AuroraSpinner size="lg" />
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  // Expired/missing session while hydrating an edit — distinct from a plain
  // fetch failure so the user knows to sign in again rather than retry.
  if (signInRequired) {
    return (
      <AuroraBackground theme="space" animated intensity={0.3}>
        <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
          <GlassHeader eyebrow="EDIT WORKOUT" onBack={() => navigation.goBack()} />
          <View
            style={styles.emptyWrap}
            testID="create-workout-sign-in-required"
          >
            <EmptyState
              icon="lock-closed-outline"
              iconColor={colors.warning}
              title="Sign in required"
              subtitle="Your session has expired. Sign in again to edit this workout."
              ctaText="Go Back"
              onCta={() => navigation.goBack()}
            />
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
      <AuroraBackground theme="space" animated intensity={0.3}>
        <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
          <GlassHeader eyebrow="EDIT WORKOUT" onBack={() => navigation.goBack()} />
          <View
            style={styles.emptyWrap}
            testID="create-workout-load-error"
          >
            <EmptyState
              icon="cloud-offline-outline"
              iconColor={colors.error}
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
    <AuroraBackground theme="space" animated intensity={0.3}>
      <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Shared Aurora header — eyebrow-only (no title/right action here;
              Save/Update is a separate sticky bottom bar). */}
          <GlassHeader
            eyebrow={isEditing ? "EDIT WORKOUT" : "NEW WORKOUT"}
            onBack={() => navigation.goBack()}
          />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View entering={FadeInUp.delay(80).duration(450)}>
              <Text style={styles.title}>
                {isEditing ? "Edit workout" : "Create workout"}
              </Text>
              <Text style={styles.subtitle}>
                Add exercises, tune sets & reps, then save or start.
              </Text>
            </Animated.View>

            {/* Workout name input — rounded 12, tinted bg, no border */}
            <TextInput
              style={styles.nameInput}
              placeholder="Workout name"
              placeholderTextColor={colors.textTertiary}
              value={workoutName}
              onChangeText={setWorkoutName}
              testID="workout-name-input"
            />

            {/* Added exercises — flat rows, hairline separators */}
            {addedExercises.length > 0 && (
              <View style={styles.addedSection}>
                <View style={styles.addedHeader}>
                  <Text style={styles.sectionTitle}>
                    Added ({addedExercises.length})
                  </Text>
                  {addedExercises.length > 1 && (
                    <Text style={styles.dragHint}>Hold to drag & reorder</Text>
                  )}
                </View>
                <View style={styles.addedList}>
                  {addedExercises.map((ex, index) => (
                    <DraggableRow
                      key={`${ex.exerciseId}-${index}`}
                      index={index}
                      totalCount={addedExercises.length}
                      onReorder={handleDragReorder}
                    >
                      <View
                        style={[
                          styles.addedRow,
                          index < addedExercises.length - 1 &&
                            styles.addedRowSeparator,
                        ]}
                      >
                        <View style={styles.addedInfo}>
                          <Text style={styles.addedName} numberOfLines={1}>
                            {ex.name}
                          </Text>
                          <View style={styles.inputRow}>
                            <Text style={styles.inputLabel}>Sets</Text>
                            <TextInput
                              style={styles.smallInput}
                              keyboardType="numeric"
                              value={String(ex.sets)}
                              onChangeText={(v) =>
                                updateExerciseField(index, "sets", parseInt(v) || 1)
                              }
                              testID={`sets-input-${index}`}
                            />
                            <Text style={styles.inputLabel}>Reps</Text>
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
                            <Text style={styles.inputLabel}>Rest</Text>
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
                            {/* Unit suffix — without it "REST 60" is ambiguous (sec vs min) */}
                            <Text style={styles.inputLabel}>s</Text>
                            <Text style={styles.inputLabel}>kg</Text>
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
                              placeholderTextColor={colors.textTertiary}
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
                            <Ionicons name="chevron-up" size={rf(16)} color={colors.primary} />
                          </AnimatedPressable>
                          <AnimatedPressable
                            onPress={() => moveExercise(index, "down")}
                            testID={`move-down-${index}`}
                            accessibilityLabel="Move exercise down"
                            style={styles.iconBtn}
                          >
                            <Ionicons name="chevron-down" size={rf(16)} color={colors.primary} />
                          </AnimatedPressable>
                          <AnimatedPressable
                            onPress={() => removeExercise(index)}
                            testID={`remove-exercise-${index}`}
                            accessibilityLabel="Remove exercise"
                            style={styles.iconBtn}
                          >
                            <Ionicons name="close" size={rf(16)} color={colors.error} />
                          </AnimatedPressable>
                        </View>
                      </View>
                    </DraggableRow>
                  ))}
                </View>
              </View>
            )}

            {/* Exercise search — filters availableExercises by name */}
            <View style={styles.exerciseSearchRow}>
              <Ionicons
                name="search-outline"
                size={rf(16)}
                color={colors.textTertiary}
                style={styles.exerciseSearchIcon}
              />
              <TextInput
                style={styles.exerciseSearchInput}
                placeholder="Search exercises..."
                placeholderTextColor={colors.textTertiary}
                value={exerciseSearch}
                onChangeText={setExerciseSearch}
                autoCapitalize="none"
                returnKeyType="search"
                testID="exercise-picker-search-input"
              />
              {exerciseSearch.length > 0 ? (
                <AnimatedPressable
                  onPress={() => setExerciseSearch("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear exercise search"
                  scaleValue={0.9}
                  springConfig="snappy"
                  hapticType="light"
                >
                  <Ionicons
                    name="close-circle"
                    size={rf(16)}
                    color={colors.textTertiary}
                  />
                </AnimatedPressable>
              ) : null}
            </View>

            {/* Category filter — flat pill chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryTabs}
            >
              {CATEGORY_TABS.map((tab) => {
                const active = selectedCategory === tab.key;
                return (
                  <AnimatedPressable
                    key={tab.key}
                    style={[styles.tab, active && styles.tabActive]}
                    onPress={() => setSelectedCategory(tab.key)}
                    testID={`category-tab-${tab.key}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${tab.label}`}
                    scaleValue={0.97}
                    springConfig="smooth"
                    hapticType="light"
                  >
                    <Text
                      style={[styles.tabText, active && styles.tabTextActive]}
                    >
                      {tab.label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>

            {/* Exercise picker — flat rows with hairline separators */}
            <View style={styles.pickerListWrap}>
              <FlatList
                data={availableExercises}
                keyExtractor={(item) => item.id}
                renderItem={renderExercisePickerItem}
                style={styles.exerciseList}
                testID="exercise-picker-list"
                scrollEnabled={false}
                ListEmptyComponent={
                  <Text style={styles.pickerEmptyText}>
                    {exerciseSearch.trim()
                      ? `No exercises match "${exerciseSearch.trim()}"`
                      : "No exercises found"}
                  </Text>
                }
              />
            </View>

            {/* ── Share to Community toggle (Phase 10) ─────────────────────────── */}
            <View style={styles.shareToggleWrap}>
              <View style={styles.shareToggleRow}>
                <View style={styles.shareToggleInfo}>
                  <View
                    style={[
                      styles.iconDisc,
                      { backgroundColor: hexToRgba(colors.primary, 0.12) },
                    ]}
                  >
                    <Ionicons
                      name="people-outline"
                      size={rf(18)}
                      color={colors.primary}
                    />
                  </View>
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
                    false: colors.backgroundTertiary,
                    true: colors.primary,
                  }}
                  thumbColor={colors.white}
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
                          scaleValue={0.97}
                          springConfig="smooth"
                          hapticType="light"
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
                          scaleValue={0.97}
                          springConfig="smooth"
                          hapticType="light"
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
                    placeholderTextColor={colors.textTertiary}
                    maxLength={120}
                    testID="share-tags-input"
                  />
                </Animated.View>
              ) : null}
            </View>

            {/* Bottom spacer so content isn't hidden behind sticky CTA */}
            <View style={styles.footerSpacer} />
          </ScrollView>

          {/* Sticky bottom CTA — gradient primary + ghost secondary */}
          <View style={styles.footer}>
            <AnimatedPressable
              style={styles.secondaryCta}
              onPress={handleStartNow}
              testID="start-now-button"
              accessibilityRole="button"
              accessibilityLabel="Start workout now"
              scaleValue={0.97}
              springConfig="smooth"
              hapticType="medium"
            >
              <Text style={styles.secondaryCtaText}>Start Now</Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={handleSaveTemplate}
              disabled={saving}
              testID="save-template-button"
              accessibilityRole="button"
              accessibilityLabel="Save template"
              accessibilityState={{ disabled: saving }}
              scaleValue={0.97}
              hapticType="medium"
              style={[styles.primaryCta, saving && styles.ctaDisabled]}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryCtaGradient}
              >
                {saving ? (
                  <AuroraSpinner size="sm" customSize={rf(16)} theme="white" />
                ) : (
                  <>
                    <Text style={styles.primaryCtaText}>
                      {isEditing ? "Update" : "Save Template"}
                    </Text>
                    <Ionicons name="checkmark" size={rf(18)} color={colors.white} />
                  </>
                )}
              </LinearGradient>
            </AnimatedPressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: rp(spacing.lg),
    paddingBottom: rp(spacing.md),
  },
  title: {
    fontSize: rf(28),
    fontFamily: FONT_FAMILY.extrabold,
    fontWeight: "800",
    color: colors.text,
    lineHeight: rf(34),
    letterSpacing: -0.3,
    marginBottom: rp(spacing.sm),
  },
  subtitle: {
    fontSize: rf(14),
    color: colors.textSecondary,
    lineHeight: rf(20),
    marginBottom: rp(spacing.lg),
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
  },
  iconDisc: {
    width: rw(40),
    height: rw(40),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  // ── Name input ──
  nameInput: {
    backgroundColor: hexToRgba(colors.white, 0.06),
    color: colors.text,
    fontSize: rf(15),
    fontWeight: "600",
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.md),
    borderRadius: borderRadius.lg,
    marginBottom: rp(spacing.md),
  },
  // ── Added section ──
  addedSection: {
    marginBottom: rp(spacing.md),
  },
  addedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: rp(spacing.sm),
  },
  sectionTitle: {
    fontSize: rf(13),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  dragHint: {
    fontSize: rf(11),
    color: colors.textTertiary,
    fontStyle: "italic",
  },
  addedList: {
    borderTopWidth: 1,
    borderTopColor: hexToRgba(colors.white, 0.06),
  },
  addedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rp(spacing.md),
    gap: rp(spacing.sm),
    minHeight: 44,
  },
  addedRowSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: hexToRgba(colors.white, 0.06),
  },
  addedInfo: { flex: 1, minWidth: 0 },
  addedName: {
    fontSize: rf(15),
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
    color: colors.text,
    marginBottom: rp(spacing.xs),
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xxs),
    flexWrap: "wrap",
  },
  inputLabel: {
    fontSize: rf(11),
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  smallInput: {
    backgroundColor: hexToRgba(colors.white, 0.06),
    color: colors.text,
    width: rw(38),
    height: rh(32),
    borderRadius: borderRadius.lg,
    textAlign: "center",
    fontSize: rf(13),
    fontWeight: "600",
  },
  addedActions: {
    flexDirection: "column",
    alignItems: "center",
    gap: rp(spacing.xxs),
  },
  iconBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: Math.max(rw(32), 44),
    height: Math.max(rw(32), 44),
  },
  // ── Exercise search ──
  exerciseSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    backgroundColor: hexToRgba(colors.white, 0.06),
    borderRadius: borderRadius.lg,
    paddingHorizontal: rp(spacing.md),
    minHeight: 44,
    marginBottom: rp(spacing.sm),
  },
  exerciseSearchIcon: {
    flexShrink: 0,
  },
  exerciseSearchInput: {
    flex: 1,
    fontSize: rf(14),
    color: colors.text,
    paddingVertical: rp(spacing.sm),
  },
  pickerEmptyText: {
    fontSize: rf(13),
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: rp(spacing.xl),
  },
  // ── Category tabs ──
  categoryTabs: {
    flexDirection: "row",
    gap: rp(spacing.xs),
    paddingVertical: rp(spacing.sm),
    marginBottom: rp(spacing.sm),
  },
  tab: {
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.white, 0.06),
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: {
    fontSize: rf(13),
    color: colors.textSecondary,
    fontWeight: "600",
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  // ── Exercise picker ──
  pickerListWrap: {
    borderTopWidth: 1,
    borderTopColor: hexToRgba(colors.white, 0.06),
  },
  exerciseList: { flex: 1 },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.md),
    paddingVertical: rp(spacing.md),
    borderBottomWidth: 1,
    borderBottomColor: hexToRgba(colors.white, 0.06),
    minHeight: 44,
  },
  pickerInfo: { flex: 1, minWidth: 0 },
  pickerName: {
    fontSize: rf(15),
    color: colors.text,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
  },
  pickerMuscles: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  pickerCircle: {
    width: rw(28),
    height: rw(28),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: rp(spacing.xs),
  },
  pickerCircleSelected: {
    backgroundColor: colors.primary,
  },
  pickerCircleUnselected: {
    borderWidth: 1,
    borderColor: hexToRgba(colors.white, 0.25),
  },
  // ── Share-to-Community ──
  shareToggleWrap: {
    marginTop: rp(spacing.md),
    borderTopWidth: 1,
    borderTopColor: hexToRgba(colors.white, 0.06),
    paddingTop: rp(spacing.md),
  },
  shareToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rp(spacing.sm),
  },
  shareToggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.md),
    flex: 1,
    paddingRight: rp(spacing.sm),
  },
  shareToggleText: {
    flex: 1,
    gap: rp(2),
  },
  shareToggleTitle: {
    fontSize: rf(15),
    fontWeight: "600",
    color: colors.text,
  },
  shareToggleSubtitle: {
    fontSize: rf(12),
    color: colors.textSecondary,
    lineHeight: rf(18),
  },
  shareFields: {
    marginTop: rp(spacing.md),
    gap: rp(spacing.xs),
  },
  shareFieldLabel: {
    fontSize: rf(13),
    fontWeight: "600",
    color: colors.text,
    marginTop: rp(spacing.xs),
  },
  required: {
    color: colors.primary,
  },
  difficultyRow: {
    flexDirection: "row",
    gap: rp(spacing.xs),
    flexWrap: "wrap",
  },
  difficultyChip: {
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.white, 0.06),
  },
  difficultyChipActive: {
    backgroundColor: colors.primary,
  },
  difficultyChipText: {
    fontSize: rf(13),
    color: colors.textSecondary,
    fontWeight: "600",
  },
  difficultyChipTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  categoryChipsRow: {
    flexDirection: "row",
    gap: rp(spacing.xs),
    flexWrap: "wrap",
  },
  categoryChip: {
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.xs),
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.white, 0.06),
  },
  categoryChipActive: {
    backgroundColor: hexToRgba(colors.secondary, 0.15),
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  categoryChipText: {
    fontSize: rf(13),
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  categoryChipTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  tagsInput: {
    backgroundColor: hexToRgba(colors.white, 0.06),
    color: colors.text,
    fontSize: rf(14),
    borderRadius: borderRadius.lg,
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
  },
  // ── Footer ──
  footerSpacer: {
    height: rp(100),
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: rp(spacing.lg),
    paddingTop: rp(spacing.sm),
    paddingBottom: rp(spacing.sm),
    gap: rp(spacing.md),
  },
  primaryCta: {
    flex: 1,
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    minHeight: 52,
  },
  primaryCtaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(spacing.sm),
    paddingVertical: rp(spacing.md),
    paddingHorizontal: rp(spacing.xl),
    minHeight: 52,
  },
  primaryCtaText: {
    fontSize: rf(15),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
    color: colors.white,
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  secondaryCta: {
    paddingHorizontal: rp(spacing.lg),
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    borderRadius: borderRadius.xl,
    backgroundColor: hexToRgba(colors.white, 0.06),
  },
  secondaryCtaText: {
    fontSize: rf(15),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
    color: colors.text,
  },
});
