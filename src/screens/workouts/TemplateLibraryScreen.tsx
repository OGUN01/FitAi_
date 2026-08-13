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
  RefreshControl,
  type TextStyle,
  type ViewStyle,
} from "react-native";
// NOTE: Pressable intentionally removed — all interactive buttons use AnimatedPressable.
import { SafeAreaView } from "react-native-safe-area-context";
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
import { usePaywall } from "../../hooks/usePaywall";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { getCurrentUserId } from "../../services/authUtils";
import { buildDayWorkoutFromTemplate } from "../../utils/workoutBuilders";
import {
  AuroraBackground,
  AuroraSpinner,
  AuroraSearchField,
  EmptyState,
  AnimatedPressable,
  GlassHeader,
  SkeletonLoader,
} from "../../components/ui/aurora";
import { CommunityTemplatesTab } from "../../components/fitness/builder/CommunityTemplatesTab";
import PaywallModal from "../../components/subscription/PaywallModal";
import {
  getBookmarks,
  toggleBookmark,
} from "../../services/templateBookmarksService";
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
  flatColors as colors,
  spacing,
  typography,
} from "../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../theme/fonts";
import { animations } from "../../theme/animations";
import { haptics } from "../../utils/haptics";
import { rf, rp, rw, rh, rbr } from "../../utils/responsive";
import { hexToRgba } from "../../utils/colors";

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
  { key: "pinned", label: "Bookmarks", icon: "bookmark-outline" },
  { key: "mine", label: "My Templates", icon: "person-outline" },
  { key: "community", label: "Community", icon: "people-outline" },
  { key: "ai", label: "AI Generated", icon: "sparkles-outline" },
  { key: "collections", label: "Collections", icon: "albums-outline" },
];

const TAB_KEYS = new Set<TabKey>(TABS.map((t) => t.key));

/** Narrow an arbitrary route param into a known TabKey, defaulting to "mine". */
function resolveInitialTab(initialTab: unknown): TabKey {
  return typeof initialTab === "string" && TAB_KEYS.has(initialTab as TabKey)
    ? (initialTab as TabKey)
    : "mine";
}

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
  beginner: colors.success,
  intermediate: colors.warning,
  advanced: colors.error,
};

const DIFFICULTY_LABEL: Record<
  NonNullable<WorkoutTemplate["difficulty"]>,
  string
> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const TemplateLibraryLoadingSkeleton: React.FC = () => (
  <View style={styles.loadingSkeleton} accessibilityLabel="Loading template library">
    <View style={styles.loadingSearchRow}>
      <SkeletonLoader
        variant="button"
        width={1}
        height={rh(48)}
        borderRadius={rbr(12)}
        style={styles.loadingSearchField}
      />
      <SkeletonLoader variant="button" width={rw(48)} height={rh(48)} borderRadius={rbr(12)} />
    </View>
    <View style={styles.loadingTabs}>
      {[0, 1, 2].map((item) => (
        <SkeletonLoader
          key={`loading-tab-${item}`}
          variant="button"
          width={rw(92)}
          height={rh(44)}
        />
      ))}
    </View>
    <View style={styles.loadingGrid}>
      {[0, 1, 2, 3].map((item) => (
        <SkeletonLoader
          key={`loading-template-${item}`}
          variant="card"
          width="48%"
          height={rh(188)}
          style={styles.loadingCard}
        />
      ))}
    </View>
  </View>
);

// ============================================================================
// COMPONENT
// ============================================================================

