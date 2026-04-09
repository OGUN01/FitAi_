import React, { type ComponentProps } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw, rh } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import { GlassCard, AnimatedPressable } from "../../../components/ui/aurora";
import { MultiSelect } from "../../../components/advanced/MultiSelect";
import {
  LOCATION_OPTIONS,
  EQUIPMENT_OPTIONS,
  STANDARD_GYM_EQUIPMENT,
  WORKOUT_TIMES,
} from "../../../screens/onboarding/tabs/WorkoutPreferencesConstants";
import { WorkoutPreferencesData } from "../../../types/onboarding";

interface PreferencesSectionProps {
  formData: WorkoutPreferencesData;
  updateField: <K extends keyof WorkoutPreferencesData>(
    field: K,
    value: WorkoutPreferencesData[K],
  ) => void;
  toggleWorkoutTime: (timeId: string) => void;
  showInfoTooltip: (title: string, description: string) => void;
}

export const PreferencesSection: React.FC<PreferencesSectionProps> = ({
  formData,
  updateField,
  toggleWorkoutTime,
  showInfoTooltip,
}) => {
  const handleInfoPress =
    (title: string, description: string) => (event: any) => {
      event.stopPropagation?.();
      showInfoTooltip(title, description);
    };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <GlassCard
      style={styles.sectionEdgeToEdge}
      elevation={2}
      blurIntensity="default"
      padding="none"
      borderRadius="none"
    >
      <View style={styles.sectionTitlePadded}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          Workout Preferences
        </Text>
        <Text
          style={styles.sectionSubtitle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          Where and when do you prefer to workout?
        </Text>
      </View>

      {/* Location - Horizontal scroll */}
      <View style={styles.edgeToEdgeContentPadded}>
        <Text style={styles.fieldLabel} numberOfLines={1}>
          Workout Location
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
          {LOCATION_OPTIONS.map((option) => {
            const isSelected = formData.location === option.id;
            return (
              <AnimatedPressable
                key={option.id}
                onPress={() =>
                  updateField(
                    "location",
                    option.id as WorkoutPreferencesData["location"],
                  )
                }
                style={styles.consistentCardItem}
                scaleValue={0.97}
              >
                <View
                  style={[
                    styles.consistentCard,
                    isSelected && styles.consistentCardSelected,
                  ]}
                >
                  {/* Icon + Info row */}
                  <View style={styles.consistentCardHeader}>
                    <Ionicons
                      name={option.iconName as ComponentProps<typeof Ionicons>['name']}
                      size={rf(22)}
                      color={
                        isSelected
                          ? ResponsiveTheme.colors.primary
                          : ResponsiveTheme.colors.textSecondary
                      }
                    />
                    <TouchableOpacity
                      onPress={handleInfoPress(
                        option.title,
                        option.description,
                      )}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={`More info about ${option.title}`}
                    >
                      <Ionicons
                        name="information-circle-outline"
                        size={rf(14)}
                        color={ResponsiveTheme.colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                  {/* Title */}
                  <Text
                    style={[
                      styles.consistentCardTitle,
                      isSelected && styles.consistentCardTitleSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {option.title}
                  </Text>
                  {/* Selection indicator */}
                  <View
                    style={[
                      styles.consistentCardIndicator,
                      isSelected && styles.consistentCardIndicatorSelected,
                    ]}
                  >
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={rf(12)}
                        color={ResponsiveTheme.colors.white}
                      />
                    )}
                  </View>
                </View>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Equipment - Hidden for gym, shown for home/both */}
      <View style={styles.edgeToEdgeContentPadded}>
        {formData.location !== "gym" ? (
          <View style={styles.preferenceField}>
            <MultiSelect
              options={EQUIPMENT_OPTIONS}
              selectedValues={formData.equipment}
              onSelectionChange={(values) => updateField("equipment", values)}
              label="Available Equipment"
              placeholder="Select equipment you have access to"
              searchable={true}
            />
          </View>
        ) : (
          <View style={styles.preferenceField}>
            <Text style={styles.fieldLabel} numberOfLines={1}>
              Available Equipment
            </Text>
            <GlassCard
              elevation={2}
              blurIntensity="default"
              padding="md"
              borderRadius="lg"
              style={styles.gymEquipmentCard}
            >
              <View style={styles.gymEquipmentContent}>
                <Ionicons
                  name="fitness-outline"
                  size={rf(24)}
                  color={ResponsiveTheme.colors.primary}
                  style={{ marginBottom: ResponsiveTheme.spacing.sm }}
                />
                <Text style={styles.gymEquipmentTitle} numberOfLines={1}>
                  Full Gym Access
                </Text>
                <Text
                  style={styles.gymEquipmentDescription}
                  numberOfLines={3}
                  ellipsizeMode="tail"
                >
                  All standard gym equipment is available. Equipment selection
                  is automatically configured.
                </Text>
                <View style={styles.gymEquipmentList}>
                  {STANDARD_GYM_EQUIPMENT.map((equipmentId) => {
                    const equipment = EQUIPMENT_OPTIONS.find(
                      (opt) => opt.value === equipmentId,
                    );
                    return equipment ? (
                      <View key={equipmentId} style={styles.gymEquipmentItem}>
                        <Ionicons
                          name={equipment.iconName as ComponentProps<typeof Ionicons>['name']}
                          size={rf(16)}
                          color={ResponsiveTheme.colors.text}
                          style={{ marginRight: ResponsiveTheme.spacing.xs }}
                        />
                        <Text style={styles.gymEquipmentItemLabel}>
                          {equipment.label}
                        </Text>
                      </View>
                    ) : null;
                  })}
                </View>
              </View>
            </GlassCard>
          </View>
        )}
      </View>

      {/* Workout Duration - Horizontal scroll compact pills */}
      <View style={styles.edgeToEdgeContentPadded}>
        <Text style={styles.fieldLabel}>
          Workout Duration: {formatTime(formData.time_preference)}
        </Text>
      </View>
      <View style={styles.scrollContainerInset}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentInset}
          decelerationRate="fast"
          snapToInterval={rw(70) + rw(10)}
          snapToAlignment="start"
        >
          {[15, 30, 45, 60, 75, 90, 120].map((minutes) => {
            const isSelected = formData.time_preference === minutes;
            return (
              <AnimatedPressable
                key={minutes}
                style={
                  isSelected
                    ? [styles.durationPill, styles.durationPillSelected]
                    : styles.durationPill
                }
                onPress={() => updateField("time_preference", minutes)}
                scaleValue={0.97}
              >
                <Text
                  style={[
                    styles.durationPillText,
                    isSelected && styles.durationPillTextSelected,
                  ]}
                >
                  {formatTime(minutes)}
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Preferred Workout Times - Horizontal scroll */}
      <View style={styles.edgeToEdgeContentPadded}>
        <Text style={styles.fieldLabel}>Preferred Workout Times</Text>
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
          {WORKOUT_TIMES.map((time) => {
            const isSelected = formData.preferred_workout_times.includes(
              time.value,
            );
            return (
              <AnimatedPressable
                key={time.value}
                onPress={() => toggleWorkoutTime(time.value)}
                style={styles.consistentCardItem}
                scaleValue={0.97}
              >
                <View
                  style={[
                    styles.consistentCard,
                    isSelected && styles.consistentCardSelected,
                  ]}
                >
                  {/* Icon */}
                  <View style={styles.consistentCardIconCenter}>
                    <Ionicons
                      name={time.iconName as ComponentProps<typeof Ionicons>['name']}
                      size={rf(22)}
                      color={
                        isSelected
                          ? ResponsiveTheme.colors.primary
                          : ResponsiveTheme.colors.textSecondary
                      }
                    />
                  </View>
                  {/* Title */}
                  <Text
                    style={[
                      styles.consistentCardTitle,
                      isSelected && styles.consistentCardTitleSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {time.label}
                  </Text>
                  {/* Description */}
                  <Text style={styles.consistentCardDesc} numberOfLines={1}>
                    {time.description}
                  </Text>
                  {/* Selection indicator */}
                  <View
                    style={[
                      styles.consistentCardIndicator,
                      isSelected && styles.consistentCardIndicatorSelected,
                    ]}
                  >
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={rf(12)}
                        color={ResponsiveTheme.colors.white}
                      />
                    )}
                  </View>
                </View>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>
      <View style={styles.sectionBottomPad} />
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  sectionEdgeToEdge: {
    marginTop: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.md,
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
  fieldLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    flexShrink: 1,
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
  consistentCardItem: {
    width: rw(105),
  },
  consistentCard: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    padding: ResponsiveTheme.spacing.sm,
    minHeight: rh(12),
    alignItems: "center",
  },
  consistentCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },
  consistentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  consistentCardIconCenter: {
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  consistentCardTitle: {
    fontSize: rf(11),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  consistentCardTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },
  consistentCardDesc: {
    fontSize: rf(9),
    color: ResponsiveTheme.colors.textMuted,
    textAlign: "center",
    lineHeight: rf(12),
  },
  consistentCardIndicator: {
    width: rf(18),
    height: rf(18),
    borderRadius: rf(9),
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginTop: ResponsiveTheme.spacing.xs,
  },
  consistentCardIndicatorSelected: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },
  preferenceField: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  gymEquipmentCard: {
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.success}08`,
    borderColor: `${ResponsiveTheme.colors.success}30`,
    borderWidth: 1,
  },
  gymEquipmentContent: {
    alignItems: "center",
  },
  gymEquipmentTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.success,
    marginBottom: ResponsiveTheme.spacing.xs,
    textAlign: "center",
  },
  gymEquipmentDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: rf(18),
  },
  gymEquipmentList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.sm,
  },
  gymEquipmentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  gymEquipmentItemLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  durationPill: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.full,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    minWidth: rw(70),
    alignItems: "center",
  },
  durationPillSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },
  durationPillText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  durationPillTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
  sectionBottomPad: {
    height: ResponsiveTheme.spacing.lg,
  },
});
