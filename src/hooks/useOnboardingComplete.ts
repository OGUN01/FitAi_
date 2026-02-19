/**
 * useOnboardingComplete - Animation and state logic for onboarding completion
 */

import { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import { haptics } from "../utils/haptics";

interface UseOnboardingCompleteProps {
  visible: boolean;
  onGetStarted: () => void;
}

export const useOnboardingComplete = ({
  visible,
  onGetStarted,
}: UseOnboardingCompleteProps) => {
  const { width: screenWidth } = useWindowDimensions();
  const modalWidth = Math.min(screenWidth - 40, 340);

  useEffect(() => {
    if (visible) {
      console.log(
        "🎯 OnboardingCompleteModal: Modal visible, screenWidth:",
        screenWidth,
        "modalWidth:",
        modalWidth,
      );
      haptics.success();
    }
  }, [visible, screenWidth, modalWidth]);

  const handleGetStarted = () => {
    console.log("🎯 OnboardingCompleteModal: handleGetStarted called");
    haptics.medium();
    console.log("🎯 OnboardingCompleteModal: Calling onGetStarted prop...");
    onGetStarted();
    console.log("🎯 OnboardingCompleteModal: onGetStarted completed");
  };

  return {
    modalWidth,
    handleGetStarted,
  };
};
