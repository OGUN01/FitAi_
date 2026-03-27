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
      haptics.success();
    }
  }, [visible]);

  const handleGetStarted = () => {
    haptics.medium();
    onGetStarted();
  };

  return {
    modalWidth,
    handleGetStarted,
  };
};
