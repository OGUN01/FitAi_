import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, interpolate } from "react-native-reanimated";
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

export default function CreateWorkoutScreen({ navigation, route }: Props) {
  const templateId = route?.params?.templateId as string | undefined;
  const [workoutName, setWorkoutName] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("all");
  const [addedExercises, setAddedExercises] = useState<TemplateExercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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

  // Load existing template when editing
  useEffect(() => {
    if (!templateId) return;
    let cancelled = false;

    (async () => {
      try {
        const userId = getCurrentUserId();
        if (!userId) return;

        const templates = await workoutTemplateService.getTemplates(userId);
        const existing = templates.find((t) => t.id === templateId);
        if (existing && !cancelled) {
          setWorkoutName(existing.name);
          setAddedExercises(existing.exercises);
          setIsEditing(true);
        }
      } catch (err) {
        console.error("Failed to load template for editing:", err);
      }
    })();

    return () => { cancelled = true; };
  }, [templateId]);

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

  const updateExerciseField = useCallback(
    (index: number, field: keyof TemplateExercise, value: number | [number, number]) => {
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

      if (isEditing && templateId) {
        // Update existing template
        await workoutTemplateService.updateTemplate(templateId, userId, {
          name: workoutName.trim(),
          exercises: addedExercises,
          targetMuscleGroups: muscleGroups,
          estimatedDurationMinutes: addedExercises.length * 8,
        });
      } else {
        // Create new template
        await workoutTemplateService.createTemplate(userId, {
          name: workoutName.trim(),
          exercises: addedExercises,
          targetMuscleGroups: muscleGroups,
          estimatedDurationMinutes: addedExercises.length * 8,
          isPublic: false,
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
      <Pressable
        style={styles.addButton}
        onPress={() => addExercise(item)}
        testID={`add-exercise-${item.id}`}
      >
        <Text style={styles.addButtonText}>+</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} testID="back-button">
          <Text style={styles.headerButton}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{isEditing ? "Edit Workout" : "Create Workout"}</Text>
        <Pressable
          onPress={handleSaveTemplate}
          disabled={saving}
          testID="save-button"
        >
          <Text style={[styles.headerButton, styles.saveButton]}>
            {saving ? "Saving..." : isEditing ? "Update" : "Save"}
          </Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.nameInput}
        placeholder="Workout Name"
        placeholderTextColor="#888"
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
                          parseFloat(v) || 0,
                        )
                      }
                      placeholder="0"
                      placeholderTextColor="#555"
                      testID={`weight-input-${index}`}
                    />
                  </View>
                </View>
                <View style={styles.addedActions}>
                  <Pressable
                    onPress={() => moveExercise(index, "up")}
                    testID={`move-up-${index}`}
                  >
                    <Text style={styles.arrowText}>▲</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => moveExercise(index, "down")}
                    testID={`move-down-${index}`}
                  >
                    <Text style={styles.arrowText}>▼</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => removeExercise(index)}
                    testID={`remove-exercise-${index}`}
                  >
                    <Text style={styles.removeText}>✕</Text>
                  </Pressable>
                </View>
              </View>
              </DraggableRow>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.categoryTabs}>
        {CATEGORY_TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[
              styles.tab,
              selectedCategory === tab.key && styles.tabActive,
            ]}
            onPress={() => setSelectedCategory(tab.key)}
            testID={`category-tab-${tab.key}`}
          >
            <Text
              style={[
                styles.tabText,
                selectedCategory === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={availableExercises}
        keyExtractor={(item) => item.id}
        renderItem={renderExercisePickerItem}
        style={styles.exerciseList}
        testID="exercise-picker-list"
      />

      <View style={styles.bottomButtons}>
        <Pressable
          style={styles.startButton}
          onPress={handleStartNow}
          testID="start-now-button"
        >
          <Text style={styles.startButtonText}>Start Now</Text>
        </Pressable>
        <Pressable
          style={styles.saveTemplateButton}
          onPress={handleSaveTemplate}
          disabled={saving}
          testID="save-template-button"
        >
          <Text style={styles.saveTemplateText}>Save Template</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A1A2E" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A4E",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  headerButton: { fontSize: 16, color: "#4CAF50" },
  saveButton: { fontWeight: "600" },
  nameInput: {
    backgroundColor: "#2A2A4E",
    color: "#FFFFFF",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
  },
  addedSection: { maxHeight: 200, marginTop: 12, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#AAA",
    marginBottom: 8,
  },
  dragHint: {
    fontSize: 11,
    color: "#666",
    marginBottom: 6,
    fontStyle: "italic",
  },
  addedList: { maxHeight: 200 },
  addedRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A2A4E",
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  addedInfo: { flex: 1 },
  addedName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  inputLabel: { fontSize: 12, color: "#AAA" },
  smallInput: {
    backgroundColor: "#1A1A2E",
    color: "#FFFFFF",
    width: 44,
    height: 28,
    borderRadius: 6,
    textAlign: "center",
    fontSize: 13,
  },
  addedActions: {
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    marginLeft: 8,
  },
  arrowText: { fontSize: 14, color: "#4CAF50", paddingVertical: 2 },
  removeText: { fontSize: 16, color: "#FF5252", paddingVertical: 2 },
  categoryTabs: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 6,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#2A2A4E",
  },
  tabActive: { backgroundColor: "#4CAF50" },
  tabText: { fontSize: 13, color: "#AAA" },
  tabTextActive: { color: "#FFFFFF", fontWeight: "600" },
  exerciseList: { flex: 1, paddingHorizontal: 16 },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A4E",
  },
  pickerInfo: { flex: 1 },
  pickerName: { fontSize: 15, color: "#FFFFFF", fontWeight: "500" },
  pickerMuscles: { fontSize: 12, color: "#888", marginTop: 2 },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "700",
    lineHeight: 22,
  },
  bottomButtons: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#2A2A4E",
  },
  startButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  startButtonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  saveTemplateButton: {
    flex: 1,
    backgroundColor: "#2A2A4E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  saveTemplateText: { fontSize: 16, fontWeight: "700", color: "#4CAF50" },
});
