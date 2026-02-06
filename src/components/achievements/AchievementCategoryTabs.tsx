import React, { useRef, useEffect } from "react";
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Animated,
} from "react-native";
import { ResponsiveTheme } from "../../utils/constants";
import { AchievementCategory } from "../../services/achievements/types";
import { rh, rw, rf } from "../../utils/responsive";

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
  const scrollViewRef = useRef<ScrollView>(null);

  // Scroll to selected tab if needed (optional enhancement)

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category.id;
          return (
            <TouchableOpacity
              key={category.id}
              style={[styles.tab, isSelected && styles.selectedTab]}
              onPress={() => onSelectCategory(category.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.tabText, isSelected && styles.selectedTabText]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: rh(6),
    marginBottom: rh(1),
  },
  scrollContent: {
    paddingHorizontal: rw(4),
    alignItems: "center",
  },
  tab: {
    paddingHorizontal: rw(4),
    paddingVertical: rh(0.8),
    borderRadius: 20,
    marginRight: rw(2),
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  selectedTab: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },
  tabText: {
    color: ResponsiveTheme.colors.textSecondary,
    fontSize: rf(1.8),
    fontWeight: "500",
  },
  selectedTabText: {
    color: "#FFFFFF", // Always white for selected
    fontWeight: "700",
  },
});
