import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  Platform,
  SectionList,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { AuroraSpinner } from "../../components/ui/aurora/AuroraSpinner";
import { EmptyState } from "../../components/ui/aurora/EmptyState";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { AchievementCategoryTabs } from "../../components/achievements/AchievementCategoryTabs";
import AchievementCard from "../../components/achievements/AchievementCard";
import { AchievementDetailModal } from "../../components/achievements/AchievementDetailModal";
import { useAchievementStore } from "../../stores/achievementStore";
import { useAuth } from "../../hooks/useAuth";
import {
  AchievementCategory,
  Achievement,
} from "../../services/achievements/types";
import { colors, typography } from "../../theme/aurora-tokens";
import { rh, rw, rf, rbr } from "../../utils/responsive";
import { Ionicons } from "@expo/vector-icons";

interface AchievementsScreenProps {
  onNavigateToTab?: (tab: string) => void;
  navigation?: any;
}

type AchievementSection = {
  title: string;
  subtitle: string;
  data: Achievement[];
};

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({
  navigation,
  onNavigateToTab,
}) => {
  const { user, guestId } = useAuth();
  const {
    achievements,
    userAchievements,
    isLoading,
    isInitialized,
    initialize,
  } = useAchievementStore();

  // Initialize achievement store on mount
  useEffect(() => {
    const userId = user?.id || guestId || "guest";
    initialize(userId);
  }, [user?.id, guestId, initialize]);
  const [selectedCategory, setSelectedCategory] = useState<
    AchievementCategory | "all"
  >("all");
  const [selectedAchievement, setSelectedAchievement] =
    useState<Achievement | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter achievements by selected category tab
  const filteredAchievements = useMemo(() => {
    if (selectedCategory === "all") {
      return achievements;
    }
    return achievements.filter((a) => a.category === selectedCategory);
  }, [achievements, selectedCategory]);

  // Partition into unlocked + in-progress + locked, each sorted sensibly.
  const { unlocked, inProgress, locked } = useMemo(() => {
    const unlocked: Achievement[] = [];
    const inProgress: Achievement[] = [];
    const locked: Achievement[] = [];

    for (const a of filteredAchievements) {
      const ua = userAchievements.get(a.id);
      if (ua?.isCompleted) {
        unlocked.push(a);
      } else if (ua && ua.progress > 0) {
        inProgress.push(a);
      } else {
        locked.push(a);
      }
    }

    // Unlocked: newest first
    unlocked.sort((a, b) => {
      const timeA = userAchievements.get(a.id)?.unlockedAt
        ? new Date(userAchievements.get(a.id)!.unlockedAt).getTime()
        : 0;
      const timeB = userAchievements.get(b.id)?.unlockedAt
        ? new Date(userAchievements.get(b.id)!.unlockedAt).getTime()
        : 0;
      return timeB - timeA;
    });

    // In-progress: highest progress fraction first
    inProgress.sort((a, b) => {
      const uaA = userAchievements.get(a.id);
      const uaB = userAchievements.get(b.id);
      const fracA =
        (uaA?.progress || 0) / Math.max(uaA?.maxProgress || 1, 1);
      const fracB =
        (uaB?.progress || 0) / Math.max(uaB?.maxProgress || 1, 1);
      return fracB - fracA;
    });

    // Locked: lower-tier (more attainable) first, then alphabetical
    const tierOrder: Record<string, number> = {
      bronze: 0,
      silver: 1,
      gold: 2,
      platinum: 3,
      diamond: 4,
      legendary: 5,
    };
    locked.sort((a, b) => {
      const tierDiff =
        (tierOrder[a.tier] ?? 99) - (tierOrder[b.tier] ?? 99);
      if (tierDiff !== 0) return tierDiff;
      return a.title.localeCompare(b.title);
    });

    return { unlocked, inProgress, locked };
  }, [filteredAchievements, userAchievements]);

  // SectionList needs sections; only render sections that have items (under
  // the active category filter). This is what makes "no achievements found"
  // disappear — we always show SOMETHING (at minimum the locked catalog).
  const sections: AchievementSection[] = useMemo(() => {
    const secs: AchievementSection[] = [];
    if (unlocked.length > 0) {
      secs.push({
        title: "Unlocked",
        subtitle: `${unlocked.length} earned`,
        data: unlocked,
      });
    }
    if (inProgress.length > 0) {
      secs.push({
        title: "In Progress",
        subtitle: `${inProgress.length} to go`,
        data: inProgress,
      });
    }
    if (locked.length > 0) {
      secs.push({
        title: "Locked",
        subtitle: `${locked.length} available`,
        data: locked,
      });
    }
    return secs;
  }, [unlocked, inProgress, locked]);

  // Stats banner numbers
  const stats = useMemo(() => {
    const total = achievements.length;
    const completed = unlocked.length;
    const totalFitCoins = unlocked.reduce((sum, a) => {
      const ua = userAchievements.get(a.id);
      return sum + (ua?.fitCoinsEarned || 0);
    }, 0);
    const completionRate =
      total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, totalFitCoins, completionRate };
  }, [achievements, unlocked, userAchievements]);

  const handleAchievementPress = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setModalVisible(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const userId = user?.id || guestId || "guest";
    try {
      await initialize(userId);
    } catch (err) {
      console.error("[AchievementsScreen] refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: Achievement }) => {
    const userProgress = userAchievements.get(item.id);
    return (
      <AchievementCard
        achievement={item}
        userProgress={userProgress}
        onPress={() => handleAchievementPress(item)}
      />
    );
  };

  const renderSectionHeader = ({
    section,
  }: {
    section: AchievementSection;
  }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
    </View>
  );

  // Loading state: store still initializing on first mount.
  const showLoading = isLoading && !isInitialized;

  // Motivational empty state: only for a brand-new user with no unlocked,
  // no in-progress, AND the catalog hasn't loaded yet OR is genuinely empty.
  // Since the catalog is non-empty by design, this branch only fires before
  // initialize populates the store.
  const catalogEmpty = achievements.length === 0 && !showLoading;

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          {navigation && (
            <AnimatedPressable
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="back"
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={colors.text.primary}
              />
            </AnimatedPressable>
          )}
          <Text style={styles.headerTitle}>Achievements</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Stats banner — only once we have a catalog */}
        {!catalogEmpty && (
          <View style={styles.statsBanner}>
            <View style={styles.statItem}>
              <Text
                style={styles.statValue}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {stats.completed}
              </Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text
                style={styles.statValue}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {stats.completionRate}%
              </Text>
              <Text style={styles.statLabel}>Complete</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text
                style={styles.statValue}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                🪙 {stats.totalFitCoins}
              </Text>
              <Text style={styles.statLabel}>FitCoins</Text>
            </View>
          </View>
        )}

        <AchievementCategoryTabs
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {showLoading ? (
          <View style={styles.loadingContainer}>
            <AuroraSpinner size="lg" />
            <Text style={styles.loadingText}>Loading achievements...</Text>
          </View>
        ) : catalogEmpty ? (
          <EmptyState
            icon="trophy-outline"
            title="Your journey starts here"
            subtitle="Complete your first workout to start unlocking achievements and earning FitCoins!"
          />
        ) : (
          <Animated.View
            style={{ flex: 1 }}
            entering={Platform.OS !== "web" ? FadeIn.duration(300) : undefined}
          >
            <SectionList
              sections={sections}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              stickySectionHeadersEnabled={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.primary.DEFAULT}
                  colors={[colors.primary.DEFAULT]}
                />
              }
              ListEmptyComponent={
                // Reached only if a category filter yields zero achievements
                // (shouldn't happen with the current catalog, but stay safe).
                <EmptyState
                  icon="search-outline"
                  title="Nothing here yet"
                  subtitle="Switch to another category or complete an activity to unlock achievements here."
                />
              }
            />
          </Animated.View>
        )}

        <AchievementDetailModal
          visible={modalVisible}
          achievement={selectedAchievement}
          userAchievement={
            selectedAchievement
              ? userAchievements.get(selectedAchievement.id)
              : undefined
          }
          onClose={() => setModalVisible(false)}
        />
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rw(16),
    paddingVertical: rh(16),
  },
  backButton: {
    width: Math.max(rw(10), 44),
    height: Math.max(rw(10), 44),
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: rf(20),
    fontWeight: "700",
    color: colors.text.primary,
  },
  placeholder: {
    width: Math.max(rw(10), 44),
  },
  listContent: {
    paddingHorizontal: rw(16),
    paddingBottom: rh(32),
  },
  statsBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginHorizontal: rw(16),
    marginBottom: rh(12),
    paddingVertical: rh(12),
    paddingHorizontal: rw(16),
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: rbr(16),
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },
  statValue: {
    fontSize: rf(18),
    fontWeight: "800",
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: rf(10),
    color: colors.text.tertiary,
    marginTop: rh(2),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: rh(32),
    backgroundColor: colors.glass.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: rh(20),
    marginBottom: rh(8),
    paddingHorizontal: rw(4),
  },
  sectionTitle: {
    fontSize: rf(15),
    fontWeight: "700",
    color: colors.text.primary,
  },
  sectionSubtitle: {
    fontSize: rf(12),
    color: colors.text.tertiary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: rh(80),
  },
  loadingText: {
    color: colors.text.secondary,
    fontSize: rf(14),
    marginTop: rh(16),
  },
});
