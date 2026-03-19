import { convertWeight, toDisplayWeight } from "../../utils/units";

describe("units", () => {
  it("converts kilograms to pounds for display", () => {
    expect(toDisplayWeight(70, "lbs")).toBeCloseTo(154.3234, 4);
  });

  it("keeps kilograms unchanged for metric display", () => {
    expect(toDisplayWeight(70, "kg")).toBe(70);
  });

  it("converts pounds back to kilograms", () => {
    expect(convertWeight(154.3234, "lbs", "kg")).toBeCloseTo(70, 4);
  });

  it("returns null for missing display weights", () => {
    expect(toDisplayWeight(null, "kg")).toBeNull();
    expect(toDisplayWeight(undefined, "lbs")).toBeNull();
  });
});
