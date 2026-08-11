import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ListRenderItemInfo,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "../ui/aurora/BottomSheet";
import { GlassCard } from "../ui/aurora/GlassCard";
import { GlassButton } from "../ui/aurora/GlassButton";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rf } from "../../utils/responsive";
import { hexToRgba, TINT_ALPHA_SOFT } from "../../utils/colors";

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

  // Date list — capped to ±60 days around today (or to the provided
  // minimumDate/maximumDate window when narrower). Rendering is virtualized
  // via FlatList below, so this cap is a belt-and-suspenders bound rather
  // than the only thing standing between us and hundreds of mounted rows.
  const dateOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const defaultStart = new Date(today);
    defaultStart.setDate(defaultStart.getDate() - 60);
    const defaultEnd = new Date(today);
    defaultEnd.setDate(defaultEnd.getDate() + 60);

    const start = minimumDate || defaultStart;
    const end = maximumDate || defaultEnd;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      options.push(new Date(d));
    }

    return options;
  }, [minimumDate, maximumDate]);

  // Time list — only allocated when the mode actually needs time values.
  // 96 quarter-hour slots (24 * 4). Cheap, but no point paying for it when
  // mode === "date".
  const timeOptions = useMemo(() => {
    if (mode === "date") return [];
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        options.push(time);
      }
    }
    return options;
  }, [mode]);

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

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const renderDateItem = useCallback(
    ({ item: date }: ListRenderItemInfo<Date>) => {
      const isSelected = isDateSelected(date);
      const isToday = date.toDateString() === today.toDateString();
      const isPast = date < today && !isToday;

      return (
        <AnimatedPressable
          onPress={() => setSelectedDate(date)}
          disabled={isPast}
          scaleValue={0.98}
          springConfig="smooth"
          hapticType="light"
          accessibilityLabel={formatDate(date)}
          accessibilityState={{ selected: isSelected, disabled: isPast }}
          containerStyle={styles.rowWrapper}
          style={[styles.rowPressable, isPast && styles.rowPastPressable]}
        >
          <GlassCard
            padding="sm"
            borderRadius="md"
            style={isSelected ? styles.optionItemSelected : undefined}
          >
            <View style={styles.optionRow}>
              <View style={styles.optionContent}>
                <Text
                  style={[styles.optionText, isSelected && styles.optionTextSelected]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
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
              {isSelected && (
                <Ionicons name="checkmark" size={rf(18)} color={colors.primary} />
              )}
            </View>
          </GlassCard>
        </AnimatedPressable>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedDate, today, mode],
  );

  const renderTimeItem = useCallback(
    ({ item: time }: ListRenderItemInfo<Date>) => {
      const isSelected = isDateSelected(time);

      return (
        <AnimatedPressable
          onPress={() => {
            const newDate = new Date(selectedDate);
            newDate.setHours(time.getHours(), time.getMinutes(), 0, 0);
            setSelectedDate(newDate);
          }}
          scaleValue={0.98}
          springConfig="smooth"
          hapticType="light"
          accessibilityLabel={time.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          accessibilityState={{ selected: isSelected }}
          containerStyle={styles.rowWrapper}
          style={styles.rowPressable}
        >
          <GlassCard
            padding="sm"
            borderRadius="md"
            style={isSelected ? styles.optionItemSelected : undefined}
          >
            <View style={styles.optionRow}>
              <Text
                style={[styles.optionText, isSelected && styles.optionTextSelected]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {time.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark" size={rf(18)} color={colors.primary} />
              )}
            </View>
          </GlassCard>
        </AnimatedPressable>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedDate],
  );

  const dateKeyExtractor = useCallback((date: Date) => `date-${date.toISOString()}`, []);
  const timeKeyExtractor = useCallback(
    (time: Date) => `time-${time.getHours()}-${time.getMinutes()}`,
    [],
  );

  const renderDatePicker = () => (
    <FlatList
      data={dateOptions}
      keyExtractor={dateKeyExtractor}
      renderItem={renderDateItem}
      style={styles.optionsContainer}
      showsVerticalScrollIndicator={false}
      initialNumToRender={16}
      maxToRenderPerBatch={16}
      windowSize={7}
      removeClippedSubviews
    />
  );

  const renderTimePicker = () => (
    <FlatList
      data={timeOptions}
      keyExtractor={timeKeyExtractor}
      renderItem={renderTimeItem}
      style={styles.optionsContainer}
      showsVerticalScrollIndicator={false}
      initialNumToRender={16}
      maxToRenderPerBatch={16}
      windowSize={7}
      removeClippedSubviews
    />
  );

  const renderDateTimePicker = () => (
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

  const sheetTitle =
    mode === "datetime" ? "Select Date & Time" : mode === "time" ? "Select Time" : "Select Date";

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
        accessibilityHint="Opens the date picker"
      >
        <Text style={[styles.triggerText, !value && styles.placeholderText]} numberOfLines={1}>
          {value ? formatDate(value) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={rf(20)} color={disabled ? colors.textMuted : colors.primary} />
      </GlassCard>

      <BottomSheet
        visible={isVisible}
        onClose={handleCancel}
        title={sheetTitle}
        testID="date-picker-sheet"
      >
        {renderPicker()}

        <View style={styles.modalActions}>
          <GlassButton
            label="Cancel"
            onPress={handleCancel}
            variant="secondary"
            style={styles.actionButton}
          />
          <GlassButton
            label="Confirm"
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
    fontSize: fontSize.md,
    color: colors.text,
  },

  placeholderText: {
    color: colors.textMuted,
  },

  optionsContainer: {
    maxHeight: 300,
  },

  // Wrapper carries the row's bottom spacing; the Pressable inside carries
  // the 44pt touch-target floor directly (not nested behind GlassCard's own
  // press handling) so accessibility tooling measures the real target.
  rowWrapper: {
    marginVertical: spacing.xs / 2,
  },

  rowPressable: {
    minHeight: 44,
    justifyContent: "center",
  },

  rowPastPressable: {
    opacity: 0.5,
  },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  optionItemSelected: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_SOFT),
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
    paddingTop: spacing.md,
    gap: spacing.sm,
  },

  actionButton: {
    flex: 1,
  },
});
