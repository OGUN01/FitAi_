import type { Discrepancy, ConsistencyReport } from "./types";

export function generateRecommendations(
  discrepancies: Discrepancy[],
): string[] {
  const recommendations: string[] = [];

  const errors = discrepancies.filter((d) => d.severity === "error");
  const warnings = discrepancies.filter((d) => d.severity === "warning");
  const infos = discrepancies.filter((d) => d.severity === "info");

  if (errors.length > 0) {
    recommendations.push(
      `CRITICAL: Found ${errors.length} critical data mismatches that require immediate attention.`,
    );

    const hasIdMismatch = errors.some(
      (e) => e.field === "id" || e.field === "user_id",
    );
    if (hasIdMismatch) {
      recommendations.push(
        "ID mismatch detected - verify data migration completed correctly.",
      );
    }

    const hasMedicalMismatch = errors.some((e) =>
      [
        "pregnancy_status",
        "breastfeeding_status",
        "medical_conditions",
      ].includes(e.field),
    );
    if (hasMedicalMismatch) {
      recommendations.push(
        "Medical data mismatch - review health-related fields for safety.",
      );
    }
  }

  if (warnings.length > 0) {
    recommendations.push(
      `Found ${warnings.length} data inconsistencies that should be reviewed.`,
    );

    const hasWeightMismatch = warnings.some((e) =>
      ["current_weight_kg", "target_weight_kg", "height_cm"].includes(e.field),
    );
    if (hasWeightMismatch) {
      recommendations.push(
        "Body measurements differ - consider re-syncing user data.",
      );
    }
  }

  if (infos.length > 0 && errors.length === 0 && warnings.length === 0) {
    recommendations.push(
      `Found ${infos.length} minor differences (informational only).`,
    );
  }

  if (discrepancies.length === 0) {
    recommendations.push("All data is consistent between old and new systems.");
  }

  if (errors.length > 0 || warnings.length > 0) {
    recommendations.push(
      "Consider running a full data migration to resolve inconsistencies.",
    );
    recommendations.push(
      "Review the discrepancy details to identify root causes.",
    );
  }

  return recommendations;
}

export function createReport(
  userId: string | null,
  discrepancies: Discrepancy[],
  checks: {
    localStorageMatch: boolean;
    databaseMatch: boolean;
    schemaValid: boolean;
  },
): ConsistencyReport {
  const recommendations = generateRecommendations(discrepancies);

  return {
    timestamp: new Date().toISOString(),
    userId,
    checks,
    discrepancies,
    recommendations,
  };
}

export function getSummary(discrepancies: Discrepancy[]): {
  errors: number;
  warnings: number;
  info: number;
} {
  return {
    errors: discrepancies.filter((d) => d.severity === "error").length,
    warnings: discrepancies.filter((d) => d.severity === "warning").length,
    info: discrepancies.filter((d) => d.severity === "info").length,
  };
}
