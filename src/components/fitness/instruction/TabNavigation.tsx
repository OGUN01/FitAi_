import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { THEME } from "../../ui";

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
    backgroundColor: THEME.colors.surface,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.xs,
  },

  tab: {
    flex: 1,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    alignItems: "center",
  },

  activeTab: {
    backgroundColor: THEME.colors.primary,
  },

  tabText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: "600",
    color: THEME.colors.textSecondary,
  },

  activeTabText: {
    color: THEME.colors.surface,
  },
});
