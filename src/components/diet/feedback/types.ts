import { RecognizedFood } from "../../../services/foodRecognitionService";

export interface FoodFeedback {
  foodId: string;
  originalName: string;
  isCorrect: boolean;
  correctName?: string;
  correctPortion?: number;
  correctNutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  userNotes?: string;
  accuracyRating: 1 | 2 | 3 | 4 | 5;
}

export interface FoodRecognitionFeedbackProps {
  visible: boolean;
  recognizedFoods: RecognizedFood[];
  onClose: () => void;
  onSubmitFeedback: (feedback: FoodFeedback[]) => Promise<void>;
  originalImageUri: string;
}
