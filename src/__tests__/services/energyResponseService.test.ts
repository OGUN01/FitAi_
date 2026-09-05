/**
 * energyResponseService — Phase E tests.
 *
 * Covers the behaviors the plan calls out explicitly:
 *   - Adherence counts ONLY had_logged_data days (zero-meal days excluded,
 *     never scored as a hit or a miss)
 *   - The 70% threshold (at/above → no prompt, below → prompt)
 *   - ~0 planned-deficit days are skipped, never divide-by-zero
 *   - Full-14-day-window gate (no prompt before day 14)
 *   - "Don't ask again" suppression for the current plan
 *   - Safety trigger fires at EXACTLY 3 consecutive logged low-intake days
 *   - Unlogged days are skipped by the streak (neither count nor break)
 *   - No re-fire within the same streak (per-streak marker), fresh streak refires
 *   - The safety trigger IGNORES UNDERPERFORMANCE_14D acknowledgments
 *
 * Mocks mirror the energyLedgerService pattern: state lives INSIDE the
 * jest.mock factory, and the returned object exposes a __state handle tests
 * mutate. weekUtils is NOT mocked — fixture dates are plain YYYY-MM-DD strings
 * (ledger DATE column values), so no timezone ambiguity arises.
 */

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
}));

// ---- Store mocks (state internal to the factory) ----
const mockNutritionState = {
  activeDietSource: "ai" as "ai" | "custom",
  weeklyMealPlan: { id: "plan-1", databaseId: null as string | null },
  customWeeklyMealPlan: null as any,
};
const mockFitnessState = {
  getActivePlan: () => null,
};

jest.mock("../../stores/nutritionStore", () => ({
  useNutritionStore: {
    getState: () => mockNutritionState,
  },
}));

jest.mock("../../stores/fitnessStore", () => ({
  useFitnessStore: {
    getState: () => mockFitnessState,
  },
}));

// ---- Supabase chained builder mock (state internal to the factory) ----
jest.mock("../../services/supabase", () => {
  const state = {
    ledgerRows: [] as any[],
    ackRows: [] as any[],
    inserted: [] as any[],
    insertError: null as any,
    ledgerError: null as any,
  };
  const makeBuilder = (table: string) => {
    const b: any = {
      select: jest.fn(() => b),
      eq: jest.fn(() => b),
      gte: jest.fn(() => b),
      lte: jest.fn(() => b),
      order: jest.fn(() => b),
      limit: jest.fn(() => b),
      // Thenable: awaiting the chain resolves per-table fixtures.
      // daily_energy_ledger → ledger rows; plan_acknowledgments → ack rows.
      // ledgerError simulates a Supabase failure on the ledger read.
      then: (onFulfilled: any, onRejected: any) => {
        const payload =
          table === "plan_acknowledgments"
            ? { data: state.ackRows, error: null }
            : { data: state.ledgerRows, error: state.ledgerError };
        return Promise.resolve(payload).then(onFulfilled, onRejected);
      },
      insert: jest.fn((row: any) => {
        state.inserted.push(row);
        return Promise.resolve({ error: state.insertError });
      }),
    };
    return b;
  };
  return {
    supabase: {
      from: jest.fn((table: string) => makeBuilder(table)),
      __state: state,
    },
  };
});

import {
  computeAdherenceSnapshot,
  computeSafetyStreak,
  evaluateAdherence,
  evaluateSafetyCheckIn,
  checkEnergyResponse,
  acknowledgeUnderperformance,
  markSafetyCheckInShown,
  ADHERENCE_THRESHOLD,
} from "../../services/energyResponseService";
import { LEDGER_WINDOWS } from "../../services/energy/constants";
import { getLocalDateString } from "../../utils/weekUtils";

const supabaseMock = require("../../services/supabase").supabase;
const sbState: {
  ledgerRows: any[];
  ackRows: any[];
  inserted: any[];
  insertError: any;
  ledgerError: any;
} = supabaseMock.__state;

const UID = "auth-user-123";

// ---------------------------------------------------------------------------
// FIXTURE HELPERS — ledger rows are plain { date, ... } records. Tests use
// fake timers pinned to 2026-08-30T15:00Z so "yesterday" = 2026-08-29.
// ---------------------------------------------------------------------------
jest.useFakeTimers().setSystemTime(new Date("2026-08-30T15:00:00Z"));

