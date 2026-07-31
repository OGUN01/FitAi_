/**
 * MeasurementsSection — Body tab, default-visible group (Editorial Dark).
 *
 * height_cm + current_weight_kg RangeSliders with premium numeric readouts:
 * a big, confident Manrope 300 number beside the label, the unit as a small
 * trailing word, and a live secondary conversion (cm → ft/in, kg → lb) as
 * calm caption microcopy. A BMI ring (StrokeRing, read-only) updates as the
 * sliders move, with the BMI category as the hero text and a thin position
 * spectrum beneath showing where the value sits against the healthy band.
 *
 * Presentation only — props/validation/data wiring unchanged (sliders call the
 * same updateField that the legacy Inputs did). No new form fields.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  RowGroup,
  StrokeRing,
} from "../../onboarding/fresh";
import {
  tokens,
  type as freshType,
  font,
  spacing as freshSpacing,
} from "../../onboarding/fresh/tokens";
import { RangeSlider } from "../../onboarding/aurora/RangeSlider";
import { BodyAnalysisData } from "../../../types/onboarding";

interface MeasurementsSectionProps {
  formData: BodyAnalysisData;
  updateField: <K extends keyof BodyAnalysisData>(
    field: K,
    value: BodyAnalysisData[K],
  ) => void;
  getBMICategory: (bmi: number) => {
    category: string;
    color: string;
    iconName: string;
  };
  getFieldError: (field: string) => string | undefined;
  hasFieldError: (field: string) => boolean;
  /** S1 unit preference — display-only conversion; sliders/stored values
   * stay metric (kg/cm), the primary readout switches to lb / ft-in. */
  units?: "metric" | "imperial" | null;
  /** @deprecated Editorial Dark always uses tokens.accent; kept optional so
   * legacy callers (unreferenced BodyTab experiment) still typecheck. */
  accentColor?: string;
}

const HEIGHT_MIN = 100;
const HEIGHT_MAX = 250;
const WEIGHT_MIN = 30;
const WEIGHT_MAX = 300;

const BMI_RING_SIZE = 132;
const BMI_RING_STROKE = 10;

/** BMI 10–40 maps onto the spectrum; the healthy band sits at 18.5–25. */
const BMI_SPECTRUM_MIN = 10;
const BMI_SPECTRUM_MAX = 40;
const BMI_HEALTHY_LOW = 18.5;
const BMI_HEALTHY_HIGH = 25;

// Pure presentation conversions — no validation, no storage.
const cmToFtIn = (cm: number): string => {
  if (!cm || cm <= 0) return "";
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  // Round up to a full foot edge case (e.g. 182.88 cm → 5'12" → 6'0").
  if (inch === 12) return `${ft + 1}'0"`;
  return `${ft}'${inch}"`;
};

