import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rs, rbr, rp } from '../../../utils/responsive';
import { Option } from "../../../hooks/useMultiSelectWithCustom";

interface OptionsListProps {
  groupedOptions: Record<string, Option[]>;
  showRegions: boolean;
  isOptionSelected: (value: any) => boolean;
  canSelectMore: boolean;
  toggleOption: (option: Option) => void;
}

export const OptionsList: React.FC<OptionsListProps> = ({
  groupedOptions,
  showRegions,
  isOptionSelected,
  canSelectMore,
  toggleOption,
}) => {
  const entries = Object.entries(groupedOptions);

  if (entries.length === 0 || entries.every(([, opts]) => opts.length === 0)) {
    return (
      <View style={styles.noResults}>
        <Text style={styles.noResultsText}>No options found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.optionsContainer}
      showsVerticalScrollIndicator={false}
    >
      {entries.map(([region, regionOptions]) => (
        <View key={`region-${region}`}>
          {showRegions && region && (
            <Text style={styles.regionHeader}>{region}</Text>
          )}
          {regionOptions.map((option) => {
            const isSelected = isOptionSelected(option.value);
            const isDisabled =
              option.disabled ||
              (!canSelectMore && !isSelected && !option.isCustom);

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionItem,
                  isSelected && styles.optionItemSelected,
                  isDisabled && styles.optionItemDisabled,
                  option.isCustom && styles.optionItemCustom,
                ]}
                onPress={() => toggleOption(option)}
                disabled={isDisabled && !option.isCustom}
              >
                <View style={styles.optionContent}>
                  {option.icon && (
                    <Text style={styles.optionIcon}>{option.icon}</Text>
                  )}
                  <View style={styles.optionTextContainer}>
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                        isDisabled && styles.optionTextDisabled,
                        option.isCustom && styles.optionTextCustom,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {option.region && showRegions && (
                      <Text style={styles.optionRegion}>{option.region}</Text>
                    )}
                  </View>
                </View>

                {!option.isCustom && (
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                      isDisabled && styles.checkboxDisabled,
                    ]}
                  >
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  optionsContainer: {
    maxHeight: 300,
    paddingHorizontal: spacing.md,
  },

  regionHeader: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold as "600",
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
  },

  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs / 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },

  optionItemSelected: {
    backgroundColor: colors.primary + "20",
    borderWidth: 1,
    borderColor: colors.primary + "40",
  },

  optionItemDisabled: {
    opacity: 0.5,
  },

  optionItemCustom: {
    backgroundColor: colors.primary + "10",
    borderWidth: 1,
    borderColor: colors.primary + "30",
    borderStyle: "dashed",
  },

  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  optionIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing.sm,
  },

  optionTextContainer: {
    flex: 1,
  },

  optionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },

  optionTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold as "600",
  },

  optionTextDisabled: {
    color: colors.textMuted,
  },

  optionTextCustom: {
    color: colors.primary,
    fontWeight: typography.fontWeight.medium as "500",
  },

  optionRegion: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: rp(2),
  },

  checkbox: {
    width: rs(24),
    height: rs(24),
    borderRadius: rbr(4),
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },

  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  checkboxDisabled: {
    opacity: 0.5,
  },

  checkmark: {
    fontSize: fontSize.sm,
    color: colors.white,
    fontWeight: typography.fontWeight.bold as "700",
  },

  noResults: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },

  noResultsText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
});