/** Ledger row factory: defaults to a fully-adherent logged day (planned 800,
 *  actual 800 → ratio 1.0). */
function goodDay(date: string): any {
  return {
    date,
    intake_kcal: 1800,
    net_deficit: 500,
    planned_deficit: 500,
    had_logged_data: true,
  };
}

/** Build N consecutive good days ending yesterday (2026-08-29). Dates are
 *  formatted through the app's own getLocalDateString so the fixture strings
 *  always match what the service computes locally (no UTC shifting). */
function goodWindow(days: number): any[] {
  const out: any[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date("2026-08-29T00:00:00");
    d.setDate(d.getDate() - i);
    out.push(goodDay(getLocalDateString(d)));
  }
  return out;
}

function lowDay(date: string, intake = 800): any {
  return {
    date,
    intake_kcal: intake,
    net_deficit: null,
    planned_deficit: 500,
    had_logged_data: true,
  };
}

beforeEach(() => {
  sbState.ledgerRows = [];
  sbState.ackRows = [];
  sbState.inserted = [];
  sbState.insertError = null;
});

// ---------------------------------------------------------------------------
// 14-DAY ADHERENCE
// ---------------------------------------------------------------------------

describe("computeAdherenceSnapshot (pure math)", () => {
  it("counts ONLY had_logged_data days — zero-meal days excluded, never scored as hits", () => {
    // 4 eligible logged days at 100% + 3 unlogged days (excluded) + 1 logged
    // maintenance day (planned ~0, skipped).
    const rows = [
      goodDay("2026-08-20"),
      goodDay("2026-08-21"),
      goodDay("2026-08-22"),
      goodDay("2026-08-23"),
      { date: "2026-08-24", intake_kcal: 0, net_deficit: 9999, planned_deficit: 500, had_logged_data: false }, // excluded
      { date: "2026-08-25", intake_kcal: 0, net_deficit: 9999, planned_deficit: 500, had_logged_data: false }, // excluded
      { date: "2026-08-26", intake_kcal: 0, net_deficit: 9999, planned_deficit: 500, had_logged_data: false }, // excluded
      { date: "2026-08-27", intake_kcal: 2000, net_deficit: 0, planned_deficit: 10, had_logged_data: true }, // maintenance day → skipped
    ];

    const snap = computeAdherenceSnapshot(rows, 8);
    expect(snap.loggedDays).toBe(5); // only the 4 good + 1 maintenance logged
    expect(snap.eligibleDays).toBe(4); // maintenance day excluded
    expect(snap.plannedDeficitTotalKcal).toBe(2000);
    expect(snap.actualDeficitTotalKcal).toBe(2000);
    expect(snap.adherenceRatio).toBe(1);
  });

  it("aggregate ratio is Σactual/Σplanned, weighting big days more than small ones", () => {
    // Day A: planned 900, hit 0 (ratio 0). Day B: planned 100, hit 100 (ratio 1).
    // Mean-of-ratios would be 0.5; the aggregate is 100/1000 = 0.1 — the
    // honest "what fraction of the promised deficit was banked".
    const rows = [
      { date: "2026-08-20", intake_kcal: 1400, net_deficit: 0, planned_deficit: 900, had_logged_data: true },
      { date: "2026-08-21", intake_kcal: 900, net_deficit: 100, planned_deficit: 100, had_logged_data: true },
    ];
    const snap = computeAdherenceSnapshot(rows, 2);
    expect(snap.adherenceRatio).toBeCloseTo(0.1, 5);
expect(snap.eligibleDays).toBe(2);
  });

  it("skips days with ~zero planned deficit instead of dividing by zero", () => {
    const rows = [
      { date: "2026-08-20", intake_kcal: 2000, net_deficit: 0, planned_deficit: 0, had_logged_data: true },
    ];
    const snap = computeAdherenceSnapshot(rows, 1);
    expect(snap.eligibleDays).toBe(0);
    expect(snap.adherenceRatio).toBeNull();
    expect(snap.belowThreshold).toBe(false);
  });

  it("flags belowThreshold only at the 14-day mark (historyDays gate)", () => {
    // 100% shortfall — ratio 0 — but only 10 days of history → gated off.
    const shortRows = [
      { date: "2026-08-20", intake_kcal: 1400, net_deficit: 0, planned_deficit: 900, had_logged_data: true },
    ];
    expect(computeAdherenceSnapshot(shortRows, 10).belowThreshold).toBe(false);

    // Same zero-ratio data with a full 14-day history → fires.
    const fullRows = [
      { date: "2026-08-16", intake_kcal: 1400, net_deficit: 0, planned_deficit: 900, had_logged_data: true },
    ];
    const snap = computeAdherenceSnapshot(fullRows, 14);
    expect(snap.belowThreshold).toBe(true);
  });
});

