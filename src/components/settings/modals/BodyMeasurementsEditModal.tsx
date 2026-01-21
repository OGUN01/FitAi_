/**
 * BodyMeasurementsEditModal - Edit Body Measurements
 *
 * Fields:
 * - Weight (slider/input)
 * - Height (slider/input)
 * - BMI (calculated, display only)
 *
 * Uses useUserStore.updatePersonalInfo() to save changes.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SettingsModalWrapper } from "../SettingsModalWrapper";
import { GlassFormInput } from "../../form/GlassFormInput";
import { GlassCard } from "../../ui/aurora/GlassCard";
import { useUserStore } from "../../../stores/userStore";
import { useUser } from "../../../hooks/useUser";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";
import type { PersonalInfo } from "../../../types/user";

interface BodyMeasurementsEditModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BodyMeasurementsEditModal: React.FC<
  BodyMeasurementsEditModalProps
> = ({ visible, onClose }) => {
  const { profile } = useUser();
  const { updatePersonalInfo } = useUserStore();

  // Form state
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load current values when modal opens
  useEffect(() => {
    if (visible && profile?.personalInfo) {
      const info = profile.personalInfo;
      setWeight(String(info.weight || ""));
      setHeight(String(info.height || ""));
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [height, weight]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!validate()) {
      haptics.light();
      return;
    }

    setIsSaving(true);
    try {
      // Merge with existing personal info
      const updatedInfo: PersonalInfo = {
        ...profile?.personalInfo,
        first_name: profile?.personalInfo?.first_name || "",
        last_name: profile?.personalInfo?.last_name || "",
        age:
          typeof profile?.personalInfo?.age === "number"
            ? profile.personalInfo.age
            : 18,
        gender: (profile?.personalInfo?.gender || "male") as
          | "male"
          | "female"
          | "other"
          | "prefer_not_to_say",
        country: profile?.personalInfo?.country || "",
        state: profile?.personalInfo?.state || "",
        wake_time: profile?.personalInfo?.wake_time || "07:00",
        sleep_time: profile?.personalInfo?.sleep_time || "23:00",
        occupation_type: profile?.personalInfo?.occupation_type || "desk_job",
        height: parseFloat(height),
        weight: parseFloat(weight),
      };

      updatePersonalInfo(updatedInfo);
      haptics.success();
      onClose();
    } catch (error) {
      console.error("Error saving body measurements:", error);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [height, weight, profile, updatePersonalInfo, onClose, validate]);

  const hasChanges = useCallback(() => {
    if (!profile?.personalInfo) return true;
    const info = profile.personalInfo;
    return (
      height !== String(info.height || "") ||
      weight !== String(info.weight || "")
    );
  }, [height, weight, profile]);

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

      {/* Weight */}
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
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  bmiLeft: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.sm,
  },
  bmiIcon: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    justifyContent: "center" as const,
    alignItems: "center" as const,
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
    justifyContent: "space-between" as const,
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
