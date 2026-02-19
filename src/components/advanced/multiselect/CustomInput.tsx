import React from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { Button, THEME } from "../../ui";

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
        placeholderTextColor={THEME.colors.textMuted}
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
    padding: THEME.spacing.md,
  },

  customInputLabel: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold as "600",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  customTextInput: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    marginBottom: THEME.spacing.md,
  },

  customInputActions: {
    flexDirection: "row",
    gap: THEME.spacing.sm,
  },

  customActionButton: {
    flex: 1,
  },
});
