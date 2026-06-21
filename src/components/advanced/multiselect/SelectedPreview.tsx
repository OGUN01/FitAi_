import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";

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
    marginTop: spacing.xs,
  },

  selectedTag: {
    backgroundColor: colors.primary + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary + "40",
  },

  selectedTagText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium as "500",
  },
});
