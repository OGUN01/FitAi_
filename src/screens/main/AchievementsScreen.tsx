import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  Platform,
  SectionList,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { AuroraSpinner } from "../../components/ui/aurora/AuroraSpinner";
import { EmptyState } from "../../components/ui/aurora/EmptyState";
import { GlassHeader } from "../../components/ui/aurora/GlassHeader";
import { AchievementCategoryTabs } from "../../components/achievements/AchievementCategoryTabs";
import AchievementCard from "../../components/achievements/AchievementCard";
import { AchievementDetailModal } from "../../components/achievements/AchievementDetailModal";
import { useAchievementStore } from "../../stores/achievementStore";
import { useAuth } from "../../hooks/useAuth";
import {
  AchievementCategory,
  Achievement,
} from "../../services/achievements/types";
import {
  surface,
  border,
  chart,
  colors,
  typography,
  spacing,
  borderRadius,
} from "../../theme/aurora-tokens";
import { rf } from "../../utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useReducedMotion } from "../../utils/accessibility/hooks";

interface AchievementsScreenProps {
  navigation?: any;
}

type AchievementSection = {
  title: string;
  subtitle: string;
  data: Achievement[][];
};

// Chunks a flat list into pairs so each SectionList row can render a
// 2-column grid of AchievementCard (SectionList has no numColumns support,
// unlike the FlatList grid pattern in TemplateLibraryScreen).
function chunkPairs<T>(items: T[]): T[][] {
  const pairs: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push(items.slice(i, i + 2));
  }
  return pairs;
}

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({
  navigation,
}) => {
  const reducedMotion = useReducedMotion();
  const { user, guestId } = useAuth();
  const {
    achievements,
    userAchievements,
    isLoading,
    isInitialized,
    initialize,
  } = useAchievementStore();

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

  const filteredAchievements = useMemo(() => {
    if (selectedCategory === "all") {
      return achievements;
    }
    return achievements.filter((a) => a.category === selectedCategory);
  }, [achievements, selectedCategory]);

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

    unlocked.sort((a, b) => {
      const timeA = userAchievements.get(a.id)?.unlockedAt
        ? new Date(userAchievements.get(a.id)!.unlockedAt).getTime()
        : 0;
      const timeB = userAchievements.get(b.id)?.unlockedAt
        ? new Date(userAchievements.get(b.id)!.unlockedAt).getTime()
        : 0;
      return timeB - timeA;
    });

    inProgress.sort((a, b) => {
      const uaA = userAchievements.get(a.id);
      const uaB = userAchievements.get(b.id);
      const fracA =
        (uaA?.progress || 0) / Math.max(uaA?.maxProgress || 1, 1);
      const fracB =
        (uaB?.progress || 0) / Math.max(uaB?.maxProgress || 1, 1);
      return fracB - fracA;
    });

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

  const sections: AchievementSection[] = useMemo(() => {
    const secs: AchievementSection[] = [];
    if (unlocked.length > 0) {
      secs.push({
        title: "Unlocked",
        subtitle: `${unlocked.length} earned`,
        data: chunkPairs(unlocked),
      });
    }
    if (inProgress.length > 0) {
      secs.push({
        title: "In Progress",
        subtitle: `${inProgress.length} to go`,
        data: chunkPairs(inProgress),
      });
    }
    if (locked.length > 0) {
      secs.push({
        title: "Locked",
        subtitle: `${locked.length} available`,
        data: chunkPairs(locked),
      });
    }
    return secs;
  }, [unlocked, inProgress, locked]);

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

  const handleAchievementPress = useCallback((achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setModalVisible(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const userId = user?.id || guestId || "guest";
    try {
      await initialize(userId);
    } catch (err) {
      console.error("[AchievementsScreen] refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, guestId, initialize]);

  const renderItem = useCallback(
    ({ item }: { item: Achievement[] }) => {
      return (
        <View style={styles.cardRow}>
          {item.map((achievement) => (
            <View style={styles.cardCol} key={achievement.id}>
              <AchievementCard
                achievement={achievement}
                userProgress={userAchievements.get(achievement.id)}
                onPress={() => handleAchievementPress(achievement)}
              />
            </View>
          ))}
          {item.length === 1 && <View style={styles.cardCol} />}
        </View>
      );
    },
    [userAchievements, handleAchievementPress]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: AchievementSection }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} numberOfLines={1}>{section.title}</Text>
        <Text style={styles.sectionSubtitle} numberOfLines={1}>{section.subtitle}</Text>
      </View>
    ),
    []
  );

  const showLoading = isLoading && !isInitialized;
  const catalogEmpty = achievements.length === 0 && !showLoading;

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <GlassHeader
          title="Achievements"
          onBack={navigation ? () => navigation.goBack() : undefined}
          backAccessibilityLabel="back"
        />

        {!catalogEmpty && (
          <Animated.View
            entering={
              Platform.OS !== "web" && !reducedMotion
                ? FadeInDown.delay(100).duration(350)
                : undefined
            }
            style={styles.statsStrip}
          >
            <View style={styles.statItem}>
              <Text style={styles.statValue} numberOfLines={1}>
                {stats.completed}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>Earned</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue} numberOfLines={1}>
                {stats.completionRate}%
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>Complete</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statValueRow}>
                <Ionicons name="ribbon-outline" size={rf(14)} color={chart[5]} />
                <Text style={styles.statValue} numberOfLines={1}>
                  {stats.totalFitCoins}
                </Text>
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>FitCoins</Text>
            </View>
          </Animated.View>
        )}

        <AchievementCategoryTabs
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {showLoading ? (
          <View style={styles.loadingContainer}>
            <AuroraSpinner size="lg" />
            <Text style={styles.loadingText} numberOfLines={1}>Loading achievements...</Text>
          </View>
        ) : catalogEmpty ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Couldn't load achievements"
            subtitle="Check your connection and try again."
            ctaText="Retry"
            onCta={handleRefresh}
          />
        ) : (
          <Animated.View
            style={styles.flexContainer}
            entering={
              Platform.OS !== "web" && !reducedMotion ? FadeIn.duration(300) : undefined
            }
          >
            <SectionList
              sections={sections}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              keyExtractor={(item) => item.map((a) => a.id).join("-")}
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
  flexContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: surface[1],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: border.subtle,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },
  statValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(18),
    color: colors.text.primary,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statLabel: {
    ...typography.variants.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: "60%",
    backgroundColor: border.subtle,
  },
  cardRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cardCol: {
    flex: 1,
    minWidth: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    ...typography.variants.sectionTitle,
    color: colors.text.primary,
  },
  sectionSubtitle: {
    ...typography.variants.caption,
    color: colors.text.secondary,
  },
  loadingContainer: {
    minHeight: 400,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
  },
  loadingText: {
    ...typography.variants.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
});
