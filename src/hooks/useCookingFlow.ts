import { useState, useEffect, useRef, useCallback } from "react";
import { ScrollView, View, findNodeHandle } from "react-native";
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
  // Live-measured refs to each rendered step row, keyed by step index. Used
  // instead of a fixed per-row height (rows wrap to different heights based
  // on instruction text length) so auto-scroll lands on the real position.
  const stepRowRefs = useRef<Map<number, View | null>>(new Map());

  const registerStepRef = useCallback((index: number, ref: View | null) => {
    if (ref) {
      stepRowRefs.current.set(index, ref);
    } else {
      stepRowRefs.current.delete(index);
    }
  }, []);

  const mealId = meal?.id;
  useEffect(() => {
    if (!meal) return;
    const flow = cookingFlowGenerator.generateCookingFlow(meal);
    setCookingFlow(flow);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealId]);

  useEffect(() => {
    const scrollNode = findNodeHandle(scrollViewRef.current);
    const stepRow = stepRowRefs.current.get(currentStepIndex);
    if (!scrollViewRef.current || !scrollNode || !stepRow) return;

    stepRow.measureLayout(
      scrollNode,
      (_x, y) => {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, y - 16),
          animated: true,
        });
      },
      () => {
        // Measurement can fail if the row hasn't mounted yet — safe to skip,
        // the next step change will retry.
      },
    );
  }, [currentStepIndex]);

  const markStepComplete = (stepIndex: number) => {
    setCompletedSteps((prev) => {
      if (prev.has(stepIndex)) return prev;
      const newSet = new Set(prev);
      newSet.add(stepIndex);
      return newSet;
    });
  };

  const toggleStepComplete = (stepIndex: number) => {
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
    toggleStepComplete,
    goToNextStep,
    goToPreviousStep,
    scrollViewRef,
    registerStepRef,
  };
}