describe("evaluateAdherence (14-day prompt, threshold + acknowledgment)", () => {
  it("returns null before the 14-day window is complete", async () => {
    // Ledger starts 13 days before yesterday → window incomplete (needs 14).
    sbState.ledgerRows = goodWindow(13);
    const result = await evaluateAdherence(UID);
    expect(result).toBeNull();
  });

  it("fires at the 14-day mark when adherence is below 70%", async () => {
    // 14 days of history; the user banked 60% of the planned deficit.
    const rows = goodWindow(LEDGER_WINDOWS.adherenceCheckDays);
    rows.forEach((r) => {
      r.net_deficit = 300; // planned 500 → 60%
    });
    sbState.ledgerRows = rows;
    const result = await evaluateAdherence(UID);
    expect(result).not.toBeNull();
    expect(result!.adherenceRatio).toBeCloseTo(0.6, 5);
    expect(result!.belowThreshold).toBe(true);
    expect(result!.promisedKg).toBeCloseTo((500 * 14) / 7700, 5);
  });

  it("stays quiet at exactly 70% (threshold is exclusive below)", async () => {
    const rows = goodWindow(14);
    rows.forEach((r) => {
      r.net_deficit = 350; // planned 500 → 70%
    });
    sbState.ledgerRows = rows;
    const result = await evaluateAdherence(UID);
    expect(result).toBeNull();
  });

  it("stays quiet when adherence is high even after 14 days", async () => {
    sbState.ledgerRows = goodWindow(14);
    const result = await evaluateAdherence(UID);
    expect(result).toBeNull();
  });

  it("is suppressed by a Don't-ask-again acknowledgment for the current plan", async () => {
    const rows = goodWindow(14);
    rows.forEach((r) => {
      r.net_deficit = 300;
    });
    sbState.ledgerRows = rows;
    sbState.ackRows = [
      {
        id: "ack-1",
        plan_id: null,
        plan_kind: "diet",
        warning_codes: ["UNDERPERFORMANCE_14D"],
        shown_payload: {},
      },
    ];
    const result = await evaluateAdherence(UID);
    expect(result).toBeNull();
  });

  it("does NOT treat the safety marker as an underperformance acknowledgment", async () => {
    // A LOW_INTAKE_SAFETY_3D marker must not suppress the adherence prompt.
    const rows = goodWindow(14);
    rows.forEach((r) => {
      r.net_deficit = 300;
    });
    sbState.ledgerRows = rows;
    sbState.ackRows = [
      {
        id: "ack-2",
        plan_id: null,
        plan_kind: "diet",
        warning_codes: ["LOW_INTAKE_SAFETY_3D"],
        shown_payload: {},
      },
    ];
    const result = await evaluateAdherence(UID);
    expect(result).not.toBeNull();
  });

  it("ignores acknowledgments with a DIFFERENT plan_id (new plan → asks again)", async () => {
    const rows = goodWindow(14);
    rows.forEach((r) => {
      r.net_deficit = 300;
    });
    sbState.ledgerRows = rows;
    // Give the active diet plan a persisted databaseId, ack a different one.
    mockNutritionState.weeklyMealPlan = {
      id: "plan-1",
      databaseId: "11111111-1111-4111-8111-111111111111",
    };
    sbState.ackRows = [
      {
        id: "ack-3",
        plan_id: "22222222-2222-4222-8222-222222222222",
        plan_kind: "diet",
        warning_codes: ["UNDERPERFORMANCE_14D"],
        shown_payload: {},
      },
    ];
    const result = await evaluateAdherence(UID);
    expect(result).not.toBeNull();
    mockNutritionState.weeklyMealPlan = { id: "plan-1", databaseId: null } as any;
  });

  it("returns null on ledger fetch errors instead of throwing", async () => {
    // The mock's `then` resolves with an error object when ledgerError is set,
    // mirroring a Supabase failure; the service must log + return null.
    sbState.ledgerError = { message: "offline" };
    await expect(evaluateAdherence(UID)).resolves.toBeNull();
    await expect(evaluateSafetyCheckIn(UID)).resolves.toBeNull();
    sbState.ledgerError = null;
  });
});


