import React from "react";
import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";

jest.mock("react-native", () => {
  const React = require("react");

  return {
    View: "View",
    Text: "Text",
    Modal: ({ children }: { children: React.ReactNode }) => children,
    ScrollView: ({ children }: { children: React.ReactNode }) => children,
    KeyboardAvoidingView: ({ children }: { children: React.ReactNode }) =>
      children,
    ActivityIndicator: "ActivityIndicator",
    TextInput: React.forwardRef((props: any, ref) =>
      React.createElement("TextInput", { ...props, ref }, props.children),
    ),
    TouchableOpacity: React.forwardRef((props: any, ref) =>
      React.createElement("TouchableOpacity", { ...props, ref }, props.children),
    ),
    Pressable: React.forwardRef((props: any, ref) =>
      React.createElement("Pressable", { ...props, ref }, props.children),
    ),
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: any) =>
        Array.isArray(style)
          ? Object.assign({}, ...style.filter(Boolean))
          : (style ?? {}),
    },
    Dimensions: {
      get: () => ({ width: 393, height: 852 }),
    },
    Platform: {
      OS: "ios",
    },
    StatusBar: {
      currentHeight: 0,
    },
  };
});

jest.mock("expo-blur", () => ({
  BlurView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/utils/haptics", () => ({
  haptics: {
    light: jest.fn(),
    medium: jest.fn(),
    trigger: jest.fn(),
  },
}));

jest.mock("@/utils/responsive", () => ({
  rf: (value: number) => value,
  rw: (value: number) => Math.round(value * 0.75),
  rh: (value: number) => Math.round(value * 0.75),
  rp: (value: number) => value,
  rs: (value: number) => Math.round(value * 0.75),
  rbr: (value: number) => Math.round(value * 0.75),
}));

jest.mock("@/utils/constants", () => ({
  ResponsiveTheme: {
    colors: {
      text: "#111",
      textSecondary: "#666",
      textMuted: "#777",
      white: "#fff",
      success: "#0a0",
      primary: "#0af",
      primaryDark: "#08c",
      secondary: "#0c8",
      background: "#000",
      backgroundSecondary: "#111",
      backgroundTertiary: "#222",
      glassSurface: "#333",
      glassBorder: "#444",
      glassHighlight: "#555",
      warningTint: "#664400",
      gold: "#fc0",
      overlay: "#111",
      errorLight: "#f55",
      info: "#09f",
      primaryFaded: "#58f",
      primaryLight: "#4bf",
      warningAlt: "#fa0",
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 },
    borderRadius: { sm: 8, md: 12, lg: 16, xl: 20 },
    fontSize: { sm: 12, md: 14, lg: 18, xl: 20, xxl: 24 },
    fontWeight: { semibold: "600", bold: "700", medium: "500" },
  },
}));

jest.mock("@/hooks/adjustment-wizard", () => ({
  useAdjustmentWizard: () => ({
    selectedIndex: 0,
    setSelectedIndex: jest.fn(),
    alternatives: [{ title: "Safer option" }],
    isSaving: false,
    handleSelectAlternative: jest.fn(),
  }),
}));

jest.mock("@/screens/main/analytics/PeriodSelector", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    PeriodSelector: () => React.createElement(View, null),
  };
});

jest.mock("@/services/progressData", () => ({
  progressDataService: {
    createProgressEntry: jest.fn(),
  },
}));

jest.mock("@/stores/profileStore", () => ({
  useProfileStore: {
    getState: () => ({
      updateBodyAnalysis: jest.fn(),
    }),
  },
}));

jest.mock("@/stores/analyticsStore", () => ({
  useAnalyticsStore: {
    getState: () => ({
      weightHistory: [],
      calorieHistory: [],
      setHistoryData: jest.fn(),
    }),
  },
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
  }),
}));

