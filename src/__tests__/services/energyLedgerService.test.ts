/**
 * energyLedgerService — Phase D tests for catchUpLedger.
 *
 * Covers the three behaviors the plan calls out explicitly:
 *   - zero-meal-day had_logged_data=false path (excluded from adherence, never
 *     a 0-kcal deficit day)
 *   - neat_tdee recomputes from CURRENT weight each day (not onboarding weight)
 *   - idempotent windowing from MAX(daily_energy_ledger.date) to yesterday
 *
 * Mocks mirror the existing DataBridge pattern: state lives INSIDE the
 * jest.mock factory, and the returned object exposes handles tests mutate.
 */

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
}));

// NOTE: weekUtils is NOT mocked — the service must round-trip local dates the
// same way production does (dayStr + "T00:00:00" parsed locally, reformatted
// locally). Fixture timestamps use mid-day UTC instants, whose local calendar
// date is stable across all standard host timezones, so tests stay
// deterministic without pinning a tz.

// ---- Store mocks (state internal to the factory) ----
const mockProfile = {
  bodyAnalysis: {
    height_cm: 175,
    current_weight_kg: 100,
    pregnancy_status: false,
    pregnancy_trimester: undefined,
    breastfeeding_status: false,
  },
  personalInfo: { age: 30, gender: "male" },
  workoutPreferences: {
    activity_level: "moderate",
    workout_frequency_per_week: 3,
    time_preference: 45,
    intensity: "intermediate",
    workout_types: ["strength"],
  },
  advancedReview: { daily_calories: 2000, medical_adjustments: [] },
};

jest.mock("../../stores/profileStore", () => ({
  useProfileStore: {
    getState: () => mockProfile,
  },
}));

jest.mock("../../stores/fitnessStore", () => ({
  useFitnessStore: {
    getState: () => ({ getActivePlan: () => null }),
  },
}));

jest.mock("../../services/analyticsData", () => ({
  analyticsDataService: {
    getWeightHistory: jest.fn(),
  },
}));

// ---- Supabase chained builder mock (state internal to the factory) ----
jest.mock("../../services/supabase", () => {
  const state = {
    ledgerMax: [] as any[],
    meals: [] as any[],
    sessions: [] as any[],
    upserted: [] as any[],
    upsertError: null as any,
  };
  const makeBuilder = (table: string) => {
    const b: any = {
      select: jest.fn(() => b),
      eq: jest.fn(() => b),
      gte: jest.fn(() => b),
      order: jest.fn(() => b),
    };
    b.limit = jest.fn(() =>
      Promise.resolve({ data: state.ledgerMax, error: null }),
    );
    b.lt = jest.fn(() => {
      if (table === "meal_logs")
        return Promise.resolve({ data: state.meals, error: null });
      if (table === "workout_sessions")
        return Promise.resolve({ data: state.sessions, error: null });
      return Promise.resolve({ data: [], error: null });
    });
    b.upsert = jest.fn((rows: any[], _opts: any) => {
      state.upserted = rows;
      return Promise.resolve({ error: state.upsertError });
    });
    return b;
  };
  return {
    supabase: {
      from: jest.fn((table: string) => makeBuilder(table)),
      __state: state,
    },
  };
});

import { catchUpLedger } from "../../services/energyLedgerService";
import { computeEnergyBreakdown } from "../../services/energy/energyModel";
import { analyticsDataService } from "../../services/analyticsData";
// The mock exports a __state handle for test control.
const supabaseMock = require("../../services/supabase").supabase;
const sbState: {
  ledgerMax: any[];
  meals: any[];
  sessions: any[];
  upserted: any[];
  upsertError: any;
} = supabaseMock.__state;

const UID = "auth-user-123";

beforeEach(() => {
  // Mid-day UTC "now" — its local calendar date is stable across host timezones.
  jest.useFakeTimers().setSystemTime(new Date("2026-08-30T15:00:00Z"));
  sbState.ledgerMax = [];
  sbState.meals = [];
  sbState.sessions = [];
  sbState.upserted = [];
  sbState.upsertError = null;
  (analyticsDataService.getWeightHistory as jest.Mock).mockResolvedValue([]);
});

afterEach(() => {
  jest.useRealTimers();
});

function rowFor(date: string) {
  return sbState.upserted.find((r) => r.date === date);
}