// ---------------------------------------------------------------------------
// SAFETY TRIGGER — intake < 1000 kcal, 3+ consecutive LOGGED days
// ---------------------------------------------------------------------------

describe("computeSafetyStreak (pure streak math)", () => {
  it("fires at EXACTLY 3 consecutive logged low-intake days", () => {
    const rows = [
      lowDay("2026-08-27"),
      lowDay("2026-08-28"),
      lowDay("2026-08-29"),
    ];
    const streak = computeSafetyStreak(rows);
    expect(streak.qualifies).toBe(true);
    expect(streak.streakLength).toBe(3);
    expect(streak.streakStart).toBe("2026-08-27");
    expect(streak.streakEnd).toBe("2026-08-29");
  });

  it("does not fire at 2 consecutive days", () => {
    const rows = [lowDay("2026-08-28"), lowDay("2026-08-29")];
    expect(computeSafetyStreak(rows).qualifies).toBe(false);
  });

  it("a logged day at exactly 1000 kcal breaks the streak (threshold is < 1000)", () => {
    const rows = [
      lowDay("2026-08-27"),
      lowDay("2026-08-28"),
      { ...lowDay("2026-08-29", 1000) }, // at threshold → NOT low
    ];
    const streak = computeSafetyStreak(rows);
    expect(streak.qualifies).toBe(false);
    // The scan is newest-first and stops at the ≥1000 day: the two low days
    // BEFORE it are not part of the CURRENT (newest-anchored) streak.
    expect(streak.streakLength).toBe(0);
  });

  it("unlogged days neither count nor break the streak", () => {
    const rows = [
      lowDay("2026-08-24"),
      lowDay("2026-08-25"),
      { date: "2026-08-26", intake_kcal: 0, net_deficit: null, planned_deficit: 500, had_logged_data: false },
      lowDay("2026-08-27"),
      lowDay("2026-08-28"),
      lowDay("2026-08-29"),
    ];
    const streak = computeSafetyStreak(rows);
    expect(streak.qualifies).toBe(true);
    expect(streak.streakLength).toBe(5); // the unlogged day skipped, not counted
  });

  it("a day well above the threshold breaks the chain", () => {
    const rows = [
      lowDay("2026-08-25"),
      { ...lowDay("2026-08-26", 2200) }, // breaks the chain
      lowDay("2026-08-27"),
      lowDay("2026-08-28"),
      lowDay("2026-08-29"),
    ];
    const streak = computeSafetyStreak(rows);
    expect(streak.qualifies).toBe(true);
    expect(streak.streakLength).toBe(3); // only the days after the break
    expect(streak.streakStart).toBe("2026-08-27"); // the NEW streak, not 08-25
  });
});

