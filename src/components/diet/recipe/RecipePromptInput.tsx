import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rf, rh } from "../../../utils/responsive";

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
        placeholderTextColor={colors.textMuted}
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
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  promptHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  promptIcon: {
    fontSize: rf(20),
    marginRight: spacing.sm,
  },

  promptTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },

  requiredIndicator: {
    fontSize: rf(16),
    color: colors.error,
    fontWeight: typography.fontWeight.bold,
  },

  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    minHeight: rh(44),
  },

  textInputFocused: {
    borderColor: colors.primary,
  },

  textInputFilled: {
    backgroundColor: colors.primary + "08",
  },

  examplesLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: typography.fontWeight.medium,
  },

  examplesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  exampleChip: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },

  exampleChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  exampleText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  exampleTextSelected: {
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },
});
