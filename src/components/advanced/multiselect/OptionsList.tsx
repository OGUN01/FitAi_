import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
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
    paddingHorizontal: ResponsiveTheme.spacing.md,
  },

  regionHeader: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold as "600",
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
  },

  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    marginVertical: ResponsiveTheme.spacing.xs / 2,
    borderRadius: ResponsiveTheme.borderRadius.md,
    backgroundColor: ResponsiveTheme.colors.surface,
  },

  optionItemSelected: {
    backgroundColor: ResponsiveTheme.colors.primary + "20",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primary + "40",
  },

  optionItemDisabled: {
    opacity: 0.5,
  },

  optionItemCustom: {
    backgroundColor: ResponsiveTheme.colors.primary + "10",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primary + "30",
    borderStyle: "dashed",
  },

  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  optionIcon: {
    fontSize: ResponsiveTheme.fontSize.lg,
    marginRight: ResponsiveTheme.spacing.sm,
  },

  optionTextContainer: {
    flex: 1,
  },

  optionText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
  },

  optionTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold as "600",
  },

  optionTextDisabled: {
    color: ResponsiveTheme.colors.textMuted,
  },

  optionTextCustom: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium as "500",
  },

  optionRegion: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(2),
  },

  checkbox: {
    width: rs(24),
    height: rs(24),
    borderRadius: rbr(4),
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ResponsiveTheme.colors.background,
  },

  checkboxSelected: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },

  checkboxDisabled: {
    opacity: 0.5,
  },

  checkmark: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.bold as "700",
  },

  noResults: {
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.xl,
  },

  noResultsText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textMuted,
  },
});
