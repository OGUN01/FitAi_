import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { GlassCard, AnimatedPressable } from "../../components/ui/aurora";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw, rh } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { OCCUPATION_OPTIONS } from "./PersonalInfoConstants";
import { PersonalInfoData } from "../../types/onboarding";
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
            Daily Activity
          </Text>
          <Text
            style={styles.sectionSubtitle}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            This helps us understand your daily movement beyond exercise
          </Text>
        </View>

        <View style={styles.scrollContainerInset}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContentInset}
            decelerationRate="fast"
            snapToInterval={rw(105) + rw(10)}
            snapToAlignment="start"
          >
            {OCCUPATION_OPTIONS.map((option) => {
              const isSelected = formData.occupation_type === option.value;

              return (
                <AnimatedPressable
                  key={option.value}
                  style={styles.activityCardItem}
                  onPress={() =>
                    updateField(
                      "occupation_type",
                      option.value as PersonalInfoData["occupation_type"],
                    )
                  }
                  scaleValue={0.95}
                >
                  <View
                    style={[
                      styles.activityCard,
                      isSelected && styles.activityCardSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.activityIconContainer,
                        isSelected && styles.activityIconContainerSelected,
                      ]}
                    >
                      <Ionicons
                        name={option.iconName as any}
                        size={rf(24)}
                        color={
                          isSelected
                            ? ResponsiveTheme.colors.primary
                            : ResponsiveTheme.colors.textSecondary
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.activityCardTitle,
                        isSelected && styles.activityCardTitleSelected,
                      ]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {option.label}
                    </Text>
                  </View>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.edgeToEdgeContentPadded}>
          {hasFieldError("occupation") && (
            <Text style={styles.errorText}>{getFieldError("occupation")}</Text>
          )}
        </View>
        <View style={styles.sectionBottomPad} />
      </GlassCard>

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
                    color="#F59E0B"
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
                  <Ionicons name="moon-outline" size={rf(20)} color="#FF6B35" />
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
                        ? ResponsiveTheme.colors.success
                        : ResponsiveTheme.colors.warning
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
    marginTop: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.xl,
    marginHorizontal: -ResponsiveTheme.spacing.lg,
  },
  sectionTitlePadded: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  sectionSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: ResponsiveTheme.fontSize.sm * 1.4,
    flexShrink: 1,
  },
  edgeToEdgeContentPadded: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  sectionBottomPad: {
    height: ResponsiveTheme.spacing.lg,
  },
  scrollContainerInset: {
    marginHorizontal: ResponsiveTheme.spacing.lg,
    marginTop: ResponsiveTheme.spacing.sm,
    overflow: "hidden",
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  scrollContentInset: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    gap: rw(10),
  },
  activityCardItem: {
    width: rw(105),
  },
  activityCard: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    padding: ResponsiveTheme.spacing.sm,
    minHeight: rh(12),
    alignItems: "center",
    justifyContent: "center",
  },
  activityCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },
  activityIconContainer: {
    width: rf(44),
    height: rf(44),
    borderRadius: rf(22),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  activityIconContainerSelected: {
    backgroundColor: `${ResponsiveTheme.colors.primary}20`,
  },
  activityCardTitle: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(14),
  },
  activityCardTitleSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
  errorText: {
    color: ResponsiveTheme.colors.error,
    fontSize: ResponsiveTheme.fontSize.xs,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  row: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  inputLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    flexShrink: 1,
  },
  timeSelector: {
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    alignItems: "center",
  },
  timeIconContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
  },
  timeText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    flexShrink: 1,
  },
  sleepDurationCardInline: {
    marginTop: ResponsiveTheme.spacing.md,
  },
  sleepDurationHealthy: {
    backgroundColor: `${ResponsiveTheme.colors.success}10`,
    borderColor: `${ResponsiveTheme.colors.success}30`,
    borderWidth: 1,
  },
  sleepDurationWarning: {
    backgroundColor: `${ResponsiveTheme.colors.warning}10`,
    borderColor: `${ResponsiveTheme.colors.warning}30`,
    borderWidth: 1,
  },
  sleepDurationContent: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.md,
    alignItems: "center",
  },
  sleepDurationIconContainer: {
    justifyContent: "center",
  },
  sleepDurationText: {
    flex: 1,
  },
  sleepDurationTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  sleepDurationSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: ResponsiveTheme.fontSize.sm * 1.4,
  },
});
