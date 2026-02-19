import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { THEME } from "../../ui";
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
    paddingHorizontal: THEME.spacing.md,
  },

  regionHeader: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semibold as "600",
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.xs,
    paddingHorizontal: THEME.spacing.sm,
  },

  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    marginVertical: THEME.spacing.xs / 2,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.surface,
  },

  optionItemSelected: {
    backgroundColor: THEME.colors.primary + "20",
    borderWidth: 1,
    borderColor: THEME.colors.primary + "40",
  },

  optionItemDisabled: {
    opacity: 0.5,
  },

  optionItemCustom: {
    backgroundColor: THEME.colors.primary + "10",
    borderWidth: 1,
    borderColor: THEME.colors.primary + "30",
    borderStyle: "dashed",
  },

  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  optionIcon: {
    fontSize: THEME.fontSize.lg,
    marginRight: THEME.spacing.sm,
  },

  optionTextContainer: {
    flex: 1,
  },

  optionText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
  },

  optionTextSelected: {
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.semibold as "600",
  },

  optionTextDisabled: {
    color: THEME.colors.textMuted,
  },

  optionTextCustom: {
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.medium as "500",
  },

  optionRegion: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: THEME.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.colors.background,
  },

  checkboxSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },

  checkboxDisabled: {
    opacity: 0.5,
  },

  checkmark: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.white,
    fontWeight: THEME.fontWeight.bold as "700",
  },

  noResults: {
    alignItems: "center",
    paddingVertical: THEME.spacing.xl,
  },

  noResultsText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textMuted,
  },
});
