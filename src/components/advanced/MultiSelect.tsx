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
import { ResponsiveTheme } from "../../utils/constants";
import { rs, rbr } from '../../utils/responsive';

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
                  placeholderTextColor={ResponsiveTheme.colors.textMuted}
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
    marginVertical: ResponsiveTheme.spacing.sm,
  },

  label: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium as "500",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    minHeight: 44,
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },

  triggerDisabled: {
    opacity: 0.5,
  },

  triggerText: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
  },

  placeholderText: {
    color: ResponsiveTheme.colors.textMuted,
  },

  triggerIcon: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  selectedPreview: {
    marginTop: ResponsiveTheme.spacing.xs,
  },

  selectedTag: {
    backgroundColor: ResponsiveTheme.colors.primary + "20",
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs / 2,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    marginRight: ResponsiveTheme.spacing.xs,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primary + "40",
  },

  selectedTagText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium as "500",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: ResponsiveTheme.colors.background,
    borderTopLeftRadius: ResponsiveTheme.borderRadius.xl,
    borderTopRightRadius: ResponsiveTheme.borderRadius.xl,
    maxHeight: "80%",
  },

  modalHeader: {
    padding: ResponsiveTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },

  modalTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold as "600",
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
  },

  selectionCount: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginTop: ResponsiveTheme.spacing.xs / 2,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },

  searchInput: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
  },

  searchIcon: {
    fontSize: ResponsiveTheme.fontSize.md,
    marginLeft: ResponsiveTheme.spacing.sm,
  },

  optionsContainer: {
    maxHeight: 300,
    paddingHorizontal: ResponsiveTheme.spacing.md,
  },

  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    minHeight: 44,
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

  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  optionIcon: {
    fontSize: ResponsiveTheme.fontSize.lg,
    marginRight: ResponsiveTheme.spacing.sm,
  },

  optionText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    flex: 1,
    flexShrink: 1,
  },

  optionTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold as "600",
  },

  optionTextDisabled: {
    color: ResponsiveTheme.colors.textMuted,
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

  modalActions: {
    flexDirection: "row",
    padding: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  actionButton: {
    flex: 1,
  },
});
