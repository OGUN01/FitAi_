import { MealType } from "../../services/foodRecognitionService";
import { ScannedProduct } from "../../services/barcodeService";
import { Meal } from "../../types/ai";

export interface PortionData {
  recognizedFoods: any[];
  imageUri: string;
}

export interface FeedbackData {
  recognizedFoods: any[];
  imageUri: string;
  mealId: string;
}

export type CameraMode = "food" | "progress" | "barcode";

export interface HealthAssessmentBreakdown {
  calories: {
    score: number;
    status: "good" | "moderate" | "high";
    message: string;
  };
  macros: {
    score: number;
    status: "balanced" | "acceptable" | "imbalanced";
    message: string;
  };
  additives: {
    score: number;
    status: "good" | "moderate" | "concerning";
    message: string;
  };
  processing: {
    score: number;
    status: "minimal" | "moderate" | "high";
    message: string;
  };
}

export interface HealthAssessment {
  overallScore: number;
  category: "excellent" | "good" | "moderate" | "poor" | "unhealthy";
  breakdown: HealthAssessmentBreakdown;
  recommendations: string[];
  alerts: string[];
  healthBenefits: string[];
  concerns: string[];
  alternatives?: string[];
}

export interface UseAIMealGenerationReturn {
  aiMeals: Meal[];
  isGeneratingMeal: boolean;
  aiError: string | null;

  showCamera: boolean;
  setShowCamera: (show: boolean) => void;
  cameraMode: CameraMode;
  setCameraMode: (mode: CameraMode) => void;

  scannedProduct: ScannedProduct | null;
  productHealthAssessment: HealthAssessment | null;
  showProductModal: boolean;
  setShowProductModal: (show: boolean) => void;
  isProcessingBarcode: boolean;

  showMealTypeSelector: boolean;
  setShowMealTypeSelector: (show: boolean) => void;
  selectedMealType: MealType;
  setSelectedMealType: (type: MealType) => void;

  portionData: PortionData | null;
  setPortionData: (data: PortionData | null) => void;
  showPortionAdjustment: boolean;
  setShowPortionAdjustment: (show: boolean) => void;

  feedbackData: FeedbackData | null;
  setFeedbackData: (
    data:
      | FeedbackData
      | null
      | ((prev: FeedbackData | null) => FeedbackData | null),
  ) => void;
  showFeedbackModal: boolean;
  setShowFeedbackModal: (show: boolean) => void;

  handleMealTypeSelected: (mealType: MealType) => void;
  handleScanFood: () => void;
  handleScanProduct: () => void;
  handleCameraCapture: (
    imageUri: string,
    setShowGuestSignUp: (show: boolean) => void,
  ) => Promise<void>;
  handleBarcodeScanned: (barcode: string) => Promise<void>;
  handleAddProductToMeal: (
    product: ScannedProduct,
    setShowGuestSignUp: (show: boolean) => void,
  ) => void;
  generateAIMeal: (
    mealType: string,
    setShowGuestSignUp: (show: boolean) => void,
    options?: any,
  ) => Promise<void>;
  generateDailyMealPlan: (
    setShowGuestSignUp: (show: boolean) => void,
  ) => Promise<void>;
  handleFeedbackSubmit: (feedback: any[]) => Promise<void>;
  handlePortionAdjustmentComplete: (adjustedFoods: any[]) => Promise<void>;
}
