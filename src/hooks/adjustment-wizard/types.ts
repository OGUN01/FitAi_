import { Ionicons } from "@expo/vector-icons";
import { ValidationResult } from "../../services/validationEngine";

export interface Alternative {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  newTimeline?: number;
  newTargetWeight?: number;
  newWorkoutFrequency?: number;
  dailyCalories: number;
  weeklyRate: number;
  approach: string;
  pros: string[];
  cons: string[];
  goalType?:
    | "weight-loss"
    | "weight-gain"
    | "muscle-gain"
    | "strength"
    | "endurance"
    | "body-recomp"
    | "flexibility"
    | "general-fitness";
  newProteinTarget?: number;
  newIntensity?: "beginner" | "intermediate" | "advanced";
  newWorkoutTypes?: string[];
  newCardioMinutes?: number;
  newStrengthSessions?: number;
  newMobilitySessions?: number;
}

export interface UseAdjustmentWizardProps {
  visible: boolean;
  error: ValidationResult;
  currentData: {
    bmr: number;
    tdee: number;
    currentWeight: number;
    targetWeight: number;
    currentTimeline: number;
    currentFrequency: number;
    currentIntensity?: string;
    currentProtein?: number;
    currentCardioMinutes?: number;
    currentStrengthSessions?: number;
  };
  primaryGoals?: string[];
  onSelectAlternative: (alternative: Alternative) => void;
  onSaveToDatabase?: () => Promise<boolean>;
  onClose: () => void;
}

export interface CurrentData {
  bmr: number;
  tdee: number;
  currentWeight: number;
  targetWeight: number;
  currentTimeline: number;
  currentFrequency: number;
  currentIntensity?: string;
  currentProtein?: number;
  currentCardioMinutes?: number;
  currentStrengthSessions?: number;
}
