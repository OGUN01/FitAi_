import React from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  View,
} from "react-native";
import { flatColors as colors } from "../../theme/aurora-tokens";
import { AchievementCategory } from "../../services/achievements/types";
import { rh, rw, rf, rbr } from "../../utils/responsive";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { haptics } from "../../utils/haptics";

interface AchievementCategoryTabsProps {
  selectedCategory: AchievementCategory | "all";
  onSelectCategory: (category: AchievementCategory | "all") => void;
}

const CATEGORIES: { id: AchievementCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "fitness", label: "Fitness" },
  { id: "nutrition", label: "Nutrition" },
  { id: "wellness", label: "Wellness" },
  { id: "consistency", label: "Streak" },
  { id: "milestone", label: "Milestones" },
  { id: "social", label: "Social" },
  { id: "challenge", label: "Challenges" },
  { id: "special", label: "Special" },
];

export const AchievementCategoryTabs: React.FC<
  AchievementCategoryTabsProps
> = ({ selectedCategory, onSelectCategory }) => {

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category.id;
          return (
            <AnimatedPressable
              key={category.id}
              style={[styles.tab, isSelected && styles.selectedTab]}
              onPress={() => {
                haptics.light();
                onSelectCategory(category.id);
              }}
              scaleValue={0.95}
              hapticFeedback={false}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={category.label}
            >
              <Text
                style={[styles.tabText, isSelected && styles.selectedTabText]}
                numberOfLines={1}
              >
                {category.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Use minHeight instead of fixed height so the row can grow with the
    // user's font scale (the previous height: rh(48) clipped tabs at large
    // text sizes).
    minHeight: 44,
    marginBottom: rh(8),
  },
  scrollContent: {
    paddingHorizontal: rw(16),
    alignItems: "center",
  },
  tab: {
    paddingHorizontal: rw(16),
    paddingVertical: rh(8),
    borderRadius: rbr(20),
    marginRight: rw(8),
    backgroundColor: colors.glassSurface,
    borderWidth: 1,
    borderColor: colors.glassHighlight,
    minHeight: 44,
    justifyContent: "center" as const,
  },
  selectedTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: rf(14),
    fontWeight: "500",
  },
  selectedTabText: {
    color: colors.white,
    fontWeight: "700",
  },
});
