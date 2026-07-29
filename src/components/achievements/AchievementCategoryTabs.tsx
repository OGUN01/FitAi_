import React, { useEffect } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import {
  chart,
  colors,
  typography,
  spacing,
} from "../../theme/aurora-tokens";
import { AchievementCategory } from "../../services/achievements/types";
import { haptics } from "../../utils/haptics";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";

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

const TabItem: React.FC<{
  label: string;
  isSelected: boolean;
  onPress: () => void;
}> = ({ label, isSelected, onPress }) => {
  const indicatorScale = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    indicatorScale.value = withSpring(isSelected ? 1 : 0, {
      damping: 20,
      stiffness: 200,
    });
  }, [isSelected]);

  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: indicatorScale.value }],
    opacity: indicatorScale.value,
  }));

  return (
    <AnimatedPressable
      style={styles.tab}
      onPress={onPress}
      scaleValue={0.97}
      hapticFeedback={false}
      accessibilityRole="tab"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={label}
    >
      <Text
        style={[styles.tabText, isSelected && styles.tabTextActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Animated.View style={[styles.underline, underlineStyle]} />
    </AnimatedPressable>
  );
};

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
        {CATEGORIES.map((category) => (
          <TabItem
            key={category.id}
            label={category.label}
            isSelected={selectedCategory === category.id}
            onPress={() => {
              haptics.selection();
              onSelectCategory(category.id);
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.xs,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  tabText: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
  },
  tabTextActive: {
    fontFamily: "Manrope_600SemiBold",
    color: colors.text.primary,
  },
  underline: {
    position: "absolute",
    bottom: 2,
    left: spacing.md,
    right: spacing.md,
    height: 2,
    borderRadius: 1,
    backgroundColor: chart[1],
  },
});
