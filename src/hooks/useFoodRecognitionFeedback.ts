import { useState, useEffect } from "react";
import { Alert } from "react-native";
import { RecognizedFood } from "../services/foodRecognitionService";
import { FoodFeedback } from "../components/diet/feedback/types";

interface UseFoodRecognitionFeedbackProps {
  recognizedFoods: RecognizedFood[];
  onSubmitFeedback: (feedback: FoodFeedback[]) => Promise<void>;
  onClose: () => void;
}

export const useFoodRecognitionFeedback = ({
  recognizedFoods,
  onSubmitFeedback,
  onClose,
}: UseFoodRecognitionFeedbackProps) => {
  const [feedback, setFeedback] = useState<FoodFeedback[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentFoodIndex, setCurrentFoodIndex] = useState(0);

  // Initialize feedback state when foods change
  useEffect(() => {
    if (recognizedFoods.length > 0) {
      setFeedback(
        recognizedFoods.map((food) => ({
          foodId: food.id,
          originalName: food.name,
          isCorrect: true, // Default to correct
          accuracyRating: 4, // Default to good rating
        })),
      );
      setCurrentFoodIndex(0);
    }
  }, [recognizedFoods]);

  const updateFeedback = (index: number, updates: Partial<FoodFeedback>) => {
    setFeedback((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item)),
    );
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await onSubmitFeedback(feedback);

      Alert.alert(
        "🙏 Thank You!",
        "Your feedback helps improve our food recognition accuracy for everyone!",
        [{ text: "You're Welcome!" }],
      );

      onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToPrevious = () => {
    setCurrentFoodIndex((prev) => prev - 1);
  };

  const goToNext = () => {
    setCurrentFoodIndex((prev) => prev + 1);
  };

  const currentFood = recognizedFoods[currentFoodIndex];
  const currentFeedback = feedback[currentFoodIndex];

  return {
    feedback,
    isSubmitting,
    currentFoodIndex,
    currentFood,
    currentFeedback,
    updateFeedback,
    handleSubmit,
    goToPrevious,
    goToNext,
  };
};
