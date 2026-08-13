import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

jest.mock("react-native", () => {
  const RealReact = require("react");
  return {
    View: "View",
    Text: "Text",
    TextInput: RealReact.forwardRef((props: any, ref: any) =>
      RealReact.createElement("TextInput", { ...props, ref }),
    ),
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
    ScrollView: ({ children, ...props }: any) =>
      RealReact.createElement("View", props, children),
    SafeAreaView: ({ children, ...props }: any) =>
      RealReact.createElement("View", props, children),
    KeyboardAvoidingView: ({ children, ...props }: any) =>
      RealReact.createElement("View", props, children),
    // Switch is rendered by the Share-to-Community toggle (always in the
    // render path). Without this export it resolves to undefined and the
    // suite fails with "Element type is invalid: got undefined".
    Switch: (props: any) =>
      RealReact.createElement("Switch", props),
    // Modal backs CustomDialog's DialogShell (the discard-changes-confirm
    // dialog, always mounted in the render tree even while closed — see
    // DialogShell's "do NOT early-return on !visible" contract). Without
    // this export DialogShell resolves to undefined and the whole screen
    // fails to render with "Element type is invalid... DialogShell".
    // Render unconditionally like the other passthrough mocks above; no
    // test in this suite opens the dialog, so visibility gating isn't
    // exercised here.
    Modal: (props: any) =>
      RealReact.createElement("Modal", props, props.children),
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

// react-native-reanimated + react-native-gesture-handler are not part of the
// minimal RN mock above. CreateWorkoutScreen renders DraggableRow (which uses
// GestureDetector + Animated.View via useDragToReorder) and the aurora
// primitives (GlassHeader/GlassCard/AnimatedPressable/EmptyState/AuroraSpinner
// all read from reanimated at module-eval/render time). The global
// jest.setup.js mocks cover both, but the local reanimated mock below mirrors
// the established pattern from TemplateLibraryScreen.test.tsx — it provides
// forwardRef passthrough components instead of the global mock's string host
// names, so Animated.View renders children correctly under react-test-renderer.
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
    ScrollView: RealReact.forwardRef((props: any, ref: any) =>
      RealReact.createElement("ScrollView", { ...props, ref }, props.children),
    ),
    createAnimatedComponent: (Comp: any) => Comp,
    FadeIn: chainable,
    FadeInDown: chainable,
    FadeInUp: chainable,
    Easing,
    // Hooks used by Aurora primitives + useDragToReorder at module-eval/render
    // time. All no-ops in the node test env — they return stubs so the
    // components render without driving a real Reanimated UI thread.
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

// GestureDetector wraps a gesture-aware component; in tests just render
// children. Gesture builders are chainable (Gesture.Pan().onUpdate(...).onEnd())
// — the proxy makes any chain resolve to a plain object the mock
// GestureDetector ignores. This mirrors the global gesture-handler mock but
// is local so this suite is self-contained.
jest.mock("react-native-gesture-handler", () => {
  const RealReact = require("react");
  const GestureDetector = ({ children }: { children: RealReact.ReactNode }) =>
    RealReact.createElement(RealReact.Fragment, null, children);
  const passthrough = (name: string) => ({ children, ...props }: any) =>
    RealReact.createElement(name, props, children);
  return {
    __esModule: true,
    State: {},
    GestureHandlerRootView: passthrough("GestureHandlerRootView"),
    GestureDetector,
    PanGestureHandler: passthrough("PanGestureHandler"),
    TapGestureHandler: passthrough("TapGestureHandler"),
    NativeViewGestureHandler: passthrough("NativeViewGestureHandler"),
    Directions: {},
    Gesture: new Proxy(
      {},
      {
        get: () => () =>
          new Proxy(
            function () {
              return {};
            },
            {
              get: (_t: any, prop: string | symbol) =>
                prop === "then" || prop === "catch"
                  ? undefined // not a thenable
                  : () =>
                      new Proxy(function () {}, { get: () => () => ({}) }),
            },
          ),
      },
    ),
  };
});

jest.mock("../../../stores/fitnessStore", () => ({
  useFitnessStore: (selector?: (state: any) => any) => {
    const state = {
      startTemplateSession: jest.fn().mockResolvedValue("session-123"),
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock("../../../services/workoutTemplateService", () => ({
  workoutTemplateService: {
    createTemplate: jest.fn().mockResolvedValue({ id: "tpl-1", name: "Test" }),
  },
  TemplateExercise: {},
}));

jest.mock("../../../services/authUtils", () => ({
  getCurrentUserId: jest.fn(() => "test-user"),
}));

jest.mock("../../../utils/crossPlatformAlert", () => ({
  crossPlatformAlert: jest.fn(),
}));

import CreateWorkoutScreen from "../../../screens/workouts/CreateWorkoutScreen";

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe("CreateWorkoutScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders name input", () => {
    const { getByTestId } = render(
      <CreateWorkoutScreen navigation={mockNavigation} />,
    );
    expect(getByTestId("workout-name-input")).toBeTruthy();
  });

  it("exercise picker shows exercises", () => {
    const { getByTestId } = render(
      <CreateWorkoutScreen navigation={mockNavigation} />,
    );
    expect(getByTestId("exercise-picker-list")).toBeTruthy();
  });

  it('"+" adds exercise to added list', () => {
    const { getByTestId, queryByTestId } = render(
      <CreateWorkoutScreen navigation={mockNavigation} />,
    );

    const addBtn = getByTestId("add-exercise-push_up");
    fireEvent.press(addBtn);

    expect(queryByTestId("remove-exercise-0")).toBeTruthy();
  });

  it("remove button removes exercise", () => {
    const { getByTestId, queryByTestId } = render(
      <CreateWorkoutScreen navigation={mockNavigation} />,
    );

    fireEvent.press(getByTestId("add-exercise-push_up"));
    expect(queryByTestId("remove-exercise-0")).toBeTruthy();

    fireEvent.press(getByTestId("remove-exercise-0"));
    expect(queryByTestId("remove-exercise-0")).toBeNull();
  });

  it('"Save Template" button exists', () => {
    const { getByTestId } = render(
      <CreateWorkoutScreen navigation={mockNavigation} />,
    );
    expect(getByTestId("save-template-button")).toBeTruthy();
  });
});
