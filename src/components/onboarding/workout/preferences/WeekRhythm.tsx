/**
 * WeekRhythm — sessions-per-week, Editorial Dark (replaces aurora StepperRow)
 *
 * Presents frequency as "your week", not a form value:
 *
 *  1. A hairline ruler of numbers 0–7. The selected number turns accent with a
 *     2px underline bar (echoes OptionRow's 2px bar language) and springs up.
 *     selectionAsync haptic on every change. No boxes, no fills.
 *  2. Below, a live Mon–Sun map: session dots spread evenly across the week
 *     (3 → M/W/F) and re-distribute with springs as the number moves. Pure
 *     presentation — the stored value is still just the count.
 *
 * Data wiring unchanged: `value` (0–7) + `onChange(count)`. The parent keeps
 * the `frequency-stepper` testID on the container.
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
  style?: ViewStyle;
  testID?: string;
}

const SPRING = { damping: 15, stiffness: 220 };
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
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

const DayDot: React.FC<{ letter: string; lit: boolean; index: number }> = ({
  letter,
  lit,
  index,
}) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(lit ? 1 : 0.85, SPRING);
  }, [lit, scale]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.dayCol} key={index}>
      <Animated.View style={[styles.dayDot, lit && styles.dayDotLit, anim]} />
      <Text style={[styles.dayLetter, lit && styles.dayLetterLit]}>
        {letter}
      </Text>
    </View>
  );
};

export const WeekRhythm: React.FC<WeekRhythmProps> = ({
  value,
  onChange,
  style,
  testID,
}) => {
  const clamped = Math.max(0, Math.min(7, value));
  const days = spreadSessions(clamped);

  const handle = (n: number) => {
    if (n !== clamped) fireSelection();
    onChange(n);
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

      {/* Live week map — derived presentation, not stored state */}
      <View style={styles.weekMap} testID="frequency-week-map">
        {DAY_LETTERS.map((letter, i) => (
          <DayDot key={i} index={i} letter={letter} lit={days[i]} />
        ))}
      </View>
      <Text style={styles.weekCaption}>
        {clamped === 0
          ? "A rest week — no sessions scheduled"
          : `${clamped} ${clamped === 1 ? "session" : "sessions"} spread across your week`}
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
