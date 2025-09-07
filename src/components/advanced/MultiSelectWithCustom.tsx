import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Button, THEME } from '../ui';

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
  style?: any;
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
  placeholder = 'Select options',
  maxSelections,
  searchable = true,
  disabled = false,
  style,
  allowCustom = true,
  customLabel = 'Add Custom',
  customPlaceholder = 'Enter custom value',
  onCustomAdd,
  showRegions = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelectedValues, setTempSelectedValues] = useState(selectedValues);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [customOptions, setCustomOptions] = useState<Option[]>([]);

  // Combine initial options with custom options and add custom button if allowed
  const allOptions = [
    ...initialOptions.filter(opt => !opt.isCustom),
    ...customOptions,
    ...(allowCustom ? [{
      id: 'add-custom',
      label: `➕ ${customLabel}...`,
      value: 'add-custom',
      isCustom: true,
    }] : []),
  ];

  const filteredOptions =
    searchable && searchQuery
      ? allOptions.filter((option) => 
          option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (option.region && option.region.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : allOptions;

  const isOptionSelected = (value: any) => {
    return tempSelectedValues.includes(value);
  };

  const toggleOption = (option: Option) => {
    if (option.disabled) return;

    // Handle custom option button
    if (option.isCustom && option.value === 'add-custom') {
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
          'Maximum Selections',
          `You can only select up to ${maxSelections} items.`,
          [{ text: 'OK' }]
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
      Alert.alert('Invalid Input', 'Please enter a valid value.', [{ text: 'OK' }]);
      return;
    }

    // Check if this custom value already exists
    const existingOption = allOptions.find(
      opt => opt.label.toLowerCase() === trimmedValue.toLowerCase()
    );

    if (existingOption) {
      Alert.alert('Duplicate Entry', 'This option already exists.', [{ text: 'OK' }]);
      return;
    }

    // Create new custom option
    const newCustomOption: Option = {
      id: `custom-${Date.now()}`,
      label: trimmedValue,
      value: trimmedValue.toLowerCase().replace(/\s+/g, '-'),
      icon: '✨',
    };

    // Add to custom options
    setCustomOptions(prev => [...prev, newCustomOption]);
    
    // Add to selected values
    if (maxSelections && tempSelectedValues.length >= maxSelections) {
      Alert.alert(
        'Maximum Selections',
        `You can only select up to ${maxSelections} items.`,
        [{ text: 'OK' }]
      );
    } else {
      setTempSelectedValues(prev => [...prev, newCustomOption.value]);
    }

    // Call custom add callback if provided
    if (onCustomAdd) {
      onCustomAdd(trimmedValue);
    }

    // Reset custom input
    setCustomValue('');
    setShowCustomInput(false);
  };

  const handleConfirm = () => {
    onSelectionChange(tempSelectedValues);
    setIsVisible(false);
    setSearchQuery('');
    setShowCustomInput(false);
    setCustomValue('');
  };

  const handleCancel = () => {
    setTempSelectedValues(selectedValues);
    setIsVisible(false);
    setSearchQuery('');
    setShowCustomInput(false);
    setCustomValue('');
  };

  const getSelectedLabels = () => {
    const allOptionsWithCustom = [...allOptions.filter(opt => !opt.isCustom)];
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
      return selectedLabels.join(', ');
    } else {
      return `${selectedLabels.slice(0, 2).join(', ')} +${selectedLabels.length - 2} more`;
    }
  };

  const canSelectMore = !maxSelections || tempSelectedValues.length < maxSelections;

  // Group options by region if showRegions is true
  const groupedOptions = showRegions
    ? filteredOptions.reduce((groups, option) => {
        if (option.isCustom) {
          if (!groups['Custom']) groups['Custom'] = [];
          groups['Custom'].push(option);
        } else {
          const region = option.region || 'Other';
          if (!groups[region]) groups[region] = [];
          groups[region].push(option);
        }
        return groups;
      }, {} as Record<string, Option[]>)
    : { '': filteredOptions };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setIsVisible(true)}
      >
        <Text style={[styles.triggerText, selectedValues.length === 0 && styles.placeholderText]}>
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
          {getSelectedLabels().map((label, index) => (
            <View key={index} style={styles.selectedTag}>
              <Text style={styles.selectedTagText}>{label}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={isVisible} transparent animationType="slide" onRequestClose={handleCancel}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || 'Select Options'}</Text>
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
                  placeholderTextColor={THEME.colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <Text style={styles.searchIcon}>🔍</Text>
              </View>
            )}

            {/* Custom Input Mode */}
            {showCustomInput ? (
              <View style={styles.customInputContainer}>
                <Text style={styles.customInputLabel}>Add Custom {label?.replace('Select ', '')}</Text>
                <TextInput
                  style={styles.customTextInput}
                  placeholder={customPlaceholder}
                  placeholderTextColor={THEME.colors.textMuted}
                  value={customValue}
                  onChangeText={setCustomValue}
                  autoFocus
                />
                <View style={styles.customInputActions}>
                  <Button
                    title="Cancel"
                    onPress={() => {
                      setShowCustomInput(false);
                      setCustomValue('');
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
              <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
                {Object.entries(groupedOptions).map(([region, regionOptions]) => (
                  <View key={region}>
                    {showRegions && region && (
                      <Text style={styles.regionHeader}>{region}</Text>
                    )}
                    {regionOptions.map((option) => {
                      const isSelected = isOptionSelected(option.value);
                      const isDisabled = option.disabled || (!canSelectMore && !isSelected && !option.isCustom);

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
                            {option.icon && <Text style={styles.optionIcon}>{option.icon}</Text>}
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
                  title={`Select ${tempSelectedValues.length} item${tempSelectedValues.length !== 1 ? 's' : ''}`}
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
    marginVertical: THEME.spacing.sm,
  },

  label: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium as '500',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },

  triggerDisabled: {
    opacity: 0.5,
  },

  triggerText: {
    flex: 1,
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
  },

  placeholderText: {
    color: THEME.colors.textMuted,
  },

  triggerIcon: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  selectedPreview: {
    marginTop: THEME.spacing.xs,
  },

  selectedTag: {
    backgroundColor: THEME.colors.primary + '20',
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs / 2,
    borderRadius: THEME.borderRadius.sm,
    marginRight: THEME.spacing.xs,
    borderWidth: 1,
    borderColor: THEME.colors.primary + '40',
  },

  selectedTagText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.medium as '500',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: THEME.borderRadius.xl,
    borderTopRightRadius: THEME.borderRadius.xl,
    maxHeight: '80%',
  },

  modalHeader: {
    padding: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },

  modalTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold as '600',
    color: THEME.colors.text,
    textAlign: 'center',
  },

  selectionCount: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: THEME.spacing.xs / 2,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },

  searchInput: {
    flex: 1,
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
  },

  searchIcon: {
    fontSize: THEME.fontSize.md,
    marginLeft: THEME.spacing.sm,
  },

  customInputContainer: {
    padding: THEME.spacing.md,
  },

  customInputLabel: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold as '600',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  customTextInput: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    marginBottom: THEME.spacing.md,
  },

  customInputActions: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },

  customActionButton: {
    flex: 1,
  },

  optionsContainer: {
    maxHeight: 300,
    paddingHorizontal: THEME.spacing.md,
  },

  regionHeader: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semibold as '600',
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.xs,
    paddingHorizontal: THEME.spacing.sm,
  },

  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    marginVertical: THEME.spacing.xs / 2,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.surface,
  },

  optionItemSelected: {
    backgroundColor: THEME.colors.primary + '20',
    borderWidth: 1,
    borderColor: THEME.colors.primary + '40',
  },

  optionItemDisabled: {
    opacity: 0.5,
  },

  optionItemCustom: {
    backgroundColor: THEME.colors.primary + '10',
    borderWidth: 1,
    borderColor: THEME.colors.primary + '30',
    borderStyle: 'dashed',
  },

  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: THEME.fontWeight.semibold as '600',
  },

  optionTextDisabled: {
    color: THEME.colors.textMuted,
  },

  optionTextCustom: {
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.medium as '500',
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
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: THEME.fontWeight.bold as '700',
  },

  noResults: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.xl,
  },

  noResultsText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textMuted,
  },

  modalActions: {
    flexDirection: 'row',
    padding: THEME.spacing.md,
    gap: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  actionButton: {
    flex: 1,
  },
});