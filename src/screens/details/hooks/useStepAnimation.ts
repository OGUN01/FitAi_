import { useState, useRef, useEffect } from "react";
import { Animated } from "react-native";

export function useStepAnimation(instructionsCount: number) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const animationValue = useRef(new Animated.Value(0)).current;

  const animateToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    Animated.timing(animationValue, {
      toValue: stepIndex,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying && instructionsCount > 0) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          const nextStep = (prev + 1) % instructionsCount;
          animateToStep(nextStep);
          return nextStep;
        });
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, instructionsCount]);

  return {
    currentStep,
    isPlaying,
    animationValue,
    setIsPlaying,
    animateToStep,
  };
}
