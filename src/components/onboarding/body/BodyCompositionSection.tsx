/**
 * BodyCompositionSection — Body tab signature "Body Map" (Editorial Dark).
 *
 * The counterpart to the Measurements section's BMI ring: instead of four
 * vertically stacked sliders, measurements are anchored to a line-art
 * silhouette (2026 pattern: live body figure — values map onto the body as
 * you adjust them; research: body-visualizer tools, silhouette-guided health
 * inputs).
 *
 *   • Chest / waist / hip are TAPE LINES across the torso at their anatomical
 *     height. Line width tracks the value. Drag a tape sideways to set it
 *     (unset tapes render as dashed ghosts at a sensible baseline).
 *   • The torso itself is the body-fat control: a calm accent fill rises from
 *     the base; drag the body vertically to set body_fat_percentage.
 *   • A hero fat readout + category sits above; a Chest/Waist/Hip readout row
 *     sits below (active tape turns accent). Waist-hip ratio line unchanged.
 *
 * Data wiring unchanged — every gesture ends in the same updateField calls the
 * legacy sliders made. All gesture callbacks are ref-routed (the RangeSlider
 * coupling-bug lesson: never let a once-created PanResponder capture a stale
 * state closure). No new form fields.
 */

import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
  PanResponderGestureState,
} from "react-native";
import Svg, { Path, Circle, Line, Rect } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  tokens,
  type as freshType,
  font,
  spacing as freshSpacing,
} from "../../onboarding/fresh/tokens";
import { BodyAnalysisData, PersonalInfoData } from "../../../types/onboarding";

interface BodyCompositionSectionProps {
  formData: BodyAnalysisData;
  updateField: <K extends keyof BodyAnalysisData>(
    field: K,
    value: BodyAnalysisData[K],
  ) => void;
  showMeasurementGuide: boolean;
  setShowMeasurementGuide: (show: boolean) => void;
  personalInfoData?: PersonalInfoData | null;
}

const FAT_MIN = 3;
const FAT_MAX = 50;
const GIRTH_MIN = 40;
const GIRTH_MAX = 200;

/** First-drag baselines when a field is still unset (presentation only). */
const FAT_BASELINE = 20;
const GIRTH_BASELINE: Record<BandField, number> = {
  chest_cm: 95,
  waist_cm: 80,
  hip_cm: 95,
};

/** Gesture sensitivity: px of travel → units. */
const CM_PER_PX = 0.6;
const FAT_PER_PX = 0.2;

/** Stage geometry (SVG viewBox == rendered px; bands are overlaid at these y). */
const STAGE_W = 200;
const STAGE_H = 270;
const BAND_Y: Record<BandField, number> = {
  chest_cm: 108,
  waist_cm: 162,
  hip_cm: 206,
};
const BAND_HIT_H = 44; // touch-target floor (tests enforce >= 44pt)
const FAT_TOP_Y = 46; // fill never rises into the head/neck
const FAT_BASE_Y = 252;

type BandField = "chest_cm" | "waist_cm" | "hip_cm";
const BAND_FIELDS: BandField[] = ["chest_cm", "waist_cm", "hip_cm"];
const BAND_LABEL: Record<BandField, string> = {
  chest_cm: "Chest",
  waist_cm: "Waist",
  hip_cm: "Hip",
};
const BAND_HINT: Record<BandField, string> = {
  chest_cm: "Fullest part, tape level",
  waist_cm: "Narrowest point, above the belly button",
  hip_cm: "Widest point of your hips",
};

const fireImpact = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};
const fireSelection = () => {
  Haptics.selectionAsync().catch(() => {});
};

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

/** Girth (cm) → tape half-width (px). 40–200 cm maps to 26–74 px half-width. */
const girthToHalfWidth = (cm: number): number =>
  26 + (clamp(cm, GIRTH_MIN, GIRTH_MAX) - GIRTH_MIN) / (GIRTH_MAX - GIRTH_MIN) * 48;

/** Body-fat % → fill level y (higher fat → smaller y → taller fill). */
const fatToLevelY = (fat: number): number =>
  FAT_BASE_Y -
  (clamp(fat, FAT_MIN, FAT_MAX) - FAT_MIN) / (FAT_MAX - FAT_MIN) *
    (FAT_BASE_Y - FAT_TOP_Y);

/** Editorial category for the fat hero (gender-aware, presentation only). */
const fatCategory = (fat: number, gender?: string): string => {
  const t = gender === "female" ? [14, 21, 25, 32] : [6, 14, 18, 25];
  if (fat < t[0]) return "Essential";
  if (fat < t[1]) return "Athletic";
  if (fat < t[2]) return "Fitness";
  if (fat < t[3]) return "Average";
  return "High";
};

