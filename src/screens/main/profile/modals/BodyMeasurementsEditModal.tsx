/**
 * BodyMeasurementsEditModal - Edit Body Measurements
 *
 * Fields:
 * - Height (input)
 * - Current Weight (input)
 * - Target Weight (input)
 * - Body Fat % (optional input)
 * - BMI (calculated, display only)
 *
 * Saves to profile.bodyMetrics via setProfile.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { SettingsModalWrapper } from "../components/SettingsModalWrapper";
import { GlassFormInput } from "../components/GlassFormInput";
import { useProfileStore } from "../../../../stores/profileStore";
import { useAuth } from "../../../../hooks/useAuth";
import { BodyAnalysisService } from "../../../../services/onboardingService";
import type { BodyAnalysisData } from "../../../../types/onboarding";
import { resolveCurrentWeightForUser } from "../../../../services/currentWeight";
import {
  colors,
  surface,
  border,
  spacing,
  typography,
  borderRadius,
} from "../../../../theme/aurora-tokens";
import { rf, rw } from "../../../../utils/responsive";
import { haptics } from "../../../../utils/haptics";
import { crossPlatformAlert } from "../../../../utils/crossPlatformAlert";
import { useReducedMotion } from "../../../../utils/accessibility/hooks";
import { convertWeight, toDisplayWeight, convertHeight, toDisplayHeight, parseLocalFloat } from "../../../../utils/units";

const { variants } = typography;

interface BodyMeasurementsEditModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BodyMeasurementsEditModal: React.FC<
  BodyMeasurementsEditModalProps
> = ({ visible, onClose }) => {
  const reducedMotion = useReducedMotion();
  const { user } = useAuth();
  const { updateBodyAnalysis } = useProfileStore();
  const bodyAnalysis = useProfileStore((s) => s.bodyAnalysis);
  const personalInfo = useProfileStore((s) => s.personalInfo);
  const weightUnit: "kg" | "lbs" = personalInfo?.units === "imperial" ? "lbs" : "kg";
  const heightUnit: "cm" | "in" = personalInfo?.units === "imperial" ? "in" : "cm";

  // Form state
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load current values ONLY when the modal transitions to visible. The
  // previous deps [visible, bodyAnalysis, weightUnit] re-ran this effect every
  // time the store's bodyAnalysis updated (e.g. from a parallel save) —
  // wiping in-progress edits the user was mid-typing. weightUnit changes are
  // handled separately by the unit-conversion effect below.
  useEffect(() => {
    if (!visible) return;
    const bodyAnalysisData = useProfileStore.getState().bodyAnalysis;
    // ✅ SSOT: profileStore.bodyAnalysis is authoritative
    const rawHeight = bodyAnalysisData?.height_cm;
    const displayHeight = rawHeight && rawHeight > 0 ? toDisplayHeight(rawHeight, heightUnit) : null;
    setHeight(displayHeight != null ? (heightUnit === "in" ? displayHeight.toFixed(1) : displayHeight.toString()) : "");
    const rawWeight = bodyAnalysisData?.current_weight_kg;
    const displayWt = rawWeight && rawWeight > 0 ? toDisplayWeight(rawWeight, weightUnit) : null;
    setWeight(displayWt != null ? displayWt.toFixed(1) : "");
    const rawTarget = bodyAnalysisData?.target_weight_kg;
    const displayTarget = rawTarget && rawTarget > 0 ? toDisplayWeight(rawTarget, weightUnit) : null;
    setTargetWeight(displayTarget != null ? displayTarget.toFixed(1) : "");
    setBodyFat((bodyAnalysisData?.body_fat_percentage && bodyAnalysisData.body_fat_percentage > 0) ? bodyAnalysisData.body_fat_percentage.toString() : "");
    // Chest/waist/hips are stored in cm; display in the user's height unit
    // (cm/in) so an Imperial user isn't asked to enter metric circumferences.
    const rawChest = bodyAnalysisData?.chest_cm;
    const displayChest = rawChest && rawChest > 0 ? toDisplayHeight(rawChest, heightUnit) : null;
    setChest(displayChest != null ? displayChest.toFixed(1) : "");
    const rawWaist = bodyAnalysisData?.waist_cm;
    const displayWaist = rawWaist && rawWaist > 0 ? toDisplayHeight(rawWaist, heightUnit) : null;
    setWaist(displayWaist != null ? displayWaist.toFixed(1) : "");
    const rawHips = bodyAnalysisData?.hip_cm;
    const displayHips = rawHips && rawHips > 0 ? toDisplayHeight(rawHips, heightUnit) : null;
    setHips(displayHips != null ? displayHips.toFixed(1) : "");
    setErrors({});
  }, [visible]);

  // Calculate BMI — weight/height state are in display units (lbs/in when
  // imperial); convert to kg and cm first so BMI is always kg/m^2.
  const bmi = useMemo(() => {
    const w = convertWeight(parseLocalFloat(weight), weightUnit, "kg");
    const h = convertHeight(parseLocalFloat(height), heightUnit, "cm") / 100; // cm to meters
    if (w > 0 && h > 0) {
      return (w / (h * h)).toFixed(1);
    }
    return null;
  }, [weight, height, weightUnit, heightUnit]);

  // Get BMI category
  const bmiCategory = useMemo(() => {
    if (!bmi) return null;
    const bmiValue = parseFloat(bmi);
    if (bmiValue < 18.5) return { label: "Underweight", color: colors.info.DEFAULT };
    if (bmiValue < 25) return { label: "Normal", color: colors.success.DEFAULT };
    if (bmiValue < 30) return { label: "Overweight", color: colors.warning.DEFAULT };
    return { label: "Obese", color: colors.error.DEFAULT };
  }, [bmi]);

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    const hMin = heightUnit === "in" ? 39 : 100;
    const hMax = heightUnit === "in" ? 99 : 250;
    if (
      !height ||
      isNaN(Number(height)) ||
      Number(height) < hMin ||
      Number(height) > hMax
    ) {
      newErrors.height = `Enter valid height in ${heightUnit} (${hMin}-${hMax})`;
    }

    const wMin = weightUnit === "lbs" ? 66 : 30;
    const wMax = weightUnit === "lbs" ? 660 : 300;
    if (
      !weight ||
      isNaN(Number(weight)) ||
      Number(weight) < wMin ||
      Number(weight) > wMax
    ) {
      newErrors.weight = `Enter valid weight in ${weightUnit} (${wMin}-${wMax})`;
    }

    // Target weight is optional but must be valid if provided
    if (
      targetWeight &&
      (isNaN(Number(targetWeight)) ||
        Number(targetWeight) < wMin ||
        Number(targetWeight) > wMax)
    ) {
      newErrors.targetWeight = `Enter valid target weight in ${weightUnit} (${wMin}-${wMax})`;
    }

    // Body fat is optional but must be valid if provided
    if (
      bodyFat &&
      (isNaN(Number(bodyFat)) || Number(bodyFat) < 3 || Number(bodyFat) > 50)
    ) {
      newErrors.bodyFat = "Enter valid body fat % (3-50)";
    }

    // Chest/waist/hips ranges are authored in cm, then converted to the
    // user's display unit so validation matches whatever unit is shown.
    const chestMin = Math.round(convertHeight(50, "cm", heightUnit));
    const chestMax = Math.round(convertHeight(200, "cm", heightUnit));
    const waistMin = Math.round(convertHeight(40, "cm", heightUnit));
    const waistMax = Math.round(convertHeight(200, "cm", heightUnit));
    const hipsMin = Math.round(convertHeight(50, "cm", heightUnit));
    const hipsMax = Math.round(convertHeight(200, "cm", heightUnit));

    // Chest is optional but must be valid if provided
    if (
      chest &&
      (isNaN(Number(chest)) || Number(chest) < chestMin || Number(chest) > chestMax)
    ) {
      newErrors.chest = `Enter valid chest measurement in ${heightUnit} (${chestMin}-${chestMax})`;
    }

    // Waist is optional but must be valid if provided
    if (
      waist &&
      (isNaN(Number(waist)) || Number(waist) < waistMin || Number(waist) > waistMax)
    ) {
      newErrors.waist = `Enter valid waist measurement in ${heightUnit} (${waistMin}-${waistMax})`;
    }

    // Hips is optional but must be valid if provided
    if (
      hips &&
      (isNaN(Number(hips)) || Number(hips) < hipsMin || Number(hips) > hipsMax)
    ) {
      newErrors.hips = `Enter valid hips measurement in ${heightUnit} (${hipsMin}-${hipsMax})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [height, weight, targetWeight, bodyFat, chest, waist, hips, weightUnit, heightUnit]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!validate()) {
      haptics.light();
      return;
    }

    setIsSaving(true);
    try {
      const bodyAnalysisData = useProfileStore.getState().bodyAnalysis;
      const weightKg = convertWeight(parseLocalFloat(weight), weightUnit, "kg");
      const targetWeightKg = targetWeight ? convertWeight(parseLocalFloat(targetWeight), weightUnit, "kg") : undefined;
      const canonicalCurrentWeight = user?.id
        ? (await resolveCurrentWeightForUser(user.id, {
            bodyAnalysisWeight: weightKg,
          })).value ?? weightKg
        : weightKg;
      const nextBodyAnalysis = {
        // Preserve other fields - profileStore.bodyAnalysis is authoritative SSOT
        medical_conditions:
          bodyAnalysisData?.medical_conditions ||
          [],
        medications:
          bodyAnalysisData?.medications ||
          [],
        physical_limitations:
          bodyAnalysisData?.physical_limitations ||
          [],
        pregnancy_status:
          bodyAnalysisData?.pregnancy_status ||
          false,
        breastfeeding_status:
          bodyAnalysisData?.breastfeeding_status ||
          false,
        height_cm: Math.round(convertHeight(parseLocalFloat(height), heightUnit, "cm") * 10) / 10,
        current_weight_kg: canonicalCurrentWeight,
        ...(targetWeightKg != null ? { target_weight_kg: targetWeightKg } : {}),
        body_fat_percentage: bodyFat ? parseLocalFloat(bodyFat) : undefined,
        chest_cm: chest ? convertHeight(parseLocalFloat(chest), heightUnit, "cm") : undefined,
        waist_cm: waist ? convertHeight(parseLocalFloat(waist), heightUnit, "cm") : undefined,
        hip_cm: hips ? convertHeight(parseLocalFloat(hips), heightUnit, "cm") : undefined,
      };

      // ✅ Update bodyAnalysis in profileStore
      updateBodyAnalysis(nextBodyAnalysis);

      // Sync to Supabase body_analysis table
      if (user?.id) {
        try {
          const success = await BodyAnalysisService.save(
            user.id,
            nextBodyAnalysis as BodyAnalysisData,
          );

          if (!success) {
            crossPlatformAlert(
              "Saved Locally",
              "Your measurements were saved locally but failed to sync to the server. They will sync automatically when connection is restored.",
            );
          }
        } catch (syncError) {
          console.error("Error syncing body measurements:", syncError);
          // Don't fail the save - local update succeeded
        }
      }

      haptics.success();
      onClose();
    } catch (error) {
      console.error("Error saving body measurements:", error);
      crossPlatformAlert("Error", "Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [
    height,
    weight,
    targetWeight,
    bodyFat,
    chest,
    waist,
    hips,
    user,
    onClose,
    validate,
    updateBodyAnalysis,
    weightUnit,
    heightUnit,
  ]);

  const hasChanges = useCallback(() => {
    // Use epsilon comparison to avoid false positives from float-to-string round-tripping
    // e.g. user enters "15.5", stored value is 15.500000001 → strings differ but values are equal
    const EPSILON = 0.01;
    const floatChanged = (local: string, stored: number | null | undefined): boolean => {
      if (!local && !stored) return false;
      if (!local || stored == null) return true;
      return Math.abs(parseFloat(local) - stored) > EPSILON;
    };

    const bodyAnalysisData = useProfileStore.getState().bodyAnalysis;
    if (!bodyAnalysisData) return true;
    // weight/targetWeight are in display units; stored values are kg.
    // Convert local to kg before comparing so the Save button enables correctly.
    const weightKg = convertWeight(parseLocalFloat(weight), weightUnit, "kg");
    const targetKg = targetWeight
      ? convertWeight(parseLocalFloat(targetWeight), weightUnit, "kg")
      : null;
    // height is in display units (in when imperial); convert to cm before comparing.
    const heightCm = convertHeight(parseLocalFloat(height), heightUnit, "cm");
    // chest/waist/hips are also in display units; convert to cm before comparing.
    const chestCm = chest ? convertHeight(parseLocalFloat(chest), heightUnit, "cm") : null;
    const waistCm = waist ? convertHeight(parseLocalFloat(waist), heightUnit, "cm") : null;
    const hipsCm = hips ? convertHeight(parseLocalFloat(hips), heightUnit, "cm") : null;
    return (
      floatChanged(String(heightCm), bodyAnalysisData.height_cm) ||
      floatChanged(String(weightKg), bodyAnalysisData.current_weight_kg) ||
      floatChanged(targetKg != null ? String(targetKg) : "", bodyAnalysisData.target_weight_kg) ||
      floatChanged(bodyFat, bodyAnalysisData.body_fat_percentage) ||
      floatChanged(chestCm != null ? String(chestCm) : "", bodyAnalysisData.chest_cm) ||
      floatChanged(waistCm != null ? String(waistCm) : "", bodyAnalysisData.waist_cm) ||
      floatChanged(hipsCm != null ? String(hipsCm) : "", bodyAnalysisData.hip_cm)
    );
  }, [height, weight, targetWeight, bodyFat, chest, waist, hips, bodyAnalysis, weightUnit, heightUnit]);

  return (
    <SettingsModalWrapper
      visible={visible}
      title="Body Measurements"
      subtitle="Track your body composition"
      icon="body-outline"
      iconColor={colors.primary.DEFAULT}
      onClose={onClose}
      onSave={handleSave}
      isSaving={isSaving}
      saveDisabled={!hasChanges()}
    >
      {/* BMI Panel — flat surface.1, no card nesting */}
      {bmi && bmiCategory && (
        <Animated.View
          entering={reducedMotion ? undefined : FadeIn.duration(400)}
          style={styles.bmiPanel}
        >
          <View style={styles.bmiContent}>
            <View style={styles.bmiLeft}>
              <View
                style={[
                  styles.bmiIcon,
                  { backgroundColor: `${bmiCategory.color}1F` },
                ]}
              >
                <Ionicons
                  name="analytics-outline"
                  size={rf(20)}
                  color={bmiCategory.color}
                />
              </View>
              <View>
                <Text style={styles.bmiLabel}>Your BMI</Text>
                <Text style={styles.bmiCategory}>{bmiCategory.label}</Text>
              </View>
            </View>
            <View style={styles.bmiRight}>
              <Text style={[styles.bmiValue, { color: bmiCategory.color }]}>
                {bmi}
              </Text>
              <Text style={styles.bmiUnit}>kg/m²</Text>
            </View>
          </View>

          {/* BMI Scale — segments sized proportionally to the BMI ranges
              they represent (15-18.5, 18.5-25, 25-30, 30-40). */}
          <View style={styles.bmiScale}>
            <View
              style={styles.bmiScaleBarContainer}
            >
              <View style={styles.bmiScaleBar}>
                <View
                  style={[
                    styles.bmiScaleSegment,
                    styles.bmiScaleUnderweight,
                    { backgroundColor: colors.info.DEFAULT },
                  ]}
                />
                <View
                  style={[
                    styles.bmiScaleSegment,
                    styles.bmiScaleNormal,
                    { backgroundColor: colors.success.DEFAULT },
                  ]}
                />
                <View
                  style={[
                    styles.bmiScaleSegment,
                    styles.bmiScaleOverweight,
                    { backgroundColor: colors.warning.DEFAULT },
                  ]}
                />
                <View
                  style={[
                    styles.bmiScaleSegment,
                    styles.bmiScaleObese,
                    { backgroundColor: colors.error.DEFAULT },
                  ]}
                />
              </View>
              {bmi && (() => {
                const bmiVal = parseFloat(bmi);
                const pct = Math.min(100, Math.max(0, ((bmiVal - 15) / (40 - 15)) * 100));
                return (
                  <View
                    style={[
                      styles.bmiIndicator,
                      { left: `${pct}%` },
                    ]}
                  />
                );
              })()}
            </View>
            <View style={styles.bmiScaleLabels}>
              <Text style={styles.bmiScaleLabel}>15</Text>
              <Text style={styles.bmiScaleLabel}>18.5</Text>
              <Text style={styles.bmiScaleLabel}>25</Text>
              <Text style={styles.bmiScaleLabel}>30</Text>
              <Text style={styles.bmiScaleLabel}>40</Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Height */}
      <GlassFormInput
        label="Height"
        icon="resize-outline"
        iconColor={colors.info.DEFAULT}
        value={height}
        onChangeText={setHeight}
        placeholder={heightUnit === "in" ? "e.g. 70.5" : "Enter your height"}
        keyboardType={heightUnit === "in" ? "decimal-pad" : "numeric"}
        maxLength={heightUnit === "in" ? 5 : 3}
        suffix={heightUnit}
        error={errors.height}
        hint={heightUnit === "in" ? "Height in inches" : "Height in centimeters"}
      />

      {/* Current Weight */}
      <GlassFormInput
        label="Current Weight"
        icon="scale-outline"
        iconColor={colors.primary.DEFAULT}
        value={weight}
        onChangeText={setWeight}
        placeholder="Enter your weight"
        keyboardType="decimal-pad"
        maxLength={6}
        suffix={weightUnit}
        error={errors.weight}
        hint={`Weight in ${weightUnit}`}
      />

      {/* Target Weight */}
      <GlassFormInput
        label="Target Weight"
        icon="flag-outline"
        iconColor={colors.success.DEFAULT}
        value={targetWeight}
        onChangeText={setTargetWeight}
        placeholder="Enter your goal weight"
        keyboardType="decimal-pad"
        maxLength={6}
        suffix={weightUnit}
        error={errors.targetWeight}
        hint="Your weight goal (optional)"
      />

      {/* Body Fat Percentage */}
      <GlassFormInput
        label="Body Fat %"
        icon="body-outline"
        iconColor={colors.warning.DEFAULT}
        value={bodyFat}
        onChangeText={setBodyFat}
        placeholder="Enter body fat percentage"
        keyboardType="decimal-pad"
        maxLength={4}
        suffix="%"
        error={errors.bodyFat}
        hint="Optional - if you know it"
      />

      {/* Chest Measurement */}
      <GlassFormInput
        label="Chest"
        icon="ellipse-outline"
        iconColor={colors.secondary.DEFAULT}
        value={chest}
        onChangeText={setChest}
        placeholder="Enter chest measurement"
        keyboardType="decimal-pad"
        maxLength={5}
        suffix={heightUnit}
        error={errors.chest}
        hint={`Optional - chest circumference in ${heightUnit}`}
      />

      {/* Waist Measurement */}
      <GlassFormInput
        label="Waist"
        icon="radio-button-off-outline"
        iconColor={colors.secondary.DEFAULT}
        value={waist}
        onChangeText={setWaist}
        placeholder="Enter waist measurement"
        keyboardType="decimal-pad"
        maxLength={5}
        suffix={heightUnit}
        error={errors.waist}
        hint={`Optional - waist circumference in ${heightUnit}`}
      />

      {/* Hips Measurement */}
      <GlassFormInput
        label="Hips"
        icon="ellipse-outline"
        iconColor={colors.primary.DEFAULT}
        value={hips}
        onChangeText={setHips}
        placeholder="Enter hips measurement"
        keyboardType="decimal-pad"
        maxLength={5}
        suffix={heightUnit}
        error={errors.hips}
        hint={`Optional - hips circumference in ${heightUnit}`}
      />

      {/* Info footer — flat, no card */}
      <View style={styles.infoRow}>
        <Ionicons
          name="information-circle-outline"
          size={rf(16)}
          color={colors.text.tertiary}
        />
        <Text style={styles.infoText}>
          Keep your measurements updated for accurate calorie calculations and
          personalized workout recommendations.
        </Text>
      </View>
    </SettingsModalWrapper>
  );
};

