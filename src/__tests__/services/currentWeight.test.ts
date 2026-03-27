import {
  getLatestManualWeightEntry,
  resolveCurrentWeight,
} from "../../services/currentWeight";

describe("currentWeight resolver", () => {
  it("prefers the latest manual weight entry over body analysis weight", () => {
    const resolution = resolveCurrentWeight({
      weightHistory: [
        { date: "2026-03-24", weight: 90.2 },
        { date: "2026-03-25", weight: 89.8 },
      ],
      bodyAnalysisWeight: 94,
      bodyAnalysisUpdatedAt: "2026-03-25T07:00:36.898+00:00",
    });

    expect(resolution).toEqual({
      value: 89.8,
      source: "manual_log",
      asOf: "2026-03-25",
    });
  });

  it("falls back to body analysis weight when there is no manual log", () => {
    const resolution = resolveCurrentWeight({
      weightHistory: [],
      bodyAnalysisWeight: 94,
      bodyAnalysisUpdatedAt: "2026-03-25T07:00:36.898+00:00",
    });

    expect(resolution).toEqual({
      value: 94,
      source: "body_analysis",
      asOf: "2026-03-25T07:00:36.898+00:00",
    });
  });

  it("returns the latest valid manual entry", () => {
    expect(
      getLatestManualWeightEntry([
        { date: "2026-03-20", weight: 90.9 },
        { date: "2026-03-22", weight: 90.2 },
        { date: "2026-03-21", weight: 90.6 },
      ]),
    ).toEqual({ date: "2026-03-22", weight: 90.2 });
  });
});
