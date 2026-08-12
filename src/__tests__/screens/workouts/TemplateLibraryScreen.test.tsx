import React from "react";
import { render, waitFor } from "@testing-library/react-native";

const mockGetTemplates = jest.fn();
const mockIncrementUsageCount = jest.fn();
const mockStartTemplateSession = jest.fn().mockResolvedValue("session-456");

jest.mock("react-native", () => {
  const RealReact = require("react");
  return {
    View: "View",
    Text: "Text",
    FlatList: ({ data, renderItem, testID, ...rest }: any) =>
      RealReact.createElement(
        "View",
        { testID, ...rest },
        (data || []).map((item: any, index: number) =>
          RealReact.createElement(
            RealReact.Fragment,
            { key: item.id || index },
            renderItem({ item, index }),
          ),
        ),
      ),
    Pressable: RealReact.forwardRef((props: any, ref: any) =>
      RealReact.createElement("Pressable", { ...props, ref }, props.children),
    ),
    TextInput: (props: any) =>
      RealReact.createElement("TextInput", props, props.children),
    ScrollView: ({ children, ...props }: any) =>
      RealReact.createElement("View", props, children),
    SafeAreaView: ({ children, ...props }: any) =>
      RealReact.createElement("View", props, children),
    ActivityIndicator: () => null,
    // BottomSheet (mounted unconditionally via PaywallModal at the screen
    // root, per the bottom-sheet-modal-sweep cycle) uses Modal +
    // KeyboardAvoidingView regardless of `visible` — sheetBody's JSX is
    // constructed on every render, and the native branch always wraps it in
    // <Modal>. Matches the MockModal pattern in DietScreen.barcodeWeakData.test.tsx.
    Modal: ({ visible = true, children, ...props }: any) =>
      visible ? RealReact.createElement("Modal", props, children) : null,
    KeyboardAvoidingView: ({ children, ...props }: any) =>
      RealReact.createElement("KeyboardAvoidingView", props, children),
    StyleSheet: {
      create: (s: any) => s,
      flatten: (style: any) =>
        Array.isArray(style)
          ? Object.assign({}, ...style.filter(Boolean))
          : (style ?? {}),
    },
    Platform: { OS: "ios" },
  };
});

// Phase 7 redesign reads weight from profileStore.bodyAnalysis and gates the
// Community tab via subscriptionStore.isPremium(). Both are mocked so the
// screen renders "My Templates" (default tab) without a live Supabase call.
jest.mock("../../../stores/profileStore", () => ({
  useProfileStore: (selector?: (state: any) => any) => {
    const state = { bodyAnalysis: { current_weight_kg: 75 }, personalInfo: null };
    return selector ? selector(state) : state;
  },
}));

jest.mock("../../../stores/subscriptionStore", () => ({
  useSubscriptionStore: (selector?: (state: any) => any) => {
    const state = { isPremium: () => false };
    return selector ? selector(state) : state;
  },
}));

// PaywallModal (now mounted unconditionally at TemplateLibraryScreen's root)
// reads useAuthStore. The real store uses zustand/persist against
// AsyncStorage, which rehydrates asynchronously after mount and can update
// state after this test's render/cleanup window — mocked out for the same
// live-async-store reason as profileStore/subscriptionStore above.
jest.mock("../../../stores/authStore", () => ({
  useAuthStore: (selector?: (state: any) => any) => {
    const state = { isAuthenticated: false };
    return selector ? selector(state) : state;
  },
}));

// TemplateLibraryScreen now mounts <PaywallModal> at its root and calls
// usePaywall() unconditionally to gate the Community tab. The real hook
// fires a live Supabase fetch on mount — mocked out here for the same
// reason as profileStore/subscriptionStore above (no live Supabase call).
jest.mock("../../../hooks/usePaywall", () => ({
  usePaywall: () => ({
    isLoading: false,
    showPaywall: false,
    paywallReason: null,
    currentPlan: null,
    plans: [],
    plansSource: "fallback",
    planLoadError: null,
    usage: null,
    subscribe: jest.fn(),
    dismiss: jest.fn(),
    reloadPlans: jest.fn(),
    triggerPaywall: jest.fn(),
    planFeaturesByTier: {},
  }),
}));

// expo-linear-gradient + reanimated are not part of the minimal RN mock above.
jest.mock("expo-linear-gradient", () => {
  const RealReact = require("react");
  return {
    LinearGradient: (props: any) =>
      RealReact.createElement("View", props, props.children),
  };
});

