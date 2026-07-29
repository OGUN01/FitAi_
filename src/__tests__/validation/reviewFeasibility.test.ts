/**
 * Review-tab feasibility engine — regression tests for the 23-scenario audit
 * (workflow wf_317a154d, July 2026).
 *
 * Each test pins a behavior that was previously broken and is now fixed.
 * Scenario IDs (S05, S09, …) match the audit report so a failure points at
 * the exact edge case.
 */

import { ValidationEngine } from "../../services/validation/core";
import { calculateSmartAlternatives } from "../../services/validation/smartAlternatives";
import { MetabolicCalculations } from "../../utils/healthCalculations";
import { MetabolicCalculations as DirectoryMetabolic } from "../../utils/healthCalculations/metabolic";
import type {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
} from "../../types/onboarding";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const basePersonal = (over: Record<string, unknown> = {}) =>
  ({
    full_name: "Test User",
    age: 30,
    gender: "male",
    country: "India",
    state: "MH",
    wake_time: "07:00",
    sleep_time: "23:00", // 8h
    ...over,
  }) as unknown as PersonalInfoData;

const baseDiet = (over: Record<string, unknown> = {}) =>
  ({
    diet_type: "balanced",
    breakfast_enabled: true,
    lunch_enabled: true,
    dinner_enabled: true,
    snacks_enabled: true,
    drinks_alcohol: false,
    smokes_tobacco: false,
    allergies: [],
    ...over,
  }) as unknown as DietPreferencesData;

const baseBody = (over: Record<string, unknown> = {}) =>
  ({
    current_weight_kg: 80,
    target_weight_kg: 70,
    height_cm: 175,
    target_timeline_weeks: 14,
    medical_conditions: [],
    medications: [],
    physical_limitations: [],
    pregnancy_status: false,
    breastfeeding_status: false,
    ...over,
  }) as unknown as BodyAnalysisData;

const baseWorkout = (over: Record<string, unknown> = {}) =>
  ({
    workout_frequency_per_week: 3,
    time_preference: 45,
    intensity: "beginner",
    activity_level: "moderate",
    workout_types: ["strength"],
    primary_goals: ["weight-loss"],
    location: "gym",
    equipment: [],
    workout_experience_years: 1,
    can_do_pushups: 10,
    can_run_minutes: 10,
    ...over,
  }) as unknown as WorkoutPreferencesData;

const codes = (list: Array<{ code?: string }>) => list.map((x) => x.code);

// ---------------------------------------------------------------------------
// S10/S11/S12 — gain-side cap honesty
// ---------------------------------------------------------------------------

describe("S10/S11/S12: gain surplus cap", () => {
  const body = baseBody({
    current_weight_kg: 80,
    target_weight_kg: 90,
    target_timeline_weeks: 10,
  });
  const workout = baseWorkout({ weekly_weight_loss_goal: 1.0, primary_goals: ["weight-gain"] });

  const result = ValidationEngine.validateUserPlan(
    basePersonal(),
    baseDiet(),
    body,
    workout,
  );

  it("caps the surplus and emits SURPLUS_LIMITED_FOR_SAFETY", () => {
    expect(codes(result.warnings)).toContain("SURPLUS_LIMITED_FOR_SAFETY");
  });

  it("wasRateCapped is true so the UI shows the pace-reduced callout", () => {
    expect(result.calculatedMetrics.wasRateCapped).toBe(true);
  });

  it("delivered rate is below the requested 1.0 kg/wk and timeline is recomputed", () => {
    expect(result.calculatedMetrics.originalWeeklyRate).toBeCloseTo(1.0, 2);
    expect(result.calculatedMetrics.weeklyRate).toBeLessThan(0.5);
    // 10 kg at the delivered capped rate must take longer than the stored 10 weeks
    expect(result.calculatedMetrics.timeline).toBeGreaterThan(10);
  });

  it("does NOT fire EXCESSIVE_GAIN_RATE against the requested rate", () => {
    // Warning must evaluate the DELIVERED (capped) rate, not the 1.0 request.
    expect(codes(result.warnings)).not.toContain("EXCESSIVE_GAIN_RATE");
  });
});

// ---------------------------------------------------------------------------
// S13/S14 — maintenance recomp is honored, stale goals can't false-flag
// ---------------------------------------------------------------------------

