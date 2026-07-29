import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize } from "../../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../../theme/fonts";
import { AnimatedPressable } from "../../ui/aurora/AnimatedPressable";

interface TabNavigationProps {
  activeTab: "instructions" | "details";
  onTabChange: (tab: "instructions" | "details") => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <View style={styles.tabContainer}>
      <AnimatedPressable
        style={[styles.tab, activeTab === "instructions" && styles.activeTab]}
        onPress={() => onTabChange("instructions")}
        scaleValue={0.96}
        springConfig="snappy"
        hapticType="selection"
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === "instructions" }}
        accessibilityLabel="Show instructions tab"
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "instructions" && styles.activeTabText,
          ]}
        >
          Instructions
        </Text>
      </AnimatedPressable>
      <AnimatedPressable
        style={[styles.tab, activeTab === "details" && styles.activeTab]}
        onPress={() => onTabChange("details")}
        scaleValue={0.96}
        springConfig="snappy"
        hapticType="selection"
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === "details" }}
        accessibilityLabel="Show details tab"
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "details" && styles.activeTabText,
          ]}
        >
          Details
        </Text>
      </AnimatedPressable>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },

  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },

  activeTab: {
    backgroundColor: colors.primary,
  },

  tabText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
    color: colors.text,
  },

  // White text on the orange primary background — colors.surface (dark) was
  // ~3.2:1 borderline; white gives >4.5:1 AA pass.
  activeTabText: {
    color: colors.white,
  },
});
