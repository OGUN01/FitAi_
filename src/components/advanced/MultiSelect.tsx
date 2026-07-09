import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Button } from "../ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rs, rbr, rh } from '../../utils/responsive';

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

      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setIsVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
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
        <Text style={styles.triggerIcon}>▼</Text>
      </TouchableOpacity>

      {/* Selected Items Preview */}
      {selectedValues.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.selectedPreview}
        >
          {getSelectedLabels().map((label) => (
            <View key={`selected-${label}`} style={styles.selectedTag}>
              <Text style={styles.selectedTagText} numberOfLines={1}>
                {label}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || "Select Options"}</Text>
              {maxSelections && (
                <Text style={styles.selectionCount}>
                  {tempSelectedValues.length}/{maxSelections} selected
                </Text>
              )}
            </View>

            {/* Search Input */}
            {searchable && (
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search options..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <Text style={styles.searchIcon}>🔍</Text>
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
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionItem,
                      isSelected && styles.optionItemSelected,
                      isDisabled && styles.optionItemDisabled,
                    ]}
                    onPress={() => toggleOption(option)}
                    disabled={isDisabled}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                  >
                    <View style={styles.optionContent}>
                      {option.icon && (
                        <Text style={styles.optionIcon}>{option.icon}</Text>
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
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {filteredOptions.length === 0 && (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>No options found</Text>
                </View>
              )}
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={handleCancel}
                variant="outline"
                style={styles.actionButton}
              />
              <Button
                title={`Select ${tempSelectedValues.length} item${tempSelectedValues.length !== 1 ? "s" : ""}`}
                onPress={handleConfirm}
                variant="primary"
                style={styles.actionButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  selectedPreview: {
    marginTop: spacing.xs,
  },

  selectedTag: {
    backgroundColor: colors.primary + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary + "40",
  },

  selectedTagText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium as "500",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: rh(682),
  },

  modalHeader: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold as "600",
    color: colors.text,
    textAlign: "center",
  },

  selectionCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs / 2,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: spacing.md,
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
  },

  searchIcon: {
    fontSize: fontSize.md,
    marginLeft: spacing.sm,
  },

  optionsContainer: {
    maxHeight: 300,
    paddingHorizontal: spacing.md,
  },

  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
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

  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  optionIcon: {
    fontSize: fontSize.lg,
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

  modalActions: {
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  actionButton: {
    flex: 1,
  },
});