jest.mock("@/hooks/useCalculatedMetrics", () => ({
  invalidateMetricsCache: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock("@/utils/weekUtils", () => ({
  getLocalDateString: jest.fn(() => "2026-03-23"),
}));

jest.mock("@/services/WeightTrackingService", () => ({
  weightTrackingService: {
    setWeight: jest.fn(),
  },
}));

jest.mock("@/utils/units", () => ({
  convertWeight: (value: number) => value,
  toDisplayWeight: (value: number) => value,
}));

jest.mock("@/components/onboarding/wizard/AlternativeCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    AlternativeCard: () => React.createElement(View, null),
  };
});

import { InfoTooltipModal } from "@/components/onboarding/shared/InfoTooltipModal";
import { AdjustmentWizard } from "@/components/onboarding/AdjustmentWizard";
import { BMRInfoModal } from "@/components/onboarding/BMRInfoModal";
import AnalyticsHeader from "@/screens/main/analytics/AnalyticsHeader";
import PaywallHeader from "@/components/subscription/paywall/PaywallHeader";
import { WeightEntryModal } from "@/components/progress/WeightEntryModal";

describe("onboarding and analytics touch targets", () => {
  it("keeps onboarding modal controls at a 44pt floor", () => {
    const tooltip = render(
      <InfoTooltipModal
        visible
        title="Goal info"
        description="Helpful info"
        onClose={jest.fn()}
      />,
    );

    const wizard = render(
      <AdjustmentWizard
        visible
        error={{ message: "Unsafe target" } as any}
        currentData={{
          bmr: 1500,
          tdee: 2200,
          currentWeight: 80,
          targetWeight: 70,
          currentTimeline: 12,
          currentFrequency: 3,
        }}
        onSelectAlternative={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const bmr = render(
      <BMRInfoModal visible onClose={jest.fn()} userBMR={1600} />,
    );

    expect(
      StyleSheet.flatten(tooltip.getByLabelText("Close Goal info").props.style),
    ).toMatchObject({ minWidth: 44, minHeight: 44 });
    expect(
      StyleSheet.flatten(
        wizard.getByLabelText("Close goal adjustment").props.style,
      ),
    ).toMatchObject({ width: 44, height: 44 });
    expect(
      StyleSheet.flatten(
        wizard.getByLabelText("Cancel goal adjustment").props.style,
      ),
    ).toMatchObject({ minHeight: 44 });
    expect(
      StyleSheet.flatten(wizard.getByLabelText("Apply goal adjustment").props.style),
    ).toMatchObject({ minHeight: 44 });
    expect(
      StyleSheet.flatten(bmr.getByLabelText("Close BMR info").props.style),
    ).toMatchObject({ minWidth: 44, minHeight: 44 });
    expect(
      StyleSheet.flatten(bmr.getByLabelText("I understand").props.style),
    ).toMatchObject({ minHeight: 44 });
  });

  it("keeps analytics and paywall chrome at a 44pt floor", () => {
    const analytics = render(
      <AnalyticsHeader
        selectedPeriod={"week" as any}
        onPeriodChange={jest.fn()}
        onProgressPress={jest.fn()}
      />,
    );

    const paywall = render(
      <PaywallHeader
        title="Go Premium"
        description="Unlock everything"
        onClose={jest.fn()}
        trialInfo={{ isEligible: true }}
      />,
    );

    expect(
      StyleSheet.flatten(analytics.getByLabelText("Progress").props.style),
    ).toMatchObject({ width: 44, height: 44 });
    expect(
      StyleSheet.flatten(analytics.getByLabelText("AI Insights").props.style),
    ).toMatchObject({ width: 44, height: 44 });
    expect(
      StyleSheet.flatten(paywall.getByLabelText("Close paywall").props.style),
    ).toMatchObject({ width: 44, height: 44 });
  });

  it("keeps weight entry modal chrome at a 44pt floor", () => {
    const screen = render(
      <WeightEntryModal visible onClose={jest.fn()} onSuccess={jest.fn()} />,
    );

    expect(
      StyleSheet.flatten(screen.getByLabelText("Close weight entry").props.style),
    ).toMatchObject({ minWidth: 44, minHeight: 44 });
    expect(
      StyleSheet.flatten(screen.getByLabelText("Save weight entry").props.style),
    ).toMatchObject({ minHeight: 44 });
  });
});
