import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";

interface SelectedPreviewProps {
  selectedLabels: string[];
}

export const SelectedPreview: React.FC<SelectedPreviewProps> = ({
  selectedLabels,
}) => {
  if (selectedLabels.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.selectedPreview}
    >
      {selectedLabels.map((label) => (
        <View key={`selected-${label}`} style={styles.selectedTag}>
          <Text style={styles.selectedTagText} numberOfLines={1}>
            {label}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  selectedPreview: {
    marginTop: ResponsiveTheme.spacing.xs,
  },

  selectedTag: {
    backgroundColor: ResponsiveTheme.colors.primary + "20",
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs / 2,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    marginRight: ResponsiveTheme.spacing.xs,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primary + "40",
  },

  selectedTagText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium as "500",
  },
});
