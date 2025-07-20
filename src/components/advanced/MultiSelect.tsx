import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { Button, THEME } from '../ui';

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
  style?: any;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selectedValues,
  onSelectionChange,
  label,
  placeholder = 'Select options',
  maxSelections,
  searchable = true,
  disabled = false,
  style,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelectedValues, setTempSelectedValues] = useState(selectedValues);

  const filteredOptions = searchable && searchQuery
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
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
      newSelection = tempSelectedValues.filter(val => val !== option.value);
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
    setSearchQuery('');
  };

  const handleCancel = () => {
    setTempSelectedValues(selectedValues);
    setIsVisible(false);
    setSearchQuery('');
  };

  const getSelectedLabels = () => {
    return options
      .filter(option => selectedValues.includes(option.value))
      .map(option => option.label);
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

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setIsVisible(true)}
      >
        <Text style={[
          styles.triggerText,
          selectedValues.length === 0 && styles.placeholderText
        ]}>
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

      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {label || 'Select Options'}
              </Text>
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
                  placeholderTextColor={THEME.colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <Text style={styles.searchIcon}>🔍</Text>
              </View>
            )}

            {/* Options List */}
            <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
              {filteredOptions.map((option) => {
                const isSelected = isOptionSelected(option.value);
                const isDisabled = option.disabled || (!canSelectMore && !isSelected);

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
                  >
                    <View style={styles.optionContent}>
                      {option.icon && (
                        <Text style={styles.optionIcon}>{option.icon}</Text>
                      )}
                      <Text style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                        isDisabled && styles.optionTextDisabled,
                      ]}>
                        {option.label}
                      </Text>
                    </View>
                    
                    <View style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                      isDisabled && styles.checkboxDisabled,
                    ]}>
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
                title={`Select ${tempSelectedValues.length} item${tempSelectedValues.length !== 1 ? 's' : ''}`}
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
    marginVertical: THEME.spacing.sm,
  },

  label: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium,
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
    fontWeight: THEME.fontWeight.medium,
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
    fontWeight: THEME.fontWeight.semibold,
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

  optionsContainer: {
    maxHeight: 300,
    paddingHorizontal: THEME.spacing.md,
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

  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  optionIcon: {
    fontSize: THEME.fontSize.lg,
    marginRight: THEME.spacing.sm,
  },

  optionText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
  },

  optionTextSelected: {
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.semibold,
  },

  optionTextDisabled: {
    color: THEME.colors.textMuted,
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
    fontWeight: THEME.fontWeight.bold,
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