describe("catchUpLedger", () => {
  it("ignores guest / local user ids", async () => {
    await catchUpLedger("guest-abc");
    await catchUpLedger("local-user");
    expect(sbState.upserted).toHaveLength(0);
  });

  it("walks from MAX(date)+1 to yesterday and is a no-op when up to date", async () => {
    // Yesterday = 2026-08-29. MAX already at 2026-08-29 → start = 2026-08-30 > yesterday.
    sbState.ledgerMax = [{ date: "2026-08-29" }];
    await catchUpLedger(UID);
    expect(sbState.upserted).toHaveLength(0);
  });

  it("zero-meal day sets had_logged_data=false (excluded from adherence, never a 0-kcal deficit day)", async () => {
    // MAX = 2026-08-27 → window = 2026-08-28 .. 2026-08-29.
    sbState.ledgerMax = [{ date: "2026-08-27" }];
    // Meals only on 08-28; 08-29 has none.
    sbState.meals = [
      { total_calories: 500, logged_at: "2026-08-28T08:00:00Z" },
      { total_calories: 600, logged_at: "2026-08-28T13:00:00Z" },
    ];
    (analyticsDataService.getWeightHistory as jest.Mock).mockResolvedValue([
      { date: "2026-08-28", weight: 95 },
    ]);

    await catchUpLedger(UID);

    const day28 = rowFor("2026-08-28");
    const day29 = rowFor("2026-08-29");
    expect(day28).toBeDefined();
    expect(day28.had_logged_data).toBe(true);
    expect(day28.intake_kcal).toBe(1100);

    // The zero-meal day.
    expect(day29).toBeDefined();
    expect(day29.had_logged_data).toBe(false);
    expect(day29.intake_kcal).toBe(0);
    // net_deficit is still computed (energy math for 0 intake), but the flag
    // excludes it from adherence — the point is had_logged_data=false.
    expect(day29.net_deficit).toBeGreaterThan(0);
  });

  it("recomputes neat_tdee from CURRENT weight each day, not onboarding weight", async () => {
    sbState.ledgerMax = [{ date: "2026-08-27" }];
    sbState.meals = [];
    // Weight dropped 100 → 90 across the window.
    (analyticsDataService.getWeightHistory as jest.Mock).mockResolvedValue([
      { date: "2026-08-28", weight: 100 },
      { date: "2026-08-29", weight: 90 },
    ]);

    await catchUpLedger(UID);

    const day28 = rowFor("2026-08-28");
    const day29 = rowFor("2026-08-29");

    // weight_kg column = exact log for the day.
    expect(day28.weight_kg).toBe(100);
    expect(day29.weight_kg).toBe(90);

    // NEAT recomputed from each day's current (forward-filled) weight.
    const energy100 = computeEnergyBreakdown({
      weightKg: 100, heightCm: 175, age: 30, gender: "male",
      activityLevel: "moderate", workoutFrequencyPerWeek: 3,
      timePreference: 45, intensity: "intermediate", workoutTypes: ["strength"],
      plan: null,
    });
    const energy90 = computeEnergyBreakdown({
      weightKg: 90, heightCm: 175, age: 30, gender: "male",
      activityLevel: "moderate", workoutFrequencyPerWeek: 3,
      timePreference: 45, intensity: "intermediate", workoutTypes: ["strength"],
      plan: null,
    });
    expect(day28.neat_tdee).toBe(energy100.neatTdee);
    expect(day29.neat_tdee).toBe(energy90.neatTdee);

    // A 10 kg loss cuts BMR/NEAT — the later day must be lower.
    expect(day29.neat_tdee).toBeLessThan(day28.neat_tdee);
  });

  it("sums burn_kcal from completed workout_sessions attributed by completion date", async () => {
    sbState.ledgerMax = [{ date: "2026-08-27" }];
    sbState.meals = [{ total_calories: 2000, logged_at: "2026-08-28T08:00:00Z" }];
    sbState.sessions = [
      { calories_burned: 300, completed_at: "2026-08-28T18:00:00Z", is_completed: true },
      { calories_burned: 250, completed_at: "2026-08-29T07:00:00Z", is_completed: true },
      // In-progress session (no completed_at) must NOT count.
      { calories_burned: 999, completed_at: null, is_completed: false },
    ];
    (analyticsDataService.getWeightHistory as jest.Mock).mockResolvedValue([
      { date: "2026-08-28", weight: 95 },
    ]);

    await catchUpLedger(UID);

    expect(rowFor("2026-08-28").burn_kcal).toBe(300);
    expect(rowFor("2026-08-29").burn_kcal).toBe(250);
  });

  it("computes net_deficit (positive = deficit) and planned_deficit against the target", async () => {
    sbState.ledgerMax = [{ date: "2026-08-27" }];
    sbState.meals = [{ total_calories: 1800, logged_at: "2026-08-28T08:00:00Z" }];
    sbState.sessions = [
      { calories_burned: 200, completed_at: "2026-08-28T18:00:00Z", is_completed: true },
    ];
    (analyticsDataService.getWeightHistory as jest.Mock).mockResolvedValue([
      { date: "2026-08-28", weight: 95 },
    ]);

    await catchUpLedger(UID);

    const day = rowFor("2026-08-28");
    const energy = computeEnergyBreakdown({
      weightKg: 95, heightCm: 175, age: 30, gender: "male",
      activityLevel: "moderate", workoutFrequencyPerWeek: 3,
      timePreference: 45, intensity: "intermediate", workoutTypes: ["strength"],
      plan: null,
    });
    const expenditure = energy.neatTdee + 0; // no plan
    // net_deficit = expenditure - intake (positive = deficit)
    expect(day.net_deficit).toBe(Math.round(expenditure - 1800));
    // planned_deficit = expenditure - targetCalories(2000)
    expect(day.planned_deficit).toBe(Math.round(expenditure - 2000));
  });

  it("logs and tolerates a supabase upsert error without throwing", async () => {
    sbState.ledgerMax = [{ date: "2026-08-27" }];
    sbState.meals = [{ total_calories: 100, logged_at: "2026-08-28T08:00:00Z" }];
    sbState.upsertError = { message: "RLS denied" };
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(catchUpLedger(UID)).resolves.toBeUndefined();
    spy.mockRestore();
  });

  it("first run with no prior ledger rows is capped to a bounded window", async () => {
    // No MAX → first run. Yesterday = 2026-08-29, start = 90 days back.
    sbState.ledgerMax = [];
    sbState.meals = [];
    await catchUpLedger(UID);
    // Bounded (not unbounded); last row is yesterday.
    expect(sbState.upserted.length).toBeGreaterThan(0);
    expect(sbState.upserted.length).toBeLessThanOrEqual(91);
    expect(sbState.upserted[sbState.upserted.length - 1].date).toBe("2026-08-29");
  });
});
