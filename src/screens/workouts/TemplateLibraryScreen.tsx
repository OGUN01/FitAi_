import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  lazy,
  Suspense,
} from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Pressable,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import {
  workoutTemplateService,
  type WorkoutTemplate,
} from "../../services/workoutTemplateService";
import { useFitnessStore } from "../../stores/fitnessStore";
import { useProfileStore } from "../../stores/profileStore";
import { useSubscriptionStore } from "../../stores/subscriptionStore";
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
import { CommunityTemplatesTab } from "../../components/fitness/builder/CommunityTemplatesTab";
// Lazy-load TemplateDetailSheet so its Skia dependency (@shopify/react-native-skia,
// pulled in via MuscleBalanceRadar) is only evaluated when the user actually
// opens a template preview. This keeps the screen's module-eval cost low and
// avoids pulling Skia into test environments that don't mock it.
const TemplateDetailSheet = lazy(() =>
  import("../../components/fitness/builder/TemplateDetailSheet").then(
    (m) => ({ default: m.default }),
  ),
);
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../theme/aurora-tokens";
import { animations } from "../../theme/animations";
import { haptics } from "../../utils/haptics";
import { rf, rp, rw } from "../../utils/responsive";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface Props {
  navigation: any;
  route?: any;
}

type TabKey =
  | "recent"
  | "pinned"
  | "mine"
  | "community"
  | "ai"
  | "collections";

interface TabDef {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TABS: TabDef[] = [
  { key: "recent", label: "Recent", icon: "time-outline" },
  { key: "pinned", label: "Pinned", icon: "pin-outline" },
  { key: "mine", label: "My Templates", icon: "person-outline" },
  { key: "community", label: "Community", icon: "people-outline" },
  { key: "ai", label: "AI Generated", icon: "sparkles-outline" },
  { key: "collections", label: "Collections", icon: "albums-outline" },
];

interface CollectionChip {
  id: string;
  label: string;
  category: string;
}

const COLLECTION_CHIPS: CollectionChip[] = [
  { id: "upper-lower", label: "Upper-Lower", category: "upper-lower" },
  { id: "ppl", label: "PPL", category: "ppl" },
  { id: "strength", label: "Strength", category: "strength" },
  { id: "powerlifting", label: "Powerlifting", category: "powerlifting" },
  { id: "athlete", label: "Athlete", category: "athlete" },
  { id: "fat-loss", label: "Fat Loss", category: "fat-loss" },
  { id: "home", label: "Home", category: "home" },
  { id: "travel", label: "Travel", category: "travel" },
];

/** Narrow a typography.fontWeight token to RN's literal fontWeight union. */
const fw = (w: string): TextStyle["fontWeight"] =>
  w as TextStyle["fontWeight"];

const DIFFICULTY_TINT: Record<
  NonNullable<WorkoutTemplate["difficulty"]>,
  string
> = {
  beginner: colors.success.DEFAULT,
  intermediate: colors.secondary.DEFAULT,
  advanced: colors.error.DEFAULT,
};

const DIFFICULTY_LABEL: Record<
  NonNullable<WorkoutTemplate["difficulty"]>,
  string
> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function TemplateLibraryScreen({ navigation }: Props) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("mine");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [multiSelect, setMultiSelect] = useState(false);
  const [detailTemplate, setDetailTemplate] = useState<WorkoutTemplate | null>(
    null,
  );
  const [detailVisible, setDetailVisible] = useState(false);

  const startTemplateSession = useFitnessStore((s) => s.startTemplateSession);
  // Weight SSOT: profileStore.bodyAnalysis.current_weight_kg (mirrors
  // WorkoutSessionScreen's selector — see that screen for the canonical read).
  const bodyAnalysis = useProfileStore((s) => s.bodyAnalysis);
  const isPremium = useSubscriptionStore((s) => s.isPremium());

  const userWeightKg = bodyAnalysis?.current_weight_kg ?? null;

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

  // ── Derived: filtered templates for the current tab ──────────────────────
  const filteredTemplates = useMemo(() => {
    let list = templates;
    if (activeTab === "recent") {
      list = [...templates].sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0));
    } else if (activeTab === "pinned") {
      // v1: no pinned store — treat most-used (usageCount >= 1) as pinned.
      list = templates.filter((t) => (t.usageCount ?? 0) > 0);
    } else if (activeTab === "collections") {
      if (activeCollection) {
        list = templates.filter((t) => t.category === activeCollection);
      } else {
        list = [];
      }
    }
    // "mine" tab = all user templates (no extra filter)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.targetMuscleGroups.some((m) => m.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [templates, activeTab, activeCollection, search]);

