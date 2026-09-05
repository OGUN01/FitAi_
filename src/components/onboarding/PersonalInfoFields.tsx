/**
 * PersonalInfoFields — S1 "You" identity inputs, Editorial Dark skin.
 *
 * Name: two UnderlineInputs side by side (underline-only, accent focus) plus a
 *   conversational greeting line that appears the moment a first name exists —
 *   live micro-feedback at the point of entry (Typeform-style dialogue).
 * Age: a self-labeled 56px hairline stepper row that mirrors TimeRow exactly —
 *   label left, quiet [-] value [+] ghost-circle stepper right, hairline below.
 *   The value opacity-pulses on each step so taps feel acknowledged.
 * Gender: 4 OptionRows (single-select, accent check + 2px left bar) — type
 *   only, no icons, one row language across the whole tab. Each risky/personal
 *   field gets a one-line "why we ask" caption under it.
 *
 * Presentation only — props/hooks/validation stay identical to the data layer.
 */
import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  tokens,
  type as typeScale,
  spacing,
  SectionLabel,
  Rule,
  OptionRow,
  RowGroup,
} from "./fresh";
import { UnderlineInput } from "./aurora";
import { GENDER_OPTIONS } from "./PersonalInfoConstants";
import { PersonalInfoData } from "../../types/onboarding";

const PRESS_DURATION = 120;
const PRESS_OPACITY = 0.5;

interface PersonalInfoFieldsProps {
  formData: PersonalInfoData;
  actions: {
    updateField: <K extends keyof PersonalInfoData>(
      field: K,
      value: PersonalInfoData[K],
    ) => void;
    handleAgeChange: (text: string) => void;
    hasFieldError: (field: string) => boolean;
    getFieldError: (field: string) => string | undefined;
  };
}

export const PersonalInfoFields: React.FC<PersonalInfoFieldsProps> = ({
  formData,
  actions,
}) => {
  const { updateField, hasFieldError, getFieldError } = actions;
  const firstName = formData.first_name?.trim() ?? "";

  return (
    <View>
      <SectionLabel>Full Name</SectionLabel>
      <View style={styles.nameRow}>
        <UnderlineInput
          label="First Name"
          placeholder="John"
          testID="onboarding-first-name"
          value={formData.first_name}
          onChangeText={(v) => updateField("first_name", v)}
          autoFocus
          accentColor={tokens.accent}
          containerStyle={styles.nameField}
          // No server-side length limit (profiles.first_name is TEXT), but an
          // unbounded free-text field with no client guard lets a pasted wall
          // of text into a name field — cap at a generous but sane length.
          maxLength={50}
        />
        <UnderlineInput
          label="Last Name"
          placeholder="Doe"
          testID="onboarding-last-name"
          value={formData.last_name}
          onChangeText={(v) => updateField("last_name", v)}
          accentColor={tokens.accent}
          containerStyle={styles.nameField}
          maxLength={50}
        />
      </View>
      {hasFieldError("first name") && (
        <Text style={styles.errorText}>{getFieldError("first name")}</Text>
      )}
      {hasFieldError("last name") && (
        <Text style={styles.errorText}>{getFieldError("last name")}</Text>
      )}
      {/* Conversational micro-feedback: the answer immediately talks back.
          Key is constant so the entrance animation fires once (first non-empty
          keystroke); later keystrokes just update the text. */}
      {firstName.length > 0 && (
        <Animated.Text
          key="name-greeting"
          entering={FadeInDown.duration(220)}
          style={styles.greeting}
        >
          Nice to meet you, {firstName}.
        </Animated.Text>
      )}
      <Rule spacing={36} />
    </View>
  );
};

export const DemographicsFields: React.FC<PersonalInfoFieldsProps> = ({
  formData,
  actions,
}) => {
  const { updateField, hasFieldError, getFieldError } = actions;

  return (
    <View>
      {/* CLAUDE.md #8 — no hardcoded fallbacks for user data: when age is
          unset the stepper shows "—" (validation requires a real value),
          not a fake 13 that looks filled but blocks Next with "age required".
          First tap on + commits the real minimum (13). */}
      <AgeStepper
        value={
          typeof formData.age === "number" && formData.age >= 13
            ? formData.age
            : null
        }
        min={13}
        max={120}
        onChange={(v) => updateField("age", v)}
        testID="onboarding-age"
      />
      <Text style={styles.fieldCaption}>
        Drives your metabolic and calorie baseline.
      </Text>
      {hasFieldError("age") && (
        <Text style={styles.errorText}>{getFieldError("age")}</Text>
      )}

      <RowGroup label="Gender" style={styles.genderGroup}>
        {GENDER_OPTIONS.map((opt, i) => (
          <OptionRow
            key={opt.value}
            label={opt.label}
            selected={formData.gender === opt.value}
            onPress={() =>
              updateField("gender", opt.value as PersonalInfoData["gender"])
            }
            testID={i === 0 ? "onboarding-gender" : undefined}
          />
        ))}
      </RowGroup>
      <Text style={styles.fieldCaption}>
        Only used for calorie and macro math.
      </Text>
      {hasFieldError("gender") && (
        <Text style={styles.errorText}>{getFieldError("gender")}</Text>
      )}
      <Rule spacing={36} />
    </View>
  );
};