describe("evaluateSafetyCheckIn (always-on trigger + per-streak re-fire guard)", () => {
  it("returns the streak when it qualifies and nothing was marked before", async () => {
    sbState.ledgerRows = [
      lowDay("2026-08-27"),
      lowDay("2026-08-28"),
      lowDay("2026-08-29"),
    ];
    sbState.ackRows = [];
    const result = await evaluateSafetyCheckIn(UID);
    expect(result).not.toBeNull();
    expect(result!.qualifies).toBe(true);
  });

  it("does NOT re-fire within the same streak (marker with streak_end ≥ streakStart)", async () => {
    sbState.ledgerRows = [
      lowDay("2026-08-25"),
      lowDay("2026-08-26"),
      lowDay("2026-08-27"),
      lowDay("2026-08-28"),
      lowDay("2026-08-29"), // streak grew 3 → 5 since the marker
    ];
    sbState.ackRows = [
      {
        id: "mark-1",
        plan_id: null,
        plan_kind: "diet",
        warning_codes: ["LOW_INTAKE_SAFETY_3D"],
        shown_payload: { streak_end: "2026-08-27", streak_length: 3 },
      },
    ];
    const result = await evaluateSafetyCheckIn(UID);
    expect(result).toBeNull();
  });

  it("fires again for a NEW streak after the old one was broken", async () => {
    // Old streak ended 08-20 (marker). Chain broke on 08-21 (2000 kcal), new
    // streak 08-27..29. New streakStart (08-27) > marker (08-20) → fires.
    sbState.ledgerRows = [
      lowDay("2026-08-27"),
      lowDay("2026-08-28"),
      lowDay("2026-08-29"),
      { ...lowDay("2026-08-21", 2000) },
    ];
    sbState.ackRows = [
      {
        id: "mark-2",
        plan_id: null,
        plan_kind: "diet",
        warning_codes: ["LOW_INTAKE_SAFETY_3D"],
        shown_payload: { streak_end: "2026-08-20", streak_length: 3 },
      },
    ];
    const result = await evaluateSafetyCheckIn(UID);
    expect(result).not.toBeNull();
  });

  it("IGNORES UNDERPERFORMANCE_14D acknowledgments (always-on, never suppressed)", async () => {
    sbState.ledgerRows = [
      lowDay("2026-08-27"),
      lowDay("2026-08-28"),
      lowDay("2026-08-29"),
    ];
    sbState.ackRows = [
      {
        id: "ack-4",
        plan_id: null,
        plan_kind: "diet",
        warning_codes: ["UNDERPERFORMANCE_14D"],
        shown_payload: {},
      },
    ];
    const result = await evaluateSafetyCheckIn(UID);
    expect(result).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// COMBINED CHECK + PERSISTENCE
// ---------------------------------------------------------------------------

describe("checkEnergyResponse", () => {
  it("skips guest / local user ids entirely", async () => {
    await expect(checkEnergyResponse("guest-abc")).resolves.toBeNull();
    await expect(checkEnergyResponse("local-user")).resolves.toBeNull();
    await expect(checkEnergyResponse("")).resolves.toBeNull();
  });

  it("prioritizes the safety check-in over the adherence prompt", async () => {
    // Both conditions hold simultaneously: 3 low days AND 14 days of poor
    // adherence. Safety must win.
    const rows = goodWindow(14);
    rows.forEach((r) => {
      r.net_deficit = 300;
    });
    // The last 3 days (27–29) are already in the window; set them low.
    const low = rows.filter((r) => r.date >= "2026-08-27");
    low.forEach((r) => {
      r.intake_kcal = 800;
    });
    sbState.ledgerRows = rows;
    sbState.ackRows = [];

    const result = await checkEnergyResponse(UID);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("safety");
  });

  it("falls through to the adherence prompt when the streak does not qualify", async () => {
    const rows = goodWindow(14);
    rows.forEach((r) => {
      r.net_deficit = 300;
    });
    sbState.ledgerRows = rows;
    sbState.ackRows = [];
    const result = await checkEnergyResponse(UID);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("adherence");
  });

  it("returns null when the ledger has no rows", async () => {
    sbState.ledgerRows = [];
    await expect(checkEnergyResponse(UID)).resolves.toBeNull();
  });
});

describe("persistence writers", () => {
  it("acknowledgeUnderperformance inserts a plan_acknowledgments row with the snapshot", async () => {
    const snap = computeAdherenceSnapshot(
      goodWindow(14).map((r) => ({ ...r, net_deficit: 300 })),
      14,
    );
    await acknowledgeUnderperformance(UID, snap);
    expect(sbState.inserted).toHaveLength(1);
    const row = sbState.inserted[0];
    expect(row.user_id).toBe(UID);
    expect(row.warning_codes).toEqual(["UNDERPERFORMANCE_14D"]);
    expect(row.plan_kind).toBe("diet");
    expect(row.shown_payload.adherence_ratio).toBeCloseTo(0.6, 5);
    expect(row.shown_payload.promised_kg).toBeCloseTo(7000 / 7700, 1);
  });

  it("markSafetyCheckInShown inserts a marker row carrying streak_end", async () => {
    const streak = computeSafetyStreak([
      lowDay("2026-08-27"),
      lowDay("2026-08-28"),
      lowDay("2026-08-29"),
    ]);
    await markSafetyCheckInShown(UID, streak);
    expect(sbState.inserted).toHaveLength(1);
    const row = sbState.inserted[0];
    expect(row.warning_codes).toEqual(["LOW_INTAKE_SAFETY_3D"]);
    expect(row.shown_payload.streak_end).toBe("2026-08-29");
  });

  it("swallows insert errors (offline is non-fatal)", async () => {
    sbState.insertError = { message: "network down" };
    const snap = computeAdherenceSnapshot(goodWindow(14), 14);
    await expect(
      acknowledgeUnderperformance(UID, snap),
    ).resolves.toBeUndefined();
    sbState.insertError = null;
  });
});