/** Line-art torso, symmetric about x=100 — hairline stroke, no fill. */
const TORSO_PATH =
  "M 78 44 " +
  "C 64 52 55 64 54 80 " +
  "C 53 96 57 112 63 124 " +
  "C 69 137 72 149 68 162 " +
  "C 64 175 67 191 77 203 " +
  "C 85 213 90 226 92 244 " +
  "L 92 252 " +
  "M 122 44 " +
  "C 136 52 145 64 146 80 " +
  "C 147 96 143 112 137 124 " +
  "C 131 137 128 149 132 162 " +
  "C 136 175 133 191 123 203 " +
  "C 115 213 110 226 108 244 " +
  "L 108 252";

export const BodyCompositionSection: React.FC<
  BodyCompositionSectionProps
> = ({
  formData,
  updateField,
  showMeasurementGuide,
  setShowMeasurementGuide,
  personalInfoData,
}) => {
  // ── Ref-routed gesture plumbing (never capture stale state in a
  //    once-created PanResponder — the slider-coupling bug pattern). ──
  const valuesRef = useRef(formData);
  valuesRef.current = formData;
  const updateFieldRef = useRef(updateField);
  updateFieldRef.current = updateField;

  const [activeBand, setActiveBand] = useState<BandField | null>(null);
  const [fatDragging, setFatDragging] = useState(false);

  const showRatio =
    formData.waist_hip_ratio != null && formData.waist_hip_ratio > 0;
  const ratioThreshold = personalInfoData?.gender === "female" ? 0.85 : 0.9;
  const ratioHealthy = showRatio
    ? (formData.waist_hip_ratio ?? 0) < ratioThreshold
    : false;

  const fat = formData.body_fat_percentage ?? null;
  const fatLevelY = fat != null && fat > 0 ? fatToLevelY(fat) : null;

  // Per-gesture drag accumulators (incremental moveX/moveY deltas — robust
  // against frame lag, no dependence on re-render timing).
  const bandDrag = useRef<{ field: BandField; value: number; lastX: number } | null>(null);
  const fatDrag = useRef<{ value: number; lastY: number } | null>(null);
  const lastHapticBucket = useRef(-1);

  // ── Tape responders: claim only horizontal-intent moves so vertical drags
  //    fall through to the torso (fat) responder. ──
  const bandResponders = useRef(
    BAND_FIELDS.reduce(
      (acc, field) => {
        acc[field] = PanResponder.create({
          onStartShouldSetPanResponder: () => false,
          onMoveShouldSetPanResponder: (_e, g: PanResponderGestureState) =>
            Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 4,
          onPanResponderTerminationRequest: () => true,
          onPanResponderGrant: (_e, g) => {
            const current = valuesRef.current[field];
            bandDrag.current = {
              field,
              value: current != null && current > 0 ? current : GIRTH_BASELINE[field],
              lastX: g.moveX,
            };
            lastHapticBucket.current = -1;
            setActiveBand(field);
            fireSelection();
          },
          onPanResponderMove: (_e, g) => {
            const d = bandDrag.current;
            if (!d) return;
            const dx = g.moveX - d.lastX;
            d.lastX = g.moveX;
            d.value = clamp(d.value + dx * CM_PER_PX, GIRTH_MIN, GIRTH_MAX);
            const v = Math.round(d.value);
            if (v !== lastHapticBucket.current) {
              lastHapticBucket.current = v;
              fireImpact();
            }
            updateFieldRef.current(field, v as BodyAnalysisData[BandField]);
          },
          onPanResponderRelease: () => {
            bandDrag.current = null;
            setActiveBand(null);
            fireSelection();
          },
          onPanResponderTerminate: () => {
            bandDrag.current = null;
            setActiveBand(null);
          },
        });
        return acc;
      },
      {} as Record<BandField, ReturnType<typeof PanResponder.create>>,
    ),
  ).current;

  // ── Torso responder: vertical drag sets body fat; claims only
  //    vertical-intent moves (horizontal belongs to the tapes). ──
  const torsoResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g: PanResponderGestureState) =>
        Math.abs(g.dy) >= Math.abs(g.dx) && Math.abs(g.dy) > 4,
      onPanResponderTerminationRequest: () => true,
      onPanResponderGrant: (_e, g) => {
        const current = valuesRef.current.body_fat_percentage;
        fatDrag.current = {
          value: current != null && current > 0 ? current : FAT_BASELINE,
          lastY: g.moveY,
        };
        lastHapticBucket.current = -1;
        setFatDragging(true);
        fireSelection();
      },
      onPanResponderMove: (_e, g) => {
        const d = fatDrag.current;
        if (!d) return;
        const dy = g.moveY - d.lastY;
        d.lastY = g.moveY;
        // Drag UP (dy < 0) raises the fill → more fat.
        d.value = clamp(d.value - dy * FAT_PER_PX, FAT_MIN, FAT_MAX);
        const v = Math.round(d.value);
        if (v !== lastHapticBucket.current) {
          lastHapticBucket.current = v;
          fireImpact();
        }
        updateFieldRef.current(
          "body_fat_percentage",
          v as BodyAnalysisData["body_fat_percentage"],
        );
      },
      onPanResponderRelease: () => {
        fatDrag.current = null;
        setFatDragging(false);
        fireSelection();
      },
      onPanResponderTerminate: () => {
        fatDrag.current = null;
        setFatDragging(false);
      },
    }),
  ).current;

  const fatColor =
    fat != null && (fatCategory(fat, personalInfoData?.gender) === "Athletic" ||
      fatCategory(fat, personalInfoData?.gender) === "Fitness")
      ? tokens.healthy
      : tokens.ink2;

  return (
    <View style={styles.container}>
      {/* Measurement guide — plain text toggle, no box. */}
      <Pressable
        style={styles.guideToggle}
        onPress={() => setShowMeasurementGuide(!showMeasurementGuide)}
        accessibilityRole="button"
        accessibilityLabel="How to measure correctly"
      >
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={tokens.ink2}
        />
        <Text style={styles.guideToggleText} numberOfLines={1}>
          How to measure correctly
        </Text>
        <Ionicons
          name={showMeasurementGuide ? "chevron-up" : "chevron-down"}
          size={16}
          color={tokens.ink3}
        />
      </Pressable>

      {showMeasurementGuide && (
        <View style={styles.guide}>
          <Text style={styles.guideText}>
            {"• Waist: narrowest point, just above the belly button.\n"}
            {"• Hip: widest point of your hips.\n"}
            {"• Chest: fullest part of your chest.\n"}
            {"• Body fat: use a body-fat scale or professional measurement."}
          </Text>
        </View>
      )}

      {/* Body-fat hero — big number + category; the torso fill below IS the
          control (drag the body vertically). */}
      <View style={styles.fatHero}>
        <View style={styles.fatHeroLabels}>
          <Text style={styles.fieldLabel} numberOfLines={1}>
            Body fat
          </Text>
          {fat != null && fat > 0 ? (
            <Text
              style={[styles.fatCategory, { color: fatColor }]}
              numberOfLines={1}
            >
              {fatCategory(fat, personalInfoData?.gender)}
            </Text>
          ) : (
            <Text style={styles.fatHint} numberOfLines={1}>
              Drag the body up or down
            </Text>
          )}
        </View>
        <Text style={styles.fatValue} numberOfLines={1}>
          <Text style={styles.fatNumber}>
            {fat != null && fat > 0 ? fat : "—"}
          </Text>
          <Text style={styles.fatUnit}> %</Text>
        </Text>
      </View>

      {/* Body Map stage — line-art torso + tape bands + fat fill. */}
      <View
        style={styles.stage}
        testID="body-map-stage"
        accessibilityRole="adjustable"
        accessibilityLabel="Body fat percentage"
        accessibilityValue={{
          min: FAT_MIN,
          max: FAT_MAX,
          now: fat ?? 0,
          text: fat != null ? `${fat} percent` : "not set",
        }}
        {...torsoResponder.panHandlers}
      >
        <Svg width={STAGE_W} height={STAGE_H}>
          {/* Fat fill — rises from the base with the value. */}
          {fatLevelY != null ? (
            <>
              <Rect
                x={62}
                y={fatLevelY}
                width={76}
                height={FAT_BASE_Y - fatLevelY}
                rx={6}
                fill={tokens.accentDim}
              />
              <Line
                x1={58}
                x2={142}
                y1={fatLevelY}
                y2={fatLevelY}
                stroke={fatDragging ? tokens.accent : tokens.ink3}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            </>
          ) : null}

          {/* Silhouette */}
          <Circle cx={100} cy={24} r={13} stroke={tokens.hairline} strokeWidth={1.5} fill="none" />
          <Path d={TORSO_PATH} stroke={tokens.hairline} strokeWidth={1.5} fill="none" strokeLinecap="round" />

          {/* Tape bands — width tracks the value; ghost dashes when unset. */}
          {BAND_FIELDS.map((field) => {
            const raw = formData[field];
            const isSet = raw != null && raw > 0;
            const v = isSet ? raw : GIRTH_BASELINE[field];
            const hw = girthToHalfWidth(v);
            const y = BAND_Y[field];
            const color =
              activeBand === field
                ? tokens.accent
                : isSet
                  ? tokens.ink2
                  : tokens.ink3;
            return (
              <React.Fragment key={field}>
                {/* end brackets — tape-measure feel */}
                <Line x1={100 - hw} x2={100 - hw} y1={y - 5} y2={y + 5} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
                <Line x1={100 + hw} x2={100 + hw} y1={y - 5} y2={y + 5} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
                <Line
                  x1={100 - hw}
                  x2={100 + hw}
                  y1={y}
                  y2={y}
                  stroke={color}
                  strokeWidth={isSet || activeBand === field ? 3 : 1.5}
                  strokeLinecap="round"
                  strokeDasharray={isSet || activeBand === field ? undefined : "3 5"}
                />
              </React.Fragment>
            );
          })}
        </Svg>

        {/* Tape hit targets — full-width 44px rows at each anatomical y. */}
        {BAND_FIELDS.map((field) => (
          <View
            key={field}
            style={[
              styles.bandHit,
              { top: BAND_Y[field] - BAND_HIT_H / 2, height: BAND_HIT_H },
            ]}
            testID={`band-${BAND_LABEL[field].toLowerCase()}`}
            accessibilityRole="adjustable"
            accessibilityLabel={`${BAND_LABEL[field]} circumference`}
            accessibilityValue={{
              min: GIRTH_MIN,
              max: GIRTH_MAX,
              now: formData[field] ?? 0,
              text:
                formData[field] != null
                  ? `${formData[field]} centimeters`
                  : "not set",
            }}
            {...bandResponders[field].panHandlers}
          />
        ))}
      </View>

      <Text style={styles.mapHint} numberOfLines={2}>
        Drag a tape sideways to set it · drag the body vertically for body fat
      </Text>

      {/* Readout row — plain stats separated by hairlines; active tape in
          accent. Values update live as the tapes move. */}
      <View style={styles.readoutRow}>
        {BAND_FIELDS.map((field, i) => {
          const v = formData[field];
          const active = activeBand === field;
          return (
            <React.Fragment key={field}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.readout}>
                <Text style={styles.readoutLabel} numberOfLines={1}>
                  {BAND_LABEL[field]}
                </Text>
                <Text
                  style={[
                    styles.readoutValue,
                    active ? { color: tokens.accent } : null,
                  ]}
                  numberOfLines={1}
                >
                  {v != null && v > 0 ? `${v}` : "—"}
                </Text>
                <Text style={styles.readoutHint} numberOfLines={2}>
                  {BAND_HINT[field]}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>

      {/* Live waist-hip ratio */}
      {showRatio ? (
        <View style={styles.ratioRow}>
          <Ionicons
            name={ratioHealthy ? "checkmark-circle" : "alert-circle"}
            size={16}
            color={ratioHealthy ? tokens.accent : tokens.danger}
          />
          <Text style={styles.ratioText} numberOfLines={1}>
            Waist-hip ratio {formData.waist_hip_ratio} —{" "}
            {ratioHealthy ? "healthy" : "consider waist reduction"}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: freshSpacing.l,
  },
  guideToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: freshSpacing.s,
    paddingVertical: freshSpacing.xs,
  },
  guideToggleText: {
    ...freshType.body,
    flex: 1,
  },
  guide: {
    paddingBottom: freshSpacing.xs,
  },
  guideText: {
    ...freshType.caption,
    color: tokens.ink2,
  },
  fieldLabel: {
    ...freshType.sectionLabel,
  },
  fatHero: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: freshSpacing.s,
  },
  fatHeroLabels: {
    flex: 1,
    gap: 2,
  },
  fatCategory: {
    ...freshType.caption,
  },
  fatHint: {
    ...freshType.caption,
    color: tokens.ink2,
  },
  fatValue: {
    flexShrink: 0,
  },
  fatNumber: {
    fontFamily: font.light,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: tokens.ink,
  },
  fatUnit: {
    ...freshType.body,
    color: tokens.ink2,
  },
  stage: {
    width: STAGE_W,
    height: STAGE_H,
    alignSelf: "center",
    marginVertical: freshSpacing.xs,
  },
  bandHit: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  mapHint: {
    ...freshType.caption,
    textAlign: "center",
  },
  readoutRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: freshSpacing.m,
    borderTopWidth: 1,
    borderTopColor: tokens.hairline,
  },
  readout: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  readoutLabel: {
    ...freshType.caption,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  readoutValue: {
    ...freshType.valueLg,
  },
  readoutHint: {
    ...freshType.caption,
    textAlign: "center",
    marginTop: freshSpacing.xs,
  },
  divider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: tokens.hairline,
  },
  ratioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: freshSpacing.s,
    marginTop: freshSpacing.xs,
  },
  ratioText: {
    ...freshType.caption,
    color: tokens.ink2,
    flex: 1,
  },
});
