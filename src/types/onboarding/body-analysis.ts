/**
 * BODY ANALYSIS TYPES (Tab 3)
 *
 * Types for body measurements and health analysis (body_analysis table)
 * Part of the onboarding flow - Tab 3
 */

// ============================================================================
// TAB 3: BODY ANALYSIS TYPES (body_analysis table)
// ============================================================================
export interface BodyAnalysisData {
  // Basic measurements (required)
  height_cm: number; // DECIMAL(5,2), 100-250
  current_weight_kg: number; // DECIMAL(5,2), 30-300
  target_weight_kg: number; // DECIMAL(5,2), 30-300
  target_timeline_weeks: number; // INTEGER, 4-104

  // Body composition (optional)
  body_fat_percentage?: number; // DECIMAL(4,2), 3-50
  waist_cm?: number; // DECIMAL(5,2)
  hip_cm?: number; // DECIMAL(5,2)
  chest_cm?: number; // DECIMAL(5,2)

  // Photos (individual URLs instead of JSONB)
  front_photo_url?: string;
  side_photo_url?: string;
  back_photo_url?: string;

  // AI analysis results (RELIABLE ONLY)
  ai_estimated_body_fat?: number; // DECIMAL(4,2)
  ai_body_type?: "ectomorph" | "mesomorph" | "endomorph";
  ai_confidence_score?: number; // INTEGER, 0-100

  // Medical information
  medical_conditions: string[]; // TEXT[]
  medications: string[]; // TEXT[]
  physical_limitations: string[]; // TEXT[]

  // Pregnancy/Breastfeeding status (CRITICAL for safety)
  pregnancy_status: boolean;
  pregnancy_trimester?: 1 | 2 | 3; // Only if pregnancy_status = true
  breastfeeding_status: boolean;

  // NEW: Stress level (affects deficit limits and recovery)
  stress_level?: "low" | "moderate" | "high"; // Optional - can be measured via fitness devices

  // Calculated values (auto-computed)
  bmi?: number; // DECIMAL(4,2)
  bmr?: number; // DECIMAL(7,2)
  ideal_weight_min?: number; // DECIMAL(5,2)
  ideal_weight_max?: number; // DECIMAL(5,2)
  waist_hip_ratio?: number; // DECIMAL(3,2)

  // Legacy JSONB fields (keep for backward compatibility)
  photos?: {
    front?: string;
    back?: string;
    side?: string;
  };
  analysis?: {
    bodyType: string;
    muscleMass: string;
    bodyFat: string;
    fitnessLevel: string;
    recommendations: string[];
  };
}

// Form state for UI components
export interface BodyAnalysisFormState extends BodyAnalysisData {
  // UI-specific fields
  errors: Partial<Record<keyof BodyAnalysisData, string>>;
  is_loading: boolean;
  is_dirty: boolean;
  is_analyzing_photos: boolean;
  photo_upload_progress: Record<"front" | "side" | "back", number>;
}

// Database row type (matching database schema)
export interface BodyAnalysisRow {
  id: string;
  user_id: string;
  height_cm?: number | null;
  current_weight_kg?: number | null;
  target_weight_kg?: number | null;
  target_timeline_weeks?: number | null;
  body_fat_percentage?: number | null;
  waist_cm?: number | null;
  hip_cm?: number | null;
  chest_cm?: number | null;
  front_photo_url?: string | null;
  side_photo_url?: string | null;
  back_photo_url?: string | null;
  ai_estimated_body_fat?: number | null;
  ai_body_type?: "ectomorph" | "mesomorph" | "endomorph" | null;
  ai_confidence_score?: number | null;
  medical_conditions?: string[] | null;
  medications?: string[] | null;
  physical_limitations?: string[] | null;
  pregnancy_status?: boolean | null;
  pregnancy_trimester?: 1 | 2 | 3 | null;
  breastfeeding_status?: boolean | null;
  stress_level?: "low" | "moderate" | "high" | null;
  bmi?: number | null;
  bmr?: number | null;
  ideal_weight_min?: number | null;
  ideal_weight_max?: number | null;
  waist_hip_ratio?: number | null;
  // Legacy JSONB fields
  photos?: string[];
  analysis?: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
}

// Validation rules for body analysis
export const BODY_ANALYSIS_VALIDATION = {
  height_cm: { min: 100, max: 250 },
  current_weight_kg: { min: 30, max: 300 },
  target_weight_kg: { min: 30, max: 300 },
  target_timeline_weeks: { min: 4, max: 104 },
  body_fat_percentage: { min: 3, max: 50 },
  ai_confidence_score: { min: 0, max: 100 },
} as const;