  const hasContent = filteredTemplates.length > 0;

  // ── CRUD handlers (preserved from the original screen) ─────────────────────
  const handleStart = useCallback(
    async (template: WorkoutTemplate) => {
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
    },
    [startTemplateSession, navigation],
  );

  const handleDuplicate = useCallback(
    async (template: WorkoutTemplate) => {
      try {
        await workoutTemplateService.duplicateTemplate(
          template.id,
          template.userId,
        );
        setMenuOpenId(null);
        await loadTemplates();
        haptics.success();
      } catch (err) {
        console.error("Failed to duplicate template:", err);
        crossPlatformAlert("Error", "Failed to duplicate template.");
      }
    },
    [loadTemplates],
  );

  const handleDelete = useCallback(
    (template: WorkoutTemplate) => {
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
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  next.delete(template.id);
                  return next;
                });
                await loadTemplates();
                haptics.delete();
              } catch (err) {
                console.error("Failed to delete template:", err);
                crossPlatformAlert("Error", "Failed to delete template.");
              }
            },
          },
        ],
      );
    },
    [loadTemplates],
  );

  const handleEdit = useCallback(
    (template: WorkoutTemplate) => {
      setMenuOpenId(null);
      navigation.navigate("CreateWorkout", { templateId: template.id });
    },
    [navigation],
  );

  const handleOpenDetail = useCallback((template: WorkoutTemplate) => {
    haptics.light();
    setDetailTemplate(template);
    setDetailVisible(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false);
  }, []);

  const handleUseInSchedule = useCallback(
    (template: WorkoutTemplate) => {
      setDetailVisible(false);
      // v1: minimal wiring — navigate to WeeklyBuilder. Phase 9 will pre-load
      // the template into the builder draft (buildDayWorkoutFromTemplate +
      // hydrateFromPlan).
      navigation.navigate("WeeklyBuilder");
      void template;
    },
    [navigation],
  );

  // ── Tab / view switching ───────────────────────────────────────────────────
  const handleTabChange = useCallback((key: TabKey) => {
    haptics.selection();
    setActiveTab(key);
    setActiveCollection(null);
    setMultiSelect(false);
    setSelectedIds(new Set());
    setMenuOpenId(null);
  }, []);

  const handleViewToggle = useCallback(() => {
    haptics.selection();
    setViewMode((prev) => (prev === "grid" ? "list" : "grid"));
  }, []);

  const handleCollectionChip = useCallback((chip: CollectionChip) => {
    haptics.selection();
    setActiveCollection((prev) => (prev === chip.category ? null : chip.category));
  }, []);

  // ── Multi-select ───────────────────────────────────────────────────────────
  const handleLongPress = useCallback((template: WorkoutTemplate) => {
    haptics.longPress();
    setMultiSelect(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(template.id);
      return next;
    });
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    haptics.selection();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleExitMultiSelect = useCallback(() => {
    haptics.light();
    setMultiSelect(false);
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    crossPlatformAlert(
      "Delete Templates",
      `Delete ${selectedIds.size} selected template${selectedIds.size > 1 ? "s" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const ids = Array.from(selectedIds);
            const userId = getCurrentUserId();
            if (!userId) return;
            let failures = 0;
            for (const id of ids) {
              try {
                await workoutTemplateService.deleteTemplate(id, userId);
              } catch (err) {
                failures += 1;
                console.error("Failed to delete template:", err);
              }
            }
            handleExitMultiSelect();
            await loadTemplates();
            if (failures > 0) {
              crossPlatformAlert(
                "Partial failure",
                `${failures} template(s) could not be deleted.`,
              );
            } else {
              haptics.delete();
            }
          },
        },
      ],
    );
  }, [selectedIds, handleExitMultiSelect, loadTemplates]);

  const handleBulkShare = useCallback(() => {
    if (selectedIds.size === 0) return;
    haptics.warning();
    // v1 placeholder — deep-link sharing wired in Phase 10.
    console.error(
      "[TemplateLibraryScreen] bulk share not wired (Phase 10) — count:",
      selectedIds.size,
    );
  }, [selectedIds]);

  // ── Loading ────────────────────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AuroraBackground theme="space">
      <SafeAreaView style={styles.flex}>
        <GlassHeader
          title="Template Library"
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

        {/* Search bar + view toggle */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Ionicons
              name="search-outline"
              size={rf(18)}
              color={colors.text.tertiary}
              style={styles.searchIcon}
            />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search templates"
              placeholderTextColor={colors.text.tertiary}
              style={styles.searchInput}
              accessibilityLabel="Search templates"
              testID="template-search-input"
            />
            {search.length > 0 ? (
              <Pressable
                onPress={() => {
                  haptics.light();
                  setSearch("");
                }}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Ionicons
                  name="close-circle"
                  size={rf(18)}
                  color={colors.text.tertiary}
                />
              </Pressable>
            ) : null}
          </View>

          <AnimatedPressable
            onPress={handleViewToggle}
            style={styles.viewToggle}
            testID="view-toggle-button"
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${viewMode === "grid" ? "list" : "grid"} view`}
          >
            <Ionicons
              name={viewMode === "grid" ? "list-outline" : "grid-outline"}
              size={rf(20)}
              color={colors.text.secondary}
            />
          </AnimatedPressable>
        </View>

        {/* Folder tabs */}
        <View style={styles.tabsRow}>
          <FlatList
            horizontal
            data={TABS}
            keyExtractor={(t) => t.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
            renderItem={({ item: tab }) => {
              const active = activeTab === tab.key;
              const locked =
                tab.key === "community" && !isPremium;
              return (
                <AnimatedPressable
                  onPress={() => handleTabChange(tab.key)}
                  style={[
                    styles.tabChip,
                    active && styles.tabChipActive,
                    locked && styles.tabChipLocked,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={tab.label}
                  accessibilityState={{ selected: active }}
                  testID={`tab-${tab.key}`}
                >
                  <Ionicons
                    name={locked ? "lock-closed-outline" : tab.icon}
                    size={rf(typography.fontSize.caption)}
                    color={
                      locked
                        ? colors.text.tertiary
                        : active
                          ? colors.text.primary
                          : colors.text.secondary
                    }
                    style={styles.tabChipIcon}
                  />
                  <Text
                    style={[
                      styles.tabChipText,
                      active && styles.tabChipTextActive,
                      locked && styles.tabChipTextLocked,
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {locked ? (
                    <Ionicons
                      name="sparkles"
                      size={rf(9)}
                      color={colors.primary.DEFAULT}
                      style={styles.tabLockIcon}
                    />
                  ) : null}
                </AnimatedPressable>
              );
            }}
          />
        </View>

        {/* Collections sub-filter chips */}
        {activeTab === "collections" ? (
          <View style={styles.collectionsRow}>
            <FlatList
              horizontal
              data={COLLECTION_CHIPS}
              keyExtractor={(c) => c.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContent}
              renderItem={({ item: chip }) => {
                const active = activeCollection === chip.category;
                return (
                  <AnimatedPressable
                    onPress={() => handleCollectionChip(chip)}
                    style={[
                      styles.collectionChip,
                      active && styles.collectionChipActive,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${chip.label}`}
                    accessibilityState={{ selected: active }}
                    testID={`collection-${chip.id}`}
                  >
                    <Text
                      style={[
                        styles.collectionChipText,
                        active && styles.collectionChipTextActive,
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </AnimatedPressable>
                );
              }}
            />
          </View>
        ) : null}

        {/* Multi-select action bar */}
        {multiSelect ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.multiBar}>
            <AnimatedPressable
              onPress={handleExitMultiSelect}
              style={styles.multiBarBtn}
              accessibilityRole="button"
              accessibilityLabel="Exit multi-select"
            >
              <Ionicons name="close" size={rf(18)} color={colors.text.primary} />
            </AnimatedPressable>
            <Text style={styles.multiBarText}>
              {selectedIds.size} selected
            </Text>
            <View style={styles.multiBarActions}>
              <AnimatedPressable
                onPress={handleBulkShare}
                style={styles.multiBarBtn}
                accessibilityRole="button"
                accessibilityLabel="Share selected"
                testID="bulk-share-button"
              >
                <Ionicons name="share-outline" size={rf(18)} color={colors.text.primary} />
              </AnimatedPressable>
              <AnimatedPressable
                onPress={handleBulkDelete}
                style={styles.multiBarBtn}
                accessibilityRole="button"
                accessibilityLabel="Delete selected"
                testID="bulk-delete-button"
              >
                <Ionicons name="trash-outline" size={rf(18)} color={colors.error.DEFAULT} />
              </AnimatedPressable>
            </View>
          </Animated.View>
        ) : null}

        {/* Body: tab-specific content */}
        {activeTab === "community" ? (
          isPremium ? (
            <CommunityTemplatesTab
              onOpenTemplate={handleOpenDetail}
              category={activeCollection ?? undefined}
              style={styles.tabBody}
            />
          ) : (
            <View style={styles.emptyWrap} testID="community-locked">
              <EmptyState
                icon="lock-closed-outline"
                title="Community is a Premium feature"
                subtitle="Upgrade to browse, fork, and rate community workout templates."
                iconColor={colors.primary.DEFAULT}
                ctaText="Upgrade"
                onCta={() => {
                  haptics.light();
                  // Navigate to profile where the upgrade flow lives.
                  navigation.navigate("Profile");
                }}
              />
            </View>
          )
        ) : activeTab === "ai" ? (
          <View style={styles.emptyWrap} testID="ai-empty">
            <EmptyState
              icon="sparkles-outline"
              title="AI plans live on the Workout tab"
              subtitle="Generate a personalized week from the Workout tab, then save it as a template to see it here."
              iconColor={colors.primary.DEFAULT}
              ctaText="Go to Workout"
              onCta={() => {
                haptics.light();
                navigation.goBack();
              }}
            />
          </View>
        ) : activeTab === "collections" && !activeCollection ? (
          <View style={styles.emptyWrap} testID="collections-empty">
            <EmptyState
              icon="albums-outline"
              title="Pick a collection"
              subtitle="Choose a category above to browse templates in that collection."
              iconColor={colors.secondary.DEFAULT}
            />
          </View>
        ) : !hasContent ? (
          <View style={styles.emptyWrap} testID="empty-state">
            <EmptyState
              icon={emptyIconFor(activeTab)}
              title={emptyTitleFor(activeTab)}
              subtitle={emptySubtitleFor(activeTab)}
              iconColor={colors.primary.DEFAULT}
              ctaText="Create Workout"
              onCta={() => navigation.navigate("CreateWorkout")}
            />
          </View>
        ) : (
          <FlatList
            data={filteredTemplates}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) =>
              viewMode === "grid" ? (
                <TemplateGridCard
                  template={item}
                  index={index}
                  selected={selectedIds.has(item.id)}
                  multiSelect={multiSelect}
                  onPress={handleOpenDetail}
                  onLongPress={handleLongPress}
                  onToggleSelect={handleToggleSelect}
                  onStart={handleStart}
                />
              ) : (
                <TemplateListRow
                  template={item}
                  index={index}
                  selected={selectedIds.has(item.id)}
                  multiSelect={multiSelect}
                  menuOpen={menuOpenId === item.id}
                  onPress={handleOpenDetail}
                  onLongPress={handleLongPress}
                  onToggleSelect={handleToggleSelect}
                  onToggleMenu={(id) => {
                    haptics.light();
                    setMenuOpenId((prev) => (prev === id ? null : id));
                  }}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onStart={handleStart}
                  onExerciseHistory={(exerciseId, exerciseName) =>
                    navigation.navigate("ExerciseHistory", {
                      exerciseId,
                      exerciseName,
                    } as never)
                  }
                />
              )
            }
            contentContainerStyle={styles.list}
            numColumns={viewMode === "grid" ? 2 : 1}
            key={viewMode}
            testID="template-list"
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>

      {/* Shared template detail sheet — lazy-loaded (Skia dep deferred). */}
      {detailVisible ? (
        <Suspense fallback={null}>
          <TemplateDetailSheet
            visible={detailVisible}
            onClose={handleCloseDetail}
            template={detailTemplate}
            isCommunity={activeTab === "community"}
            isOwned={detailTemplate ? activeTab !== "community" : false}
            userWeightKg={userWeightKg}
            onStart={handleStart}
            onUseInSchedule={handleUseInSchedule}
            onForkComplete={loadTemplates}
          />
        </Suspense>
      ) : null}
    </AuroraBackground>
  );
}

// ============================================================================
// EMPTY-STATE COPY HELPERS
// ============================================================================

function emptyIconFor(tab: TabKey): keyof typeof Ionicons.glyphMap {
  switch (tab) {
    case "recent":
      return "time-outline";
    case "pinned":
      return "pin-outline";
    case "collections":
      return "albums-outline";
    case "mine":
    default:
      return "barbell-outline";
  }
}

function emptyTitleFor(tab: TabKey): string {
  switch (tab) {
    case "recent":
      return "No recently used templates";
    case "pinned":
      return "No pinned templates yet";
    case "collections":
      return "No templates in this collection";
    case "mine":
    default:
      return "No workouts saved yet";
  }
}

function emptySubtitleFor(tab: TabKey): string {
  switch (tab) {
    case "recent":
      return "Start a workout to see it here.";
    case "pinned":
      return "Templates you use most will appear here for quick access.";
    case "collections":
      return "Create a template and tag it with this category to fill this collection.";
    case "mine":
    default:
      return "Tap + to create your first workout template.";
  }
}

// ============================================================================
// GRID CARD
// ============================================================================

interface GridCardProps {
  template: WorkoutTemplate;
  index: number;
  selected: boolean;
  multiSelect: boolean;
  onPress: (t: WorkoutTemplate) => void;
  onLongPress: (t: WorkoutTemplate) => void;
  onToggleSelect: (id: string) => void;
  onStart: (t: WorkoutTemplate) => void;
}

const TemplateGridCard: React.FC<GridCardProps> = ({
  template,
  index,
  selected,
  multiSelect,
  onPress,
  onLongPress,
  onToggleSelect,
  onStart,
}) => {
  const duration = template.estimatedDurationMinutes ?? 0;
  const exerciseCount = template.exercises.length;
  const difficulty = template.difficulty;
  const tint = difficulty ? DIFFICULTY_TINT[difficulty] : colors.primary.DEFAULT;

  const handleCardPress = useCallback(() => {
    if (multiSelect) {
      onToggleSelect(template.id);
    } else {
      onPress(template);
    }
  }, [multiSelect, onToggleSelect, onPress, template]);

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 40, 320)).duration(
        animations.duration.normal,
      )}
      style={styles.gridItem}
    >
      <AnimatedPressable
        onPress={handleCardPress}
        onLongPress={() => onLongPress(template)}
        scaleValue={0.97}
        springConfig="snappy"
        hapticType={multiSelect ? "selection" : "light"}
        style={styles.gridCardWrap}
        testID={`template-card-${template.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${template.name}, ${exerciseCount} exercises`}
      >
        <GlassCard
          elevation={2}
          padding="none"
          borderRadius="xl"
          contentStyle={styles.gridCardContent}
        >
          {/* Gradient thumbnail */}
          <LinearGradient
            colors={[colors.primary.DEFAULT, colors.secondary.DEFAULT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gridThumb}
          >
            <Ionicons name="barbell" size={rf(26)} color={colors.text.primary} />
            {multiSelect ? (
              <View
                style={[
                  styles.gridCheckbox,
                  selected && styles.gridCheckboxSelected,
                ]}
              >
                {selected ? (
                  <Ionicons
                    name="checkmark"
                    size={rf(14)}
                    color={colors.text.primary}
                  />
                ) : null}
              </View>
            ) : null}
          </LinearGradient>

          {/* Body */}
          <View style={styles.gridBody}>
            <Text style={styles.gridName} numberOfLines={1}>
              {template.name}
            </Text>
            <View style={styles.gridMetaRow}>
              <Ionicons
                name="barbell-outline"
                size={rf(11)}
                color={colors.text.secondary}
              />
              <Text style={styles.gridMetaText}>{exerciseCount}</Text>
              {duration > 0 ? (
                <>
                  <Ionicons
                    name="time-outline"
                    size={rf(11)}
                    color={colors.text.secondary}
                    style={styles.gridMetaIcon}
                  />
                  <Text style={styles.gridMetaText}>{duration}m</Text>
                </>
              ) : null}
            </View>
            <View
              style={[
                styles.gridDifficulty,
                { backgroundColor: `${tint}1F` },
              ]}
            >
              <Text style={[styles.gridDifficultyText, { color: tint }]}>
                {difficulty ? DIFFICULTY_LABEL[difficulty] : "Any level"}
              </Text>
            </View>
          </View>

          {/* Start button (non-multiselect only) */}
          {!multiSelect ? (
            <Pressable
              onPress={() => onStart(template)}
              style={({ pressed }) => [
                styles.gridStartBtn,
                pressed && styles.gridStartBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Start ${template.name}`}
              testID={`start-button-${template.id}`}
            >
              <Text style={styles.gridStartBtnText}>Start</Text>
            </Pressable>
          ) : null}
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

// ============================================================================
// LIST ROW
// ============================================================================

interface ListRowProps {
  template: WorkoutTemplate;
  index: number;
  selected: boolean;
  multiSelect: boolean;
  menuOpen: boolean;
  onPress: (t: WorkoutTemplate) => void;
  onLongPress: (t: WorkoutTemplate) => void;
  onToggleSelect: (id: string) => void;
  onToggleMenu: (id: string) => void;
  onEdit: (t: WorkoutTemplate) => void;
  onDuplicate: (t: WorkoutTemplate) => void;
  onDelete: (t: WorkoutTemplate) => void;
  onStart: (t: WorkoutTemplate) => void;
  onExerciseHistory: (exerciseId: string, exerciseName: string) => void;
}

const TemplateListRow: React.FC<ListRowProps> = ({
  template,
  index,
  selected,
  multiSelect,
  menuOpen,
  onPress,
  onLongPress,
  onToggleSelect,
  onToggleMenu,
  onEdit,
  onDuplicate,
  onDelete,
  onStart,
  onExerciseHistory,
}) => {
  const duration = template.estimatedDurationMinutes ?? 0;
  const exerciseCount = template.exercises.length;
  const difficulty = template.difficulty;
  const tint = difficulty ? DIFFICULTY_TINT[difficulty] : colors.primary.DEFAULT;

  const handleRowPress = useCallback(() => {
    if (multiSelect) {
      onToggleSelect(template.id);
    } else {
      onPress(template);
    }
  }, [multiSelect, onToggleSelect, onPress, template]);

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 30, 240)).duration(
        animations.duration.normal,
      )}
      style={styles.listItem}
    >
      <AnimatedPressable
        onPress={handleRowPress}
        onLongPress={() => onLongPress(template)}
        scaleValue={0.98}
        springConfig="smooth"
        hapticType={multiSelect ? "selection" : "light"}
        testID={`template-card-${template.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${template.name}, ${exerciseCount} exercises`}
      >
        <GlassCard
          elevation={3}
          padding="md"
          borderRadius="lg"
          contentStyle={
            selected
              ? styles.listCardContentSelected
              : styles.listCardContent
          }
        >
          <View style={styles.listRow}>
            {/* Thumbnail */}
            <LinearGradient
              colors={[colors.primary.DEFAULT, colors.secondary.DEFAULT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.listThumb}
            >
              <Ionicons name="barbell" size={rf(20)} color={colors.text.primary} />
            </LinearGradient>

            {/* Body */}
            <View style={styles.listBody}>
              <View style={styles.listHeaderRow}>
                <Text style={styles.listName} numberOfLines={1}>
                  {template.name}
                </Text>
                {multiSelect ? (
                  <View
                    style={[
                      styles.listCheckbox,
                      selected && styles.listCheckboxSelected,
                    ]}
                  >
                    {selected ? (
                      <Ionicons
                        name="checkmark"
                        size={rf(12)}
                        color={colors.text.primary}
                      />
                    ) : null}
                  </View>
                ) : (
                  <AnimatedPressable
                    onPress={() => onToggleMenu(template.id)}
                    testID={`menu-button-${template.id}`}
                    accessibilityRole="button"
                    accessibilityLabel="Open template menu"
                    style={styles.menuBtn}
                  >
                    <Ionicons
                      name="ellipsis-horizontal"
                      size={rf(20)}
                      color={colors.text.secondary}
                    />
                  </AnimatedPressable>
                )}
              </View>

              {/* Muscle badges */}
              <View style={styles.badgeRow}>
                {template.targetMuscleGroups.slice(0, 4).map((mg) => (
                  <View key={mg} style={styles.badge}>
                    <Text style={styles.badgeText}>{mg}</Text>
                  </View>
                ))}
              </View>

              {/* Meta row: exercise count + duration + difficulty */}
              <View style={styles.listMetaRow}>
                <View style={styles.listMetaItem}>
                  <Ionicons
                    name="barbell-outline"
                    size={rf(12)}
                    color={colors.primary.DEFAULT}
                  />
                  <Text style={styles.listMetaText}>{exerciseCount} ex</Text>
                </View>
                {duration > 0 ? (
                  <View style={styles.listMetaItem}>
                    <Ionicons
                      name="time-outline"
                      size={rf(12)}
                      color={colors.primary.DEFAULT}
                    />
                    <Text style={styles.listMetaText}>{duration}m</Text>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.listDifficulty,
                    { backgroundColor: `${tint}1F` },
                  ]}
                >
                  <Text style={[styles.listDifficultyText, { color: tint }]}>
                    {difficulty ? DIFFICULTY_LABEL[difficulty] : "Any level"}
                  </Text>
                </View>
              </View>

              {/* Exercise quick list (preserves GAP-14 history tap) */}
              <View style={styles.exerciseListContainer}>
                {template.exercises.slice(0, 3).map((ex, idx) => (
                  <Pressable
                    key={`${ex.exerciseId}-${idx}`}
                    style={styles.exerciseRow}
                    onPress={() => onExerciseHistory(ex.exerciseId, ex.name)}
                    testID={`exercise-history-${template.id}-${idx}`}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${ex.name} history`}
                  >
                    <Text style={styles.exerciseRowName} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    <Text style={styles.exerciseRowMeta}>
                      {ex.sets}×
                      {ex.repRange[0] === ex.repRange[1]
                        ? ex.repRange[0]
                        : `${ex.repRange[0]}-${ex.repRange[1]}`}
                    </Text>
                  </Pressable>
                ))}
                {template.exercises.length > 3 ? (
                  <Text style={styles.moreExercises}>
                    +{template.exercises.length - 3} more
                  </Text>
                ) : null}
              </View>

              {/* Inline menu (preserved from original) */}
              {menuOpen ? (
                <Animated.View entering={FadeIn.duration(150)} style={styles.menu} testID={`menu-${template.id}`}>
                  <AnimatedPressable
                    style={styles.menuItem}
                    onPress={() => onEdit(template)}
                    testID={`edit-button-${template.id}`}
                    accessibilityRole="button"
                    accessibilityLabel="Edit template"
                  >
                    <Ionicons name="create-outline" size={rf(16)} color={colors.text.primary} />
                    <Text style={styles.menuItemText}>Edit</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    style={styles.menuItem}
                    onPress={() => onDuplicate(template)}
                    testID={`duplicate-button-${template.id}`}
                    accessibilityRole="button"
                    accessibilityLabel="Duplicate template"
                  >
                    <Ionicons name="copy-outline" size={rf(16)} color={colors.text.primary} />
                    <Text style={styles.menuItemText}>Duplicate</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    style={styles.menuItem}
                    onPress={() => onDelete(template)}
                    testID={`delete-button-${template.id}`}
                    accessibilityRole="button"
                    accessibilityLabel="Delete template"
                  >
                    <Ionicons name="trash-outline" size={rf(16)} color={colors.error.DEFAULT} />
                    <Text style={[styles.menuItemText, styles.deleteText]}>Delete</Text>
                  </AnimatedPressable>
                </Animated.View>
              ) : null}

              {/* Start button */}
              {!multiSelect ? (
                <AnimatedPressable
                  style={styles.startButton}
                  onPress={() => onStart(template)}
                  testID={`start-button-${template.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Start ${template.name}`}
                  hapticType="medium"
                >
                  <Text style={styles.startButtonText}>Start</Text>
                </AnimatedPressable>
              ) : null}
            </View>
          </View>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  // Header
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
  },
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
    fontWeight: fw(typography.fontWeight.semibold),
  },
  addButton: {
    width: rw(40),
    height: rw(40),
    borderRadius: 999,
    backgroundColor: colors.glass.background,
    alignItems: "center",
    justifyContent: "center",
  },
  // Search
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    paddingBottom: rp(spacing.sm),
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.xl,
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.xs),
    gap: rp(spacing.xs),
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    padding: 0,
    minHeight: rf(22),
  },
  viewToggle: {
    width: rw(44),
    height: rw(44),
    borderRadius: 999,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: "center",
    justifyContent: "center",
  },
  // Tabs
  tabsRow: {
    paddingBottom: rp(spacing.xs),
  },
  tabsContent: {
    paddingHorizontal: rp(spacing.md),
    gap: rp(spacing.xs),
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xxs),
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.backgroundDark,
    borderWidth: 1,
    borderColor: colors.glass.border,
    minHeight: rp(40),
  },
  tabChipActive: {
    backgroundColor: `${colors.primary.DEFAULT}26`,
    borderColor: colors.primary.DEFAULT,
  },
  tabChipLocked: {
    opacity: 0.7,
  },
  tabChipIcon: {},
  tabChipText: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.medium),
    color: colors.text.secondary,
  },
  tabChipTextActive: {
    color: colors.text.primary,
    fontWeight: fw(typography.fontWeight.semibold),
  },
  tabChipTextLocked: {
    color: colors.text.tertiary,
  },
  tabLockIcon: {
    marginLeft: rp(spacing.xxs),
  },
  // Collections sub-filter
  collectionsRow: {
    paddingBottom: rp(spacing.sm),
  },
  collectionChip: {
    paddingVertical: rp(spacing.xs),
    paddingHorizontal: rp(spacing.md),
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.backgroundDark,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  collectionChipActive: {
    backgroundColor: `${colors.secondary.DEFAULT}26`,
    borderColor: colors.secondary.DEFAULT,
  },
  collectionChipText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
    fontWeight: fw(typography.fontWeight.medium),
  },
  collectionChipTextActive: {
    color: colors.text.primary,
    fontWeight: fw(typography.fontWeight.semibold),
  },
  // Multi-select bar
  multiBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: rp(spacing.md),
    marginBottom: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.lg,
  },
  multiBarText: {
    flex: 1,
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: fw(typography.fontWeight.semibold),
    marginLeft: rp(spacing.sm),
  },
  multiBarActions: {
    flexDirection: "row",
    gap: rp(spacing.sm),
  },
  multiBarBtn: {
    width: rw(36),
    height: rw(36),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass.backgroundDark,
  },
  // Body
  tabBody: {
    flex: 1,
  },
  emptyWrap: { flex: 1, justifyContent: "center" },
  list: {
    padding: rp(spacing.md),
  },
  // Grid card
  gridItem: {
    flex: 1,
    margin: rp(spacing.xs),
    maxWidth: "50%" as unknown as number,
  },
  gridCardWrap: {
    flex: 1,
  },
  gridCardContent: {
    flex: 1,
  },
  gridThumb: {
    height: rw(90),
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  gridCheckbox: {
    position: "absolute",
    top: rp(spacing.xs),
    right: rp(spacing.xs),
    width: rw(22),
    height: rw(22),
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.text.primary,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  gridCheckboxSelected: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  gridBody: {
    padding: rp(spacing.sm),
    gap: rp(spacing.xs),
  },
  gridName: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.semibold),
    color: colors.text.primary,
  },
  gridMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xxs),
  },
  gridMetaIcon: {
    marginLeft: rp(spacing.xs),
  },
  gridMetaText: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.text.secondary,
  },
  gridDifficulty: {
    alignSelf: "flex-start",
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xxs),
    borderRadius: borderRadius.full,
  },
  gridDifficultyText: {
    fontSize: rf(typography.fontSize.micro),
    fontWeight: fw(typography.fontWeight.semibold),
  },
  gridStartBtn: {
    marginHorizontal: rp(spacing.sm),
    marginBottom: rp(spacing.sm),
    paddingVertical: rp(spacing.sm),
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  gridStartBtnPressed: {
    opacity: 0.85,
  },
  gridStartBtnText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.bold),
  },
  // List row
  listItem: {
    marginBottom: rp(spacing.md),
  },
  listCardContent: {
    borderWidth: 0,
  } as ViewStyle,
  listCardContentSelected: {
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
  } as ViewStyle,
  listRow: {
    flexDirection: "row",
    gap: rp(spacing.sm),
    alignItems: "flex-start",
  },
  listThumb: {
    width: rw(48),
    height: rw(48),
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  listBody: {
    flex: 1,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listName: {
    fontSize: rf(typography.fontSize.body),
    fontWeight: fw(typography.fontWeight.bold),
    color: colors.text.primary,
    flex: 1,
  },
  listCheckbox: {
    width: rw(22),
    height: rw(22),
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.text.tertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  listCheckboxSelected: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  listMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
    marginTop: rp(spacing.xs),
  },
  listMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xxs),
  },
  listMetaText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
  },
  listDifficulty: {
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xxs),
    borderRadius: borderRadius.full,
  },
  listDifficultyText: {
    fontSize: rf(typography.fontSize.micro),
    fontWeight: fw(typography.fontWeight.semibold),
  },
  menuBtn: {
    paddingLeft: rp(spacing.sm),
    paddingVertical: rp(spacing.xs),
    minWidth: rw(44),
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rp(spacing.xs),
    marginTop: rp(spacing.sm),
  },
  badge: {
    backgroundColor: colors.background.DEFAULT,
    borderRadius: borderRadius.xl,
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xxs),
  },
  badgeText: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.primary.DEFAULT,
  },
  // Exercise list (GAP-14)
  exerciseListContainer: { marginTop: rp(spacing.sm) },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: rp(spacing.xs),
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.backgroundDark,
  },
  exerciseRowName: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.primary,
    flex: 1,
  },
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
  // Menu
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
  menuItemText: {
    fontSize: rf(typography.fontSize.body),
    color: colors.text.primary,
  },
  deleteText: { color: colors.error.DEFAULT },
  // Start button
  startButton: {
    marginTop: rp(spacing.md),
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: rp(spacing.md),
    borderRadius: borderRadius.lg,
    alignItems: "center",
  },
  startButtonText: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.bold),
    color: colors.text.primary,
  },
});
