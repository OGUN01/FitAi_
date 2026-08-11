/**
 * PersonalInfoTab — S1 "You", Editorial Dark skin (docs/onboarding-fresh-design.md).
 *
 * Frame: ScreenScaffold (question "Who are you?" + Back/Next footer).
 * Sections: SectionLabel + a one-line "why we ask" caption + content + Rule
 * hairline — no cards, no shells. Sleep schedule: two compact TimeRow steppers
 * (Wake / Sleep) + a SleepInsight row — the one computed key-number of the tab
 * (accent, tabular-nums, opacity pulse on change).
 * Activity level: OptionRows (single-select).
 * Mount motion: FadeInDown stagger (360ms, 70ms steps) — micro-motion only.
 *
 * Presentation/layout only — props, hooks, validation, and data wiring stay
 * identical to the previous implementation.
 */
import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import {
  tokens,
  type as typeScale,
  ScreenScaffold,
  SectionLabel,
  Rule,
  OptionRow,
  TimeRow,
} from "../../../components/onboarding/fresh";
import {
  PersonalInfoData,
  TabValidationResult,
} from "../../../types/onboarding";
import { usePersonalInfoForm } from "../../../hooks/usePersonalInfoForm";
import {
  PersonalInfoFields,
  DemographicsFields,
} from "../../../components/onboarding/PersonalInfoFields";
import { LocationFields } from "../../../components/onboarding/LocationFields";
import { ValidationSection } from "../../../components/onboarding/shared/ValidationSection";

const MOUNT_DURATION = 360;
const STAGGER = 70;

// ---------------------------------------------------------------------------
// SleepInsight — the tab's one computed key-number. Caption left, accent value
// right (accent discipline: key numbers only). The value opacity-pulses when
// wake/sleep times change — quiet confirmation that the steppers did something.
// ---------------------------------------------------------------------------

const SleepInsight: React.FC<{ value: string }> = ({ value }) => {
  const flash = useSharedValue(1);
  useEffect(() => {
    flash.value = 0.3;
    flash.value = withTiming(1, { duration: 240 });
  }, [value, flash]);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  return (
    <View style={styles.insightRow}>
      <Text style={styles.insightLabel}>Sleep duration</Text>
      <Animated.Text style={[styles.insightValue, flashStyle]}>
        {value}
      </Animated.Text>
    </View>
  );
};

// activity_level option set — identical to WorkoutPreferencesData (blueprint §8
// rule 18 + typeTransformers mapActivityLevelForHealthCalc boundary).
const ACTIVITY_LEVEL_OPTIONS = [
  { id: "sedentary", label: "Sedentary", sublabel: "Desk life · little to no exercise" },
  { id: "light", label: "Light", sublabel: "Easy walks · 1–3 workouts a week" },
  { id: "moderate", label: "Moderate", sublabel: "3–5 workouts a week" },
  { id: "active", label: "Active", sublabel: "Daily hard exercise or sports" },
  { id: "extreme", label: "Extreme", sublabel: "Physical job plus daily training" },
];

interface PersonalInfoTabProps {
  data: PersonalInfoData | null;
  validationResult?: TabValidationResult;
  onNext: (currentData?: PersonalInfoData) => void;
  onBack: () => void;
  onUpdate: (data: Partial<PersonalInfoData>) => void;
  onNavigateToTab?: (tabNumber: number) => void;
  isLoading?: boolean;
  isAutoSaving?: boolean;
  isEditingFromReview?: boolean;
  onReturnToReview?: () => void;
  /** activity_level relocated from S4 (blueprint §8 rule 18). Rendered as
   * OptionRows ONLY when both are provided. */
  activityLevel?: string;
  onActivityLevelChange?: (v: string) => void;
}

