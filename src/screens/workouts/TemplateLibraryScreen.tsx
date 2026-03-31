import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import {
  workoutTemplateService,
  WorkoutTemplate,
} from "../../services/workoutTemplateService";
import { useFitnessStore } from "../../stores/fitnessStore";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { getCurrentUserId } from "../../services/authUtils";
import { buildDayWorkoutFromTemplate } from "../../utils/workoutBuilders";

interface Props {
  navigation: any;
  route?: any;
}

export default function TemplateLibraryScreen({ navigation }: Props) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const startTemplateSession = useFitnessStore((s) => s.startTemplateSession);

  const loadTemplates = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const result = await workoutTemplateService.getTemplates(userId);
      setTemplates(result);
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleStart = async (template: WorkoutTemplate) => {
    try {
      await workoutTemplateService.incrementUsageCount(
        template.id,
        template.userId,
      );
      const sessionId = await startTemplateSession(template);
      const workout = buildDayWorkoutFromTemplate(template);
      navigation.navigate("WorkoutSession", {
        workout,
        sessionId,
        isExtra: true,
      });
    } catch (err) {
      console.error("Failed to start template workout:", err);
      crossPlatformAlert("Error", "Failed to start workout.");
    }
  };

  const handleDuplicate = async (template: WorkoutTemplate) => {
    try {
      await workoutTemplateService.duplicateTemplate(
        template.id,
        template.userId,
      );
      setMenuOpenId(null);
      await loadTemplates();
    } catch (err) {
      console.error("Failed to duplicate template:", err);
      crossPlatformAlert("Error", "Failed to duplicate template.");
    }
  };

  const handleDelete = (template: WorkoutTemplate) => {
    crossPlatformAlert(
      "Delete Template",
      `Are you sure you want to delete "${template.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await workoutTemplateService.deleteTemplate(
                template.id,
                template.userId,
              );
              setMenuOpenId(null);
              await loadTemplates();
            } catch (err) {
              console.error("Failed to delete template:", err);
              crossPlatformAlert("Error", "Failed to delete template.");
            }
          },
        },
      ],
    );
  };

  const renderTemplate = ({ item }: { item: WorkoutTemplate }) => (
    <View style={styles.card} testID={`template-card-${item.id}`}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Pressable
          onPress={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
          testID={`menu-button-${item.id}`}
        >
          <Text style={styles.menuDots}>...</Text>
        </Pressable>
      </View>

      <View style={styles.badgeRow}>
        {item.targetMuscleGroups.slice(0, 4).map((mg) => (
          <View key={mg} style={styles.badge}>
            <Text style={styles.badgeText}>{mg}</Text>
          </View>
        ))}
      </View>

      {/* GAP-14: Exercise list with View History tap per exercise */}
      <View style={styles.exerciseListContainer}>
        {item.exercises.slice(0, 4).map((ex, idx) => (
          <Pressable
            key={`${ex.exerciseId}-${idx}`}
            style={styles.exerciseRow}
            onPress={() =>
              navigation.navigate('ExerciseHistory', {
                exerciseId: ex.exerciseId,
                exerciseName: ex.name,
              } as any)
            }
            testID={`exercise-history-${item.id}-${idx}`}
          >
            <Text style={styles.exerciseRowName} numberOfLines={1}>
              {ex.name}
            </Text>
            <Text style={styles.exerciseRowMeta}>
              {ex.sets}×{ex.repRange[0] === ex.repRange[1] ? ex.repRange[0] : `${ex.repRange[0]}-${ex.repRange[1]}`} 📊
            </Text>
          </Pressable>
        ))}
        {item.exercises.length > 4 && (
          <Text style={styles.moreExercises}>+{item.exercises.length - 4} more</Text>
        )}
      </View>

      {menuOpenId === item.id && (
        <View style={styles.menu} testID={`menu-${item.id}`}>
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              setMenuOpenId(null);
              navigation.navigate("CreateWorkout", { templateId: item.id });
            }}
            testID={`edit-button-${item.id}`}
          >
            <Text style={styles.menuItemText}>Edit</Text>
          </Pressable>
          <Pressable
            style={styles.menuItem}
            onPress={() => handleDuplicate(item)}
            testID={`duplicate-button-${item.id}`}
          >
            <Text style={styles.menuItemText}>Duplicate</Text>
          </Pressable>
          <Pressable
            style={styles.menuItem}
            onPress={() => handleDelete(item)}
            testID={`delete-button-${item.id}`}
          >
            <Text style={[styles.menuItemText, styles.deleteText]}>Delete</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        style={styles.startButton}
        onPress={() => handleStart(item)}
        testID={`start-button-${item.id}`}
      >
        <Text style={styles.startButtonText}>Start</Text>
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          testID="back-button"
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>My Workouts</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => navigation.navigate("ScheduleBuilder")}
            style={styles.scheduleBtn}
            testID="schedule-builder-button"
          >
            <Text style={styles.scheduleBtnText}>Build Schedule</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("CreateWorkout")}
            testID="add-template-button"
          >
            <Text style={styles.addButton}>+</Text>
          </Pressable>
        </View>
      </View>

      {templates.length === 0 ? (
        <View style={styles.emptyState} testID="empty-state">
          <Text style={styles.emptyText}>
            No workouts saved yet {"\u2014"} tap + to create your first
          </Text>
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          renderItem={renderTemplate}
          contentContainerStyle={styles.list}
          testID="template-list"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A1A2E" },
  loader: { flex: 1, justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A4E",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  scheduleBtn: {
    backgroundColor: "#2A2A4E",
    borderWidth: 1,
    borderColor: "#4CAF50",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scheduleBtnText: { fontSize: 13, color: "#4CAF50", fontWeight: "600" },
  addButton: { fontSize: 28, color: "#4CAF50", fontWeight: "600" },
  list: { padding: 16 },
  card: {
    backgroundColor: "#2A2A4E",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardName: { fontSize: 17, fontWeight: "700", color: "#FFFFFF", flex: 1 },
  menuDots: { fontSize: 20, color: "#AAA", paddingLeft: 12 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  badge: {
    backgroundColor: "#1A1A2E",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, color: "#4CAF50" },
  exerciseCount: { fontSize: 13, color: "#AAA", marginTop: 8 },
  menu: {
    marginTop: 10,
    backgroundColor: "#1A1A2E",
    borderRadius: 8,
    overflow: "hidden",
  },
  menuItem: { paddingVertical: 10, paddingHorizontal: 14 },
  menuItemText: { fontSize: 14, color: "#FFFFFF" },
  deleteText: { color: "#FF5252" },
  startButton: {
    marginTop: 12,
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  startButtonText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: { fontSize: 16, color: "#888", textAlign: "center" },
  backButton: {
    paddingRight: 12,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "600",
  },
  // GAP-14: Exercise list styles
  exerciseListContainer: { marginTop: 10 },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  exerciseRowName: { fontSize: 13, color: "#DDD", flex: 1 },
  exerciseRowMeta: { fontSize: 12, color: "#4CAF50", marginLeft: 8 },
  moreExercises: { fontSize: 12, color: "#666", marginTop: 5, textAlign: "right" },
});
