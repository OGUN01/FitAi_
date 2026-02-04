import React from "react";
import { View, StyleSheet } from "react-native";
import { Button, THEME } from "../ui";
import { rp, rw } from "../../utils/responsive";

interface WorkoutNavigationProps {
  currentExercise: number;
  totalExercises: number;
  onPrevious: () => void;
  onNext: () => void;
}

export const WorkoutNavigation: React.FC<WorkoutNavigationProps> = ({
  currentExercise,
  totalExercises,
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
        style={[styles.navButton, styles.primaryNavButton] as any}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  navigationContainer: {
    flexDirection: "row",
    paddingHorizontal: rp(16),
    paddingVertical: rp(8),
    gap: rw(12),
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  navButton: {
    flex: 1,
    minHeight: 44,
    maxHeight: 48,
  },

  primaryNavButton: {
    elevation: 2,
  },
});
