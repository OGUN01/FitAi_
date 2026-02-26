import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Button } from "../ui";
import { ResponsiveTheme } from "../../utils/constants";
import { rs, rbr, rp } from '../../utils/responsive';

interface Option {
  id: string;
  label: string;
  value: any;
  icon?: string;
  disabled?: boolean;
  isCustom?: boolean;
  region?: string;
}

interface MultiSelectWithCustomProps {
  options: Option[];
  selectedValues: any[];
  onSelectionChange: (values: any[]) => void;
  label?: string;
  placeholder?: string;
  maxSelections?: number;
  searchable?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  allowCustom?: boolean;
  customLabel?: string;
  customPlaceholder?: string;
  onCustomAdd?: (value: string) => void;
  showRegions?: boolean;
}

export const MultiSelectWithCustom: React.FC<MultiSelectWithCustomProps> = ({
  options: initialOptions,
  selectedValues,
  onSelectionChange,
  label,
  placeholder = "Select options",
  maxSelections,
  searchable = true,
  disabled = false,
  style,
  allowCustom = true,
  customLabel = "Add Custom",
  customPlaceholder = "Enter custom value",
  onCustomAdd,
  showRegions = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelectedValues, setTempSelectedValues] = useState(selectedValues);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [customOptions, setCustomOptions] = useState<Option[]>([]);

  // Combine initial options with custom options and add custom button if allowed
  const allOptions = [
    ...initialOptions.filter((opt) => !opt.isCustom),
    ...customOptions,
    ...(allowCustom
      ? [
          {
            id: "add-custom",
            label: `➕ ${customLabel}...`,
            value: "add-custom",
            isCustom: true,
          },
        ]
      : []),
  ];

  const filteredOptions =
    searchable && searchQuery
      ? allOptions.filter(
          (option) =>
            option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (option.region &&
              option.region.toLowerCase().includes(searchQuery.toLowerCase())),
        )
      : allOptions;

  const isOptionSelected = (value: any) => {
    return tempSelectedValues.includes(value);
  };

  const toggleOption = (option: Option) => {
    if (option.disabled) return;

    // Handle custom option button
    if (option.isCustom && option.value === "add-custom") {
      setShowCustomInput(true);
      return;
    }

    const isSelected = isOptionSelected(option.value);
    let newSelection;

    if (isSelected) {
      newSelection = tempSelectedValues.filter((val) => val !== option.value);
    } else {
      if (maxSelections && tempSelectedValues.length >= maxSelections) {
        Alert.alert(
          "Maximum Selections",
          `You can only select up to ${maxSelections} items.`,
          [{ text: "OK" }],
        );
        return;
      }
      newSelection = [...tempSelectedValues, option.value];
    }

    setTempSelectedValues(newSelection);
  };

  const handleAddCustom = () => {
    const trimmedValue = customValue.trim();

    if (!trimmedValue) {
      Alert.alert("Invalid Input", "Please enter a valid value.", [
        { text: "OK" },
      ]);
      return;
    }

    // Check if this custom value already exists
    const existingOption = allOptions.find(
      (opt) => opt.label.toLowerCase() === trimmedValue.toLowerCase(),
    );

    if (existingOption) {
      Alert.alert("Duplicate Entry", "This option already exists.", [
        { text: "OK" },
      ]);
      return;
    }

    // Create new custom option
    const newCustomOption: Option = {
      id: `custom-${Date.now()}`,
      label: trimmedValue,
      value: trimmedValue.toLowerCase().replace(/\s+/g, "-"),
      icon: "✨",
    };

    // Add to custom options
    setCustomOptions((prev) => [...prev, newCustomOption]);

    // Add to selected values
    if (maxSelections && tempSelectedValues.length >= maxSelections) {
      Alert.alert(
        "Maximum Selections",
        `You can only select up to ${maxSelections} items.`,
        [{ text: "OK" }],
      );
    } else {
      setTempSelectedValues((prev) => [...prev, newCustomOption.value]);
    }

    // Call custom add callback if provided
    if (onCustomAdd) {
      onCustomAdd(trimmedValue);
    }

    // Reset custom input
    setCustomValue("");
    setShowCustomInput(false);
  };

  const handleConfirm = () => {
    onSelectionChange(tempSelectedValues);
    setIsVisible(false);
    setSearchQuery("");
    setShowCustomInput(false);
    setCustomValue("");
  };

  const handleCancel = () => {
    setTempSelectedValues(selectedValues);
    setIsVisible(false);
    setSearchQuery("");
    setShowCustomInput(false);
    setCustomValue("");
  };

  const getSelectedLabels = () => {
    const allOptionsWithCustom = [...allOptions.filter((opt) => !opt.isCustom)];
    return allOptionsWithCustom
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

  // Group options by region if showRegions is true
  const groupedOptions = showRegions
    ? filteredOptions.reduce(
        (groups, option) => {
          if (option.isCustom) {
            if (!groups["Custom"]) groups["Custom"] = [];
            groups["Custom"].push(option);
          } else {
            const region = option.region || "Other";
            if (!groups[region]) groups[region] = [];
            groups[region].push(option);
          }
          return groups;
        },
        {} as Record<string, Option[]>,
      )
    : { "": filteredOptions };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setIsVisible(true)}
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
            {searchable && !showCustomInput && (
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

            {/* Custom Input Mode */}
            {showCustomInput ? (
              <View style={styles.customInputContainer}>
                <Text style={styles.customInputLabel}>
                  Add Custom {label?.replace("Select ", "")}
                </Text>
                <TextInput
                  style={styles.customTextInput}
                  placeholder={customPlaceholder}
                  placeholderTextColor={ResponsiveTheme.colors.textMuted}
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
            ) : (
              /* Options List */
              <ScrollView
                style={styles.optionsContainer}
                showsVerticalScrollIndicator={false}
              >
                {Object.entries(groupedOptions).map(
                  ([region, regionOptions]) => (
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
                                <Text style={styles.optionIcon}>
                                  {option.icon}
                                </Text>
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
                                  <Text style={styles.optionRegion}>
                                    {option.region}
                                  </Text>
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
                                  <Text style={styles.checkmark}>✓</Text>
                                )}
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ),
                )}

                {filteredOptions.length === 0 && (
                  <View style={styles.noResults}>
                    <Text style={styles.noResultsText}>No options found</Text>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Actions */}
            {!showCustomInput && (
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
            )}
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

  customInputContainer: {
    padding: ResponsiveTheme.spacing.md,
  },

  customInputLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold as "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  customTextInput: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  customInputActions: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.sm,
  },

  customActionButton: {
    flex: 1,
  },

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