export default function TemplateLibraryScreen({ navigation, route }: Props) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [signInRequired, setSignInRequired] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  // Build-method entry (BuildMethodLandingScreen) passes an `initialTab` route
  // param so "Use Templates" opens on "mine" and "Import Community" opens
  // directly on "community" instead of always landing on the default tab.
  const [activeTab, setActiveTab] = useState<TabKey>(() =>
    resolveInitialTab(route?.params?.initialTab),
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [multiSelect, setMultiSelect] = useState(false);
  const [detailTemplate, setDetailTemplate] = useState<WorkoutTemplate | null>(
    null,
  );
  const [detailVisible, setDetailVisible] = useState(false);
  // ── Bookmarks (Phase 10) — local-only store of bookmarked template ids.
  // Loaded once on mount + refreshed after every toggle so card icons stay
  // in sync. Stored as a Set for O(1) lookup during card render.
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // ── Phase 10: incoming shared template (deep-link import) ─────────────────
  // When the screen is opened via a fitai://template/{id} deep link, the
  // router passes `sharedTemplateId` in route.params. We fetch that public
  // template via getPublicTemplates-free read (forkTemplate fetches it
  // internally) and present it in the detail sheet so the user can review /
  // fork it. The deep-link import flow does NOT auto-fork — the user taps
  // "Fork to Library" in the sheet, keeping the user in control.
  const sharedTemplateId = route?.params?.sharedTemplateId as
    | string
    | undefined;

  const startTemplateSession = useFitnessStore((s) => s.startTemplateSession);
  // Weight SSOT: profileStore.bodyAnalysis.current_weight_kg (mirrors
  // WorkoutSessionScreen's selector — see that screen for the canonical read).
  const bodyAnalysis = useProfileStore((s) => s.bodyAnalysis);
  const isPremium = useSubscriptionStore((s) => s.isPremium());
  const { triggerPaywall, showPaywall, paywallReason, dismiss } = usePaywall();

  const userWeightKg = bodyAnalysis?.current_weight_kg ?? null;

  const loadTemplates = useCallback(async () => {
    setLoadError(false);
    const userId = getCurrentUserId();
    if (!userId) {
      // Distinct from the "no templates yet" empty state — the real problem
      // here is an expired/missing session, not a first-run user.
      setSignInRequired(true);
      setLoading(false);
      return;
    }
    setSignInRequired(false);
    try {
      const result = await workoutTemplateService.getTemplates(userId);
      setTemplates(result);
    } catch (err) {
      console.error("Failed to load templates:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load bookmarked template ids from AsyncStorage. Runs on mount + after
  // every toggle so card icons reflect the latest state.
  const loadBookmarks = useCallback(async () => {
    try {
      const ids = await getBookmarks();
      setBookmarks(new Set(ids));
    } catch (err) {
      console.error("Failed to load bookmarks:", err);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadTemplates(), loadBookmarks()]);
    setRefreshing(false);
  }, [loadTemplates, loadBookmarks]);

  useEffect(() => {
    loadTemplates();
    loadBookmarks();
  }, [loadTemplates, loadBookmarks]);

  // ── Phase 10: present a shared template from an incoming deep link ────────
  // When `sharedTemplateId` is set (router passed it from a fitai://template
  // link), fetch that public template and open the detail sheet so the user
  // can review + fork it. We switch to the Community tab so the sheet renders
  // in community mode (enables the Fork action).
  useEffect(() => {
    if (!sharedTemplateId) return;
    let cancelled = false;
    (async () => {
      try {
        // Fetch the public template via the supabase client directly — there's
        // no getTemplateById in the service, and getPublicTemplates would
        // paginate the whole catalog to find one row. A direct read is cheaper
        // and respects RLS (public templates are readable by all).
        const { supabase } = await import("../../services/supabase");
        const { data, error } = await supabase
          .from("workout_templates")
          .select("*")
          .eq("id", sharedTemplateId)
          .eq("is_public", true)
          .maybeSingle();
        if (error) {
          console.error(
            "[TemplateLibraryScreen] Failed to fetch shared template:",
            error,
          );
          crossPlatformAlert(
            "Template not found",
            "This shared template may have been deleted or is no longer public.",
          );
          return;
        }
        if (!data || cancelled) return;
        // Map the row to the WorkoutTemplate shape. The service's internal
        // mapRow is private, so we inline the same mapping here (kept in sync
        // with workoutTemplateService.mapRow). This is the only place in the
        // app that reads a single public template by id for preview.
        const template: WorkoutTemplate = {
          id: data.id,
          userId: data.user_id,
          name: data.name,
          description: data.description ?? undefined,
          exercises: data.exercises ?? [],
          targetMuscleGroups: data.target_muscle_groups ?? [],
          estimatedDurationMinutes: data.estimated_duration_minutes ?? undefined,
          isPublic: data.is_public ?? false,
          usageCount: data.usage_count ?? 0,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          category: data.category ?? undefined,
          difficulty: data.difficulty ?? undefined,
          tags: data.tags ?? [],
          ratingAvg: data.rating_avg ?? 0,
          ratingCount: data.rating_count ?? 0,
          forkCount: data.fork_count ?? 0,
          authorName: data.author_name ?? undefined,
          parentTemplateId: data.parent_template_id ?? undefined,
          version: data.version ?? 1,
        };
        if (cancelled) return;
        // Switch to the community tab + open the detail sheet.
        setActiveTab("community");
        setDetailTemplate(template);
        setDetailVisible(true);
      } catch (err) {
        console.error(
          "[TemplateLibraryScreen] Shared template fetch error:",
          err,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sharedTemplateId]);

  // Toggle a bookmark with optimistic UI update + haptic celebration on add.
  const handleToggleBookmark = useCallback(
    async (templateId: string) => {
      // Optimistic flip: update the local Set immediately so the icon animates
      // before AsyncStorage confirms. If the write fails, we revert.
      const wasBookmarked = bookmarks.has(templateId);
      setBookmarks((prev) => {
        const next = new Set(prev);
        if (wasBookmarked) next.delete(templateId);
        else next.add(templateId);
        return next;
      });
      if (!wasBookmarked) {
        haptics.celebration();
      } else {
        haptics.light();
      }
      try {
        await toggleBookmark(templateId);
      } catch (err) {
        console.error("Failed to toggle bookmark:", err);
        // Revert on failure.
        setBookmarks((prev) => {
          const next = new Set(prev);
          if (wasBookmarked) next.add(templateId);
          else next.delete(templateId);
          return next;
        });
        crossPlatformAlert(
          "Bookmark failed",
          "Could not update bookmarks. Please try again.",
        );
      }
    },
    [bookmarks],
  );

  // ── Derived: filtered templates for the current tab ──────────────────────
  const isSearchAvailable =
    activeTab !== "community" &&
    activeTab !== "ai" &&
    (activeTab !== "collections" || Boolean(activeCollection));
  const hasSearch = search.trim().length > 0;

  const filteredTemplates = useMemo(() => {
    let list = templates;
    if (activeTab === "recent") {
      list = [...templates].sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0));
    } else if (activeTab === "pinned") {
      // Phase 10: when the user has bookmarks, "Pinned" shows bookmarked
      // templates. When there are no bookmarks, fall back to the legacy
      // most-used heuristic (usageCount >= 1) so the tab is never empty for
      // existing users.
      if (bookmarks.size > 0) {
        list = templates.filter((t) => bookmarks.has(t.id));
      } else {
        list = templates.filter((t) => (t.usageCount ?? 0) > 0);
      }
    } else if (activeTab === "collections") {
      if (activeCollection) {
        list = templates.filter((t) => t.category === activeCollection);
      } else {
        list = [];
      }
    }
    // "mine" tab = all user templates (no extra filter)
    if (isSearchAvailable && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.targetMuscleGroups.some((m) => m.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [templates, activeTab, activeCollection, search, bookmarks, isSearchAvailable]);

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
      // The WeeklyBuilder presents a day-picker sheet on arrival (Mon–Sun,
      // empty days highlighted, first empty day pre-selected) and seeds the
      // template into the day the user confirms — never silently.
      navigation.navigate("WeeklyBuilder", { sourceTemplate: template });
    },
    [navigation],
  );

  // ── Tab / view switching ───────────────────────────────────────────────────
  const handleTabChange = useCallback((key: TabKey) => {
    haptics.selection();
    setActiveTab(key);
    setSearch("");
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
    setSearch("");
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

  const handleBulkShare = useCallback(async () => {
    if (selectedIds.size === 0) return;
    haptics.light();
    // Phase 10: share the first selected template via the share service. The
    // OS share sheet only accepts one payload, so when multiple templates are
    // selected we share the first and inform the user. This keeps the flow
    // simple — users who want to share a different template deselect others.
    const firstId = Array.from(selectedIds)[0];
    const firstTemplate = templates.find((t) => t.id === firstId);
    if (!firstTemplate) {
      haptics.warning();
      crossPlatformAlert("Share failed", "Could not find the selected template.");
      return;
    }
    try {
      const { shareTemplate } = await import(
        "../../services/templateShareService"
      );
      const sharedLink = await shareTemplate(firstTemplate.id, firstTemplate.name);
      if (!sharedLink) return;
      handleExitMultiSelect();
    } catch (err) {
      console.error("[TemplateLibraryScreen] bulk share failed:", err);
      haptics.error();
      crossPlatformAlert(
        "Share failed",
        "Could not open the share sheet. Please try again.",
      );
    }
  }, [selectedIds, templates, handleExitMultiSelect]);

  // ── Header right actions (Schedule + Add) ───────────────────────────────────
  const headerActions = (
    <View style={styles.headerActions}>
      <AnimatedPressable
        onPress={() => navigation.navigate("WeeklyBuilder")}
        style={styles.scheduleBtn}
        testID="schedule-builder-button"
        accessibilityRole="button"
        accessibilityLabel="Build schedule"
        accessibilityHint="Open the weekly schedule builder"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.scheduleBtnText} numberOfLines={1}>Schedule</Text>
      </AnimatedPressable>
      <AnimatedPressable
        onPress={() => navigation.navigate("CreateWorkout")}
        testID="add-template-button"
        accessibilityRole="button"
        accessibilityLabel="Add template"
        accessibilityHint="Create a new workout template"
        style={styles.addButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="add" size={rf(26)} color={colors.primary} />
      </AnimatedPressable>
    </View>
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AuroraBackground theme="space">
        <SafeAreaView style={styles.flex} edges={["top"]}>
          <GlassHeader title="Template Library" eyebrow="Workouts" onBack={() => navigation.goBack()} />
          <TemplateLibraryLoadingSkeleton />
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (signInRequired) {
    return (
      <AuroraBackground theme="space">
        <SafeAreaView style={styles.flex} edges={["top"]}>
          <GlassHeader title="Template Library" eyebrow="Workouts" onBack={() => navigation.goBack()} />
          <View style={styles.emptyWrap} testID="template-sign-in-required">
            <EmptyState
              icon="lock-closed-outline"
              iconColor={colors.warning}
              title="Sign in required"
              subtitle="Your session has expired. Sign in again to view and manage your workout templates."
              ctaText="Go Back"
              onCta={() => navigation.goBack()}
            />
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  if (loadError) {
    return (
      <AuroraBackground theme="space">
        <SafeAreaView style={styles.flex} edges={["top"]}>
          <GlassHeader title="Template Library" eyebrow="Workouts" onBack={() => navigation.goBack()} />
          <View style={styles.emptyWrap} testID="template-load-error">
            <EmptyState
              icon="cloud-offline-outline"
              iconColor={colors.error}
              title="Couldn't load templates"
              subtitle="Check your connection and try again."
              ctaText="Try Again"
              onCta={() => {
                setLoading(true);
                loadTemplates();
              }}
            />
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground theme="space">
      <SafeAreaView style={styles.flex} edges={["top"]}>
        <GlassHeader title="Template Library" eyebrow="Workouts" onBack={() => navigation.goBack()} rightAction={headerActions} />

        {/* Search is local to the user's library and selected collection. */}
        {isSearchAvailable ? (
          <View style={styles.searchRow}>
            <AuroraSearchField
              value={search}
              onChangeText={setSearch}
              onClear={() => setSearch("")}
              placeholder="Search templates"
              accessibilityLabel="Search templates"
              testID="template-search-input"
              containerStyle={styles.searchField}
            />

            <AnimatedPressable
              onPress={handleViewToggle}
              style={styles.viewToggle}
              testID="view-toggle-button"
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${viewMode === "grid" ? "list" : "grid"} view`}
              accessibilityHint="Toggle between grid and list layouts"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={viewMode === "grid" ? "list-outline" : "grid-outline"}
                size={rf(20)}
                color={colors.textSecondary}
              />
            </AnimatedPressable>
          </View>
        ) : null}

        {/* Folder tabs — plain pill text toggles (selected = primary 12% tint) */}
        <View style={styles.tabsRow}>
          <FlatList
            horizontal
            data={TABS}
            keyExtractor={(t) => t.key}
            showsHorizontalScrollIndicator={false}
            style={styles.tabsList}
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
                        ? colors.textTertiary
                        : active
                          ? colors.primary
                          : colors.textSecondary
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
                      color={colors.primary}
                      style={styles.tabLockIcon}
                    />
                  ) : null}
                </AnimatedPressable>
              );
            }}
          />
        </View>

        {/* Collections sub-filter chips — same plain pill language */}
        {activeTab === "collections" ? (
          <View style={styles.collectionsRow}>
            <FlatList
              horizontal
              data={COLLECTION_CHIPS}
              keyExtractor={(c) => c.id}
              showsHorizontalScrollIndicator={false}
              style={styles.tabsList}
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

        {/* Multi-select action bar — flat */}
        {multiSelect ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.multiBar}>
            <AnimatedPressable
              onPress={handleExitMultiSelect}
              style={styles.multiBarBtn}
              accessibilityRole="button"
              accessibilityLabel="Exit multi-select"
            >
              <Ionicons name="close" size={rf(18)} color={colors.text} />
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
                <Ionicons name="share-outline" size={rf(18)} color={colors.text} />
              </AnimatedPressable>
              <AnimatedPressable
                onPress={handleBulkDelete}
                style={styles.multiBarBtn}
                accessibilityRole="button"
                accessibilityLabel="Delete selected"
                testID="bulk-delete-button"
              >
                <Ionicons name="trash-outline" size={rf(18)} color={colors.error} />
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
                iconColor={colors.primary}
                ctaText="Upgrade"
                onCta={() => {
                  haptics.light();
                  triggerPaywall(
                    "Upgrade to browse, fork, and rate community workout templates",
                  );
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
              iconColor={colors.primary}
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
              iconColor={colors.secondary}
            />
          </View>
        ) : hasSearch && !hasContent ? (
          <View style={styles.emptyWrap} testID="template-search-empty">
            <EmptyState
              icon="search-outline"
              title="No templates found"
              subtitle="Try a different template name or muscle group."
              ctaText="Clear search"
              onCta={() => setSearch("")}
            />
          </View>
        ) : !hasContent ? (
          <HeroEmptyState
            tab={activeTab}
            onCreate={() => navigation.navigate("CreateWorkout")}
            onAIGenerate={() => {
              haptics.light();
              navigation.goBack();
            }}
          />
        ) : (
          <FlatList
            data={filteredTemplates}
            keyExtractor={(item) => item.id}
            testID="template-list"
            renderItem={({ item, index }) =>
              viewMode === "grid" ? (
                <TemplateGridCard
                  template={item}
                  index={index}
                  selected={selectedIds.has(item.id)}
                  multiSelect={multiSelect}
                  bookmarked={bookmarks.has(item.id)}
                  onPress={handleOpenDetail}
                  onLongPress={handleLongPress}
                  onToggleSelect={handleToggleSelect}
                  onToggleBookmark={handleToggleBookmark}
                  onStart={handleStart}
                />
              ) : (
                <TemplateListRow
                  template={item}
                  index={index}
                  selected={selectedIds.has(item.id)}
                  multiSelect={multiSelect}
                  menuOpen={menuOpenId === item.id}
                  bookmarked={bookmarks.has(item.id)}
                  onPress={handleOpenDetail}
                  onLongPress={handleLongPress}
                  onToggleSelect={handleToggleSelect}
                  onToggleMenu={(id) => {
                    haptics.light();
                    setMenuOpenId((prev) => (prev === id ? null : id));
                  }}
                  onToggleBookmark={handleToggleBookmark}
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
            extraData={viewMode}
            columnWrapperStyle={
              viewMode === "grid"
                ? {
                    gap: rp(spacing.sm),
                    paddingHorizontal: rp(spacing.lg),
                  }
                : undefined
            }
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          />
        )}
      </SafeAreaView>

      {/* Shared template detail sheet — lazy-loaded (Skia dep deferred). */}
      {detailVisible ? (
        <Suspense
          fallback={
            <View style={styles.sheetFallback} pointerEvents="none">
              <AuroraSpinner size="md" />
            </View>
          }
        >
          <TemplateDetailSheet
            visible={detailVisible}
            onClose={handleCloseDetail}
            template={detailTemplate}
            isCommunity={
              activeTab === "community" ||
              (detailTemplate ? detailTemplate.isPublic : false)
            }
            isOwned={
              detailTemplate
                ? activeTab !== "community" && !detailTemplate.isPublic
                : false
            }
            userWeightKg={userWeightKg}
            onStart={handleStart}
            onUseInSchedule={handleUseInSchedule}
            onForkComplete={loadTemplates}
            onRated={() => {
              // Refresh the user's own template list so rating aggregates on
              // owned templates reflect the new rating. Community templates are
              // re-fetched by their own tab's refresh; we don't need to force
              // it here since the detail sheet shows optimistic local values.
              loadTemplates();
            }}
          />
        </Suspense>
      ) : null}

      {/* PaywallModal is NOT mounted globally (only DietScreen +
          SubscriptionManagement + AnalyticsScreen mount it) — without this
          local mount the Community tab's Upgrade CTA would set showPaywall
          in the store but render nothing on this screen. */}
      <PaywallModal
        visible={showPaywall}
        onClose={dismiss}
        reason={paywallReason ?? undefined}
      />
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
      return "bookmark-outline";
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
      return "No bookmarked templates yet";
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
      return "Tap the bookmark icon on any template to pin it here for quick access.";
    case "collections":
      return "Create a template and tag it with this category to fill this collection.";
    case "mine":
    default:
      return "Tap + to create your first workout template.";
  }
}

// ============================================================================
// HERO EMPTY STATE — premium first-run experience (replaces generic EmptyState
// for the "no templates yet" case). A gradient icon orb with a soft glow,
// aspirational copy, and two CTAs (create + AI generate). Used only for the
// `mine`/`recent`/`pinned` empty cases; locked/error tabs keep the generic
// EmptyState since their copy is contextual, not first-run hero copy.
// ============================================================================

const HERO_COPY: Partial<Record<TabKey, { eyebrow: string; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }>> = {
  mine: {
    eyebrow: "Get Started",
    title: "Build your first workout",
    subtitle: "Design a routine from scratch, or let AI generate one tailored to your goals.",
    icon: "barbell-outline",
  },
  recent: {
    eyebrow: "Nothing yet",
    title: "Your recent workouts appear here",
    subtitle: "Start or finish a workout to see it show up in this list.",
    icon: "time-outline",
  },
  pinned: {
    eyebrow: "No bookmarks",
    title: "Pin the ones you love",
    subtitle: "Tap the bookmark on any template to keep it here for quick access.",
    icon: "bookmark-outline",
  },
  collections: {
    eyebrow: "Empty collection",
    title: "No templates here yet",
    subtitle: "Create a template and tag it with this category to fill this collection.",
    icon: "albums-outline",
  },
};

interface HeroEmptyStateProps {
  tab: TabKey;
  onCreate: () => void;
  onAIGenerate: () => void;
}

const HeroEmptyState: React.FC<HeroEmptyStateProps> = ({ tab, onCreate, onAIGenerate }) => {
  const copy = HERO_COPY[tab] ?? HERO_COPY.mine!;
  // Only the "mine" first-run state shows the AI-generate secondary CTA — the
  // other tabs (recent/pinned/collections) are secondary list states where a
  // second CTA would be noise.
  const showAICta = tab === "mine";
  return (
    <View style={styles.heroEmpty} testID="empty-state">
      {/* Gradient icon orb + soft glow */}
      <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.heroIconWrap}>
        <View style={styles.heroGlow} />
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroIconDisc}
        >
          <Ionicons name={copy.icon} size={rf(40)} color={colors.text} />
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(500)}>
        <Text style={styles.heroEyebrow}>{copy.eyebrow}</Text>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(260).duration(500)}>
        <Text style={styles.heroTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
          {copy.title}
        </Text>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(320).duration(500)}>
        <Text style={styles.heroSubtitle} numberOfLines={3}>
          {copy.subtitle}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.heroCtaRow}>
        <AnimatedPressable
          onPress={onCreate}
          scaleValue={0.96}
          springConfig="snappy"
          hapticType="light"
          style={styles.heroPrimaryCta}
          accessibilityRole="button"
          accessibilityLabel="Create Workout"
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons name="add" size={rf(18)} color={colors.text} style={styles.heroCtaIcon} />
          <Text style={styles.heroPrimaryCtaText} numberOfLines={1}>Create Workout</Text>
        </AnimatedPressable>

        {showAICta ? (
          <AnimatedPressable
            onPress={onAIGenerate}
            scaleValue={0.96}
            springConfig="snappy"
            hapticType="light"
            style={styles.heroSecondaryCta}
            accessibilityRole="button"
            accessibilityLabel="Generate with AI"
          >
            <Ionicons name="sparkles-outline" size={rf(16)} color={colors.primary} style={styles.heroCtaIcon} />
            <Text style={styles.heroSecondaryCtaText} numberOfLines={1}>Generate with AI</Text>
          </AnimatedPressable>
        ) : null}
      </Animated.View>
    </View>
  );
};

// ============================================================================
// FLAT START CTA — gradient button (radius 16, minHeight 52)
// ============================================================================

interface StartCtaProps {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  testID: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

const StartCta: React.FC<StartCtaProps> = ({
  label,
  disabled,
  onPress,
  testID,
  accessibilityLabel,
  accessibilityHint,
}) => (
  <AnimatedPressable
    onPress={onPress}
    disabled={disabled}
    testID={testID}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityHint={accessibilityHint}
    style={[styles.startCta, disabled && styles.startCtaDisabled]}
    scaleValue={0.97}
    springConfig="snappy"
    hapticType="light"
  >
    <LinearGradient
      colors={[colors.primary, colors.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
    <Text style={styles.startCtaText} numberOfLines={1}>
      {label}
    </Text>
  </AnimatedPressable>
);

// ============================================================================
// GRID CARD (flat tile)
// ============================================================================

interface GridCardProps {
  template: WorkoutTemplate;
  index: number;
  selected: boolean;
  multiSelect: boolean;
  bookmarked: boolean;
  onPress: (t: WorkoutTemplate) => void;
  onLongPress: (t: WorkoutTemplate) => void;
  onToggleSelect: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onStart: (t: WorkoutTemplate) => void;
}

const TemplateGridCard: React.FC<GridCardProps> = ({
  template,
  index,
  selected,
  multiSelect,
  bookmarked,
  onPress,
  onLongPress,
  onToggleSelect,
  onToggleBookmark,
  onStart,
}) => {
  const duration = template.estimatedDurationMinutes ?? 0;
  const exerciseCount = template.exercises.length;
  const difficulty = template.difficulty;

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
      {/* Card shell is a plain View; the pressable wraps ONLY the
          thumbnail + body so the Start CTA below and the bookmark overlay
          stay interactive SIBLINGS (no Pressable ancestor of another
          Pressable — web DOM / a11y-tree safe). */}
      <View style={styles.gridCardWrap}>
        <View style={[styles.gridTile, selected && styles.gridTileSelected]}>
          <AnimatedPressable
            onPress={handleCardPress}
            onLongPress={() => onLongPress(template)}
            scaleValue={0.97}
            springConfig="snappy"
            hapticType={multiSelect ? "selection" : "light"}
            testID={`template-card-${template.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${template.name}, ${exerciseCount} exercises`}
          >
            {/* Gradient thumbnail */}
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gridThumb}
            >
              <Ionicons name="barbell" size={rf(26)} color={colors.text} />
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
                      color={colors.text}
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
              <Text style={styles.gridMeta} numberOfLines={1}>
                {exerciseCount} exercise{exerciseCount === 1 ? "" : "s"}
                {duration > 0 ? ` • ${duration}m` : ""}
              </Text>
              <Text style={[styles.gridLevel, difficulty ? { color: DIFFICULTY_TINT[difficulty] } : { color: colors.textTertiary }]} numberOfLines={1}>
                {difficulty ? DIFFICULTY_LABEL[difficulty] : "Any level"}
              </Text>
            </View>
          </AnimatedPressable>

          {/* Start CTA (non-multiselect only) — sibling of the card
              pressable, never nested inside it. */}
          {!multiSelect ? (
            <View style={styles.gridCtaWrap}>
              <StartCta
                label="Start"
                disabled={template.exercises.length === 0}
                onPress={() => onStart(template)}
                testID={`start-button-${template.id}`}
                accessibilityLabel={`Start ${template.name}`}
                accessibilityHint={
                  template.exercises.length === 0
                    ? "Template has no exercises yet"
                    : "Begin a workout session from this template"
                }
              />
            </View>
          ) : null}
        </View>
      </View>
      {/* Bookmark icon (Phase 10) — top-right corner overlay. Rendered as an
          absolute SIBLING of the card pressable (never nested inside it) so
          the web DOM has a single interactive ancestor. Hidden during
          multi-select so it doesn't conflict with the selection checkbox. */}
      {!multiSelect ? (
        <AnimatedPressable
          onPress={() => onToggleBookmark(template.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.gridBookmarkBtn}
          accessibilityRole="button"
          accessibilityLabel={
            bookmarked ? "Remove bookmark" : "Bookmark template"
          }
          testID={`bookmark-${template.id}`}
          scaleValue={0.9}
          springConfig="snappy"
          hapticType="light"
        >
          <Ionicons
            name={bookmarked ? "bookmark" : "bookmark-outline"}
            size={rf(18)}
            color={colors.text}
          />
        </AnimatedPressable>
      ) : null}
    </Animated.View>
  );
};

// ============================================================================
// LIST ROW (flat)
// ============================================================================

interface ListRowProps {
  template: WorkoutTemplate;
  index: number;
  selected: boolean;
  multiSelect: boolean;
  menuOpen: boolean;
  bookmarked: boolean;
  onPress: (t: WorkoutTemplate) => void;
  onLongPress: (t: WorkoutTemplate) => void;
  onToggleSelect: (id: string) => void;
  onToggleMenu: (id: string) => void;
  onToggleBookmark: (id: string) => void;
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
  bookmarked,
  onPress,
  onLongPress,
  onToggleSelect,
  onToggleMenu,
  onToggleBookmark,
  onEdit,
  onDuplicate,
  onDelete,
  onStart,
  onExerciseHistory,
}) => {
  const duration = template.estimatedDurationMinutes ?? 0;
  const exerciseCount = template.exercises.length;
  const difficulty = template.difficulty;
  const levelLabel = difficulty ? DIFFICULTY_LABEL[difficulty] : "Any level";
  const levelColor = difficulty ? DIFFICULTY_TINT[difficulty] : colors.textTertiary;

  const handleRowPress = useCallback(() => {
    if (multiSelect) {
      onToggleSelect(template.id);
    } else {
      onPress(template);
    }
  }, [multiSelect, onToggleSelect, onPress, template]);

  const metaParts = [
    `${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"}`,
    duration > 0 ? `${duration}m` : null,
    levelLabel,
  ].filter(Boolean) as string[];

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 30, 240)).duration(
        animations.duration.normal,
      )}
      style={styles.listItem}
    >
      {/* Row shell is a plain View. The pressable wraps ONLY the top band
          (icon + name/meta/muscles); the kebab menu button and bookmark are
          absolute SIBLINGS, and the exercise-history rows / inline menu /
          Start CTA below are flow siblings — no Pressable is ever an
          ancestor of another Pressable (web DOM / a11y-tree safe). */}
      <View style={selected ? styles.listRowSelected : undefined}>
        <AnimatedPressable
          onPress={handleRowPress}
          onLongPress={() => onLongPress(template)}
          scaleValue={0.98}
          springConfig="smooth"
          hapticType={multiSelect ? "selection" : "light"}
          testID={`template-card-${template.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${template.name}, ${exerciseCount} exercises`}
          style={styles.listRow}
        >
          {/* Icon square — gradient tinted */}
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.listIconSquare}
          >
            <Ionicons name="barbell" size={rf(18)} color={colors.text} />
          </LinearGradient>

          {/* Header band */}
          <View style={styles.listBody}>
            <View style={styles.listHeaderRow}>
              <Text
                style={[
                  styles.listName,
                  // Reserve space for the absolutely-positioned kebab +
                  // bookmark overlays (rendered as siblings below) so long
                  // names don't run underneath them.
                  !multiSelect && {
                    paddingRight: LIST_MENU_BTN_W + LIST_BOOKMARK_W,
                  },
                ]}
                numberOfLines={1}
              >
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
                      color={colors.text}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>

            {/* Meta line: exercises • duration • level (muted, level tinted) */}
            <Text style={styles.listMeta} numberOfLines={1}>
              {metaParts.map((part, i) => (
                <Text
                  key={i}
                  style={part === levelLabel ? { color: levelColor, fontWeight: "600" } : undefined}
                >
                  {i > 0 ? "  •  " : ""}
                  {part}
                </Text>
              ))}
            </Text>

            {/* Muscle groups — muted text, not boxed badges */}
            {template.targetMuscleGroups.length > 0 ? (
              <Text style={styles.listMuscles} numberOfLines={1}>
                {template.targetMuscleGroups.join("  ·  ")}
              </Text>
            ) : null}
          </View>
        </AnimatedPressable>

        {/* Kebab — absolute SIBLING overlaying the header corner (never
            nested inside the row pressable). Hidden during multi-select. */}
        {!multiSelect ? (
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
              color={colors.textSecondary}
            />
          </AnimatedPressable>
        ) : null}

        {/* Lower band — indented to align with the header text column
            (row padding + icon width + row gap). */}
        <View style={styles.listLower}>
          {/* Exercise quick list (preserves GAP-14 history tap) — flat rows with hairlines */}
          <View style={styles.exerciseListContainer}>
            {template.exercises.slice(0, 3).map((ex, idx) => (
              <View key={`${ex.exerciseId}-${idx}`} style={styles.exerciseRowWrap}>
                <AnimatedPressable
                  style={styles.exerciseRow}
                  onPress={() => onExerciseHistory(ex.exerciseId, ex.name)}
                  testID={`exercise-history-${template.id}-${idx}`}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${ex.name} history`}
                  scaleValue={0.97}
                  springConfig="snappy"
                  hapticType="light"
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
                </AnimatedPressable>
                {idx < Math.min(template.exercises.length, 3) - 1 ? (
                  <View style={styles.exerciseSeparator} />
                ) : null}
              </View>
            ))}
            {template.exercises.length > 3 ? (
              <Text style={styles.moreExercises}>
                +{template.exercises.length - 3} more
              </Text>
            ) : null}
          </View>

          {/* Inline menu (preserved from original) — flat */}
          {menuOpen ? (
            <Animated.View entering={FadeIn.duration(150)} style={styles.menu} testID={`menu-${template.id}`}>
              <AnimatedPressable
                style={styles.menuItem}
                onPress={() => onEdit(template)}
                testID={`edit-button-${template.id}`}
                accessibilityRole="button"
                accessibilityLabel="Edit template"
              >
                <Ionicons name="create-outline" size={rf(16)} color={colors.text} />
                <Text style={styles.menuItemText}>Edit</Text>
              </AnimatedPressable>
              <View style={styles.menuSeparator} />
              <AnimatedPressable
                style={styles.menuItem}
                onPress={() => onDuplicate(template)}
                testID={`duplicate-button-${template.id}`}
                accessibilityRole="button"
                accessibilityLabel="Duplicate template"
              >
                <Ionicons name="copy-outline" size={rf(16)} color={colors.text} />
                <Text style={styles.menuItemText}>Duplicate</Text>
              </AnimatedPressable>
              <View style={styles.menuSeparator} />
              <AnimatedPressable
                style={styles.menuItem}
                onPress={() => onDelete(template)}
                testID={`delete-button-${template.id}`}
                accessibilityRole="button"
                accessibilityLabel="Delete template"
              >
                <Ionicons name="trash-outline" size={rf(16)} color={colors.error} />
                <Text style={[styles.menuItemText, styles.deleteText]}>Delete</Text>
              </AnimatedPressable>
            </Animated.View>
          ) : null}

          {/* Start CTA */}
          {!multiSelect ? (
            <View style={styles.listCtaWrap}>
              <StartCta
                label="Start"
                disabled={template.exercises.length === 0}
                onPress={() => onStart(template)}
                testID={`start-button-${template.id}`}
                accessibilityLabel={`Start ${template.name}`}
                accessibilityHint={
                  template.exercises.length === 0
                    ? "Template has no exercises yet"
                    : "Begin a workout session from this template"
                }
              />
            </View>
          ) : null}
        </View>
      </View>
      {/* Bookmark — absolute SIBLING overlaying the header corner (never
          nested inside the row pressable) so the web DOM has a single
          interactive ancestor. Hidden during multi-select. */}
      {!multiSelect ? (
        <AnimatedPressable
          onPress={() => onToggleBookmark(template.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.listBookmarkBtn}
          accessibilityRole="button"
          accessibilityLabel={
            bookmarked ? "Remove bookmark" : "Bookmark template"
          }
          testID={`bookmark-${template.id}`}
          scaleValue={0.9}
          springConfig="snappy"
          hapticType="light"
        >
          <Ionicons
            name={bookmarked ? "bookmark" : "bookmark-outline"}
            size={rf(18)}
            color={bookmarked ? colors.primary : colors.textSecondary}
          />
        </AnimatedPressable>
      ) : null}
      {/* Hairline separator between rows */}
      <View style={styles.listSeparator} />
    </Animated.View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

/** Header action sizes — shared by layout math for the absolute bookmark
    overlays (grid + list), which sit as siblings outside the card pressable. */
const GRID_BOOKMARK_W = Math.max(rw(32), 44);
const LIST_BOOKMARK_W = Math.max(rw(36), 44);
const LIST_MENU_BTN_W = Math.max(rw(44), 44);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingSkeleton: {
    flex: 1,
    paddingTop: rp(spacing.sm),
    gap: rp(spacing.md),
  },
  loadingSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rp(spacing.sm),
    paddingHorizontal: rp(spacing.lg),
  },
  loadingSearchField: {
    flex: 1,
  },
  loadingTabs: {
    flexDirection: "row",
    gap: rp(spacing.sm),
    paddingHorizontal: rp(spacing.lg),
    overflow: "hidden",
  },
  loadingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: rp(spacing.lg),
  },
  loadingCard: {
    marginBottom: rp(spacing.md),
  },
  sheetFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 1300,
    elevation: 1300,
  },
  // ── Flat header ─────────────────────────────────────────────────────────────
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
  },
  scheduleBtn: {
    backgroundColor: hexToRgba(colors.primary, 0.12),
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xs),
    minHeight: Math.max(rw(36), 44),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: rbr(12),
  },
  scheduleBtnText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.primary,
    fontWeight: fw(typography.fontWeight.semibold),
  },
  addButton: {
    width: Math.max(rw(40), 44),
    height: Math.max(rw(40), 44),
    borderRadius: 999,
    backgroundColor: hexToRgba(colors.primary, 0.12),
    alignItems: "center",
    justifyContent: "center",
  },
  // ── Search ───────────────────────────────────────────────────────────────────
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
    paddingHorizontal: rp(spacing.lg),
    paddingBottom: rp(spacing.sm),
  },
  searchField: {
    flex: 1,
  },
  viewToggle: {
    width: Math.max(rw(48), 48),
    height: Math.max(rw(48), 48),
    borderRadius: rbr(12),
    backgroundColor: hexToRgba(colors.text, 0.06),
    alignItems: "center",
    justifyContent: "center",
  },
  // ── Tabs (plain pill text toggles) ───────────────────────────────────────────
  tabsRow: {
    width: '100%',
    paddingBottom: rp(spacing.xs),
  },
  tabsList: {
    width: '100%',
  },
  tabsContent: {
    paddingHorizontal: rp(spacing.lg),
    paddingRight: rp(spacing.lg),
    gap: rp(spacing.sm),
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xxs),
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    borderRadius: 999,
    minHeight: Math.max(rp(spacing.xl), 44),
  },
  tabChipActive: {
    backgroundColor: hexToRgba(colors.primary, 0.12),
  },
  tabChipIcon: {},
  tabChipText: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.medium),
    color: colors.textSecondary,
  },
  tabChipTextActive: {
    color: colors.primary,
    fontWeight: fw(typography.fontWeight.semibold),
  },
  tabChipTextLocked: {
    color: colors.textSecondary,
  },
  tabLockIcon: {
    marginLeft: rp(spacing.xxs),
  },
  // ── Collections sub-filter (same plain pill language) ───────────────────────
  collectionsRow: {
    width: '100%',
    paddingBottom: rp(spacing.sm),
  },
  collectionChip: {
    paddingVertical: rp(spacing.xs),
    paddingHorizontal: rp(spacing.md),
    minHeight: Math.max(rp(spacing.xl), 44),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  collectionChipActive: {
    backgroundColor: hexToRgba(colors.secondary, 0.12),
  },
  collectionChipText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.textSecondary,
    fontWeight: fw(typography.fontWeight.medium),
  },
  collectionChipTextActive: {
    color: colors.text,
    fontWeight: fw(typography.fontWeight.semibold),
  },
  // ── Multi-select bar (flat) ──────────────────────────────────────────────────
  multiBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: rp(spacing.lg),
    marginBottom: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    backgroundColor: hexToRgba(colors.primary, 0.1),
    borderRadius: rbr(16),
    zIndex: 50,
    elevation: 50,
  },
  multiBarText: {
    flex: 1,
    color: colors.text,
    fontSize: rf(typography.fontSize.body),
    fontWeight: fw(typography.fontWeight.semibold),
    marginLeft: rp(spacing.sm),
  },
  multiBarActions: {
    flexDirection: "row",
    gap: rp(spacing.sm),
  },
  multiBarBtn: {
    width: Math.max(rw(36), 44),
    height: Math.max(rw(36), 44),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: hexToRgba(colors.text, 0.06),
  },
  // ── Body ─────────────────────────────────────────────────────────────────────
  tabBody: {
    flex: 1,
  },
  emptyWrap: { flex: 1, justifyContent: "center" },
  // ── Hero empty state ────────────────────────────────────────────────────────
  heroEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: rp(spacing.xl),
    paddingVertical: rp(spacing.xxl),
  },
  heroIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: rp(spacing.xl),
  },
  heroGlow: {
    position: "absolute",
    width: rp(160),
    height: rp(160),
    borderRadius: 999,
    backgroundColor: hexToRgba(colors.primary, 0.18),
    transform: [{ scale: 1.1 }],
  },
  heroIconDisc: {
    width: rp(104),
    height: rp(104),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  heroEyebrow: {
    fontSize: rf(11),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: rp(spacing.sm),
  },
  heroTitle: {
    fontSize: rf(26),
    fontFamily: FONT_FAMILY.extrabold,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    lineHeight: rf(32),
  },
  heroSubtitle: {
    fontSize: rf(14),
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: rp(spacing.sm),
    lineHeight: rf(20),
    maxWidth: rw(300),
  },
  heroCtaRow: {
    marginTop: rp(spacing.xxl),
    alignItems: "center",
    gap: rp(spacing.sm),
    width: "100%",
  },
  heroPrimaryCta: {
    minHeight: Math.max(rh(54), 54),
    justifyContent: "center",
    alignItems: "center",
    borderRadius: rbr(16),
    overflow: "hidden",
    paddingHorizontal: rp(spacing.xl),
    paddingVertical: rp(spacing.md),
    flexDirection: "row",
    width: rw(260),
  } as ViewStyle,
  heroPrimaryCtaText: {
    color: colors.text,
    fontSize: rf(15),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
  },
  heroSecondaryCta: {
    minHeight: Math.max(rh(48), 48),
    justifyContent: "center",
    alignItems: "center",
    borderRadius: rbr(14),
    paddingHorizontal: rp(spacing.lg),
    paddingVertical: rp(spacing.sm),
    flexDirection: "row",
    backgroundColor: hexToRgba(colors.primary, 0.12),
  },
  heroSecondaryCtaText: {
    color: colors.primary,
    fontSize: rf(14),
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
  },
  heroCtaIcon: {
    marginRight: rp(spacing.xs),
  },
  list: {
    padding: rp(spacing.lg),
  },
  // ── Grid card (flat tile) ─────────────────────────────────────────────────────
  gridItem: {
    flexBasis: "48%",
    margin: 0,
    marginBottom: rp(spacing.sm),
  },
  gridCardWrap: {
    flex: 1,
  },
  gridTile: {
    flex: 1,
    backgroundColor: hexToRgba(colors.text, 0.04),
    borderRadius: rbr(16),
    overflow: "hidden",
  },
  gridTileSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
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
    borderColor: colors.text,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  gridCheckboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  gridBookmarkBtn: {
    position: "absolute",
    top: rp(spacing.xs),
    right: rp(spacing.xs),
    width: GRID_BOOKMARK_W,
    height: GRID_BOOKMARK_W,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  gridBody: {
    padding: rp(spacing.sm),
    gap: rp(spacing.xs),
  },
  gridName: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.semibold),
    color: colors.text,
  },
  gridMeta: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.textSecondary,
  },
  gridLevel: {
    fontSize: rf(typography.fontSize.micro),
    fontWeight: fw(typography.fontWeight.semibold),
  },
  gridCtaWrap: {
    paddingHorizontal: rp(spacing.sm),
    paddingBottom: rp(spacing.sm),
  },
  // ── Start CTA (gradient) ──────────────────────────────────────────────────────
  startCta: {
    minHeight: Math.max(rh(52), 52),
    justifyContent: "center",
    alignItems: "center",
    borderRadius: rbr(16),
    overflow: "hidden",
    paddingHorizontal: rp(spacing.md),
  } as ViewStyle,
  startCtaDisabled: {
    opacity: 0.4,
  },
  startCtaText: {
    color: colors.text,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.bold),
  },
  // ── List row (flat) ───────────────────────────────────────────────────────────
  listItem: {
    marginBottom: 0,
  },
  listRowSelected: {
    backgroundColor: hexToRgba(colors.primary, 0.08),
    borderRadius: rbr(16),
  },
  listRow: {
    flexDirection: "row",
    gap: rp(spacing.sm),
    alignItems: "flex-start",
    // Top band only: bottom padding lives on listLower (the sibling band
    // with exercise rows / menu / Start CTA) so spacing matches the old
    // single-pressable layout.
    paddingTop: rp(spacing.md),
    paddingHorizontal: rp(spacing.xs),
  },
  listLower: {
    // Indent to align with the header text column: row horizontal padding
    // + icon square width (rw(44)) + row gap.
    paddingLeft: rp(spacing.xs) + rw(44) + rp(spacing.sm),
    paddingRight: rp(spacing.xs),
    paddingBottom: rp(spacing.md),
  },
  listIconSquare: {
    width: rw(44),
    height: rw(44),
    borderRadius: rbr(12),
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
    fontWeight: fw(typography.fontWeight.semibold),
    color: colors.text,
    flex: 1,
  },
  listCheckbox: {
    width: rw(22),
    height: rw(22),
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  listCheckboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  listMeta: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.textSecondary,
    marginTop: rp(spacing.xs),
  },
  listMuscles: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.textTertiary,
    marginTop: rp(spacing.xxs),
    textTransform: "capitalize",
  },
  listBookmarkBtn: {
    // Absolute sibling overlay — sits where it used to in the header row:
    // vertically aligned with the name line, immediately left of the menu
    // button (row padding + menu width).
    position: "absolute",
    top: rp(spacing.md),
    right: rp(spacing.xs) + LIST_MENU_BTN_W,
    minWidth: LIST_BOOKMARK_W,
    minHeight: LIST_BOOKMARK_W,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  menuBtn: {
    // Absolute sibling overlay — sits where it used to in the header row:
    // vertically aligned with the name line, at the row's right edge (the
    // bookmark overlay sits immediately to its left).
    position: "absolute",
    top: rp(spacing.md),
    right: rp(spacing.xs),
    paddingLeft: rp(spacing.sm),
    paddingVertical: rp(spacing.xs),
    minWidth: LIST_MENU_BTN_W,
    minHeight: Math.max(rw(44), 44),
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  // ── Exercise quick list (flat rows + hairlines) ───────────────────────────────
  exerciseListContainer: {
    marginTop: rp(spacing.sm),
  },
  exerciseRowWrap: {
    // Wrapper for row + hairline.
  },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: rp(spacing.sm),
    minHeight: Math.max(rp(spacing.xl), 44),
  },
  exerciseRowName: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text,
    flex: 1,
  },
  exerciseRowMeta: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.primary,
    marginLeft: rp(spacing.xs),
  },
  exerciseSeparator: {
    height: 1,
    backgroundColor: hexToRgba(colors.text, 0.06),
  },
  moreExercises: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.textSecondary,
    marginTop: rp(spacing.xxs),
    paddingLeft: rp(spacing.xs),
    textAlign: "right",
  },
  // ── Menu (flat) ───────────────────────────────────────────────────────────────
  menu: {
    marginTop: rp(spacing.sm),
    backgroundColor: hexToRgba(colors.text, 0.06),
    borderRadius: rbr(12),
    overflow: "hidden",
    zIndex: 50,
    elevation: 50,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
    paddingVertical: rp(spacing.sm),
    minHeight: Math.max(rp(spacing.xl), 44),
    paddingHorizontal: rp(spacing.md),
  },
  menuSeparator: {
    height: 1,
    backgroundColor: hexToRgba(colors.text, 0.06),
  },
  menuItemText: {
    fontSize: rf(typography.fontSize.body),
    color: colors.text,
  },
  deleteText: { color: colors.error },
  // ── List CTA wrapper ──────────────────────────────────────────────────────────
  listCtaWrap: {
    marginTop: rp(spacing.md),
    maxWidth: rw(320),
    alignSelf: "stretch",
  },
  // ── Row separator ─────────────────────────────────────────────────────────────
  listSeparator: {
    height: 1,
    backgroundColor: hexToRgba(colors.text, 0.06),
    marginHorizontal: rp(spacing.xs),
  },
});
