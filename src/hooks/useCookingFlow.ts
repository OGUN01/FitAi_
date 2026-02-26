import { useState, useEffect, useRef } from "react";
import { ScrollView } from "react-native";
import { DayMeal } from "../types/ai";
import {
  cookingFlowGenerator,
  CookingFlow,
} from "../utils/cookingFlowGenerator";

export function useCookingFlow(meal: DayMeal) {
  const [cookingFlow, setCookingFlow] = useState<CookingFlow | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const scrollViewRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    const flow = cookingFlowGenerator.generateCookingFlow(meal);
    setCookingFlow(flow);

  }, [meal]);

  useEffect(() => {
    if (scrollViewRef.current && currentStepIndex >= 0) {
      scrollViewRef.current.scrollTo({
        y: currentStepIndex * 120,
        animated: true,
      });
    }
  }, [currentStepIndex]);

  const markStepComplete = (stepIndex: number) => {
    setCompletedSteps((prev) => {
      const newSet = new Set(prev);
      newSet.add(stepIndex);
      return newSet;
    });
  };

  const goToNextStep = () => {
    if (!cookingFlow) return;

    if (currentStepIndex < cookingFlow.steps.length - 1) {
      markStepComplete(currentStepIndex);
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return {
    cookingFlow,
    currentStepIndex,
    setCurrentStepIndex,
    completedSteps,
    markStepComplete,
    goToNextStep,
    goToPreviousStep,
    scrollViewRef,
  };
}
