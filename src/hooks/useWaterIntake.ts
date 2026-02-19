import { useState, useCallback } from "react";
import { haptics } from "../utils/haptics";

interface UseWaterIntakeProps {
  currentIntakeML: number;
  goalML: number;
  onAddWater: (amountML: number) => void;
  onClose: () => void;
}

export interface UseWaterIntakeReturn {
  customAmount: string;
  showCustomInput: boolean;
  error: string | null;
  currentLiters: number;
  goalLiters: number;
  progress: number;
  isGoalReached: boolean;
  setCustomAmount: (value: string) => void;
  setShowCustomInput: (value: boolean) => void;
  setError: (value: string | null) => void;
  handleClose: () => void;
  handleQuickAdd: (amountML: number) => void;
  handleCustomSubmit: () => void;
}

export const useWaterIntake = ({
  currentIntakeML,
  goalML,
  onAddWater,
  onClose,
}: UseWaterIntakeProps): UseWaterIntakeReturn => {
  const [customAmount, setCustomAmount] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentLiters = currentIntakeML / 1000;
  const goalLiters = goalML / 1000;
  const progress =
    goalML > 0 ? Math.min((currentIntakeML / goalML) * 100, 100) : 0;
  const isGoalReached = currentIntakeML >= goalML;

  const handleClose = useCallback(() => {
    setCustomAmount("");
    setShowCustomInput(false);
    setError(null);
    onClose();
  }, [onClose]);

  const handleQuickAdd = useCallback(
    (amountML: number) => {
      haptics.light();
      onAddWater(amountML);
      handleClose();
    },
    [onAddWater, handleClose],
  );

  const handleCustomSubmit = useCallback(() => {
    const amountLiters = parseFloat(customAmount);

    if (!customAmount || isNaN(amountLiters)) {
      setError("Please enter a valid amount");
      haptics.error();
      return;
    }

    if (amountLiters <= 0 || amountLiters > 5) {
      setError("Amount must be between 0.1 and 5 liters");
      haptics.error();
      return;
    }

    const amountML = amountLiters * 1000;
    haptics.success();
    onAddWater(amountML);
    handleClose();
  }, [customAmount, onAddWater, handleClose]);

  return {
    customAmount,
    showCustomInput,
    error,
    currentLiters,
    goalLiters,
    progress,
    isGoalReached,
    setCustomAmount,
    setShowCustomInput,
    setError,
    handleClose,
    handleQuickAdd,
    handleCustomSubmit,
  };
};
