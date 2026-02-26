import React from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { Button } from "../../ui";
import { ResponsiveTheme } from "../../../utils/constants";

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
        placeholderTextColor={ResponsiveTheme.colors.textMuted}
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
    padding: ResponsiveTheme.spacing.md,
  },

  customInputLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold as "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  customTextInput: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  customInputActions: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.sm,
  },

  customActionButton: {
    flex: 1,
  },
});
