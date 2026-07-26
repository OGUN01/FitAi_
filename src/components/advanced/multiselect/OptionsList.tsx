import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rs, rbr, rp, rf } from '../../../utils/responsive';
import { hexToRgba, TINT_ALPHA_LOW, TINT_ALPHA_SOFT, TINT_ALPHA_MEDIUM } from "../../../utils/colors";
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
        <Ionicons name="search-outline" size={rf(28)} color={colors.textMuted} />
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
            <Text style={styles.regionHeader} numberOfLines={1}>{region}</Text>
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
                accessibilityRole={option.isCustom ? "button" : "checkbox"}
                accessibilityLabel={option.label}
                accessibilityState={{ checked: isSelected, disabled: isDisabled && !option.isCustom }}
              >
                <View style={styles.optionContent}>
                  {option.icon && (
                    <Ionicons
                      name={option.icon as any}
                      size={rf(fontSize.lg)}
                      color={option.isCustom ? colors.primary : colors.textSecondary}
                      style={styles.optionIcon}
                    />
                  )}
                  <View style={styles.optionTextContainer}>
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                        isDisabled && styles.optionTextDisabled,
                        option.isCustom && styles.optionTextCustom,
                      ]}
                      numberOfLines={2}
                    >
                      {option.label}
                    </Text>
                    {option.region && showRegions && (
                      <Text style={styles.optionRegion} numberOfLines={1}>{option.region}</Text>
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
                    {isSelected && (
                      <Ionicons name="checkmark" size={rf(fontSize.sm)} color={colors.white} />
                    )}
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
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs / 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },

  optionItemSelected: {
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_SOFT),
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM),
  },

  optionItemDisabled: {
    opacity: 0.5,
  },

  optionItemCustom: {
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW + 0.05),
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM + 0.1),
    borderStyle: "dashed",
  },

  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  optionIcon: {
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

  noResults: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },

  noResultsText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
});