const kgToLb = (kg: number): string => {
  if (!kg || kg <= 0) return "";
  return `${Math.round(kg * 2.20462)} lb`;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const MeasurementsSection: React.FC<MeasurementsSectionProps> = ({
  formData,
  updateField,
  getBMICategory,
  getFieldError,
  hasFieldError,
  units,
}) => {
  const isImperial = units === "imperial";
  const bmi = formData.bmi ?? 0;
  const bmiCategory = bmi > 0 ? getBMICategory(bmi) : null;
  // Map BMI 10–40 to a 0–1 fraction for the read-only ring.
  const bmiFraction =
    bmi > 0 ? clamp01((bmi - 10) / (40 - 10)) : 0;

  // Position of the current BMI on the 10–40 spectrum (0–1).
  const bmiSpectrumPos = bmi > 0 ? clamp01((bmi - BMI_SPECTRUM_MIN) / (BMI_SPECTRUM_MAX - BMI_SPECTRUM_MIN)) : 0;
  // Healthy band edges on the same spectrum (0–1).
  const healthyBandStart = (BMI_HEALTHY_LOW - BMI_SPECTRUM_MIN) / (BMI_SPECTRUM_MAX - BMI_SPECTRUM_MIN);
  const healthyBandWidth = (BMI_HEALTHY_HIGH - BMI_HEALTHY_LOW) / (BMI_SPECTRUM_MAX - BMI_SPECTRUM_MIN);

  const heightVal = formData.height_cm ?? 0;
  const weightVal = formData.current_weight_kg ?? 0;

  return (
    <RowGroup label="Measurements">
      <View style={styles.stack}>
        {/* HEIGHT — big confident number, secondary ft/in conversion */}
        <View style={styles.field}>
          <View style={styles.readoutRow}>
            <View style={styles.readoutLabelWrap}>
              <Text style={styles.fieldLabel} numberOfLines={1}>
                Height
              </Text>
              {heightVal > 0 ? (
                <Text style={styles.conversion} numberOfLines={1}>
                  {isImperial ? `${Math.round(heightVal)} cm` : cmToFtIn(heightVal)}
                </Text>
              ) : null}
              {hasFieldError("height") ? (
                <Text style={styles.fieldError} numberOfLines={1}>
                  {getFieldError("height")}
                </Text>
              ) : null}
            </View>
            <Text style={styles.bigValue} numberOfLines={1}>
              {isImperial ? (
                <Text style={styles.bigNumber}>
                  {heightVal > 0 ? cmToFtIn(heightVal) : "—"}
                </Text>
              ) : (
                <>
                  <Text style={styles.bigNumber}>
                    {heightVal > 0 ? Math.round(heightVal) : "—"}
                  </Text>
                  <Text style={styles.bigUnit}> cm</Text>
                </>
              )}
            </Text>
          </View>
          <RangeSlider
            value={formData.height_cm || HEIGHT_MIN}
            min={HEIGHT_MIN}
            max={HEIGHT_MAX}
            step={1}
            unit="cm"
            accentColor={tokens.accent}
            onChange={(v) => updateField("height_cm", v)}
            showValue={false}
            testID="height-slider"
          />
        </View>

        {/* CURRENT WEIGHT — big confident number, secondary lb conversion */}
        <View style={styles.field}>
          <View style={styles.readoutRow}>
            <View style={styles.readoutLabelWrap}>
              <Text style={styles.fieldLabel} numberOfLines={1}>
                Current weight
              </Text>
              {weightVal > 0 ? (
                <Text style={styles.conversion} numberOfLines={1}>
                  {isImperial
                    ? `${weightVal.toFixed(1).replace(/\.0$/, "")} kg`
                    : kgToLb(weightVal)}
                </Text>
              ) : null}
              {hasFieldError("current weight") ? (
                <Text style={styles.fieldError} numberOfLines={1}>
                  {getFieldError("current weight")}
                </Text>
              ) : null}
            </View>
            <Text style={styles.bigValue} numberOfLines={1}>
              {isImperial ? (
                <>
                  <Text style={styles.bigNumber}>
                    {weightVal > 0 ? Math.round(weightVal * 2.20462) : "—"}
                  </Text>
                  <Text style={styles.bigUnit}> lb</Text>
                </>
              ) : (
                <>
                  <Text style={styles.bigNumber}>
                    {weightVal > 0 ? weightVal.toFixed(1).replace(/\.0$/, "") : "—"}
                  </Text>
                  <Text style={styles.bigUnit}> kg</Text>
                </>
              )}
            </Text>
          </View>
          <RangeSlider
            value={formData.current_weight_kg || WEIGHT_MIN}
            min={WEIGHT_MIN}
            max={WEIGHT_MAX}
            step={0.5}
            unit="kg"
            accentColor={tokens.accent}
            onChange={(v) => updateField("current_weight_kg", v)}
            showValue={false}
            testID="current-weight-slider"
          />
        </View>

        {/* Live BMI ring — crisp react-native-svg StrokeRing (accent progress
            over a hairline track), big number + label centered. FadeInDown on
            mount (micro-motion per the design doc). The right-hand meta shows
            the category as the hero line (accent when healthy, danger when
            not) and a thin BMI spectrum with a position dot so the user sees
            where they sit against the healthy band at a glance. */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.bmiBlock}
        >
          <StrokeRing
            size={BMI_RING_SIZE}
            strokeWidth={BMI_RING_STROKE}
            progress={bmiFraction}
            color={tokens.accent}
            trackColor={tokens.hairline}
          >
            {bmi > 0 ? (
              <>
                <Text style={styles.bmiValue} numberOfLines={1}>
                  {Math.round(bmi)}
                </Text>
                <Text style={styles.bmiUnit} numberOfLines={1}>
                  BMI
                </Text>
              </>
            ) : (
              <Text style={styles.bmiPlaceholder} numberOfLines={1}>
                BMI
              </Text>
            )}
          </StrokeRing>

          <View style={styles.bmiMeta}>
            {bmi > 0 && bmiCategory ? (
              <Text
                style={[styles.bmiCategory, { color: bmiCategory.color }]}
                numberOfLines={1}
              >
                {bmiCategory.category}
              </Text>
            ) : null}

            {/* Position spectrum — hairline track, accent healthy band, dot at
                the user's BMI. Pure visual; no interaction. */}
            {bmi > 0 ? (
              <View
                style={styles.spectrumTrack}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {/* healthy band */}
                <View
                  style={[
                    styles.spectrumBand,
                    {
                      left: `${healthyBandStart * 100}%`,
                      width: `${healthyBandWidth * 100}%`,
                    },
                  ]}
                />
                {/* current position dot */}
                <View
                  style={[
                    styles.spectrumDot,
                    { left: `${bmiSpectrumPos * 100}%` },
                  ]}
                />
              </View>
            ) : null}

            <Text style={styles.idealCaption} numberOfLines={1}>
              Healthy zone 18.5 – 25
            </Text>

            {formData.ideal_weight_min != null &&
            formData.ideal_weight_max != null &&
            formData.ideal_weight_min > 0 &&
            formData.ideal_weight_max > 0 ? (
              <Text style={styles.idealText} numberOfLines={2}>
                Healthy range{"\n"}
                {isImperial
                  ? `${Math.round(formData.ideal_weight_min * 2.20462)}–${Math.round(formData.ideal_weight_max * 2.20462)} lb`
                  : `${Math.round(formData.ideal_weight_min)}–${Math.round(formData.ideal_weight_max)} kg`}
              </Text>
            ) : (
              <Text style={styles.idealText} numberOfLines={2}>
                Set height &amp; weight{"\n"}to see your BMI
              </Text>
            )}
          </View>
        </Animated.View>
      </View>
    </RowGroup>
  );
};

const styles = StyleSheet.create({
  stack: {
    gap: freshSpacing.xl + freshSpacing.s,
  },
  field: {
    gap: freshSpacing.s,
  },
  readoutRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: freshSpacing.s,
    marginBottom: freshSpacing.s,
  },
  readoutLabelWrap: {
    flex: 1,
    gap: 2,
  },
  fieldLabel: {
    ...freshType.sectionLabel,
  },
  conversion: {
    ...freshType.caption,
    color: tokens.ink2,
  },
  fieldError: {
    ...freshType.caption,
    color: tokens.danger,
  },
  bigValue: {
    flexShrink: 0,
  },
  bigNumber: {
    fontFamily: font.light,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: tokens.ink,
  },
  bigUnit: {
    ...freshType.body,
    color: tokens.ink2,
  },
  bmiBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: freshSpacing.screenPad,
    marginTop: freshSpacing.m,
    paddingVertical: freshSpacing.m,
  },
  bmiValue: {
    fontFamily: font.light,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1,
    color: tokens.ink,
  },
  bmiUnit: {
    ...freshType.caption,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginTop: freshSpacing.xs,
  },
  bmiPlaceholder: {
    ...freshType.caption,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  bmiMeta: {
    flex: 1,
    gap: freshSpacing.xs,
  },
  bmiCategory: {
    ...freshType.valueLg,
  },
  spectrumTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.hairline,
    overflow: "visible",
    justifyContent: "center",
    marginVertical: freshSpacing.xs,
    position: "relative",
  },
  spectrumBand: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: tokens.healthyDim,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: tokens.healthy,
  },
  spectrumDot: {
    position: "absolute",
    top: -3,
    width: 10,
    height: 10,
    marginLeft: -5,
    borderRadius: 9999,
    backgroundColor: tokens.ink,
    borderWidth: 2,
    borderColor: tokens.accent,
  },
  idealCaption: {
    ...freshType.caption,
    letterSpacing: 0.6,
  },
  idealText: {
    ...freshType.caption,
    color: tokens.ink2,
    marginTop: freshSpacing.xs,
  },
});
