import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Button, Card, THEME } from '../ui';

interface DatePickerProps {
  value: Date;
  onDateChange: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  style?: any;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onDateChange,
  mode = 'date',
  minimumDate,
  maximumDate,
  label,
  placeholder = 'Select date',
  disabled = false,
  style,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value);

  const formatDate = (date: Date) => {
    switch (mode) {
      case 'date':
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      case 'time':
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });
      case 'datetime':
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      default:
        return date.toLocaleDateString();
    }
  };

  const generateDateOptions = () => {
    const options = [];
    const today = new Date();
    const start = minimumDate || new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = maximumDate || new Date(today.getFullYear(), today.getMonth() + 2, 0);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      options.push(new Date(d));
    }

    return options;
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        options.push(time);
      }
    }
    return options;
  };

  const isDateSelected = (date: Date) => {
    if (mode === 'date') {
      return date.toDateString() === selectedDate.toDateString();
    } else if (mode === 'time') {
      return (
        date.getHours() === selectedDate.getHours() &&
        date.getMinutes() === selectedDate.getMinutes()
      );
    } else {
      return date.getTime() === selectedDate.getTime();
    }
  };

  const handleConfirm = () => {
    onDateChange(selectedDate);
    setIsVisible(false);
  };

  const handleCancel = () => {
    setSelectedDate(value);
    setIsVisible(false);
  };

  const renderDatePicker = () => {
    const dates = generateDateOptions();
    const today = new Date();

    return (
      <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
        {dates.map((date, index) => {
          const isSelected = isDateSelected(date);
          const isToday = date.toDateString() === today.toDateString();
          const isPast = date < today && !isToday;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionItem,
                isSelected && styles.optionItemSelected,
                isPast && styles.optionItemPast,
              ]}
              onPress={() => setSelectedDate(date)}
              disabled={isPast}
            >
              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                    isPast && styles.optionTextPast,
                  ]}
                >
                  {date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                {isToday && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayText}>Today</Text>
                  </View>
                )}
              </View>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const renderTimePicker = () => {
    const times = generateTimeOptions();

    return (
      <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
        {times.map((time, index) => {
          const isSelected = isDateSelected(time);

          return (
            <TouchableOpacity
              key={index}
              style={[styles.optionItem, isSelected && styles.optionItemSelected]}
              onPress={() => {
                const newDate = new Date(selectedDate);
                newDate.setHours(time.getHours(), time.getMinutes(), 0, 0);
                setSelectedDate(newDate);
              }}
            >
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {time.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const renderDateTimePicker = () => {
    return (
      <View style={styles.dateTimeContainer}>
        <View style={styles.dateTimeSection}>
          <Text style={styles.sectionTitle}>Date</Text>
          {renderDatePicker()}
        </View>
        <View style={styles.dateTimeSection}>
          <Text style={styles.sectionTitle}>Time</Text>
          {renderTimePicker()}
        </View>
      </View>
    );
  };

  const renderPicker = () => {
    switch (mode) {
      case 'date':
        return renderDatePicker();
      case 'time':
        return renderTimePicker();
      case 'datetime':
        return renderDateTimePicker();
      default:
        return renderDatePicker();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setIsVisible(true)}
      >
        <Text style={[styles.triggerText, !value && styles.placeholderText]}>
          {value ? formatDate(value) : placeholder}
        </Text>
        <Text style={styles.triggerIcon}>📅</Text>
      </TouchableOpacity>

      <Modal visible={isVisible} transparent animationType="slide" onRequestClose={handleCancel}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {mode === 'datetime' ? 'Date & Time' : mode === 'time' ? 'Time' : 'Date'}
              </Text>
            </View>

            {renderPicker()}

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={handleCancel}
                variant="outline"
                style={styles.actionButton}
              />
              <Button
                title="Confirm"
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
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
  },

  placeholderText: {
    color: THEME.colors.textMuted,
  },

  triggerIcon: {
    fontSize: THEME.fontSize.lg,
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
    borderColor: THEME.colors.primary,
  },

  optionItemPast: {
    opacity: 0.5,
  },

  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },

  optionText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
  },

  optionTextSelected: {
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.semibold as '600',
  },

  optionTextPast: {
    color: THEME.colors.textMuted,
  },

  todayBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.xs,
    paddingVertical: THEME.spacing.xs / 2,
    borderRadius: THEME.borderRadius.sm,
  },

  todayText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.white,
    fontWeight: THEME.fontWeight.semibold as '600',
  },

  checkmark: {
    fontSize: THEME.fontSize.lg,
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.bold as '700',
  },

  dateTimeContainer: {
    flexDirection: 'row',
    maxHeight: 300,
  },

  dateTimeSection: {
    flex: 1,
    paddingHorizontal: THEME.spacing.sm,
  },

  sectionTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold as '600',
    color: THEME.colors.text,
    textAlign: 'center',
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    marginBottom: THEME.spacing.sm,
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
