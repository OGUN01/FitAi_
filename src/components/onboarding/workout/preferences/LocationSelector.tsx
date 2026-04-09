import React, { type ComponentProps } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw } from "../../../../utils/responsive";
import { ResponsiveTheme } from "../../../../utils/constants";
import { AnimatedPressable } from "../../../../components/ui/aurora";
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
    </>
  );
};

const styles = StyleSheet.create({
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
    minHeight: 120,
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
});
