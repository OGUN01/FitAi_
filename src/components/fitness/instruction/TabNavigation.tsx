import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";

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
          📋 Instructions
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
          ℹ️ Details
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    backgroundColor: ResponsiveTheme.colors.surface,
    marginHorizontal: ResponsiveTheme.spacing.lg,
    marginTop: ResponsiveTheme.spacing.lg,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: ResponsiveTheme.spacing.xs,
  },

  tab: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    alignItems: "center",
  },

  activeTab: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },

  tabText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
  },

  activeTabText: {
    color: ResponsiveTheme.colors.surface,
  },
});