jest.mock("react-native-reanimated", () => {
  const RealReact = require("react");
  const chainable = {
    delay: () => chainable,
    duration: () => chainable,
  };
  // Easing is imported by theme/animations.ts at module-eval time. Provide a
  // stub where every method is an identity that returns a function (the real
  // Easing.* calls return easing factories used only inside Reanimated
  // worklets, which never execute in the node test env).
  const easingFn = () => () => 0;
  const Easing = {
    in: easingFn,
    out: easingFn,
    inOut: easingFn,
    ease: easingFn,
    bezier: easingFn,
    bounce: easingFn,
    elastic: easingFn,
    linear: easingFn,
  };
  const Animated = {
    View: RealReact.forwardRef((props: any, ref: any) =>
      RealReact.createElement("View", { ...props, ref }, props.children),
    ),
    Text: RealReact.forwardRef((props: any, ref: any) =>
      RealReact.createElement("Text", { ...props, ref }, props.children),
    ),
    createAnimatedComponent: (Comp: any) => Comp,
    FadeIn: chainable,
    FadeInDown: chainable,
    FadeInUp: chainable,
    Easing,
    // Hooks used by Aurora primitives at module-eval/render time. All no-ops
    // in the node test env — they return stubs so the components render
    // without driving a real Reanimated UI thread.
    useSharedValue: (initial: any) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    useDerivedValue: (fn: any) => ({ value: typeof fn === "function" ? fn() : fn }),
    useAnimatedGestureHandler: () => undefined,
    withSpring: (v: any) => v,
    withTiming: (v: any) => v,
    withRepeat: (v: any) => v,
    withSequence: (...vals: any[]) => vals[0],
    withDelay: (_d: any, v: any) => v,
    runOnJS: (fn: any) => fn,
    interpolate: (_v: any, _input: any, output: any) =>
      Array.isArray(output) ? output[0] : output,
    Extrapolate: { CLAMP: "clamp", EXTEND: "extend", IDENTITY: "identity" },
    cancelAnimation: () => undefined,
  };
  return {
    __esModule: true,
    default: Animated,
    ...Animated,
  };
});

jest.mock("../../../stores/fitnessStore", () => ({
  useFitnessStore: (selector?: (state: any) => any) => {
    const state = { startTemplateSession: mockStartTemplateSession };
    return selector ? selector(state) : state;
  },
}));

jest.mock("../../../services/workoutTemplateService", () => ({
  workoutTemplateService: {
    getTemplates: (...args: any[]) => mockGetTemplates(...args),
    incrementUsageCount: (...args: any[]) => mockIncrementUsageCount(...args),
    duplicateTemplate: jest.fn().mockResolvedValue({}),
    deleteTemplate: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../../services/authUtils", () => ({
  getCurrentUserId: jest.fn(() => "test-user"),
}));

jest.mock("../../../utils/crossPlatformAlert", () => ({
  crossPlatformAlert: jest.fn(),
}));

import TemplateLibraryScreen from "../../../screens/workouts/TemplateLibraryScreen";

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const sampleTemplate = {
  id: "tpl-001",
  userId: "test-user",
  name: "Push Day",
  description: "Chest focus",
  exercises: [
    {
      exerciseId: "push_up",
      name: "Push-Up",
      sets: 3,
      repRange: [8, 15],
      restSeconds: 60,
    },
  ],
  targetMuscleGroups: ["chest", "triceps"],
  estimatedDurationMinutes: 45,
  isPublic: false,
  usageCount: 2,
  createdAt: "2026-03-26T08:00:00.000Z",
  updatedAt: "2026-03-26T08:00:00.000Z",
};

describe("TemplateLibraryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTemplates.mockResolvedValue([]);
  });

  it("renders empty state when no templates", async () => {
    mockGetTemplates.mockResolvedValue([]);

    const { getByTestId } = render(
      <TemplateLibraryScreen navigation={mockNavigation} />,
    );

    await waitFor(() => {
      expect(getByTestId("empty-state")).toBeTruthy();
    });
  });

  it("renders template list when templates exist", async () => {
    mockGetTemplates.mockResolvedValue([sampleTemplate]);

    const { getByTestId } = render(
      <TemplateLibraryScreen navigation={mockNavigation} />,
    );

    await waitFor(() => {
      expect(getByTestId("template-list")).toBeTruthy();
    });
  });

  it("Start button calls incrementUsageCount", async () => {
    mockGetTemplates.mockResolvedValue([sampleTemplate]);
    mockIncrementUsageCount.mockResolvedValue(undefined);

    const { getByTestId } = render(
      <TemplateLibraryScreen navigation={mockNavigation} />,
    );

    await waitFor(() => {
      expect(getByTestId(`start-button-${sampleTemplate.id}`)).toBeTruthy();
    });

    const { fireEvent } = require("@testing-library/react-native");
    fireEvent.press(getByTestId(`start-button-${sampleTemplate.id}`));

    await waitFor(() => {
      expect(mockIncrementUsageCount).toHaveBeenCalledWith(
        sampleTemplate.id,
        sampleTemplate.userId,
      );
    });
  });
});
