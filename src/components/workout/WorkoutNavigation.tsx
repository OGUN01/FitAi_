import React from "react";
import { View, StyleSheet } from "react-native";
import { Button } from "../ui";
import { flatColors as colors } from "../../theme/aurora-tokens";
import { rp, rh } from "../../utils/responsive";

interface WorkoutNavigationProps {
  currentExercise: number;
  totalExercises: number;
  canAdvance: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export const WorkoutNavigation: React.FC<WorkoutNavigationProps> = ({
  currentExercise,
  totalExercises,
  canAdvance,
  onPrevious,
  onNext,
}) => {
  return (
    <View style={styles.navigationContainer}>
      <Button
        title="Previous"
        onPress={onPrevious}
        variant="outline"
        disabled={currentExercise === 0}
        style={styles.navButton}
      />

      <Button
        title={
          currentExercise === totalExercises - 1
            ? "Finish Workout"
            : "Next Exercise"
        }
        onPress={onNext}
        variant="primary"
        disabled={!canAdvance}
        style={StyleSheet.flatten([styles.navButton, styles.primaryNavButton])}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  navigationContainer: {
    flexDirection: "row",
    // Use rp() consistently for both axes (was mixing rp(16) and rw(12) —
    // inconsistent scaling between width/height-based responsive helpers).
    paddingHorizontal: rp(16),
    paddingVertical: rp(8),
    gap: rp(12),
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  navButton: {
    flex: 1,
    // Clamp to 44px minimum touch target (rh(44) drops below on small screens).
    minHeight: Math.max(rh(44), 44),
    maxHeight: Math.max(rh(48), 48),
  },

  primaryNavButton: {
    elevation: 2,
  },
});
