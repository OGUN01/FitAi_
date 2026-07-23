import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  workoutTemplateService,
  WorkoutTemplate,
} from "../../services/workoutTemplateService";
import { useFitnessStore } from "../../stores/fitnessStore";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { getCurrentUserId } from "../../services/authUtils";
import { buildDayWorkoutFromTemplate } from "../../utils/workoutBuilders";
import {
  AuroraBackground,
  GlassCard,
  GlassHeader,
  AuroraSpinner,
  EmptyState,
  AnimatedPressable,
} from "../../components/ui/aurora";
import { colors, spacing, borderRadius, typography } from "../../theme/aurora-tokens";
import { rp, rf, rw } from "../../utils/responsive";

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
    <GlassCard padding="md" elevation={3} contentStyle={styles.cardContent} style={styles.card}>
      <View testID={`template-card-${item.id}`}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{item.name}</Text>
          <AnimatedPressable
            onPress={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
            testID={`menu-button-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel="Open template menu"
            style={styles.menuBtn}
          >
            <Ionicons name="ellipsis-horizontal" size={rf(20)} color={colors.text.secondary} />
          </AnimatedPressable>
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
            <AnimatedPressable
              key={`${ex.exerciseId}-${idx}`}
              style={styles.exerciseRow}
              onPress={() =>
                navigation.navigate('ExerciseHistory', {
                  exerciseId: ex.exerciseId,
                  exerciseName: ex.name,
                } as never)
              }
              testID={`exercise-history-${item.id}-${idx}`}
              accessibilityRole="button"
              accessibilityLabel={`View ${ex.name} history`}
            >
              <Text style={styles.exerciseRowName} numberOfLines={1}>
                {ex.name}
              </Text>
              <Text style={styles.exerciseRowMeta}>
                {ex.sets}×{ex.repRange[0] === ex.repRange[1] ? ex.repRange[0] : `${ex.repRange[0]}-${ex.repRange[1]}`}{" "}
                <Ionicons name="stats-chart" size={rf(12)} color={colors.primary.DEFAULT} />
              </Text>
            </AnimatedPressable>
          ))}
          {item.exercises.length > 4 && (
            <Text style={styles.moreExercises}>+{item.exercises.length - 4} more</Text>
          )}
        </View>

        {menuOpenId === item.id && (
          <View style={styles.menu} testID={`menu-${item.id}`}>
            <AnimatedPressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpenId(null);
                navigation.navigate("CreateWorkout", { templateId: item.id });
              }}
              testID={`edit-button-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel="Edit template"
            >
              <Ionicons name="create-outline" size={rf(16)} color={colors.text.primary} />
              <Text style={styles.menuItemText}>Edit</Text>
            </AnimatedPressable>
            <AnimatedPressable
              style={styles.menuItem}
              onPress={() => handleDuplicate(item)}
              testID={`duplicate-button-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel="Duplicate template"
            >
              <Ionicons name="copy-outline" size={rf(16)} color={colors.text.primary} />
              <Text style={styles.menuItemText}>Duplicate</Text>
            </AnimatedPressable>
            <AnimatedPressable
              style={styles.menuItem}
              onPress={() => handleDelete(item)}
              testID={`delete-button-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel="Delete template"
            >
              <Ionicons name="trash-outline" size={rf(16)} color={colors.error.DEFAULT} />
              <Text style={[styles.menuItemText, styles.deleteText]}>Delete</Text>
            </AnimatedPressable>
          </View>
        )}

        <AnimatedPressable
          style={styles.startButton}
          onPress={() => handleStart(item)}
          testID={`start-button-${item.id}`}
          accessibilityRole="button"
          accessibilityLabel={`Start ${item.name}`}
        >
          <Text style={styles.startButtonText}>Start</Text>
        </AnimatedPressable>
      </View>
    </GlassCard>
  );

  if (loading) {
    return (
      <AuroraBackground theme="space">
        <SafeAreaView style={styles.flex}>
          <View style={styles.loader}>
            <AuroraSpinner size="lg" />
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground theme="space">
      <SafeAreaView style={styles.flex}>
        <GlassHeader
          title="My Workouts"
          onBack={() => navigation.goBack()}
          rightAction={
            <View style={styles.headerActions}>
              <AnimatedPressable
                onPress={() => navigation.navigate("ScheduleBuilder")}
                style={styles.scheduleBtn}
                testID="schedule-builder-button"
                accessibilityRole="button"
                accessibilityLabel="Build schedule"
              >
                <Text style={styles.scheduleBtnText}>Schedule</Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => navigation.navigate("CreateWorkout")}
                testID="add-template-button"
                accessibilityRole="button"
                accessibilityLabel="Add template"
                style={styles.addButton}
              >
                <Ionicons name="add" size={rf(26)} color={colors.primary.DEFAULT} />
              </AnimatedPressable>
            </View>
          }
        />

        {templates.length === 0 ? (
          <View style={styles.emptyWrap} testID="empty-state">
            <EmptyState
              icon="barbell-outline"
              title="No workouts saved yet"
              subtitle="Tap + to create your first workout template."
              ctaText="Create Workout"
              onCta={() => navigation.navigate("CreateWorkout")}
            />
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
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: rp(spacing.sm) },
  scheduleBtn: {
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xs),
    borderRadius: borderRadius.md,
  },
  scheduleBtnText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.primary.DEFAULT,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  addButton: {
    width: rw(40),
    height: rw(40),
    borderRadius: 999,
    backgroundColor: colors.glass.background,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: rp(spacing.md) },
  card: { marginBottom: rp(spacing.md) },
  cardContent: {},
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardName: {
    fontSize: rf(17),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text.primary,
    flex: 1,
  },
  menuBtn: {
    paddingLeft: rp(spacing.sm),
    paddingVertical: rp(spacing.xs),
    minWidth: rw(44),
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: rp(spacing.xs), marginTop: rp(spacing.sm) },
  badge: {
    backgroundColor: colors.background.DEFAULT,
    borderRadius: borderRadius.xl,
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xxs),
  },
  badgeText: { fontSize: rf(typography.fontSize.micro), color: colors.primary.DEFAULT },
  menu: {
    marginTop: rp(spacing.sm),
    backgroundColor: colors.background.DEFAULT,
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
  },
  menuItemText: { fontSize: rf(typography.fontSize.body), color: colors.text.primary },
  deleteText: { color: colors.error.DEFAULT },
  startButton: {
    marginTop: rp(spacing.md),
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: rp(spacing.md),
    borderRadius: borderRadius.lg,
    alignItems: "center",
  },
  startButtonText: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text.primary,
  },
  emptyWrap: { flex: 1 },
  // GAP-14: Exercise list styles
  exerciseListContainer: { marginTop: rp(spacing.sm) },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: rp(spacing.xs),
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.backgroundDark,
  },
  exerciseRowName: { fontSize: rf(typography.fontSize.caption), color: colors.text.primary, flex: 1 },
  exerciseRowMeta: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.primary.DEFAULT,
    marginLeft: rp(spacing.xs),
  },
  moreExercises: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.text.tertiary,
    marginTop: rp(spacing.xxs),
    textAlign: "right",
  },
});
