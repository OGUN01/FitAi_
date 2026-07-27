// Migration Progress Hook
// Manages state and animations for migration progress component

import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { MigrationProgress, MigrationResult } from "../services/migration";

export interface MigrationStepInfo {
  name: string;
  title: string;
  description: string;
  icon: string;
}

export const MIGRATION_STEPS: MigrationStepInfo[] = [
  {
    name: "validateData",
    title: "Validating Data",
    description: "Checking data integrity and consistency",
    icon: "checkmark-circle-outline",
  },
  {
    name: "transformData",
    title: "Transforming Data",
    description: "Converting data to cloud format",
    icon: "swap-horizontal-outline",
  },
  {
    name: "uploadUserProfile",
    title: "Uploading Profile",
    description: "Syncing your personal information",
    icon: "person-outline",
  },
  {
    name: "uploadFitnessData",
    title: "Uploading Workouts",
    description: "Syncing your fitness data and workouts",
    icon: "fitness-outline",
  },
  {
    name: "uploadNutritionData",
    title: "Uploading Nutrition",
    description: "Syncing your meals and nutrition logs",
    icon: "restaurant-outline",
  },
  {
    name: "uploadProgressData",
    title: "Uploading Progress",
    description: "Syncing your achievements and measurements",
    icon: "trending-up-outline",
  },
  {
    name: "verifyMigration",
    title: "Verifying Data",
    description: "Ensuring all data was uploaded correctly",
    icon: "shield-checkmark-outline",
  },
  {
    name: "cleanupLocal",
    title: "Cleaning Up",
    description: "Finalizing migration and cleanup",
    icon: "trash-outline",
  },
];

export const useMigrationProgress = (
  progress: MigrationProgress | null,
  result: MigrationResult | null,
) => {
  const [progressAnimation] = useState(new Animated.Value(0));
  const [stepAnimations] = useState(
    MIGRATION_STEPS.map(() => new Animated.Value(0)),
  );
  const [pulseAnimation] = useState(new Animated.Value(1));
  const [celebrationAnimation] = useState(new Animated.Value(0));
  const animationsRef = useRef<Animated.CompositeAnimation[]>([]);

  // Progress bar animation
  useEffect(() => {
    if (progress) {
      const progressAnim = Animated.timing(progressAnimation, {
        toValue: progress.percentage / 100,
        duration: 500,
        useNativeDriver: false,
      });
      progressAnim.start();
      animationsRef.current.push(progressAnim);

      // Animate current step
      const currentStepIndex = MIGRATION_STEPS.findIndex(
        (step) => step.name === progress.currentStep,
      );

      if (currentStepIndex >= 0) {
        // Animate completed steps
        stepAnimations.forEach((animation, index) => {
          if (index < currentStepIndex) {
            const stepAnim = Animated.timing(animation, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            });
            stepAnim.start();
            animationsRef.current.push(stepAnim);
          } else if (index === currentStepIndex) {
            // Pulse current step
            const loop = Animated.loop(
              Animated.sequence([
                Animated.timing(animation, {
                  toValue: 0.7,
                  duration: 600,
                  useNativeDriver: true,
                }),
                Animated.timing(animation, {
                  toValue: 1,
                  duration: 600,
                  useNativeDriver: true,
                }),
              ]),
            );
            loop.start();
            animationsRef.current.push(loop);
          }
        });
      }
    }
    return () => {
      animationsRef.current.forEach(a => a.stop());
      animationsRef.current = [];
    };
  }, [progress]);

  // Celebration animation
  useEffect(() => {
    if (result?.success) {
      const celebration = Animated.sequence([
        Animated.timing(celebrationAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(celebrationAnimation, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]);
      celebration.start();
      return () => { celebration.stop(); };
    }
  }, [result]);

  const currentStepIndex = progress
    ? MIGRATION_STEPS.findIndex((step) => step.name === progress.currentStep)
    : -1;

  return {
    progressAnimation,
    stepAnimations,
    pulseAnimation,
    celebrationAnimation,
    currentStepIndex,
  };
};
