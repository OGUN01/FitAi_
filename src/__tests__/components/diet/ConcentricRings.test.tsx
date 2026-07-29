import React from "react";
import { render } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/utils/responsive", () => ({
  rf: (v: number) => v,
  rw: (v: number) => v,
  rp: (v: number) => v,
  rh: (v: number) => v,
  rbr: (v: number) => v,
}));

jest.mock("@/utils/haptics", () => ({
  haptics: { celebration: jest.fn() },
}));

import { ConcentricRings } from "@/components/diet/ConcentricRings";

describe("ConcentricRings", () => {
  it("renders kcal remaining when under target", () => {
    const view = render(
      <ConcentricRings
        calories={{ current: 1200, target: 2000 }}
        protein={{ current: 60, target: 150 }}
        carbs={{ current: 100, target: 250 }}
        fat={{ current: 20, target: 60 }}
      />,
    );
    expect(view.getByText("800")).toBeTruthy();
    expect(view.getByText("kcal left")).toBeTruthy();
    expect(view.getByText("of 2000 kcal")).toBeTruthy();
  });

  it("renders overflow state when consumed exceeds target", () => {
    const view = render(
      <ConcentricRings
        calories={{ current: 2200, target: 2000 }}
        protein={{ current: 60, target: 150 }}
        carbs={{ current: 100, target: 250 }}
        fat={{ current: 20, target: 60 }}
      />,
    );
    expect(view.getByText("+200")).toBeTruthy();
    expect(view.getByText("over target")).toBeTruthy();
  });

  it("renders set-a-goal state when target is zero", () => {
    const view = render(
      <ConcentricRings
        calories={{ current: 0, target: 0 }}
        protein={{ current: 0, target: 0 }}
        carbs={{ current: 0, target: 0 }}
        fat={{ current: 0, target: 0 }}
      />,
    );
    expect(view.getAllByText("—").length).toBeGreaterThanOrEqual(1);
    expect(view.getByText("Set a goal")).toBeTruthy();
  });

  it("renders the macro legend with current/target grams", () => {
    const view = render(
      <ConcentricRings
        calories={{ current: 1200, target: 2000 }}
        protein={{ current: 60, target: 150 }}
        carbs={{ current: 100, target: 250 }}
        fat={{ current: 20, target: 60 }}
      />,
    );
    expect(view.getByText("60/150g")).toBeTruthy();
    expect(view.getByText("100/250g")).toBeTruthy();
    expect(view.getByText("20/60g")).toBeTruthy();
  });
});
