import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { AchievementCategoryTabs } from "../../components/achievements/AchievementCategoryTabs";
import AchievementCard from "../../components/achievements/AchievementCard";
import { AchievementDetailModal } from "../../components/achievements/AchievementDetailModal";
import { useAchievementStore } from "../../stores/achievementStore";
import { useAuth } from "../../hooks/useAuth";
import {
  AchievementCategory,
  Achievement,
} from "../../services/achievements/types";
import { ResponsiveTheme } from "../../utils/constants";
import { rh, rw, rf } from "../../utils/responsive";
import { Ionicons } from "@expo/vector-icons";

interface AchievementsScreenProps {
  onNavigateToTab?: (tab: string) => void;
  navigation?: any;
}

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({
  navigation,
  onNavigateToTab,
}) => {
  const { user } = useAuth();
  const {
    achievements,
    userAchievements,
    getAchievementsByCategory,
    isLoading,
  } = useAchievementStore();
  const [selectedCategory, setSelectedCategory] = useState<
    AchievementCategory | "all"
  >("all");
  const [selectedAchievement, setSelectedAchievement] =
    useState<Achievement | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Filter achievements
  const filteredAchievements = useMemo(() => {
    if (selectedCategory === "all") {
      return achievements;
    }
    return achievements.filter((a) => a.category === selectedCategory);
  }, [achievements, selectedCategory]);

  // Sort: Unlocked first, then by progress, then locked
  const sortedAchievements = useMemo(() => {
    return [...filteredAchievements].sort((a, b) => {
      const uaA = userAchievements.get(a.id);
      const uaB = userAchievements.get(b.id);

      const isCompletedA = uaA?.isCompleted || false;
      const isCompletedB = uaB?.isCompleted || false;

      if (isCompletedA && !isCompletedB) return -1;
      if (!isCompletedA && isCompletedB) return 1;

      // If both completed, sort by date (newest first)
      if (isCompletedA && isCompletedB) {
        return (
          new Date(uaB!.unlockedAt).getTime() -
          new Date(uaA!.unlockedAt).getTime()
        );
      }

      // If both incomplete, sort by progress (highest first)
      const progressA = uaA?.progress || 0;
      const progressB = uaB?.progress || 0;

      return progressB - progressA;
    });
  }, [filteredAchievements, userAchievements]);

  const handleAchievementPress = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setModalVisible(true);
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

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          {navigation && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={ResponsiveTheme.colors.text}
              />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Achievements</Text>
          <View style={styles.placeholder} />
        </View>

        <AchievementCategoryTabs
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        <Animated.FlatList
          data={sortedAchievements}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          entering={FadeIn.duration(300)}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No achievements found</Text>
            </View>
          }
        />

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
    paddingHorizontal: rw(4),
    paddingVertical: rh(2),
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: rf(2.2),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  placeholder: {
    width: 40,
  },
  listContent: {
    paddingHorizontal: rw(4),
    paddingBottom: rh(4),
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: rh(10),
  },
  emptyText: {
    color: ResponsiveTheme.colors.textSecondary,
    fontSize: rf(1.8),
  },
});
