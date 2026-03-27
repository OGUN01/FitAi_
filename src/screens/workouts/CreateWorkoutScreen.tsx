import React, { useState, useMemo, useCallback } from "react";
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
import {
  getCuratedExercises,
  CuratedExercise,
} from "../../data/curatedExercises";
import {
  workoutTemplateService,
  TemplateExercise,
  WorkoutTemplate,
} from "../../services/workoutTemplateService";
import { DayWorkout } from "../../types/ai";
import { useFitnessStore } from "../../stores/fitnessStore";
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
  | "core";

function buildDayWorkoutFromTemplate(template: WorkoutTemplate): DayWorkout {
  return {
    id: `template_${template.id}`,
    title: template.name,
    description: `Custom workout: ${template.name}`,
    category: "strength",
    difficulty: "intermediate",
    duration: template.estimatedDurationMinutes || 45,
    estimatedCalories: 0,
    exercises: template.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      name: ex.name,
      sets: ex.sets,
      reps:
        ex.repRange[0] === ex.repRange[1]
          ? ex.repRange[0]
          : `${ex.repRange[0]}-${ex.repRange[1]}`,
      restTime: ex.restSeconds,
      weight: ex.targetWeightKg,
    })),
    equipment: [],
    targetMuscleGroups: template.targetMuscleGroups,
    icon: "dumbbell",
    tags: template.targetMuscleGroups,
    isPersonalized: true,
    aiGenerated: false,
    createdAt: template.createdAt,
    dayOfWeek: new Date()
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase(),
    subCategory: "custom",
    intensityLevel: "moderate",
    warmUp: [],
    coolDown: [],
    progressionNotes: [],
    safetyConsiderations: [],
    expectedBenefits: [],
    isExtra: true,
  };
}

const CATEGORY_TABS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "chest", label: "Chest" },
  { key: "back", label: "Back" },
  { key: "shoulders", label: "Shoulders" },
  { key: "arms", label: "Arms" },
  { key: "legs", label: "Legs" },
  { key: "core", label: "Core" },
];

export default function CreateWorkoutScreen({ navigation }: Props) {
  const [workoutName, setWorkoutName] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("all");
  const [addedExercises, setAddedExercises] = useState<TemplateExercise[]>([]);
  const [saving, setSaving] = useState(false);

  const startTemplateSession = useFitnessStore((s) => s.startTemplateSession);

  const availableExercises = useMemo(() => {
    const all = getCuratedExercises(
      ["body weight", "dumbbell", "barbell", "cable", "machine", "band"],
      "any",
    );
    if (selectedCategory === "all") return all;
    return all.filter((ex) => ex.category === selectedCategory);
  }, [selectedCategory]);

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

  const updateExerciseField = useCallback(
    (index: number, field: keyof TemplateExercise, value: number) => {
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
            const curated = availableExercises.find(
              (c) => c.id === ex.exerciseId,
            );
            return curated?.muscleGroups ?? [];
          }),
        ),
      ];

      await workoutTemplateService.createTemplate(userId, {
        name: workoutName.trim(),
        exercises: addedExercises,
        targetMuscleGroups: muscleGroups,
        estimatedDurationMinutes: addedExercises.length * 8,
        isPublic: false,
      });

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

    try {
      const template = {
        id: `temp_${Date.now()}`,
        userId: getCurrentUserId() || "",
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
        <Text style={styles.headerTitle}>Create Workout</Text>
        <Pressable
          onPress={handleSaveTemplate}
          disabled={saving}
          testID="save-button"
        >
          <Text style={[styles.headerButton, styles.saveButton]}>
            {saving ? "Saving..." : "Save"}
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
          <ScrollView style={styles.addedList} nestedScrollEnabled>
            {addedExercises.map((ex, index) => (
              <View key={`${ex.exerciseId}-${index}`} style={styles.addedRow}>
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
  addedList: { maxHeight: 160 },
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
