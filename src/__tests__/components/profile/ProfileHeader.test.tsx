import React from "react";
import { render } from "@testing-library/react-native";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: {
    create: (styles: unknown) => styles,
  },
  Platform: {
    OS: "ios",
  },
}));

jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: {
    View: "AnimatedView",
  },
  FadeIn: {
    delay: () => ({ duration: () => ({}) }),
  },
  FadeInDown: {
    delay: () => ({ duration: () => ({}) }),
  },
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/theme/gradients", () => ({
  gradientAuroraSpace: ["#111", "#222"],
  toLinearGradientProps: () => ({}),
}));

jest.mock("@/utils/constants", () => ({
  ResponsiveTheme: {
    spacing: { sm: 8, lg: 16 },
    colors: {
      errorLight: "#f55",
      white: "#fff",
      text: "#ddd",
    },
  },
}));

jest.mock("@/utils/responsive", () => ({
  rf: (value: number) => value,
  rp: (value: number) => value,
  rbr: (value: number) => value,
  rw: (value: number) => value,
}));

import { ProfileHeader } from "@/screens/main/profile/ProfileHeader";

describe("ProfileHeader", () => {
  it("does not fabricate a join date when memberSince is missing", () => {
    const screen = render(
      <ProfileHeader
        userName="FitAI Tester"
        memberSince={null}
        onEditPress={jest.fn()}
      />,
    );

    expect(screen.queryByText("Just joined today")).toBeNull();
  });

  it("shows the provided membership copy when available", () => {
    const screen = render(
      <ProfileHeader
        userName="FitAI Tester"
        memberSince="2 weeks"
        onEditPress={jest.fn()}
      />,
    );

    expect(screen.getByText("Member for 2 weeks")).toBeTruthy();
  });
});
