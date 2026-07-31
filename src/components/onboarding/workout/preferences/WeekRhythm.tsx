/**
 * WeekRhythm — sessions-per-week + which days, Editorial Dark
 *
 * Presents frequency as "your week", not a form value:
 *
 *  1. A hairline ruler of numbers 0–7. The selected number turns accent with a
 *     2px underline bar (echoes OptionRow's 2px bar language) and springs up.
 *     selectionAsync haptic on every change. No boxes, no fills.
 *  2. Below, a TAPPABLE Mon–Sun map: day chips default to an even spread for
 *     the chosen count (5 → M/T/W/F/Sa) and the user taps to override WHICH
 *     days they train (user feedback, Image #13). Tapping a day makes the
 *     count follow the selection — the parent hook keeps
 *     `workout_frequency_per_week` (how many) and `preferred_workout_days`
 *     (which) in lockstep, so there is a single consistent stored model.
 *
 * Data wiring: `value` (0–7) + `onChange(count)` for the ruler;
 * `days` (selected day ids, monday-first) + `onToggleDay(dayId)` for the map.
 * When `days`/`onToggleDay` are omitted the map falls back to a derived,
 * non-interactive spread (backward compatible with the old presentation).
 */

import React, { useEffect } from "react";
import { StyleSheet, View, Text, Pressable, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { tokens } from "../../fresh";

export interface WeekRhythmProps {
  /** Sessions per week, 0–7. */
  value: number;
  onChange: (sessions: number) => void;
  /** Selected day ids ('monday'..'sunday'). Omit → even-spread presentation. */
  days?: string[];
  /** Tap handler for a day chip. Omit → day map is display-only. */
  onToggleDay?: (dayId: string) => void;
  style?: ViewStyle;
  testID?: string;
}

const SPRING = { damping: 15, stiffness: 220 };
const DAY_IDS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const RANGE = [0, 1, 2, 3, 4, 5, 6, 7];

/** Evenly spread n sessions across a Mon–Sun week (3 → M/W/F, 6 → rest Sun). */
const spreadSessions = (n: number): boolean[] => {
  const days = new Array<boolean>(7).fill(false);
  const count = Math.max(0, Math.min(7, n));
  for (let i = 0; i < count; i++) {
    days[Math.floor((i * 7) / count)] = true;
  }
  return days;
};

const fireSelection = () => {
  Haptics.selectionAsync().catch(() => {});
};

const NumberCell: React.FC<{
  n: number;
  selected: boolean;
  onPress: (n: number) => void;
}> = ({ n, selected, onPress }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(selected ? 1.12 : 1, SPRING);
  }, [selected, scale]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={() => onPress(n)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${n} ${n === 1 ? "session" : "sessions"} per week`}
      testID={`frequency-cell-${n}`}
      style={styles.cell}
    >
      <Animated.Text
        style={[
          styles.cellLabel,
          selected ? styles.cellLabelOn : styles.cellLabelOff,
          anim,
        ]}
      >
        {n}
      </Animated.Text>
      <View style={[styles.cellBar, selected && styles.cellBarOn]} />
    </Pressable>
  );
};

const DayChip: React.FC<{
  letter: string;
  lit: boolean;
  index: number;
  dayId: string;
  dayName: string;
  onPress?: (dayId: string) => void;
}> = ({ letter, lit, dayId, dayName, onPress }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(lit ? 1 : 0.85, SPRING);
  }, [lit, scale]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress ? () => onPress(dayId) : undefined}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={onPress ? { selected: lit } : undefined}
      accessibilityLabel={
        onPress ? `${dayName} — ${lit ? "training day" : "rest day"}` : dayName
      }
      testID={`day-chip-${dayId}`}
      style={styles.dayCol}
    >
      <Animated.View style={[styles.dayDot, lit && styles.dayDotLit, anim]} />
      <Text style={[styles.dayLetter, lit && styles.dayLetterLit]}>
        {letter}
      </Text>
    </Pressable>
  );
};

export const WeekRhythm: React.FC<WeekRhythmProps> = ({
  value,
  onChange,
  days,
  onToggleDay,
  style,
  testID,
}) => {
  const clamped = Math.max(0, Math.min(7, value));
  // Controlled selection wins; fall back to the derived even spread.
  const litDays: boolean[] = days
    ? DAY_IDS.map((id) => days.includes(id))
    : spreadSessions(clamped);
  const litCount = litDays.filter(Boolean).length;
  const litNames = DAY_SHORT.filter((_, i) => litDays[i]);

  const handle = (n: number) => {
    if (n !== clamped) fireSelection();
    onChange(n);
  };

  const handleDay = (dayId: string) => {
    fireSelection();
    onToggleDay?.(dayId);
  };

  return (
    <View style={style} testID={testID}>
      {/* Number ruler 0–7 */}
      <View style={styles.strip}>
        {RANGE.map((n, i) => (
          <React.Fragment key={n}>
            {i > 0 && <View style={styles.separator} />}
            <NumberCell
              n={n}
              selected={n === clamped}
              onPress={handle}
            />
          </React.Fragment>
        ))}
      </View>

      {/* Tappable week map — pick WHICH days you train */}
      <View style={styles.weekMap} testID="frequency-week-map">
        {DAY_LETTERS.map((letter, i) => (
          <DayChip
            key={DAY_IDS[i]}
            index={i}
            letter={letter}
            dayId={DAY_IDS[i]}
            dayName={DAY_SHORT[i]}
            lit={litDays[i]}
            onPress={onToggleDay ? handleDay : undefined}
          />
        ))}
      </View>
      <Text style={styles.weekCaption}>
        {litCount === 0
          ? "A rest week — no sessions scheduled"
          : onToggleDay
            ? `${litNames.join(" · ")} — tap a day to change it`
            : `${litCount} ${litCount === 1 ? "session" : "sessions"} spread across your week`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.hairline,
  },
  separator: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: tokens.hairline,
  },
  cell: {
    flex: 1,
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 10,
  },
  cellLabel: {
    fontFamily: "Manrope_500Medium",
    fontSize: 17,
    lineHeight: 22,
  },
  cellLabelOn: {
    fontFamily: "Manrope_600SemiBold",
    color: tokens.accent,
  },
  cellLabelOff: {
    color: tokens.ink3,
  },
  cellBar: {
    marginTop: 6,
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: "transparent",
  },
  cellBarOn: {
    backgroundColor: tokens.accent,
  },
  weekMap: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingHorizontal: 22,
  },
  dayCol: {
    alignItems: "center",
    justifyContent: "center",
    // 44pt minimum touch target (touch-target tests enforce this).
    minWidth: 44,
    minHeight: 44,
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: tokens.hairline,
    backgroundColor: "transparent",
  },
  dayDotLit: {
    backgroundColor: tokens.accent,
    borderColor: tokens.accent,
  },
  dayLetter: {
    marginTop: 6,
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    lineHeight: 14,
    color: tokens.ink3,
  },
  dayLetterLit: {
    color: tokens.ink2,
  },
  weekCaption: {
    marginTop: 10,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    color: tokens.ink3,
  },
});

export default WeekRhythm;