// ---------------------------------------------------------------------------
// AgeStepper — mirrors TimeRow: a 56px hairline row, "Age" label left, quiet
// [-] value [+] ghost-circle stepper right (32px circles, 120ms opacity
// press). No dial, no box — one stepper language across the whole tab.
// ---------------------------------------------------------------------------

interface AgeStepperProps {
  /** null = unset (shows "—"; first + commits `min`). */
  value: number | null;
  min: number;
  max: number;
  onChange: (v: number) => void;
  testID?: string;
}

const AgeStepper: React.FC<AgeStepperProps> = ({
  value,
  min,
  max,
  onChange,
  testID,
}) => {
  // Quiet pulse on the value each time it steps — tap acknowledgement without
  // sound or haptics (keeps the UI in sync with TimeRow's press language).
  const flash = useSharedValue(1);
  useEffect(() => {
    flash.value = 0.3;
    flash.value = withTiming(1, { duration: 180 });
  }, [value, flash]);
  const valueStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  return (
    <View testID={testID}>
      <View style={styles.stepperRow}>
        <Text style={styles.stepperLabel} numberOfLines={1}>
          Age
        </Text>
        <View style={styles.stepper}>
          <StepButton
            icon="remove"
            onPress={() => value != null && onChange(Math.max(min, value - 1))}
            disabled={value == null || value <= min}
            accessibilityLabel="Decrease age"
            testID={testID ? `${testID}-minus` : undefined}
          />
          <Animated.Text style={[styles.stepperValue, valueStyle]}>
            {value == null ? "—" : value}
          </Animated.Text>
          <StepButton
            icon="add"
            onPress={() => onChange(value == null ? min : Math.min(max, value + 1))}
            disabled={value != null && value >= max}
            accessibilityLabel="Increase age"
            testID={testID ? `${testID}-plus` : undefined}
          />
        </View>
      </View>
      <View style={styles.hairline} />
    </View>
  );
};

const StepButton: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  testID?: string;
}> = ({ icon, onPress, disabled = false, accessibilityLabel, testID }) => {
  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // Press-and-hold repeat-acceleration: reaching a realistic age (or rep
  // count elsewhere) from the unset default took dozens of single taps.
  // Holding the button now auto-repeats after a short delay, speeding up
  // the longer it's held. A single quick tap still increments exactly once.
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const repeatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickCount = useRef(0);
  const didRepeat = useRef(false);

  const stopRepeat = () => {
    if (repeatTimer.current) {
      clearTimeout(repeatTimer.current);
      repeatTimer.current = null;
    }
    tickCount.current = 0;
  };

  const startRepeat = () => {
    const tick = (delay: number) => {
      repeatTimer.current = setTimeout(() => {
        if (disabledRef.current) {
          stopRepeat();
          return;
        }
        didRepeat.current = true;
        onPressRef.current();
        tickCount.current += 1;
        const nextDelay = tickCount.current > 15 ? 40 : tickCount.current > 6 ? 80 : 140;
        tick(nextDelay);
      }, delay);
    };
    tick(450); // initial hold threshold before repeating begins
  };

  useEffect(() => stopRepeat, []);

  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        // Suppress the release tap that follows a completed long-press
        // repeat — it already applied its increments.
        if (didRepeat.current) {
          didRepeat.current = false;
          return;
        }
        onPress();
      }}
      onPressIn={() => {
        if (!disabled) {
          opacity.value = withTiming(PRESS_OPACITY, {
            duration: PRESS_DURATION,
          });
        }
        didRepeat.current = false;
        startRepeat();
      }}
      onPressOut={() => {
        opacity.value = withTiming(1, { duration: PRESS_DURATION });
        stopRepeat();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      // Real (not hitSlop) 44px touch layer — hitSlop is confirmed inert on
      // web (react-native-web's View drops it; not in the module's own prop
      // allow-list). This wraps the 32px ghost circle in a real 44x44
      // Pressable box, centered, so the visual size is unchanged but the
      // hit-testable area genuinely grows on web too. hitSlop kept for the
      // real, additional expansion it still provides on native.
      style={styles.stepButtonTouch}
      hitSlop={8}
    >
      <Animated.View
        style={[
          styles.stepButton,
          animatedStyle,
          disabled && styles.stepButtonDisabled,
        ]}
      >
        <Ionicons name={icon} size={18} color={tokens.ink} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  nameRow: {
    flexDirection: "row",
    gap: 24,
  },
  nameField: {
    flex: 1,
  },
  genderGroup: {
    marginTop: 28,
  },
  stepperRow: {
    height: spacing.rowH,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
  },
  stepperLabel: {
    ...typeScale.value,
    color: tokens.ink2,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Real (not hitSlop) 44px-minimum interactive layer — see the Pressable's
  // own comment above for why hitSlop doesn't work here on web.
  stepButtonTouch: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tokens.hairline,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  stepButtonDisabled: {
    opacity: 0.3,
  },
  stepperValue: {
    ...typeScale.valueLg,
    minWidth: 44,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  hairline: {
    height: spacing.hair,
    backgroundColor: tokens.hairline,
    alignSelf: "stretch",
  },
  errorText: {
    ...typeScale.caption,
    color: tokens.danger,
    marginTop: 8,
  },
  /** Conversational greeting under the name row — the first micro-reward. */
  greeting: {
    ...typeScale.body,
    color: tokens.ink2,
    marginTop: 12,
  },
  /** One-line "why we ask" caption under risky/personal fields. */
  fieldCaption: {
    ...typeScale.caption,
    marginTop: 10,
  },
});
