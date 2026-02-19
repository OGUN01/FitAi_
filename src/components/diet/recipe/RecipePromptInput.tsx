import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rh, rs } from "../../../utils/responsive";

interface RecipePrompt {
  id: string;
  title: string;
  placeholder: string;
  icon: string;
  examples: string[];
}

interface RecipePromptInputProps {
  prompt: RecipePrompt;
  value: string;
  isActive: boolean;
  isRequired?: boolean;
  onChangeText: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onExamplePress: (example: string) => void;
}

export const RecipePromptInput: React.FC<RecipePromptInputProps> = ({
  prompt,
  value,
  isActive,
  isRequired,
  onChangeText,
  onFocus,
  onBlur,
  onExamplePress,
}) => {
  return (
    <View style={styles.promptSection}>
      <View style={styles.promptHeader}>
        <Text style={styles.promptIcon}>{prompt.icon}</Text>
        <Text style={styles.promptTitle}>{prompt.title}</Text>
        {isRequired && <Text style={styles.requiredIndicator}>*</Text>}
      </View>

      <TextInput
        style={[
          styles.textInput,
          isActive && styles.textInputFocused,
          value && styles.textInputFilled,
        ]}
        placeholder={prompt.placeholder}
        placeholderTextColor={ResponsiveTheme.colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        multiline={prompt.id === "description"}
        numberOfLines={prompt.id === "description" ? 3 : 1}
        textAlignVertical="top"
      />

      <Text style={styles.examplesLabel}>Suggestions:</Text>
      <View style={styles.examplesContainer}>
        {prompt.examples.map((example, exampleIndex) => (
          <TouchableOpacity
            key={exampleIndex}
            style={[
              styles.exampleChip,
              value === example && styles.exampleChipSelected,
            ]}
            onPress={() => onExamplePress(example)}
          >
            <Text
              style={[
                styles.exampleText,
                value === example && styles.exampleTextSelected,
              ]}
            >
              {example}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  promptSection: {
    padding: ResponsiveTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },

  promptHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  promptIcon: {
    fontSize: rf(20),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  promptTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },

  requiredIndicator: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.error,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  textInput: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: ResponsiveTheme.spacing.md,
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.border,
    minHeight: rh(44),
  },

  textInputFocused: {
    borderColor: ResponsiveTheme.colors.primary,
  },

  textInputFilled: {
    backgroundColor: ResponsiveTheme.colors.primary + "08",
  },

  examplesLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  examplesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
  },

  exampleChip: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.full,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },

  exampleChipSelected: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },

  exampleText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  exampleTextSelected: {
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
});
