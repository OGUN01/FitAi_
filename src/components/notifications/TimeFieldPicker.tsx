/**
 * TimeFieldPicker - Aurora-styled time selection field.
 *
 * Replaces free-text "HH:MM" TextInputs (validated only by a regex on
 * submit) with a tap-to-open wheel/segmented list picker, so users can't
 * type an invalid time. Matches the GlassFormInput visual language used by
 * the profile edit modals (label above, 14px radius, focused accent border).
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  surface,
  border,
  spacing,
  typography,
} from "../../theme/aurora-tokens";
import { rf, rw, rh } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

const { variants } = typography;

const MINUTE_STEP = 15;
const ROW_HEIGHT = 46;

interface TimeOption {
  value: string; // "HH:MM"
  label: string; // "7:00 AM"
}

const TIME_OPTIONS: TimeOption[] = (() => {
  const options: TimeOption[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += MINUTE_STEP) {
      const hh = hour.toString().padStart(2, "0");
      const mm = minute.toString().padStart(2, "0");
      const period = hour < 12 ? "AM" : "PM";
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      options.push({
        value: `${hh}:${mm}`,
        label: `${displayHour}:${mm} ${period}`,
      });
    }
  }
  return options;
})();

export function formatTimeLabel(time: string): string {
  const match = TIME_OPTIONS.find((option) => option.value === time);
  if (match) return match.label;
  // Fall back to formatting an arbitrary HH:MM that doesn't land on a
  // 15-minute boundary (e.g. a value persisted before this picker existed).
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h < 12 ? "AM" : "PM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:${m.toString().padStart(2, "0")} ${period}`;
}

interface TimeFieldPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  hint?: string;
}

export const TimeFieldPicker: React.FC<TimeFieldPickerProps> = ({
  label,
  value,
  onChange,
  icon = "time-outline",
  iconColor = colors.primary.DEFAULT,
  hint,
}) => {
  const [visible, setVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Nearest grid index to `value`, used for highlighting + initial scroll.
  // For grid-aligned values this is an exact match. For values persisted
  // before this picker existed (e.g. "07:10" from the old free-text field)
  // there is no exact match, so fall back to the closest 15-minute option
  // instead of leaving the list unhighlighted and scrolled to the top.
  const selectedIndex = useMemo(() => {
    const exactIndex = TIME_OPTIONS.findIndex((option) => option.value === value);
    if (exactIndex >= 0) return exactIndex;

    const [h, m] = value.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return -1;
    const targetMinutes = h * 60 + m;

    let nearestIndex = -1;
    let smallestDelta = Infinity;
    TIME_OPTIONS.forEach((option, index) => {
      const [oh, om] = option.value.split(":").map(Number);
      const delta = Math.abs(oh * 60 + om - targetMinutes);
      if (delta < smallestDelta) {
        smallestDelta = delta;
        nearestIndex = index;
      }
    });
    return nearestIndex;
  }, [value]);

  const openPicker = useCallback(() => {
    haptics.light();
    setVisible(true);
    requestAnimationFrame(() => {
      if (selectedIndex >= 0) {
        scrollRef.current?.scrollTo({
          y: Math.max(0, selectedIndex * ROW_HEIGHT - ROW_HEIGHT * 3),
          animated: false,
        });
      }
    });
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (time: string) => {
      haptics.light();
      onChange(time);
      setVisible(false);
    },
    [onChange],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>

      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${formatTimeLabel(value)}`}
        style={({ pressed }) => [
          styles.field,
          pressed && styles.fieldPressed,
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}14` }]}>
          <Ionicons name={icon} size={rf(16)} color={iconColor} />
        </View>
        <Text style={styles.valueText}>{formatTimeLabel(value)}</Text>
        <Ionicons name="chevron-down" size={rf(16)} color={colors.text.tertiary} />
      </Pressable>

      {hint ? (
        <Text style={styles.hintText} numberOfLines={3}>
          {hint}
        </Text>
      ) : null}

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} />
          <SafeAreaView edges={["bottom"]} style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable
                onPress={() => setVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={`Close ${label} picker`}
              >
                <Ionicons name="close" size={rf(20)} color={colors.text.secondary} />
              </Pressable>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
            >
              {TIME_OPTIONS.map((option, index) => {
                const selected = index === selectedIndex;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => handleSelect(option.value)}
                    style={({ pressed }) => [
                      styles.optionRow,
                      selected && styles.optionRowSelected,
                      pressed && styles.optionRowPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    accessibilityState={selected ? { selected: true } : undefined}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {selected && (
                      <Ionicons
                        name="checkmark"
                        size={rf(16)}
                        color={colors.primary.DEFAULT}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...variants.caption,
    fontSize: rf(13),
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: surface[1],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    minHeight: Math.max(rw(48), 44),
    paddingRight: spacing.md,
  },
  fieldPressed: {
    opacity: 0.75,
  },
  iconContainer: {
    width: rw(32),
    height: rw(32),
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: rw(8),
  },
  valueText: {
    ...variants.body,
    flex: 1,
    color: colors.text.primary,
  },
  hintText: {
    ...variants.caption,
    fontSize: rf(11),
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  sheet: {
    backgroundColor: surface[0],
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: rh(420),
    // WEB/TABLET: mirror App.tsx's appColumn 480px phone-width column — this
    // Modal portals outside that wrapper, so without a cap the sheet
    // stretches edge-to-edge on wide viewports. No-op on phones.
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: border.DEFAULT,
    borderBottomWidth: 0,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: border.DEFAULT,
  },
  sheetTitle: {
    ...variants.sectionTitle,
    color: colors.text.primary,
  },
  optionsList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: ROW_HEIGHT,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
  },
  optionRowSelected: {
    backgroundColor: `${colors.primary.DEFAULT}14`,
  },
  optionRowPressed: {
    backgroundColor: surface[2],
  },
  optionText: {
    ...variants.body,
    color: colors.text.secondary,
  },
  optionTextSelected: {
    color: colors.text.primary,
    fontFamily: "Manrope_600SemiBold",
  },
});

export default TimeFieldPicker;
