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

    console.log("🍽️ Generated cooking flow:", {
      totalSteps: flow.steps.length,
      totalTime: flow.totalTime,
      difficulty: flow.difficulty,
      equipment: flow.equipmentNeeded,
    });
  }, [meal]);

  useEffect(() => {
    if (scrollViewRef.current && currentStepIndex >= 0) {
      scrollViewRef.current.scrollTo({
        y: currentStepIndex * 120,
        animated: true,
      });
    }
  }, [currentStepIndex]);

  const toggleStepCompletion = (stepIndex: number) => {
    setCompletedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepIndex)) {
        newSet.delete(stepIndex);
      } else {
        newSet.add(stepIndex);
      }
      return newSet;
    });
  };

  const goToNextStep = () => {
    if (!cookingFlow) return;

    if (currentStepIndex < cookingFlow.steps.length - 1) {
      toggleStepCompletion(currentStepIndex);
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
    toggleStepCompletion,
    goToNextStep,
    goToPreviousStep,
    scrollViewRef,
  };
}
