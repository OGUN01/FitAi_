import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { GlassCard } from "../../components/ui/aurora";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw, rh } from "../../utils/responsive";import { PersonalInfoData } from "../../types/onboarding";
import TimePicker from "./TimePicker";

interface LifestyleFieldsProps {
  formData: PersonalInfoData;
  showWakeTimePicker: boolean;
  showSleepTimePicker: boolean;
  actions: {
    updateField: <K extends keyof PersonalInfoData>(
      field: K,
      value: PersonalInfoData[K],
    ) => void;
    handleTimeChange: (field: "wake_time" | "sleep_time", time: string) => void;
    calculateSleepDuration: () => string;
    setShowWakeTimePicker: (show: boolean) => void;
    setShowSleepTimePicker: (show: boolean) => void;
    hasFieldError: (field: string) => boolean;
    getFieldError: (field: string) => string | undefined;
  };
}

export const LifestyleFields: React.FC<LifestyleFieldsProps> = ({
  formData,
  showWakeTimePicker,
  showSleepTimePicker,
  actions,
}) => {
  const {
    updateField,
    handleTimeChange,
    calculateSleepDuration,
    setShowWakeTimePicker,
    setShowSleepTimePicker,
    hasFieldError,
    getFieldError,
  } = actions;

  const formatTimeForDisplay = (time: string): string => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const sleepDuration = calculateSleepDuration();
  const sleepHours = parseFloat(sleepDuration.split("h")[0]) || 0;
  const isHealthySleep = sleepHours >= 7 && sleepHours <= 9;

  return (
    <>
      <GlassCard
        style={styles.sectionEdgeToEdge}
        elevation={2}
        blurIntensity="default"
        padding="none"
        borderRadius="none"
      >
        <View style={styles.sectionTitlePadded}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            Sleep Schedule
          </Text>
          <Text
            style={styles.sectionSubtitle}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            Help us understand your daily routine for personalized
            recommendations
          </Text>
        </View>

        <View style={styles.edgeToEdgeContentPadded}>
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.inputLabel} numberOfLines={1}>
                Wake Up Time *
              </Text>
              <TouchableOpacity
                style={styles.timeSelector}
                onPress={() => setShowWakeTimePicker(true)}
              >
                <View style={styles.timeIconContainer}>
                  <Ionicons
                    name="sunny-outline"
                    size={rf(20)}
                    color={colors.warningAlt}
                  />
                  <Text style={styles.timeText} numberOfLines={1}>
                    {formatTimeForDisplay(formData.wake_time)}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.inputLabel} numberOfLines={1}>
                Sleep Time *
              </Text>
              <TouchableOpacity
                style={styles.timeSelector}
                onPress={() => setShowSleepTimePicker(true)}
              >
                <View style={styles.timeIconContainer}>
                  <Ionicons name="moon-outline" size={rf(20)} color={colors.primary} />
                  <Text style={styles.timeText} numberOfLines={1}>
                    {formatTimeForDisplay(formData.sleep_time)}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {sleepDuration && (
            <GlassCard
              elevation={2}
              blurIntensity="default"
              padding="md"
              borderRadius="lg"
              style={StyleSheet.flatten([
                styles.sleepDurationCardInline,
                isHealthySleep
                  ? styles.sleepDurationHealthy
                  : styles.sleepDurationWarning,
              ])}
            >
              <View style={styles.sleepDurationContent}>
                <View style={styles.sleepDurationIconContainer}>
                  <Ionicons
                    name={isHealthySleep ? "checkmark-circle" : "alert-circle"}
                    size={rf(24)}
                    color={
                      isHealthySleep
                        ? colors.success
                        : colors.warning
                    }
                  />
                </View>
                <View style={styles.sleepDurationText}>
                  <Text style={styles.sleepDurationTitle} numberOfLines={1}>
                    Sleep Duration: {sleepDuration}
                  </Text>
                  <Text
                    style={styles.sleepDurationSubtitle}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {isHealthySleep
                      ? "Great! This is within the recommended 7-9 hours."
                      : sleepHours < 7
                        ? "Consider getting more sleep for better fitness results."
                        : "Very long sleep duration detected."}
                  </Text>
                </View>
              </View>
            </GlassCard>
          )}

          {hasFieldError("wake") && (
            <Text style={styles.errorText}>{getFieldError("wake")}</Text>
          )}
          {hasFieldError("sleep") && (
            <Text style={styles.errorText}>{getFieldError("sleep")}</Text>
          )}
        </View>
        <View style={styles.sectionBottomPad} />
      </GlassCard>

      <TimePicker
        visible={showWakeTimePicker}
        initialTime={formData.wake_time}
        onTimeSelect={(time) => {
          handleTimeChange("wake_time", time);
          setShowWakeTimePicker(false);
        }}
        onClose={() => setShowWakeTimePicker(false)}
        title="Select Wake Up Time"
        is24Hour={true}
      />

      <TimePicker
        visible={showSleepTimePicker}
        initialTime={formData.sleep_time}
        onTimeSelect={(time) => {
          handleTimeChange("sleep_time", time);
          setShowSleepTimePicker(false);
        }}
        onClose={() => setShowSleepTimePicker(false)}
        title="Select Sleep Time"
        is24Hour={true}
      />
    </>
  );
};

const styles = StyleSheet.create({
  sectionEdgeToEdge: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    marginHorizontal: -spacing.lg,
  },
  sectionTitlePadded: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: fontSize.sm * 1.4,
    flexShrink: 1,
  },
  edgeToEdgeContentPadded: {
    paddingHorizontal: spacing.lg,
  },
  sectionBottomPad: {
    height: spacing.lg,
  },
  scrollContainerInset: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    overflow: "hidden",
    borderRadius: borderRadius.md,
  },
  scrollContentInset: {
    paddingVertical: spacing.sm,
    gap: rw(10),
  },
  activityCardItem: {
    width: rw(105),
  },
  activityCard: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    padding: spacing.sm,
    minHeight: rh(12),
    alignItems: "center",
    justifyContent: "center",
  },
  activityCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  activityIconContainer: {
    width: rf(44),
    height: rf(44),
    borderRadius: rf(22),
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  activityIconContainerSelected: {
    backgroundColor: `${colors.primary}20`,
  },
  activityCardTitle: {
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(14),
  },
  activityCardTitleSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    flexShrink: 1,
  },
  timeSelector: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: colors.backgroundTertiary,
    alignItems: "center",
  },
  timeIconContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  timeText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
    flexShrink: 1,
  },
  sleepDurationCardInline: {
    marginTop: spacing.md,
  },
  sleepDurationHealthy: {
    backgroundColor: `${colors.success}10`,
    borderColor: `${colors.success}30`,
    borderWidth: 1,
  },
  sleepDurationWarning: {
    backgroundColor: `${colors.warning}10`,
    borderColor: `${colors.warning}30`,
    borderWidth: 1,
  },
  sleepDurationContent: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  sleepDurationIconContainer: {
    justifyContent: "center",
  },
  sleepDurationText: {
    flex: 1,
  },
  sleepDurationTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sleepDurationSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.4,
  },
});
