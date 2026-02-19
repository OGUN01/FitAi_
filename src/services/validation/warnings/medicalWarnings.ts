import { ValidationResult } from "../types";

export function warnMedicalConditions(
  conditions: string[],
  aggressive: boolean,
): ValidationResult {
  const HIGH_RISK = [
    "diabetes-type1",
    "diabetes-type2",
    "heart-disease",
    "hypertension",
  ];
  const hasHighRisk = conditions.some((c) => HIGH_RISK.includes(c));

  if (hasHighRisk && aggressive) {
    return {
      status: "WARNING",
      code: "MEDICAL_SUPERVISION",
      message: `Medical condition detected: ${conditions.filter((c) => HIGH_RISK.includes(c)).join(", ")}`,
      recommendations: [
        "🩺 Consult doctor before starting",
        "Using conservative deficit (15% max)",
        "Monitor health markers regularly",
      ],
      canProceed: true,
    };
  }
  return { status: "OK" };
}

export function warnHeartDisease(
  medicalConditions: string[],
  intensity: string,
): ValidationResult {
  if (medicalConditions.includes("heart-disease")) {
    return {
      status: "WARNING",
      code: "HEART_DISEASE_CLEARANCE",
      message:
        "Heart disease detected - medical clearance REQUIRED before starting",
      recommendations: [
        "🩺 Get doctor approval before beginning exercise",
        "May need cardiac stress test",
        "Start with cardiac rehabilitation if available",
        "Monitor heart rate during all sessions",
        "Stop immediately if chest pain, dizziness, or shortness of breath",
        "Focus on moderate-intensity continuous exercise",
        `Intensity capped at: intermediate (max)`,
      ],
      canProceed: true,
    };
  }
  return { status: "OK" };
}

export function warnMedicationEffects(medications: string[]): ValidationResult {
  const METABOLISM_MEDS = [
    "levothyroxine",
    "synthroid",
    "antidepressant",
    "beta-blocker",
    "prednisone",
    "insulin",
  ];
  const hasMetabolismMeds = medications.some((med) =>
    METABOLISM_MEDS.some((known) => med.toLowerCase().includes(known)),
  );

  if (hasMetabolismMeds) {
    return {
      status: "WARNING",
      code: "MEDICATION_EFFECTS",
      message: "Medications may affect metabolism and weight management",
      recommendations: [
        "💊 Discuss plans with prescribing doctor",
        "📊 Dosages may need adjustment as weight changes",
        "⚖️ Some weight changes may be water weight",
        "Using conservative TDEE estimates to account for variability",
      ],
      canProceed: true,
    };
  }
  return { status: "OK" };
}
