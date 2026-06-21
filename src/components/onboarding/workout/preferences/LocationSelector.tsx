import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../../theme/aurora-tokens";
import React, { type ComponentProps } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw } from "../../../../utils/responsive";import { AnimatedPressable } from "../../../../components/ui/aurora";
import { LOCATION_OPTIONS } from "../../../../screens/onboarding/tabs/WorkoutPreferencesConstants";
import { WorkoutPreferencesData } from "../../../../types/onboarding";

interface LocationSelectorProps {
  selectedLocation: WorkoutPreferencesData["location"];
  onLocationChange: (location: WorkoutPreferencesData["location"]) => void;
  onInfoPress: (title: string, description: string) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedLocation,
  onLocationChange,
  onInfoPress,
}) => {
  const handleInfoPress =
    (title: string, description: string) => (event: any) => {
      event.stopPropagation?.();
      onInfoPress(title, description);
    };

  return (
    <>
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
            const isSelected = selectedLocation === option.id;
            return (
              <AnimatedPressable
                key={option.id}
                onPress={() =>
                  onLocationChange(
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
                  <View style={styles.consistentCardHeader}>
                    <Ionicons
                      name={option.iconName as ComponentProps<typeof Ionicons>['name']}
                      size={rf(22)}
                      color={
                        isSelected
                          ? colors.primary
                          : colors.textSecondary
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
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={[
                      styles.consistentCardTitle,
                      isSelected && styles.consistentCardTitleSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {option.title}
                  </Text>
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
                        color={colors.white}
                      />
                    )}
                  </View>
                </View>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  edgeToEdgeContentPadded: {
    paddingHorizontal: spacing.lg,
  },
  fieldLabel: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
    flexShrink: 1,
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
  consistentCardItem: {
    width: rw(105),
  },
  consistentCard: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    padding: spacing.sm,
    minHeight: 120,
    alignItems: "center",
  },
  consistentCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  consistentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: spacing.xs,
  },
  consistentCardTitle: {
    fontSize: rf(11),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  consistentCardTitleSelected: {
    color: colors.primary,
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
    marginTop: spacing.xs,
  },
  consistentCardIndicatorSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
