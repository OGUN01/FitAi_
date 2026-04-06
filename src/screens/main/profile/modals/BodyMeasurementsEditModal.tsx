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
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SettingsModalWrapper } from "../components/SettingsModalWrapper";
import { GlassFormInput } from "../components/GlassFormInput";
import { GlassCard } from "../../../../components/ui/aurora/GlassCard";
import { useProfileStore } from "../../../../stores/profileStore";
import { useUser } from "../../../../hooks/useUser";
import { useAuth } from "../../../../hooks/useAuth";
import { BodyAnalysisService } from "../../../../services/onboardingService";
import { resolveCurrentWeightForUser } from "../../../../services/currentWeight";
import { ResponsiveTheme } from "../../../../utils/constants";
import { rf, rp, rbr, rw } from "../../../../utils/responsive";
import { haptics } from "../../../../utils/haptics";
import { crossPlatformAlert } from "../../../../utils/crossPlatformAlert";
import { convertWeight, toDisplayWeight } from "../../../../utils/units";

interface BodyMeasurementsEditModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BodyMeasurementsEditModal: React.FC<
  BodyMeasurementsEditModalProps
> = ({ visible, onClose }) => {
  const { profile } = useUser();
  const { user } = useAuth();
  const { updateBodyAnalysis } = useProfileStore();
  const personalInfo = useProfileStore((s) => s.personalInfo);
  const weightUnit: "kg" | "lbs" = personalInfo?.units === "imperial" ? "lbs" : "kg";

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
  const [scaleBarWidth, setScaleBarWidth] = useState(0);

  // Load current values when modal opens
  useEffect(() => {
    if (visible && profile) {
      // ✅ Get measurements from bodyMetrics (database: body_analysis table)
      const bodyMetrics = profile.bodyMetrics;
      const bodyAnalysisData = useProfileStore.getState().bodyAnalysis;
      // ✅ SSOT: profileStore.bodyAnalysis is authoritative; profile.bodyMetrics is legacy fallback
      setHeight((bodyAnalysisData?.height_cm && bodyAnalysisData.height_cm > 0) ? bodyAnalysisData.height_cm.toString() : "");
      const rawWeight = bodyAnalysisData?.current_weight_kg;
      const displayWt = rawWeight && rawWeight > 0 ? toDisplayWeight(rawWeight, weightUnit) : null;
      setWeight(displayWt != null ? displayWt.toFixed(1) : "");
      const rawTarget = bodyAnalysisData?.target_weight_kg;
      const displayTarget = rawTarget && rawTarget > 0 ? toDisplayWeight(rawTarget, weightUnit) : null;
      setTargetWeight(displayTarget != null ? displayTarget.toFixed(1) : "");
      setBodyFat((bodyAnalysisData?.body_fat_percentage && bodyAnalysisData.body_fat_percentage > 0) ? bodyAnalysisData.body_fat_percentage.toString() : "");
      setChest((bodyAnalysisData?.chest_cm && bodyAnalysisData.chest_cm > 0) ? bodyAnalysisData.chest_cm.toString() : "");
      setWaist((bodyAnalysisData?.waist_cm && bodyAnalysisData.waist_cm > 0) ? bodyAnalysisData.waist_cm.toString() : "");
      setHips((bodyAnalysisData?.hip_cm && bodyAnalysisData.hip_cm > 0) ? bodyAnalysisData.hip_cm.toString() : "");
      setErrors({});
    }
  }, [visible, profile, weightUnit]);

  // Calculate BMI
  const bmi = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100; // Convert cm to meters
    if (w > 0 && h > 0) {
      return (w / (h * h)).toFixed(1);
    }
    return null;
  }, [weight, height]);

  // Get BMI category
  const bmiCategory = useMemo(() => {
    if (!bmi) return null;
    const bmiValue = parseFloat(bmi);
    if (bmiValue < 18.5) return { label: "Underweight", color: ResponsiveTheme.colors.info };
    if (bmiValue < 25) return { label: "Normal", color: ResponsiveTheme.colors.success };
    if (bmiValue < 30) return { label: "Overweight", color: ResponsiveTheme.colors.warning };
    return { label: "Obese", color: ResponsiveTheme.colors.error };
  }, [bmi]);

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (
      !height ||
      isNaN(Number(height)) ||
      Number(height) < 100 ||
      Number(height) > 250
    ) {
      newErrors.height = "Enter valid height in cm (100-250)";
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

    // Chest is optional but must be valid if provided
    if (
      chest &&
      (isNaN(Number(chest)) || Number(chest) < 50 || Number(chest) > 200)
    ) {
      newErrors.chest = "Enter valid chest measurement in cm (50-200)";
    }

    // Waist is optional but must be valid if provided
    if (
      waist &&
      (isNaN(Number(waist)) || Number(waist) < 40 || Number(waist) > 200)
    ) {
      newErrors.waist = "Enter valid waist measurement in cm (40-200)";
    }

    // Hips is optional but must be valid if provided
    if (
      hips &&
      (isNaN(Number(hips)) || Number(hips) < 50 || Number(hips) > 200)
    ) {
      newErrors.hips = "Enter valid hips measurement in cm (50-200)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [height, weight, targetWeight, bodyFat, chest, waist, hips, weightUnit]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!validate()) {
      haptics.light();
      return;
    }

    setIsSaving(true);
    try {
      if (!profile) {
        throw new Error("Profile not found");
      }

      const bodyAnalysisData = useProfileStore.getState().bodyAnalysis;
      const weightKg = convertWeight(parseFloat(weight), weightUnit, "kg");
      const targetWeightKg = targetWeight ? convertWeight(parseFloat(targetWeight), weightUnit, "kg") : undefined;
      const canonicalCurrentWeight = user?.id
        ? (await resolveCurrentWeightForUser(user.id, {
            bodyAnalysisWeight: weightKg,
          })).value ?? weightKg
        : weightKg;
      const nextBodyAnalysis = {
        // Preserve other fields - profileStore.bodyAnalysis is authoritative SSOT
        medical_conditions:
          bodyAnalysisData?.medical_conditions ||
          profile.bodyMetrics?.medical_conditions ||
          [],
        medications:
          bodyAnalysisData?.medications ||
          profile.bodyMetrics?.medications ||
          [],
        physical_limitations:
          bodyAnalysisData?.physical_limitations ||
          profile.bodyMetrics?.physical_limitations ||
          [],
        pregnancy_status:
          bodyAnalysisData?.pregnancy_status ||
          profile.bodyMetrics?.pregnancy_status ||
          false,
        breastfeeding_status:
          bodyAnalysisData?.breastfeeding_status ||
          profile.bodyMetrics?.breastfeeding_status ||
          false,
        height_cm: parseFloat(height),
        current_weight_kg: canonicalCurrentWeight,
        ...(targetWeightKg != null ? { target_weight_kg: targetWeightKg } : {}),
        body_fat_percentage: bodyFat ? parseFloat(bodyFat) : undefined,
        chest_cm: chest ? parseFloat(chest) : undefined,
        waist_cm: waist ? parseFloat(waist) : undefined,
        hip_cm: hips ? parseFloat(hips) : undefined,
      };

      // ✅ Update bodyAnalysis in profileStore
      updateBodyAnalysis(nextBodyAnalysis);
      console.log(
        "✅ BodyMeasurementsEditModal: Saved body metrics locally",
      );

      // Sync to Supabase body_analysis table
      if (user?.id) {
        try {
          const success = await BodyAnalysisService.save(
            user.id,
            nextBodyAnalysis as any,
          );

          if (!success) {
            crossPlatformAlert(
              "Saved Locally",
              "Your measurements were saved locally but failed to sync to the server. They will sync automatically when connection is restored.",
            );
          } else {
            console.log("✅ Body measurements synced to database");
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
    profile,
    user,
    onClose,
    validate,
    updateBodyAnalysis,
    weightUnit,
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
    if (!profile?.bodyMetrics) {
      if (!bodyAnalysisData) return true;
      return (
        floatChanged(height, bodyAnalysisData.height_cm) ||
        floatChanged(weight, bodyAnalysisData.current_weight_kg) ||
        floatChanged(targetWeight, bodyAnalysisData.target_weight_kg) ||
        floatChanged(bodyFat, bodyAnalysisData.body_fat_percentage) ||
        floatChanged(chest, bodyAnalysisData.chest_cm) ||
        floatChanged(waist, bodyAnalysisData.waist_cm) ||
        floatChanged(hips, bodyAnalysisData.hip_cm)
      );
    }
    const bodyMetrics = profile.bodyMetrics;
    return (
      floatChanged(height, bodyAnalysisData?.height_cm ?? bodyMetrics?.height_cm) ||
      floatChanged(weight, bodyAnalysisData?.current_weight_kg ?? bodyMetrics?.current_weight_kg) ||
      floatChanged(targetWeight, bodyAnalysisData?.target_weight_kg ?? bodyMetrics?.target_weight_kg) ||
      floatChanged(bodyFat, bodyAnalysisData?.body_fat_percentage ?? bodyMetrics?.body_fat_percentage) ||
      floatChanged(chest, bodyAnalysisData?.chest_cm) ||
      floatChanged(waist, bodyAnalysisData?.waist_cm) ||
      floatChanged(hips, bodyAnalysisData?.hip_cm)
    );
  }, [height, weight, targetWeight, bodyFat, chest, waist, hips, profile]);

  return (
    <SettingsModalWrapper
      visible={visible}
      title="Body Measurements"
      subtitle="Track your body composition"
      icon="body-outline"
      iconColor="#FF6B35"
      onClose={onClose}
      onSave={handleSave}
      isSaving={isSaving}
      saveDisabled={!hasChanges()}
    >
      {/* BMI Card */}
      {bmi && bmiCategory && (
        <Animated.View entering={FadeIn.duration(400)}>
          <GlassCard
            elevation={2}
            padding="md"
            blurIntensity="light"
            borderRadius="lg"
            style={styles.bmiCard}
          >
            <LinearGradient
              colors={[`${bmiCategory.color}15`, "transparent"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.bmiContent}>
              <View style={styles.bmiLeft}>
                <View
                  style={[
                    styles.bmiIcon,
                    { backgroundColor: `${bmiCategory.color}20` },
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

            {/* BMI Scale */}
            <View style={styles.bmiScale}>
              <View
                style={styles.bmiScaleBarContainer}
                onLayout={(e: LayoutChangeEvent) => setScaleBarWidth(e.nativeEvent.layout.width)}
              >
                <View style={styles.bmiScaleBar}>
                  <View
                    style={[
                      styles.bmiScaleSegment,
                      { backgroundColor: "#2196F3", flex: 18.5 },
                    ]}
                  />
                  <View
                    style={[
                      styles.bmiScaleSegment,
                      { backgroundColor: "#4CAF50", flex: 6.5 },
                    ]}
                  />
                  <View
                    style={[
                      styles.bmiScaleSegment,
                      { backgroundColor: "#FF9800", flex: 5 },
                    ]}
                  />
                  <View
                    style={[
                      styles.bmiScaleSegment,
                      { backgroundColor: "#F44336", flex: 10 },
                    ]}
                  />
                </View>
                {/* BMI Position Indicator — only render once the bar width is known */}
                {bmi && scaleBarWidth > 0 && (() => {
                  const bmiVal = parseFloat(bmi);
                  const pct = Math.min(100, Math.max(0, ((bmiVal - 15) / (40 - 15)) * 100));
                  return (
                    <View
                      style={[
                        styles.bmiIndicator,
                        { left: (scaleBarWidth * pct) / 100 },
                      ]}
                    />
                  );
                })()}
              </View>
              <View style={styles.bmiScaleLabels}>
                <Text style={styles.bmiScaleLabel}>18.5</Text>
                <Text style={styles.bmiScaleLabel}>25</Text>
                <Text style={styles.bmiScaleLabel}>30</Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>
      )}

      {/* Height */}
      <GlassFormInput
        label="Height"
        icon="resize-outline"
        iconColor="#2196F3"
        value={height}
        onChangeText={setHeight}
        placeholder="Enter your height"
        keyboardType="numeric"
        maxLength={3}
        suffix="cm"
        error={errors.height}
        hint="Height in centimeters"
      />

      {/* Current Weight */}
      <GlassFormInput
        label="Current Weight"
        icon="scale-outline"
        iconColor="#FF6B35"
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
        iconColor="#4CAF50"
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
        iconColor="#FF9800"
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
        iconColor="#9C27B0"
        value={chest}
        onChangeText={setChest}
        placeholder="Enter chest measurement"
        keyboardType="decimal-pad"
        maxLength={5}
        suffix="cm"
        error={errors.chest}
        hint="Optional - chest circumference"
      />

      {/* Waist Measurement */}
      <GlassFormInput
        label="Waist"
        icon="radio-button-off-outline"
        iconColor="#00BCD4"
        value={waist}
        onChangeText={setWaist}
        placeholder="Enter waist measurement"
        keyboardType="decimal-pad"
        maxLength={5}
        suffix="cm"
        error={errors.waist}
        hint="Optional - waist circumference"
      />

      {/* Hips Measurement */}
      <GlassFormInput
        label="Hips"
        icon="ellipse-outline"
        iconColor="#E91E63"
        value={hips}
        onChangeText={setHips}
        placeholder="Enter hips measurement"
        keyboardType="decimal-pad"
        maxLength={5}
        suffix="cm"
        error={errors.hips}
        hint="Optional - hips circumference"
      />

      {/* Info Card */}
      <GlassCard
        elevation={1}
        padding="md"
        blurIntensity="light"
        borderRadius="lg"
        style={styles.infoCard}
      >
        <View style={styles.infoRow}>
          <Ionicons
            name="information-circle-outline"
            size={rf(18)}
            color={ResponsiveTheme.colors.textSecondary}
          />
          <Text style={styles.infoText}>
            Keep your measurements updated for accurate calorie calculations and
            personalized workout recommendations.
          </Text>
        </View>
      </GlassCard>
    </SettingsModalWrapper>
  );
};

const styles = StyleSheet.create({
  bmiCard: {
    marginBottom: ResponsiveTheme.spacing.lg,
    overflow: "hidden",
  },
  bmiContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  bmiLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
  },
  bmiIcon: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    justifyContent: "center",
    alignItems: "center",
  },
  bmiLabel: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
  },
  bmiCategory: {
    fontSize: rf(14),
    fontWeight: "600",
    color: ResponsiveTheme.colors.white,
  },
  bmiRight: {
    alignItems: "flex-end",
  },
  bmiValue: {
    fontSize: rf(28),
    fontWeight: "800",
  },
  bmiUnit: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textMuted,
  },
  bmiScale: {
    marginTop: ResponsiveTheme.spacing.sm,
  },
  bmiScaleBarContainer: {
    position: "relative",
    marginBottom: rp(8),
  },
  bmiScaleBar: {
    flexDirection: "row",
    height: rp(6),
    borderRadius: rbr(3),
    overflow: "hidden",
  },
  bmiIndicator: {
    position: "absolute",
    top: rp(-4),
    width: rp(10),
    height: rp(10),
    borderRadius: rbr(5),
    backgroundColor: ResponsiveTheme.colors.white,
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.primary,
    marginLeft: rp(-5),
    shadowColor: ResponsiveTheme.colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.3)',
    elevation: 3,
  },
  bmiScaleSegment: {
    height: "100%",
  },
  bmiScaleLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: rp(4),
    paddingHorizontal: rp(2),
  },
  bmiScaleLabel: {
    fontSize: rf(9),
    color: ResponsiveTheme.colors.textMuted,
  },
  infoCard: {
    marginTop: ResponsiveTheme.spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: ResponsiveTheme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(18),
  },
});

export default BodyMeasurementsEditModal;
