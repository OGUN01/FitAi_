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
import { View, Text, StyleSheet, Alert } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SettingsModalWrapper } from "../components/SettingsModalWrapper";
import { GlassFormInput } from "../components/GlassFormInput";
import { GlassCard } from "../../../../components/ui/aurora/GlassCard";
import { useUserStore } from "../../../../stores/userStore";
import { useUser } from "../../../../hooks/useUser";
import { useAuth } from "../../../../hooks/useAuth";
import { ResponsiveTheme } from "../../../../utils/constants";
import { rf, rw } from "../../../../utils/responsive";
import { haptics } from "../../../../utils/haptics";
import { supabase } from "../../../../services/supabase";

interface BodyMeasurementsEditModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BodyMeasurementsEditModal: React.FC<
  BodyMeasurementsEditModalProps
> = ({ visible, onClose }) => {
  const { profile } = useUser();
  const { user } = useAuth();
  const { setProfile } = useUserStore();

  // Form state
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load current values when modal opens
  useEffect(() => {
    if (visible && profile) {
      // ✅ Get measurements from bodyMetrics (database: body_analysis table)
      const bodyMetrics = profile.bodyMetrics;
      setHeight(bodyMetrics?.height_cm?.toString() || "");
      setWeight(bodyMetrics?.current_weight_kg?.toString() ?? "");
      setTargetWeight(bodyMetrics?.target_weight_kg?.toString() ?? "");
      setBodyFat(bodyMetrics?.body_fat_percentage?.toString() || "");
      setErrors({});
    }
  }, [visible, profile]);

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
    if (bmiValue < 18.5) return { label: "Underweight", color: "#2196F3" };
    if (bmiValue < 25) return { label: "Normal", color: "#4CAF50" };
    if (bmiValue < 30) return { label: "Overweight", color: "#FF9800" };
    return { label: "Obese", color: "#F44336" };
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

    if (
      !weight ||
      isNaN(Number(weight)) ||
      Number(weight) < 30 ||
      Number(weight) > 300
    ) {
      newErrors.weight = "Enter valid weight in kg (30-300)";
    }

    // Target weight is optional but must be valid if provided
    if (
      targetWeight &&
      (isNaN(Number(targetWeight)) ||
        Number(targetWeight) < 30 ||
        Number(targetWeight) > 300)
    ) {
      newErrors.targetWeight = "Enter valid target weight in kg (30-300)";
    }

    // Body fat is optional but must be valid if provided
    if (
      bodyFat &&
      (isNaN(Number(bodyFat)) || Number(bodyFat) < 3 || Number(bodyFat) > 50)
    ) {
      newErrors.bodyFat = "Enter valid body fat % (3-50)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [height, weight, targetWeight, bodyFat]);

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

      // ✅ Update bodyMetrics in profile
      const updatedBodyMetrics = {
        ...profile.bodyMetrics,
        height_cm: parseFloat(height),
        current_weight_kg: parseFloat(weight),
        target_weight_kg: targetWeight ? parseFloat(targetWeight) : undefined,
        body_fat_percentage: bodyFat ? parseFloat(bodyFat) : undefined,
        // Preserve other fields
        medical_conditions: profile.bodyMetrics?.medical_conditions || [],
        medications: profile.bodyMetrics?.medications || [],
        physical_limitations: profile.bodyMetrics?.physical_limitations || [],
        pregnancy_status: profile.bodyMetrics?.pregnancy_status || false,
        breastfeeding_status:
          profile.bodyMetrics?.breastfeeding_status || false,
      };

      // Update profile with new bodyMetrics
      const updatedProfile = {
        ...profile,
        bodyMetrics: updatedBodyMetrics,
        updatedAt: new Date().toISOString(),
      };

      setProfile(updatedProfile);
      console.log(
        "✅ BodyMeasurementsEditModal: Saved body metrics locally:",
        updatedBodyMetrics,
      );

      // Sync to Supabase body_analysis table
      if (user?.id) {
        try {
          const { error } = await supabase.from("body_analysis").upsert(
            {
              user_id: user.id,
              height_cm: parseFloat(height),
              current_weight_kg: parseFloat(weight),
              target_weight_kg: targetWeight ? parseFloat(targetWeight) : null,
              body_fat_percentage: bodyFat ? parseFloat(bodyFat) : null,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id",
            },
          );

          if (error) {
            console.error(
              "Failed to sync body measurements to database:",
              error,
            );
            Alert.alert(
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
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [
    height,
    weight,
    targetWeight,
    bodyFat,
    profile,
    user,
    onClose,
    validate,
    setProfile,
  ]);

  const hasChanges = useCallback(() => {
    if (!profile?.bodyMetrics) return true;
    const bodyMetrics = profile.bodyMetrics;
    return (
      height !== (bodyMetrics.height_cm?.toString() || "") ||
      weight !== (bodyMetrics.current_weight_kg?.toString() ?? "") ||
      targetWeight !== (bodyMetrics.target_weight_kg?.toString() ?? "") ||
      bodyFat !== (bodyMetrics.body_fat_percentage?.toString() || "")
    );
  }, [height, weight, targetWeight, bodyFat, profile]);

  return (
    <SettingsModalWrapper
      visible={visible}
      title="Body Measurements"
      subtitle="Track your body composition"
      icon="body-outline"
      iconColor="#667eea"
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
        iconColor="#9C27B0"
        value={weight}
        onChangeText={setWeight}
        placeholder="Enter your weight"
        keyboardType="decimal-pad"
        maxLength={5}
        suffix="kg"
        error={errors.weight}
        hint="Weight in kilograms"
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
        maxLength={5}
        suffix="kg"
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
    color: "#fff",
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
  bmiScaleBar: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  bmiScaleSegment: {
    height: "100%",
  },
  bmiScaleLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingHorizontal: 2,
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
