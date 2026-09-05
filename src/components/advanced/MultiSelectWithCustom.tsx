import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize } from "../../theme/aurora-tokens";
import { rs, rbr, rp, rf } from '../../utils/responsive';
import { hexToRgba, TINT_ALPHA_LOW, TINT_ALPHA_SOFT, TINT_ALPHA_MEDIUM } from "../../utils/colors";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
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
  const customSubmitLockRef = React.useRef(false);
  const confirmLockRef = React.useRef(false);

  const handleOpen = () => {
    if (disabled) return;
    // Refresh the draft every time the sheet opens. Keeping the mount-time
    // selection here caused stale checked rows after a parent reset/update.
    setTempSelectedValues(selectedValues);
    customSubmitLockRef.current = false;
    confirmLockRef.current = false;
    setIsVisible(true);
  };

  // Combine initial options with custom options and add custom button if allowed
  const allOptions = [
    ...initialOptions.filter((opt) => !opt.isCustom),
    ...customOptions,
    ...(allowCustom
      ? [
          {
            id: "add-custom",
            label: `${customLabel}...`,
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
        crossPlatformAlert(
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
    if (customSubmitLockRef.current) return;
    customSubmitLockRef.current = true;
    const trimmedValue = customValue.trim();

    if (!trimmedValue) {
      customSubmitLockRef.current = false;
      crossPlatformAlert("Invalid Input", "Please enter a valid value.", [
        { text: "OK" },
      ]);
      return;
    }

    // Check if this custom value already exists
    const existingOption = allOptions.find(
      (opt) => opt.label.toLowerCase() === trimmedValue.toLowerCase(),
    );

    if (existingOption) {
      customSubmitLockRef.current = false;
      crossPlatformAlert("Duplicate Entry", "This option already exists.", [
        { text: "OK" },
      ]);
      return;
    }

    // Create new custom option
    const newCustomOption: Option = {
      id: `custom-${Date.now()}`,
      label: trimmedValue,
      value: trimmedValue.toLowerCase().replace(/\s+/g, "-"),
      icon: "sparkles",
    };

    // Add to custom options
    setCustomOptions((prev) => [...prev, newCustomOption]);

    // Add to selected values
    if (maxSelections && tempSelectedValues.length >= maxSelections) {
      crossPlatformAlert(
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
    // Hold the synchronous guard through this event turn so a rapid double
    // tap cannot append the same custom option twice using a stale closure.
    Promise.resolve().then(() => {
      customSubmitLockRef.current = false;
    });
  };

  const handleConfirm = () => {
    if (confirmLockRef.current) return;
    confirmLockRef.current = true;
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
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
        accessibilityState={{ disabled }}
      >
        <Text
          style={[
            styles.triggerText,
            selectedValues.length === 0 && styles.placeholderText,
          ]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {getDisplayText()}
        </Text>
        <Ionicons name="chevron-down" size={rf(fontSize.sm)} color={colors.textSecondary} style={styles.triggerIcon} />
      </TouchableOpacity>

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
        testID="multi-select-custom-sheet"
      >
        {maxSelections && (
          <Text style={styles.selectionCount} numberOfLines={1}>
            {tempSelectedValues.length}/{maxSelections} selected
          </Text>
        )}

        {/* Search Input */}
        {searchable && !showCustomInput && (
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

        {/* Custom Input Mode */}
        {showCustomInput ? (
          <View style={styles.customInputContainer}>
            <Text style={styles.customInputLabel}>
              Add Custom {label?.replace("Select ", "")}
            </Text>
            <TextInput
              style={styles.customTextInput}
              placeholder={customPlaceholder}
              placeholderTextColor={colors.textMuted}
              value={customValue}
              onChangeText={setCustomValue}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddCustom}
              accessibilityLabel={customPlaceholder}
            />
            <View style={styles.customInputActions}>
              <GlassButton
                label="Cancel"
                onPress={() => {
                  setShowCustomInput(false);
                  setCustomValue("");
                }}
                variant="secondary"
                style={styles.customActionButton}
              />
              <GlassButton
                label="Add"
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
                      <AnimatedPressable
                        key={option.id}
                        onPress={() => toggleOption(option)}
                        disabled={isDisabled && !option.isCustom}
                        scaleValue={0.98}
                        springConfig="smooth"
                        hapticType="light"
                        accessibilityRole={option.isCustom ? "button" : "checkbox"}
                        accessibilityLabel={option.label}
                        accessibilityState={{
                          checked: isSelected,
                          disabled: isDisabled && !option.isCustom,
                        }}
                        containerStyle={styles.rowWrapper}
                        style={[
                          styles.rowPressable,
                          isDisabled && !option.isCustom && styles.rowDisabledPressable,
                        ]}
                      >
                        <GlassCard
                          padding="sm"
                          borderRadius="md"
                          style={
                            option.isCustom
                              ? styles.optionItemCustom
                              : isSelected
                                ? styles.optionItemSelected
                                : undefined
                          }
                        >
                          <View style={styles.optionRow}>
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
                                  <Text style={styles.optionRegion} numberOfLines={2}>
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
                                  <Ionicons name="checkmark" size={rf(fontSize.sm)} color={colors.white} />
                                )}
                              </View>
                            )}
                          </View>
                        </GlassCard>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              ),
            )}

            {filteredOptions.length === 0 && (
              <View style={styles.noResults}>
                <Ionicons name="search-outline" size={rf(28)} color={colors.textMuted} />
                <Text style={styles.noResultsText}>No options found</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Actions */}
        {!showCustomInput && (
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
        )}
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
    // Root cause of a real Stage 3 audit finding (VISUAL_DESIGN_OVERHAUL.md):
    // this Text always receives an explicit `style` prop, which means React
    // never falls back to the app-wide Text.defaultProps.style Manrope
    // override (App.tsx) — defaultProps only apply when the prop is
    // undefined, not merged. A numeric-weight-only style with no `fontFamily`
    // therefore rendered on the system font stack. Use `fontFamily` per
    // DESIGN.md §3 (a bare weight prop is a no-op on RN — each weight is a
    // separate font file).
    fontFamily: "Manrope_500Medium",
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
    minWidth: 0,
    fontSize: fontSize.md,
    fontFamily: "Manrope_400Regular",
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
    fontFamily: "Manrope_500Medium",
  },

  selectionCount: {
    fontSize: fontSize.sm,
    fontFamily: "Manrope_400Regular",
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
    fontFamily: "Manrope_400Regular",
    color: colors.text,
    minHeight: 44,
  },

  searchIcon: {
    marginLeft: spacing.sm,
  },

  customInputContainer: {
    paddingBottom: spacing.md,
  },

  customInputLabel: {
    fontSize: fontSize.md,
    fontFamily: "Manrope_600SemiBold",
    color: colors.text,
    marginBottom: spacing.sm,
  },

  customTextInput: {
    fontSize: fontSize.md,
    fontFamily: "Manrope_400Regular",
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.md,
    minHeight: 44,
  },

  customInputActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  customActionButton: {
    flex: 1,
  },

  optionsContainer: {
    maxHeight: 300,
  },

  regionHeader: {
    fontSize: fontSize.sm,
    fontFamily: "Manrope_600SemiBold",
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
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

  optionItemCustom: {
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM + 0.1),
    borderStyle: "dashed",
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW + 0.05),
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

  optionTextContainer: {
    flex: 1,
  },

  optionText: {
    fontSize: fontSize.md,
    fontFamily: "Manrope_400Regular",
    color: colors.text,
  },

  optionTextSelected: {
    color: colors.primary,
    fontFamily: "Manrope_600SemiBold",
  },

  optionTextDisabled: {
    color: colors.textMuted,
  },

  optionTextCustom: {
    color: colors.primary,
    fontFamily: "Manrope_500Medium",
  },

  optionRegion: {
    fontSize: fontSize.xs,
    fontFamily: "Manrope_400Regular",
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
    fontFamily: "Manrope_400Regular",
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
