import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { THEME } from "../../ui";

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
    marginTop: THEME.spacing.xs,
  },

  selectedTag: {
    backgroundColor: THEME.colors.primary + "20",
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs / 2,
    borderRadius: THEME.borderRadius.sm,
    marginRight: THEME.spacing.xs,
    borderWidth: 1,
    borderColor: THEME.colors.primary + "40",
  },

  selectedTagText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.medium as "500",
  },
});