describe("S13/S14: maintenance branch honors the BODY RECOMP card", () => {
  it("delivers the mild deficit the recomp card promises (stored goal > 0)", () => {
    const result = ValidationEngine.validateUserPlan(
      basePersonal(),
      baseDiet(),
      baseBody({ current_weight_kg: 70, target_weight_kg: 70, target_timeline_weeks: 0 }),
      baseWorkout({ weekly_weight_loss_goal: 0.18, primary_goals: ["maintenance"] }),
    );
    const { tdee, targetCalories, weeklyRate } = result.calculatedMetrics;
    expect(targetCalories).toBeLessThan(tdee);
    expect(targetCalories).toBeGreaterThanOrEqual(tdee - 210); // ~200 kcal deficit
    expect(weeklyRate).toBeGreaterThan(0.1);
    expect(weeklyRate).toBeLessThan(0.25);
  });

  it("exact maintenance (no card selected) delivers exactly TDEE", () => {
    const result = ValidationEngine.validateUserPlan(
      basePersonal(),
      baseDiet(),
      baseBody({ current_weight_kg: 70, target_weight_kg: 70, target_timeline_weeks: 12 }),
      baseWorkout({ weekly_weight_loss_goal: 0, primary_goals: ["maintenance"] }),
    );
    expect(result.calculatedMetrics.targetCalories).toBe(result.calculatedMetrics.tdee);
    expect(result.calculatedMetrics.weeklyRate).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// S19 — pregnancy / breastfeeding
// ---------------------------------------------------------------------------

describe("S19: pregnancy energy needs", () => {
  it("maintenance + pregnancy T2 delivers TDEE + 340 (ACOG)", () => {
    const result = ValidationEngine.validateUserPlan(
      basePersonal({ gender: "female", age: 28 }),
      baseDiet(),
      baseBody({
        current_weight_kg: 65,
        target_weight_kg: 65,
        height_cm: 165,
        target_timeline_weeks: 12,
        pregnancy_status: true,
        pregnancy_trimester: 2,
      }),
      baseWorkout({ primary_goals: ["maintenance"], weekly_weight_loss_goal: 0 }),
    );
    expect(result.calculatedMetrics.targetCalories).toBeGreaterThanOrEqual(
      result.calculatedMetrics.tdee + 330,
    );
    expect(result.calculatedMetrics.targetCalories).toBeLessThanOrEqual(
      result.calculatedMetrics.tdee + 350,
    );
  });

  it("pregnancy bonus overrides a stored recomp deficit", () => {
    const result = ValidationEngine.validateUserPlan(
      basePersonal({ gender: "female", age: 28 }),
      baseDiet(),
      baseBody({
        current_weight_kg: 65,
        target_weight_kg: 65,
        height_cm: 165,
        target_timeline_weeks: 0,
        pregnancy_status: true,
        pregnancy_trimester: 3,
      }),
      baseWorkout({ primary_goals: ["maintenance"], weekly_weight_loss_goal: 0.18 }),
    );
    expect(result.calculatedMetrics.targetCalories).toBeGreaterThanOrEqual(
      result.calculatedMetrics.tdee + 440,
    );
  });

  it("loss goal while breastfeeding is BLOCKED", () => {
    const result = ValidationEngine.validateUserPlan(
      basePersonal({ gender: "female", age: 28 }),
      baseDiet(),
      baseBody({
        current_weight_kg: 75,
        target_weight_kg: 65,
        height_cm: 165,
        target_timeline_weeks: 20,
        breastfeeding_status: true,
      }),
      baseWorkout({ weekly_weight_loss_goal: 0.5 }),
    );
    expect(codes(result.errors)).toContain("UNSAFE_PREGNANCY_BREASTFEEDING");
    expect(result.canProceed).toBe(false);
  });

  it("deficit pace cards are suppressed for pregnancy", () => {
    const bmr = 1400;
    const tdee = 1800;
    const alts = calculateSmartAlternatives(
      0.5, bmr, tdee, 65, 75, "female", 3, "beginner", 45,
      { pregnancyOrBreastfeeding: true, pregnancyBonusPerDay: 500 },
    );
    // No card may promise calories below TDEE
    for (const a of alts.alternatives) {
      expect(a.dailyCalories).toBeGreaterThanOrEqual(tdee);
    }
  });
});

// ---------------------------------------------------------------------------
// S20 — essential body-fat block uses the resolved (AI) value
// ---------------------------------------------------------------------------

describe("S20: essential body-fat block", () => {
  it("blocks loss for an AI-estimated 4.5% BF male with no manual entry", () => {
    const result = ValidationEngine.validateUserPlan(
      basePersonal({ gender: "male" }),
      baseDiet(),
      baseBody({
        current_weight_kg: 75,
        target_weight_kg: 70,
        body_fat_percentage: undefined,
        ai_estimated_body_fat: 4.5,
        ai_confidence_score: 80,
      }),
      baseWorkout({ weekly_weight_loss_goal: 0.5 }),
    );
    expect(codes(result.errors)).toContain("AT_ESSENTIAL_BODY_FAT");
  });
});

// ---------------------------------------------------------------------------
// S21 — gain-side BMI ceiling + underweight band
// ---------------------------------------------------------------------------

describe("S21: BMI target boundaries", () => {
  it("blocks a gain target with BMI >= 40", () => {
    const result = ValidationEngine.validateUserPlan(
      basePersonal(),
      baseDiet(),
      baseBody({ current_weight_kg: 60, target_weight_kg: 150, height_cm: 175 }),
      baseWorkout({ primary_goals: ["weight-gain"], weekly_weight_loss_goal: 0.3 }),
    );
    expect(codes(result.errors)).toContain("TARGET_BMI_EXTREME");
  });

  it("warns (not blocks) for an underweight-band loss target (BMI 17.5–18.5)", () => {
    const result = ValidationEngine.validateUserPlan(
      basePersonal(),
      baseDiet(),
      baseBody({
        current_weight_kg: 60,
        target_weight_kg: 55.2, // BMI ~18.0 at 175 cm
        height_cm: 175,
        target_timeline_weeks: 10,
      }),
      baseWorkout({ weekly_weight_loss_goal: 0.5 }),
    );
    expect(codes(result.warnings)).toContain("TARGET_BMI_UNDERWEIGHT_BAND");
    expect(codes(result.errors)).not.toContain("TARGET_BMI_UNDERWEIGHT");
  });
});

// ---------------------------------------------------------------------------
// S09 — boost cards suppress the zero-exercise warning
// ---------------------------------------------------------------------------

describe("S09: boost cardio coherence", () => {
  const lossBody = baseBody({ current_weight_kg: 90, target_weight_kg: 80, target_timeline_weeks: 20 });

  it("no NO_EXERCISE_PLANNED warning when a boost card is selected", () => {
    const result = ValidationEngine.validateUserPlan(
      basePersonal(),
      baseDiet(),
      lossBody,
      baseWorkout({
        workout_frequency_per_week: 0,
        boost_extra_cardio_minutes: 30,
        weekly_weight_loss_goal: 0.48,
      }),
    );
    expect(codes(result.warnings)).not.toContain("NO_EXERCISE_PLANNED");
  });

  it("NO_EXERCISE_PLANNED fires without a boost card", () => {
    const result = ValidationEngine.validateUserPlan(
      basePersonal(),
      baseDiet(),
      lossBody,
      baseWorkout({
        workout_frequency_per_week: 0,
        boost_extra_cardio_minutes: 0,
        weekly_weight_loss_goal: 0.3,
        activity_level: "light",
      }),
    );
    expect(codes(result.warnings)).toContain("NO_EXERCISE_PLANNED");
  });
});

// ---------------------------------------------------------------------------
// S23 — warnings are not hidden behind errors
// ---------------------------------------------------------------------------

describe("S23: warnings render alongside blocking errors", () => {
  it("sleep + zero-exercise warnings fire even with NO_MEALS_ENABLED error", () => {
    const result = ValidationEngine.validateUserPlan(
      basePersonal({ wake_time: "07:00", sleep_time: "03:00" }), // 4h
      baseDiet({
        breakfast_enabled: false,
        lunch_enabled: false,
        dinner_enabled: false,
        snacks_enabled: false,
      }),
      baseBody({ current_weight_kg: 100, target_weight_kg: 95, target_timeline_weeks: 20 }),
      baseWorkout({
        workout_frequency_per_week: 0,
        activity_level: "light",
        weekly_weight_loss_goal: 0.4,
      }),
    );
    expect(codes(result.errors)).toContain("NO_MEALS_ENABLED");
    expect(codes(result.warnings)).toContain("INSUFFICIENT_SLEEP");
    expect(codes(result.warnings)).toContain("NO_EXERCISE_PLANNED");
  });
});

// ---------------------------------------------------------------------------
// S18 — teen conservative deficit cap
// ---------------------------------------------------------------------------

describe("S18: teen (under-18) conservative deficit cap", () => {
  it("a 16-year-old's deficit is capped at the conservative 15% with clear reason", () => {
    const result = ValidationEngine.validateUserPlan(
      basePersonal({ age: 16 }),
      baseDiet(),
      baseBody({ current_weight_kg: 70, target_weight_kg: 60, height_cm: 170, target_timeline_weeks: 10 }),
      baseWorkout({
        weekly_weight_loss_goal: 1.0,
        activity_level: "sedentary",
        workout_frequency_per_week: 0,
      }),
    );
    const limited = result.warnings.find((w) => w.code === "DEFICIT_LIMITED_FOR_SAFETY");
    expect(limited).toBeDefined();
    expect(limited?.message).toContain("age under 18");
  });
});

// ---------------------------------------------------------------------------
// S23 — DEFICIT_LIMITED message reports the REAL enforced deficit
// ---------------------------------------------------------------------------

describe("S23: honest deficit percentage in cap message", () => {
  it("reports the BMR-floor-enforced percent, not the nominal 20% cap", () => {
    // sedentary 80kg/175cm/30M: tdee ≈ bmr×1.2 → 0.8×tdee < bmr → floor binds
    const result = ValidationEngine.validateUserPlan(
      basePersonal({ age: 30, gender: "male" }),
      baseDiet(),
      baseBody({ current_weight_kg: 80, target_weight_kg: 70, height_cm: 175, target_timeline_weeks: 10 }),
      baseWorkout({
        weekly_weight_loss_goal: 1.0,
        activity_level: "sedentary",
        workout_frequency_per_week: 0,
      }),
    );
    const limited = result.warnings.find((w) => w.code === "DEFICIT_LIMITED_FOR_SAFETY");
    expect(limited).toBeDefined();
    // The message must state the deficit ACTUALLY enforced after the BMR floor,
    // not the nominal 20% cap the limit was configured with.
    const { tdee, targetCalories } = result.calculatedMetrics;
    const realPercent = Math.round(((tdee - targetCalories) / tdee) * 100);
    expect(targetCalories).toBe(result.calculatedMetrics.bmr); // floor bound
    expect(limited?.message).toContain(`to ${realPercent}%`);
    expect(realPercent).toBeLessThan(20); // proves the floor, not the cap, bound
    expect(limited?.message).not.toContain("to 20%");
  });
});

// ---------------------------------------------------------------------------
// S05/S12/S15 — card-engine parity: no selectable card violates a floor or limit
// ---------------------------------------------------------------------------

describe("S05/S12/S15: pace cards never offer what the engine blocks", () => {
  const matrix: Array<[number, number, number, number, number, "male" | "female"]> = [
    // [requestedRate, bmr, tdee, currentWeight, targetWeight, gender]
    [2.5, 1818, 3918, 80, 70, "male"],     // over-limit request + huge TDEE-BMR gap
    [0.4, 1108, 1330, 45, 41, "female"],   // tiny TDEE trap — everything sub-floor
    [1.0, 1749, 2099, 80, 70, "male"],     // normal sedentary
    [0.8, 2000, 3200, 120, 100, "male"],   // obese user
    [0.3, 1500, 1650, 60, 57, "female"],   // tiny gap — comfortable inversion zone
  ];

  it.each(matrix)(
    "request=%s bmr=%s tdee=%s %skg→%skg (%s)",
    (req, bmr, tdee, cur, tgt, gender) => {
      const hardLimit = cur * 0.015;
      const floor = gender === "female" ? 1200 : 1500;
      const alts = calculateSmartAlternatives(req, bmr, tdee, cur, tgt, gender, 3, "beginner", 45);

      // INVARIANT 1: every selectable diet-only card respects the calorie floor…
      // (boost cards display eating at BMR, which the engine floors legally)
      for (const a of alts.alternatives) {
        if (!a.isBlocked && !a.requiresExercise) {
          expect(a.dailyCalories).toBeGreaterThanOrEqual(floor);
        }
      }

      // INVARIANT 2: every selectable loss card respects the 1.5%/wk hard limit
      if (alts.goalMode === "loss") {
        for (const a of alts.alternatives) {
          if (!a.isBlocked) {
            expect(a.weeklyRate).toBeLessThanOrEqual(hardLimit + 1e-9);
          }
        }
      }

      // INVARIANT 3: COMFORTABLE never exceeds AT YOUR BMR
      const atBmr = alts.alternatives.find((a) => a.id === "at_bmr");
      const comfortable = alts.alternatives.find((a) => a.id === "comfortable");
      if (atBmr && comfortable) {
        expect(comfortable.weeklyRate).toBeLessThanOrEqual(atBmr.weeklyRate + 1e-9);
      }

      // INVARIANT 4: no duplicate diet-card rates (dedupe after clamping)
      const dietRates = alts.alternatives
        .filter((a) => !a.requiresExercise && !a.isUserOriginal)
        .map((a) => Math.round(a.weeklyRate * 100));
      expect(new Set(dietRates).size).toBe(dietRates.length);

      // INVARIANT 5: gain cards match the engine's surplus cap exactly
      if (alts.goalMode === "gain") {
        const engine = ValidationEngine.validateUserPlan(
          basePersonal({ gender }),
          baseDiet(),
          baseBody({ current_weight_kg: cur, target_weight_kg: tgt }),
          baseWorkout({ weekly_weight_loss_goal: req, primary_goals: ["weight-gain"] }),
        );
        const userOriginal = alts.alternatives.find((a) => a.isUserOriginal);
        if (userOriginal) {
          expect(userOriginal.weeklyRate).toBeCloseTo(engine.calculatedMetrics.weeklyRate, 2);
        }
      }
    },
  );
});

// ---------------------------------------------------------------------------
// S05 — the "too fast" card badge is wired to the engine's limit
// ---------------------------------------------------------------------------

describe("S05: over-limit cards are marked unselectable at the card level", () => {
  it("an over-limit KEEP MY GOAL card is blocked with a rate reason", () => {
    const alts = calculateSmartAlternatives(2.5, 1818, 3918, 80, 70, "male", 3, "beginner", 45);
    const keepMyGoal = alts.alternatives.find((a) => a.isUserOriginal);
    expect(keepMyGoal?.isBlocked).toBe(true);
    expect(keepMyGoal?.blockReason).toContain("Rate above safe limit");
  });

  it("boost cards are blocked when their rate exceeds the hard limit", () => {
    // Tiny BMR deficit can't produce an over-limit boost; giant one can.
    const alts = calculateSmartAlternatives(1.0, 1500, 4000, 90, 80, "male", 3, "intermediate", 45);
    const boosts = alts.alternatives.filter((a) => a.requiresExercise);
    expect(boosts.length).toBeGreaterThan(0);
    const limit = 90 * 0.015;
    for (const b of boosts) {
      if (b.weeklyRate > limit) {
        expect(b.isBlocked).toBe(true);
      }
    }
  });

  it("boost cards are blocked when BMR is below the absolute floor (tiny users)", () => {
    const alts = calculateSmartAlternatives(0.4, 1108, 1330, 45, 41, "female", 3, "beginner", 45);
    const boosts = alts.alternatives.filter((a) => a.requiresExercise);
    for (const b of boosts) {
      expect(b.isBlocked).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Metabolic age — teens no longer collapse to exactly 18
// ---------------------------------------------------------------------------

describe("S18: teen metabolic age", () => {
  it("a 16-year-old gets a teen reference band, not the 18 floor — both engines", () => {
    // Directory implementation (review-tab SSOT)
    const bmr = DirectoryMetabolic.calculateBMR(60, 170, 16, "male"); // 1587.5
    const age = DirectoryMetabolic.calculateMetabolicAge(bmr, 16, "male");
    expect(Number.isFinite(age)).toBe(true);
    // Low BMR vs the 1750 teen reference → metabolically OLDER than 16.
    // Previously: no bracket → −Infinity → every teen got exactly 18.
    expect(age).toBe(21);

    // Legacy facade (used elsewhere in the app) must now agree.
    const facadeAge = MetabolicCalculations.calculateMetabolicAge(bmr, 16, "male");
    expect(facadeAge).toBe(age);
  });
});
