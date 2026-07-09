import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Button } from "../ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rh } from "../../utils/responsive";

interface DatePickerProps {
  value: Date;
  onDateChange: (date: Date) => void;
  mode?: "date" | "time" | "datetime";
  minimumDate?: Date;
  maximumDate?: Date;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onDateChange,
  mode = "date",
  minimumDate,
  maximumDate,
  label,
  placeholder = "Select date",
  disabled = false,
  style,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value);

  const formatDate = (date: Date) => {
    switch (mode) {
      case "date":
        return date.toLocaleDateString("en-US", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      case "time":
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
      case "datetime":
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      default:
        return date.toLocaleDateString();
    }
  };

  const dateOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    const start =
      minimumDate || new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end =
      maximumDate || new Date(today.getFullYear(), today.getMonth() + 2, 0);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      options.push(new Date(d));
    }

    return options;
  }, [minimumDate, maximumDate]);

  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        options.push(time);
      }
    }
    return options;
  }, []);

  const isDateSelected = (date: Date) => {
    if (mode === "date") {
      return date.toDateString() === selectedDate.toDateString();
    } else if (mode === "time") {
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
    const today = new Date();

    return (
      <ScrollView
        style={styles.optionsContainer}
        showsVerticalScrollIndicator={false}
      >
        {dateOptions.map((date, index) => {
          const isSelected = isDateSelected(date);
          const isToday = date.toDateString() === today.toDateString();
          const isPast = date < today && !isToday;

          return (
            <TouchableOpacity
              key={`date-${date.toISOString()}`}
              style={[
                styles.optionItem,
                isSelected && styles.optionItemSelected,
                isPast && styles.optionItemPast,
              ]}
              onPress={() => setSelectedDate(date)}
              disabled={isPast}
              accessibilityRole="button"
              accessibilityLabel={formatDate(date)}
            >
              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                    isPast && styles.optionTextPast,
                  ]}
                >
                  {date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
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
    return (
      <ScrollView
        style={styles.optionsContainer}
        showsVerticalScrollIndicator={false}
      >
        {timeOptions.map((time, index) => {
          const isSelected = isDateSelected(time);

          return (
            <TouchableOpacity
              key={`time-${time.getHours()}-${time.getMinutes()}`}
              style={[
                styles.optionItem,
                isSelected && styles.optionItemSelected,
              ]}
              onPress={() => {
                const newDate = new Date(selectedDate);
                newDate.setHours(time.getHours(), time.getMinutes(), 0, 0);
                setSelectedDate(newDate);
              }}
              accessibilityRole="button"
              accessibilityLabel={time.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {time.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
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
      case "date":
        return renderDatePicker();
      case "time":
        return renderTimePicker();
      case "datetime":
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
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
      >
        <Text style={[styles.triggerText, !value && styles.placeholderText]}>
          {value ? formatDate(value) : placeholder}
        </Text>
        <Text style={styles.triggerIcon}>📅</Text>
      </TouchableOpacity>

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
                Select{" "}
                {mode === "datetime"
                  ? "Date & Time"
                  : mode === "time"
                    ? "Time"
                    : "Date"}
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
    fontSize: fontSize.md,
    color: colors.text,
  },

  placeholderText: {
    color: colors.textMuted,
  },

  triggerIcon: {
    fontSize: fontSize.lg,
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
    borderColor: colors.primary,
  },

  optionItemPast: {
    opacity: 0.5,
  },

  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  optionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },

  optionTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold as "600",
  },

  optionTextPast: {
    color: colors.textMuted,
  },

  todayBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },

  todayText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: typography.fontWeight.semibold as "600",
  },

  checkmark: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold as "700",
  },

  dateTimeContainer: {
    flexDirection: "row",
    maxHeight: 300,
  },

  dateTimeSection: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },

  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold as "600",
    color: colors.text,
    textAlign: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
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
