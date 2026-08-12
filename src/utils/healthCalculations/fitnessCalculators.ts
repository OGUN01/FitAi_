/**
 * FITNESS CALCULATORS
 *
 * LIVE: HealthScoreCalculatorService.getGrade — the letter-grade rollup of
 * overall_health_score, called from master-engine.ts (HealthCalculationEngine).
 *
 * The heart-rate-zone and VO2-max helpers that used to live in this file
 * (HeartRateCalculatorService, VO2MaxCalculatorService) and the full
 * HealthScoreCalculatorService.calculate() method were removed — they had
 * zero production callers (cardiovascular.ts / health-scoring.ts compute the
 * live numbers directly). See calculators/heartRateCalculator.ts and
 * calculators/waterCalculator.ts for the calculators that ARE still live.
 *
 * Version: 2.0.0
 * Date: 2026-08-12
 */

export class HealthScoreCalculatorService {
  static getGrade(score: number): string {
    if (score >= 90) return "A+";
    if (score >= 85) return "A";
    if (score >= 80) return "A-";
    if (score >= 75) return "B+";
    if (score >= 70) return "B";
    if (score >= 65) return "B-";
    if (score >= 60) return "C+";
    if (score >= 55) return "C";
    if (score >= 50) return "C-";
    if (score >= 45) return "D";
    return "F";
  }
}
