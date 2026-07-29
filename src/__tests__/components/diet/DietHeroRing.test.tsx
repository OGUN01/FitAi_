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
}));

import { DietHeroRing } from "@/components/diet/DietHeroRing";

describe("DietHeroRing", () => {
  it("renders kcal remaining when under target", () => {
    const view = render(<DietHeroRing consumed={450} target={1856} />);
    // AnimatedNumber renders the final value as accessible label ("1406")
    // and as children text.
    expect(view.getByText("kcal left")).toBeTruthy();
    expect(view.getByText("of 1856 kcal")).toBeTruthy();
    expect(view.getByLabelText("1406")).toBeTruthy();
  });

  it('renders the zero-target / "Set a goal" state', () => {
    const view = render(<DietHeroRing consumed={0} target={0} />);
    expect(view.getByText("Set a goal")).toBeTruthy();
    expect(view.getByText("—")).toBeTruthy();
    expect(view.queryByText("kcal left")).toBeNull();
  });

  it("renders the overflow state when consumed exceeds target", () => {
    const view = render(<DietHeroRing consumed={2100} target={1856} />);
    expect(view.getByText("over target")).toBeTruthy();
    expect(view.getByText("of 1856 kcal")).toBeTruthy();
    // Overflow value = 244, prefixed with "+".
    expect(view.getByLabelText("+244")).toBeTruthy();
    expect(view.queryByText("kcal left")).toBeNull();
  });
});