const styles = StyleSheet.create({
  bmiPanel: {
    backgroundColor: surface[1],
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: border.subtle,
    padding: spacing.md,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  bmiContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  bmiLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  bmiIcon: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    justifyContent: "center",
    alignItems: "center",
  },
  bmiLabel: {
    ...variants.caption,
    color: colors.text.secondary,
  },
  bmiCategory: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: rf(14),
    color: colors.text.primary,
  },
  bmiRight: {
    alignItems: "flex-end",
  },
  bmiValue: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: rf(28),
  },
  bmiUnit: {
    ...variants.caption,
    fontSize: rf(11),
    color: colors.text.secondary,
  },
  bmiScale: {
    marginTop: spacing.sm,
  },
  bmiScaleBarContainer: {
    position: "relative",
    marginBottom: spacing.sm,
  },
  bmiScaleBar: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  bmiIndicator: {
    position: "absolute",
    top: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.text.primary,
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
    marginLeft: -5,
  },
  bmiScaleSegment: {
    height: "100%",
  },
  bmiScaleUnderweight: {
    flex: 3.5,
  },
  bmiScaleNormal: {
    flex: 6.5,
  },
  bmiScaleOverweight: {
    flex: 5,
  },
  bmiScaleObese: {
    flex: 10,
  },
  bmiScaleLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xxs,
  },
  bmiScaleLabel: {
    fontFamily: "Manrope_500Medium",
    fontSize: Math.max(rf(10), 10),
    color: colors.text.secondary,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  infoText: {
    ...variants.caption,
    flex: 1,
    color: colors.text.tertiary,
  },
});

export default BodyMeasurementsEditModal;