const PersonalInfoTab: React.FC<PersonalInfoTabProps> = ({
  data,
  validationResult,
  onNext,
  onBack,
  onUpdate,
  isAutoSaving = false,
  isEditingFromReview = false,
  onReturnToReview,
  activityLevel,
  onActivityLevelChange,
}) => {
  const { state, actions } = usePersonalInfoForm({
    data,
    onUpdate,
    validationResult,
  });

  const {
    formData,
    availableStates,
    showCustomCountry,
    customCountry,
    detectedNonMetric,
  } = state;

  const showActivitySection =
    activityLevel !== undefined && !!onActivityLevelChange;

  // "Somewhere else" picked but no country name typed yet — block Next so the
  // sentinel string "Other" can never be persisted as the user's country
  // (validatePersonalInfo only checks non-empty, and "Other" would pass it).
  const customCountryPending = showCustomCountry && !customCountry.trim();
  const isDisabled =
    !!(validationResult && !validationResult.is_valid) || customCountryPending;

  const handleNext = () => {
    const finalData =
      showCustomCountry && customCountry
        ? { ...formData, country: customCountry }
        : formData;
    onUpdate(finalData);
    if (isEditingFromReview && onReturnToReview) {
      onReturnToReview();
    } else {
      onNext(finalData);
    }
  };

  const sleepDuration = actions.calculateSleepDuration();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingView}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScreenScaffold
        question="Who are you?"
        subtext="A minute here shapes every plan we build."
        onBack={onBack}
        onNext={handleNext}
        nextLabel={isEditingFromReview ? "Review" : "Next"}
        nextDisabled={isDisabled}
        footerNote={
          isAutoSaving ? (
            <Text style={styles.autoSaveText} numberOfLines={1}>
              Saving…
            </Text>
          ) : undefined
        }
      >
        <Animated.View entering={FadeInDown.duration(MOUNT_DURATION)}>
          <PersonalInfoFields formData={formData} actions={actions} />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(MOUNT_DURATION).delay(STAGGER)}
        >
          <DemographicsFields formData={formData} actions={actions} />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(MOUNT_DURATION).delay(STAGGER * 2)}
        >
          <LocationFields
            formData={formData}
            availableStates={availableStates}
            showCustomCountry={showCustomCountry}
            customCountry={customCountry}
            actions={actions}
          />
        </Animated.View>

        {/* Sleep schedule — two compact TimeRow steppers + the SleepInsight
            key-number row. NO dials, NO filled circles (docs/onboarding-fresh-design.md). */}
        <Animated.View
          entering={FadeInDown.duration(MOUNT_DURATION).delay(STAGGER * 3)}
        >
          <View style={styles.labelWrap}>
            <SectionLabel>Sleep Schedule</SectionLabel>
            <Text style={styles.sectionCaption}>
              Anchors your workout and meal timing.
            </Text>
          </View>
          <TimeRow
            label="Wake"
            value={formData.wake_time}
            onChange={(v) => actions.handleTimeChange("wake_time", v)}
            stepMinutes={15}
            testID="onboarding-wake-dial"
          />
          <TimeRow
            label="Sleep"
            value={formData.sleep_time}
            onChange={(v) => actions.handleTimeChange("sleep_time", v)}
            stepMinutes={15}
            testID="onboarding-sleep-dial"
          />
          {sleepDuration ? <SleepInsight value={sleepDuration} /> : null}
          <Rule spacing={36} />
        </Animated.View>

        {/* activity_level — relocated from S4 (blueprint §8 rule 18).
            Rendered only when the parent wires the optional props. */}
        {showActivitySection && (
          <Animated.View
            entering={FadeInDown.duration(MOUNT_DURATION).delay(STAGGER * 4)}
          >
            <View style={styles.labelWrap}>
              <SectionLabel>Daily Activity</SectionLabel>
              <Text style={styles.sectionCaption}>
                How much you move on a normal day — this sets your calorie
                baseline.
              </Text>
            </View>
            <View testID="onboarding-activity-level">
              {ACTIVITY_LEVEL_OPTIONS.map((opt) => (
                <OptionRow
                  key={opt.id}
                  label={opt.label}
                  sublabel={opt.sublabel}
                  selected={(activityLevel ?? "sedentary") === opt.id}
                  onPress={() => onActivityLevelChange?.(opt.id)}
                />
              ))}
            </View>
            <Rule spacing={36} />
          </Animated.View>
        )}

        {/* Units — hidden unless detected ≠ metric (blueprint §6). */}
        {detectedNonMetric && (
          <Animated.View
            entering={FadeInDown.duration(MOUNT_DURATION).delay(STAGGER * 5)}
          >
            <View style={styles.labelWrap}>
              <SectionLabel>Units</SectionLabel>
              <Text style={styles.sectionCaption}>
                Detected from your region — switch if this looks wrong.
              </Text>
            </View>
            <View testID="onboarding-units">
              <OptionRow
                label="Metric"
                selected={(formData.units ?? "metric") === "metric"}
                onPress={() =>
                  actions.updateField(
                    "units",
                    "metric" as PersonalInfoData["units"],
                  )
                }
              />
              <OptionRow
                label="Imperial"
                selected={(formData.units ?? "metric") === "imperial"}
                onPress={() =>
                  actions.updateField(
                    "units",
                    "imperial" as PersonalInfoData["units"],
                  )
                }
              />
            </View>
            <Rule spacing={36} />
          </Animated.View>
        )}

        {validationResult && (
          <ValidationSection validationResult={validationResult} />
        )}
      </ScreenScaffold>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  autoSaveText: {
    ...typeScale.caption,
  },
  /** Section label + "why we ask" caption, 12px above the content. */
  labelWrap: {
    marginBottom: 12,
  },
  sectionCaption: {
    ...typeScale.caption,
    marginTop: 6,
  },
  /** SleepInsight — quiet full-width row under the two TimeRows. */
  insightRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  insightLabel: {
    ...typeScale.body,
    color: tokens.ink2,
  },
  /** Key number — the one computed insight of the tab (accent discipline:
   *  selection/focus/key-numbers/primary-CTA only). */
  insightValue: {
    ...typeScale.valueLg,
    fontSize: 18,
    color: tokens.accent,
    fontVariant: ["tabular-nums"],
  },
});

export default PersonalInfoTab;
