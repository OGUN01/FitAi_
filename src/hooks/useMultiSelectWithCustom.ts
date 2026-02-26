import { useState } from "react";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";

export interface Option {
  id: string;
  label: string;
  value: any;
  icon?: string;
  disabled?: boolean;
  isCustom?: boolean;
  region?: string;
}

interface UseMultiSelectWithCustomProps {
  initialOptions: Option[];
  selectedValues: any[];
  onSelectionChange: (values: any[]) => void;
  maxSelections?: number;
  searchable?: boolean;
  allowCustom?: boolean;
  customLabel?: string;
  onCustomAdd?: (value: string) => void;
  showRegions?: boolean;
}

export const useMultiSelectWithCustom = ({
  initialOptions,
  selectedValues,
  onSelectionChange,
  maxSelections,
  searchable = true,
  allowCustom = true,
  customLabel = "Add Custom",
  onCustomAdd,
  showRegions = false,
}: UseMultiSelectWithCustomProps) => {
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
    const trimmedValue = customValue.trim();

    if (!trimmedValue) {
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
      icon: "✨",
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

  return {
    // State
    isVisible,
    searchQuery,
    tempSelectedValues,
    showCustomInput,
    customValue,
    customOptions,
    allOptions,
    filteredOptions,
    groupedOptions,
    canSelectMore,

    // Actions
    setIsVisible,
    setSearchQuery,
    setCustomValue,
    setShowCustomInput,
    toggleOption,
    handleAddCustom,
    handleConfirm,
    handleCancel,
    isOptionSelected,
    getSelectedLabels,
  };
};
