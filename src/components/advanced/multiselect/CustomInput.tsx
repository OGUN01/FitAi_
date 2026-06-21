import React from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { Button } from "../../ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";

interface CustomInputProps {
  customValue: string;
  setCustomValue: (value: string) => void;
  handleAddCustom: () => void;
  setShowCustomInput: (show: boolean) => void;
  customPlaceholder: string;
  label?: string;
}

export const CustomInput: React.FC<CustomInputProps> = ({
  customValue,
  setCustomValue,
  handleAddCustom,
  setShowCustomInput,
  customPlaceholder,
  label,
}) => {
  return (
    <View style={styles.customInputContainer}>
      <Text style={styles.customInputLabel}>
        Add Custom {label?.replace("Select ", "")}
      </Text>
      <TextInput
        style={styles.customTextInput}
        placeholder={customPlaceholder}
        placeholderTextColor={colors.textMuted}
        value={customValue}
        onChangeText={setCustomValue}
        autoFocus
      />
      <View style={styles.customInputActions}>
        <Button
          title="Cancel"
          onPress={() => {
            setShowCustomInput(false);
            setCustomValue("");
          }}
          variant="outline"
          style={styles.customActionButton}
        />
        <Button
          title="Add"
          onPress={handleAddCustom}
          variant="primary"
          style={styles.customActionButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  customInputContainer: {
    padding: spacing.md,
  },

  customInputLabel: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold as "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },

  customTextInput: {
    fontSize: fontSize.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },

  customInputActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  customActionButton: {
    flex: 1,
  },
});
