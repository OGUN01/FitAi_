/**
 * TimePicker — legacy modal wheel time picker.
 *
 * NOTE: S1 "You" now uses the shared <RadialDial variant="time"> control
 * directly (blueprint §6/§7.7). This modal picker is retained for back-compat
 * with existing callers/tests and is kept aurora-token-compliant. It is NOT
 * mounted by the redesigned PersonalInfoTab.
 *
 * API is unchanged: { visible, initialTime, onTimeSelect, onClose, title?, is24Hour? }.
 */
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
} from "react-native";
import {
  surface,
  border,
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../theme/aurora-tokens";
import { rh, rw } from "../../utils/responsive";

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

const ITEM_HEIGHT = rh(5);

const TimePickerWheel: React.FC<TimePickerWheelProps> = ({
  values,
  selectedValue,
  onValueChange,
  width,
}) => {
  const selectedIndex = values.indexOf(selectedValue);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (scrollViewRef.current && selectedIndex >= 0) {
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

  const hourValues = is24Hour
    ? Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"))
    : Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));

  const minuteValues = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, "0"),
  );
  const periodValues = ["AM", "PM"];

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
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.selectedTime}>{formatDisplayTime()}</Text>
          </View>

          <View style={styles.pickersContainer}>
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Hour</Text>
              <TimePickerWheel
                values={hourValues}
                selectedValue={selectedHour}
                onValueChange={setSelectedHour}
                width={rw(80)}
              />
            </View>

            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Minute</Text>
              <TimePickerWheel
                values={minuteValues}
                selectedValue={selectedMinute}
                onValueChange={setSelectedMinute}
                width={rw(80)}
              />
            </View>

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

          <View style={styles.quickTimesContainer}>
            <Text style={styles.quickTimesTitle}>Quick Select</Text>
            <View style={styles.quickTimesGrid}>
              {title.toLowerCase().includes("wake")
                ? [
                    { label: "6:00 AM", value: "06:00" },
                    { label: "7:00 AM", value: "07:00" },
                    { label: "8:00 AM", value: "08:00" },
                    { label: "9:00 AM", value: "09:00" },
                  ].map((preset) => (
                    <Pressable
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
                    </Pressable>
                  ))
                : [
                    { label: "10:00 PM", value: "22:00" },
                    { label: "11:00 PM", value: "23:00" },
                    { label: "12:00 AM", value: "00:00" },
                    { label: "1:00 AM", value: "01:00" },
                  ].map((preset) => (
                    <Pressable
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
                    </Pressable>
                  ))}
            </View>
          </View>

          <View style={styles.actionsContainer}>
            <Pressable
              style={[styles.actionButton, styles.cancelButton]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.confirmButton]}
              onPress={handleConfirm}
              accessibilityRole="button"
              accessibilityLabel="Confirm"
            >
              <Text style={styles.confirmText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: surface[1],
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingBottom: spacing.xl,
    maxHeight: rh(682),
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: border.subtle,
    alignItems: "center",
  },
  title: {
    fontFamily: typography.variants.sectionTitle.fontFamily,
    fontSize: typography.variants.sectionTitle.fontSize,
    lineHeight:
      typography.variants.sectionTitle.fontSize *
      typography.variants.sectionTitle.lineHeight,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  selectedTime: {
    fontFamily: typography.variants.heroStat.fontFamily,
    fontSize: typography.fontSize.h2,
    color: colors.primary.DEFAULT,
  },
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
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: typography.variants.caption.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  wheelContainer: {
    height: rh(150),
    borderRadius: borderRadius.lg,
    backgroundColor: surface[2],
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
    backgroundColor: colors.primary.DEFAULT,
  },
  wheelItemText: {
    fontFamily: typography.variants.body.fontFamily,
    fontSize: typography.variants.body.fontSize,
    color: colors.text.primary,
  },
  wheelItemTextSelected: {
    color: colors.text.primary,
    fontFamily: typography.variants.sectionTitle.fontFamily,
  },
  quickTimesContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  quickTimesTitle: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    fontSize: typography.variants.cardHeadline.fontSize,
    color: colors.text.primary,
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
    borderColor: border.subtle,
    backgroundColor: surface[2],
    justifyContent: "center",
  },
  quickTimeText: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: typography.variants.caption.fontSize,
    color: colors.text.primary,
  },
  actionsContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    minHeight: 52,
    borderRadius: borderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: surface[1],
    borderWidth: 1,
    borderColor: border.subtle,
  },
  confirmButton: {
    flex: 2,
    backgroundColor: colors.primary.DEFAULT,
  },
  cancelText: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    fontSize: typography.variants.cardHeadline.fontSize,
    color: colors.primary.DEFAULT,
  },
  confirmText: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    fontSize: typography.variants.cardHeadline.fontSize,
    color: colors.text.primary,
  },
});

export default TimePicker;
