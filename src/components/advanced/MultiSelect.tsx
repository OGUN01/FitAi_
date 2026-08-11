import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "../ui/aurora/BottomSheet";
import { GlassCard } from "../ui/aurora/GlassCard";
import { GlassButton } from "../ui/aurora/GlassButton";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rs, rbr, rf } from '../../utils/responsive';
import { hexToRgba, TINT_ALPHA_SOFT, TINT_ALPHA_MEDIUM } from "../../utils/colors";

interface Option {
  id: string;
  label: string;
  value: any;
  icon?: string;
  disabled?: boolean;
}

interface MultiSelectProps {
  options: Option[];
  selectedValues: any[];
  onSelectionChange: (values: any[]) => void;
  label?: string;
  placeholder?: string;
  maxSelections?: number;
  searchable?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selectedValues,
  onSelectionChange,
  label,
  placeholder = "Select options",
  maxSelections,
  searchable = true,
  disabled = false,
  style,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelectedValues, setTempSelectedValues] = useState(selectedValues);

  const filteredOptions =
    searchable && searchQuery
      ? options.filter((option) =>
          option.label.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : options;

  const isOptionSelected = (value: any) => {
    return tempSelectedValues.includes(value);
  };

  const toggleOption = (option: Option) => {
    if (option.disabled) return;

    const isSelected = isOptionSelected(option.value);
    let newSelection;

    if (isSelected) {
      newSelection = tempSelectedValues.filter((val) => val !== option.value);
    } else {
      if (maxSelections && tempSelectedValues.length >= maxSelections) {
        return; // Don't add if max selections reached
      }
      newSelection = [...tempSelectedValues, option.value];
    }

    setTempSelectedValues(newSelection);
  };

  const handleConfirm = () => {
    onSelectionChange(tempSelectedValues);
    setIsVisible(false);
    setSearchQuery("");
  };

  const handleCancel = () => {
    setTempSelectedValues(selectedValues);
    setIsVisible(false);
    setSearchQuery("");
  };

  const getSelectedLabels = () => {
    return options
      .filter((option) => selectedValues.includes(option.value))
      .map((option) => option.label);
  };

  const getDisplayText = () => {
    const selectedLabels = getSelectedLabels();

    if (selectedLabels.length === 0) {
      return placeholder;
    } else if (selectedLabels.length === 1) {
      return selectedLabels[0];
    } else if (selectedLabels.length <= 3) {
      return selectedLabels.join(", ");
    } else {
      return `${selectedLabels.slice(0, 2).join(", ")} +${selectedLabels.length - 2} more`;
    }
  };

  const canSelectMore =
    !maxSelections || tempSelectedValues.length < maxSelections;

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <GlassCard
        pressable={!disabled}
        onPress={() => setIsVisible(true)}
        elevation={2}
        padding="none"
        borderRadius="md"
        style={disabled ? styles.triggerDisabled : undefined}
        contentStyle={styles.trigger}
        accessibilityLabel={label || placeholder}
        accessibilityHint="Opens the options list"
      >
        <Text
          style={[
            styles.triggerText,
            selectedValues.length === 0 && styles.placeholderText,
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {getDisplayText()}
        </Text>
        <Ionicons name="chevron-down" size={rf(fontSize.sm)} color={colors.textSecondary} style={styles.triggerIcon} />
      </GlassCard>

      {/* Selected Items Preview */}
      {selectedValues.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.selectedPreview}
        >
          {getSelectedLabels().map((selectedLabel) => (
            <View key={`selected-${selectedLabel}`} style={styles.selectedTag}>
              <Text style={styles.selectedTagText} numberOfLines={1} ellipsizeMode="tail">
                {selectedLabel}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      <BottomSheet
        visible={isVisible}
        onClose={handleCancel}
        title={label || "Select Options"}
        testID="multi-select-sheet"
      >
        {maxSelections && (
          <Text style={styles.selectionCount} numberOfLines={1}>
            {tempSelectedValues.length}/{maxSelections} selected
          </Text>
        )}

        {/* Search Input */}
        {searchable && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search options..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              accessibilityLabel="Search options"
            />
            <Ionicons name="search" size={rf(fontSize.md)} color={colors.textMuted} style={styles.searchIcon} />
          </View>
        )}

        {/* Options List */}
        <ScrollView
          style={styles.optionsContainer}
          showsVerticalScrollIndicator={false}
        >
          {filteredOptions.map((option) => {
            const isSelected = isOptionSelected(option.value);
            const isDisabled =
              option.disabled || (!canSelectMore && !isSelected);

            return (
              <AnimatedPressable
                key={option.id}
                onPress={() => toggleOption(option)}
                disabled={isDisabled}
                scaleValue={0.98}
                springConfig="smooth"
                hapticType="light"
                accessibilityRole="checkbox"
                accessibilityLabel={option.label}
                accessibilityState={{ checked: isSelected, disabled: isDisabled }}
                containerStyle={styles.rowWrapper}
                style={[styles.rowPressable, isDisabled && styles.rowDisabledPressable]}
              >
                <GlassCard
                  padding="sm"
                  borderRadius="md"
                  style={isSelected ? styles.optionItemSelected : undefined}
                >
                  <View style={styles.optionRow}>
                    <View style={styles.optionContent}>
                      {option.icon && (
                        <Ionicons
                          name={option.icon as any}
                          size={rf(fontSize.lg)}
                          color={colors.textSecondary}
                          style={styles.optionIcon}
                        />
                      )}
                      <Text
                        style={[
                          styles.optionText,
                          isSelected && styles.optionTextSelected,
                          isDisabled && styles.optionTextDisabled,
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {option.label}
                      </Text>
                    </View>

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
                  </View>
                </GlassCard>
              </AnimatedPressable>
            );
          })}

          {filteredOptions.length === 0 && (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={rf(28)} color={colors.textMuted} />
              <Text style={styles.noResultsText} numberOfLines={1}>No options found</Text>
            </View>
          )}
        </ScrollView>

        {/* Actions */}
        <View style={styles.modalActions}>
          <GlassButton
            label="Cancel"
            onPress={handleCancel}
            variant="secondary"
            style={styles.actionButton}
          />
          <GlassButton
            label={`Select ${tempSelectedValues.length} item${tempSelectedValues.length !== 1 ? "s" : ""}`}
            onPress={handleConfirm}
            variant="primary"
            style={styles.actionButton}
          />
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },

  label: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.medium as "500",
    color: colors.text,
    marginBottom: spacing.xs,
  },

  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },

  triggerDisabled: {
    opacity: 0.5,
  },

  triggerText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },

  placeholderText: {
    color: colors.textMuted,
  },

  triggerIcon: {
    marginLeft: spacing.sm,
  },

  selectedPreview: {
    marginTop: spacing.xs,
  },

  selectedTag: {
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_SOFT),
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM),
    maxWidth: 200,
  },

  selectedTagText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium as "500",
  },

  selectionCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 44,
  },

  searchIcon: {
    marginLeft: spacing.sm,
  },

  optionsContainer: {
    maxHeight: 300,
  },

  // Wrapper carries row spacing; the Pressable inside carries the 44pt
  // touch-target floor directly so accessibility tooling measures the real
  // interactive element (not the GlassCard visual layer nested inside it).
  rowWrapper: {
    marginVertical: spacing.xs / 2,
  },

  rowPressable: {
    minHeight: 44,
    justifyContent: "center",
  },

  rowDisabledPressable: {
    opacity: 0.5,
  },

  optionItemSelected: {
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM),
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_SOFT),
  },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  optionIcon: {
    marginRight: spacing.sm,
  },

  optionText: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
    flexShrink: 1,
  },

  optionTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold as "600",
  },

  optionTextDisabled: {
    color: colors.textMuted,
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

  modalActions: {
    flexDirection: "row",
    paddingTop: spacing.md,
    gap: spacing.sm,
  },

  actionButton: {
    flex: 1,
  },
});
