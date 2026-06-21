import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize } from "../../../theme/aurora-tokens";

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
      <TouchableOpacity
        style={[styles.tab, activeTab === "instructions" && styles.activeTab]}
        onPress={() => onTabChange("instructions")}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "instructions" && styles.activeTabText,
          ]}
        >
          Instructions
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === "details" && styles.activeTab]}
        onPress={() => onTabChange("details")}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "details" && styles.activeTabText,
          ]}
        >
          Details
        </Text>
      </TouchableOpacity>
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
    borderRadius: borderRadius.md,
    alignItems: "center",
  },

  activeTab: {
    backgroundColor: colors.primary,
  },

  tabText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  activeTabText: {
    color: colors.surface,
  },
});
