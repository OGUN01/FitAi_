import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from "react-native";
import { rh, rw } from "../../utils/responsive";
import { Button } from "../ui";

// ============================================================================
// TYPES
// ============================================================================

interface TimePickerProps {
  visible: boolean;
  initialTime: string; // "HH:MM" format
  onTimeSelect: (time: string) => void;
  onClose: () => void;
  title?: string;
  is24Hour?: boolean;
}

interface TimePickerWheelProps {
  values: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  width: number;
}

// Item height for scroll calculations
const ITEM_HEIGHT = rh(5);

// ============================================================================
// TIME PICKER WHEEL COMPONENT
// ============================================================================

const TimePickerWheel: React.FC<TimePickerWheelProps> = ({
  values,
  selectedValue,
  onValueChange,
  width,
}) => {
  const selectedIndex = values.indexOf(selectedValue);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // OB-UX-005: Scroll to selected value when component mounts or selectedValue changes
  useEffect(() => {
    if (scrollViewRef.current && selectedIndex >= 0) {
      // Small delay to ensure layout is complete
      scrollTimeoutRef.current = setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: selectedIndex * ITEM_HEIGHT,
          animated: false,
        });
      }, 100);
    }
    return () => {
      if (scrollTimeoutRef.current !== null) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [selectedIndex]);

  return (
    <View style={[styles.wheelContainer, { width }]}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.wheelContent}
      >
        {values.map((value, index) => {
          const isSelected = index === selectedIndex;
          const distance = Math.abs(index - selectedIndex);
          const opacity = Math.max(0.3, 1 - distance * 0.2);

          return (
            <TouchableOpacity
              key={value}
              style={[
                styles.wheelItem,
                isSelected && styles.wheelItemSelected,
                { opacity, height: ITEM_HEIGHT },
              ]}
              onPress={() => onValueChange(value)}
              delayPressIn={50}
              accessibilityRole="button"
              accessibilityLabel={value}
            >
              <Text
                style={[
                  styles.wheelItemText,
                  isSelected && styles.wheelItemTextSelected,
                ]}
              >
                {value}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

// ============================================================================
// MAIN TIME PICKER COMPONENT
// ============================================================================

export const TimePicker: React.FC<TimePickerProps> = ({
  visible,
  initialTime,
  onTimeSelect,
  onClose,
  title = "Select Time",
  is24Hour = true,
}) => {
  const [hours, minutes] = initialTime.split(":");
  const [selectedHour, setSelectedHour] = useState(hours);
  const [selectedMinute, setSelectedMinute] = useState(minutes);
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">("AM");

  // Generate time values
  const hourValues = is24Hour
    ? Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"))
    : Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));

  const minuteValues = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, "0"),
  );
  const periodValues = ["AM", "PM"];

  // Initialize period for 12-hour format
  React.useEffect(() => {
    if (!is24Hour) {
      const hour24 = parseInt(hours);
      setSelectedPeriod(hour24 >= 12 ? "PM" : "AM");
      setSelectedHour(
        hour24 === 0
          ? "12"
          : hour24 > 12
            ? (hour24 - 12).toString().padStart(2, "0")
            : hours,
      );
    }
  }, [hours, is24Hour]);

  const handleConfirm = () => {
    let finalHour = selectedHour;

    if (!is24Hour) {
      let hour24 = parseInt(selectedHour);
      if (selectedPeriod === "PM" && hour24 !== 12) {
        hour24 += 12;
      } else if (selectedPeriod === "AM" && hour24 === 12) {
        hour24 = 0;
      }
      finalHour = hour24.toString().padStart(2, "0");
    }

    const timeString = `${finalHour}:${selectedMinute}`;
    onTimeSelect(timeString);
  };

  const formatDisplayTime = () => {
    if (is24Hour) {
      return `${selectedHour}:${selectedMinute}`;
    } else {
      return `${selectedHour}:${selectedMinute} ${selectedPeriod}`;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.selectedTime}>{formatDisplayTime()}</Text>
          </View>

          {/* Time Picker Wheels */}
          <View style={styles.pickersContainer}>
            {/* Hour Picker */}
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Hour</Text>
              <TimePickerWheel
                values={hourValues}
                selectedValue={selectedHour}
                onValueChange={setSelectedHour}
                width={rw(80)}
              />
            </View>

            {/* Minute Picker */}
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Minute</Text>
              <TimePickerWheel
                values={minuteValues}
                selectedValue={selectedMinute}
                onValueChange={setSelectedMinute}
                width={rw(80)}
              />
            </View>

            {/* Period Picker (12-hour format only) */}
            {!is24Hour && (
              <View style={styles.pickerSection}>
                <Text style={styles.pickerLabel}>Period</Text>
                <TimePickerWheel
                  values={periodValues}
                  selectedValue={selectedPeriod}
                  onValueChange={(value) =>
                    setSelectedPeriod(value as "AM" | "PM")
                  }
                  width={rw(60)}
                />
              </View>
            )}
          </View>

          {/* Quick Time Buttons */}
          <View style={styles.quickTimesContainer}>
            <Text style={styles.quickTimesTitle}>Quick Select</Text>
            <View style={styles.quickTimesGrid}>
              {title.toLowerCase().includes("wake")
                ? // Wake time presets
                  [
                    { label: "6:00 AM", value: "06:00" },
                    { label: "7:00 AM", value: "07:00" },
                    { label: "8:00 AM", value: "08:00" },
                    { label: "9:00 AM", value: "09:00" },
                  ].map((preset) => (
                    <TouchableOpacity
                      key={preset.value}
                      style={styles.quickTimeButton}
                      onPress={() => {
                        const [h, m] = preset.value.split(":");
                        setSelectedHour(h);
                        setSelectedMinute(m);
                        if (!is24Hour) {
                          setSelectedPeriod(parseInt(h) >= 12 ? "PM" : "AM");
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={preset.label}
                    >
                      <Text style={styles.quickTimeText}>{preset.label}</Text>
                    </TouchableOpacity>
                  ))
                : // Sleep time presets
                  [
                    { label: "10:00 PM", value: "22:00" },
                    { label: "11:00 PM", value: "23:00" },
                    { label: "12:00 AM", value: "00:00" },
                    { label: "1:00 AM", value: "01:00" },
                  ].map((preset) => (
                    <TouchableOpacity
                      key={preset.value}
                      style={styles.quickTimeButton}
                      onPress={() => {
                        const [h, m] = preset.value.split(":");
                        setSelectedHour(h);
                        setSelectedMinute(m);
                        if (!is24Hour) {
                          setSelectedPeriod(parseInt(h) >= 12 ? "PM" : "AM");
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={preset.label}
                    >
                      <Text style={styles.quickTimeText}>{preset.label}</Text>
                    </TouchableOpacity>
                  ))}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <Button
              title="Cancel"
              onPress={onClose}
              variant="outline"
              style={styles.cancelButton}
            />
            <Button
              title="Confirm"
              onPress={handleConfirm}
              variant="primary"
              style={styles.confirmButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xl,
    maxHeight: "80%",
  },

  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "center",
  },

  title: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  selectedTime: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },

  // Picker Container
  pickersContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },

  pickerSection: {
    alignItems: "center",
    marginHorizontal: spacing.sm,
  },

  pickerLabel: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  // Wheel Styles
  wheelContainer: {
    height: rh(150),
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
  },

  wheelContent: {
    paddingVertical: spacing.sm,
  },

  wheelItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    alignItems: "center",
    borderRadius: borderRadius.md,
    marginVertical: spacing.xs,
    marginHorizontal: spacing.sm,
  },

  wheelItemSelected: {
    backgroundColor: colors.primary,
  },

  wheelItemText: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
  },

  wheelItemTextSelected: {
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },

  // Quick Times
  quickTimesContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },

  quickTimesTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: "center",
  },

  quickTimesGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  quickTimeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: "center",
  },

  quickTimeText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
  },

  // Actions
  actionsContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },

  cancelButton: {
    flex: 1,
  },

  confirmButton: {
    flex: 2,
  },
});

export default TimePicker;
