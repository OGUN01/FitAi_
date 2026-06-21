// Jest setup file for React Native testing

// React Native global required by many RN modules in test environment
global.__DEV__ = false;

// Mock nativewind CSS interop to prevent _ReactNativeCSSInterop errors
jest.mock("nativewind", () => ({
  styled: (component) => component,
  StyledComponent: (component) => component,
  useColorScheme: () => ({ colorScheme: "light" }),
}));
jest.mock("react-native-css-interop", () => ({
  cssInterop: jest.fn(),
  remapProps: jest.fn(),
}));

// babel-preset-expo with jsxImportSource: 'nativewind' rewrites all JSX to
// `nativewind/jsx-runtime` -> `react-native-css-interop/jsx-runtime`. Because
// react-native-css-interop has no `exports` map, Jest treats the subpath as a
// distinct module from the root — the root mock above does NOT cover it. The
// real subpath loads the css-interop runtime which calls Appearance.getColorScheme()
// at import time and throws `Cannot read properties of undefined (reading 'getColorScheme')`.
// Mock both jsx runtime subpaths as pass-throughs to React's real jsx runtime so
// components render normally while skipping the css-interop runtime entirely.
jest.mock("react-native-css-interop/jsx-runtime", () => {
  return require("react/jsx-runtime");
});
jest.mock("react-native-css-interop/jsx-dev-runtime", () => {
  return require("react/jsx-dev-runtime");
});

// Mock react-native-svg to prevent Touchable.Mixin errors in test environment
jest.mock("react-native-svg", () => {
  const React = require("react");
  const mockComponent = (name) => {
    const C = (props) => React.createElement(name, props, props.children);
    C.displayName = name;
    return C;
  };
  return {
    __esModule: true,
    default: mockComponent("Svg"),
    Svg: mockComponent("Svg"),
    Rect: mockComponent("Rect"),
    Circle: mockComponent("Circle"),
    Line: mockComponent("Line"),
    Polyline: mockComponent("Polyline"),
    Polygon: mockComponent("Polygon"),
    Path: mockComponent("Path"),
    Text: mockComponent("SvgText"),
    G: mockComponent("G"),
    Defs: mockComponent("Defs"),
    LinearGradient: mockComponent("LinearGradient"),
    RadialGradient: mockComponent("RadialGradient"),
    Stop: mockComponent("Stop"),
    ClipPath: mockComponent("ClipPath"),
    Use: mockComponent("Use"),
    Symbol: mockComponent("Symbol"),
    Mask: mockComponent("Mask"),
  };
});

// Mock react-native-reanimated
jest.mock("react-native-reanimated", () => {
  const createAnimation = () => {
    const animation = {
      delay: () => animation,
      duration: () => animation,
      springify: () => animation,
    };

    return animation;
  };

  const interpolate = (value, inputRange, outputRange) => {
    if (
      !Array.isArray(inputRange) ||
      !Array.isArray(outputRange) ||
      inputRange.length < 2 ||
      outputRange.length < 2
    ) {
      return outputRange?.[0];
    }

    const [inputStart, inputEnd] = inputRange;
    const [outputStart, outputEnd] = outputRange;

    if (
      typeof value !== "number" ||
      typeof inputStart !== "number" ||
      typeof inputEnd !== "number" ||
      typeof outputStart !== "number" ||
      typeof outputEnd !== "number" ||
      inputEnd === inputStart
    ) {
      return outputStart;
    }

    const progress = (value - inputStart) / (inputEnd - inputStart);
    return outputStart + (outputEnd - outputStart) * progress;
  };

  return {
    __esModule: true,
    Easing: {
      linear: (value) => value,
      ease: "ease",
      in: (value) => value,
      out: (value) => value,
      inOut: (value) => value,
      bezier: () => "bezier",
      bounce: "bounce",
      elastic: () => "elastic",
    },
    default: {
      View: "AnimatedView",
      Text: "AnimatedText",
      ScrollView: "AnimatedScrollView",
      createAnimatedComponent: (Component) => Component,
    },
    createAnimatedComponent: (Component) => Component,
    useSharedValue: (value) => ({ value }),
    useAnimatedStyle: (updater) => updater(),
    useAnimatedProps: (updater) => updater(),
    useAnimatedGestureHandler: (handler) => handler,
    withSpring: (value) => value,
    withTiming: (value) => value,
    withDelay: (_delay, value) => value,
    withRepeat: (value) => value,
    withSequence: (...values) => values[values.length - 1],
    cancelAnimation: (value) => { value.value = 0; },
    interpolate,
    interpolateColor: (_value, _inputRange, outputRange) => outputRange?.[0],
    runOnJS: (fn) => fn,
    Extrapolate: {
      CLAMP: "clamp",
    },
    Extrapolation: {
      CLAMP: "clamp",
    },
    FadeIn: createAnimation(),
    FadeInDown: createAnimation(),
    FadeInRight: createAnimation(),
    FadeInUp: createAnimation(),
  };
});

// Mock NetInfo
jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  fetch: jest.fn(() =>
    Promise.resolve({
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
    }),
  ),
  useNetInfo: jest.fn(() => ({
    type: "wifi",
    isConnected: true,
    isInternetReachable: true,
  })),
}));

// Mock react-native-gesture-handler
jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
  // GestureDetector is a HOC that wraps a gesture-aware component; in tests
  // just render children directly. Without this export, components importing
  // { GestureDetector } resolve to undefined → "Element type is invalid".
  const GestureDetector = ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  return {
    State: {},
    PanGestureHandler: "PanGestureHandler",
    TapGestureHandler: "TapGestureHandler",
    TouchableOpacity: "TouchableOpacity",
    TouchableHighlight: "TouchableHighlight",
    TouchableWithoutFeedback: "TouchableWithoutFeedback",
    NativeViewGestureHandler: "NativeViewGestureHandler",
    Directions: {},
    GestureHandlerRootView: ({ children }) =>
      React.createElement("GestureHandlerRootView", null, children),
    GestureDetector,
    // Gesture builders are chainable (e.g. Gesture.LongPress().minDuration(500)
    // .onEnd(...)). Each builder returns an object whose methods return `this`
    // so any chain resolves; the terminal value is a plain object the
    // GestureDetector mock ignores.
    Gesture: new Proxy(
      {},
      {
        get: () => () =>
          new Proxy(
            function () {
              return {};
            },
            {
              get: (_t, prop) =>
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

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Mock expo-font — the real ExpoFontLoader calls requireNativeModule('ExpoFontLoader')
// at import time, which throws in the node test env. @expo/vector-icons imports
// expo-font, so any suite rendering icon components without a local vector-icons
// mock would crash here. Provide a no-op font loader so fonts are treated as
// always loaded.
jest.mock("expo-font", () => ({
  isLoaded: () => true,
  isLoading: () => false,
  getLoadedFonts: () => [],
  loadAsync: jest.fn(() => Promise.resolve()),
  unloadAllAsync: jest.fn(() => Promise.resolve()),
  unloadAsync: jest.fn(() => Promise.resolve()),
  FontDisplay: { AUTO: "auto", BLOCK: "block", SWAP: "swap", FALLBACK: "fallback", OPTIONAL: "optional" },
}));

// Mock @expo/vector-icons globally — the real icon sets call into the
// RNVectorIconsManager native module at import time, which is unavailable in the
// node test env. Most test files mock this locally as { Ionicons: () => null };
// this global mock covers the suites that don't (e.g. AnalyticsScreen,
// CreateWorkoutScreen, MainNavigation). Local jest.mock calls take precedence.
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const NoopIcon = (props) =>
    React.createElement("Icon", props, props.children);
  return new Proxy(
    { Ionicons: NoopIcon },
    { get: () => NoopIcon },
  );
});

// Mock expo-constants — the real module reads NativeModules.EXDevLauncher at
// import time, which is undefined in the node test env. src/config/api.ts reads
// Constants.expoConfig?.extra, so provide a minimal shape. Local mocks override.
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: {} },
    manifest: {},
    releaseChannel: "default",
    name: "FitAI",
    version: "0.0.1",
    sessionId: "test-session",
    installationId: "test-installation",
    isDevice: false,
  },
  ExpoConfig: {},
  ExecutionEnvironment: { Store: "store", Standalone: "standalone" },
}));

// Mock expo-secure-store — the real module calls requireNativeModule('ExpoSecureStore')
// at import time, which throws in the node test env. src/services/supabase.ts uses
// getItemAsync/setItemAsync/deleteItemAsync for session persistence. An in-memory
// map mirrors the real async API without touching native storage.
jest.mock("expo-secure-store", () => {
  const store = new Map();
  return {
    AFTER_FIRST_UNLOCK: 1,
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 2,
    ALWAYS: 3,
    ALWAYS_THIS_DEVICE_ONLY: 4,
    WHEN_UNLOCKED: 5,
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
    WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 7,
    getItemAsync: jest.fn(async (key) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, String(value));
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
    isAvailableAsync: jest.fn(async () => true),
  };
});

// Mock expo-linear-gradient globally so any component importing LinearGradient
// renders without loading expo-modules-core's NativeViewManagerAdapter (which
// requires NativeUnimoduleProxy, unavailable in the node test env). Individual
// test files that need a richer mock can override via their own jest.mock.
jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const LinearGradient = ({ children }) =>
    React.createElement("LinearGradient", null, children);
  return { LinearGradient };
});

// Mock expo-blur globally — the real BlurView calls requireNativeModule
// ('BlurViewModule') at import time, which throws in the node test env.
// GlassView (used by GlassCard / BottomSheet) imports { BlurView } from
// 'expo-blur'. Render a plain View so glass surfaces still mount in tests.
jest.mock("expo-blur", () => {
  const React = require("react");
  const BlurView = ({ children, ...props }) =>
    React.createElement("BlurView", props, children);
  return { BlurView };
});

// Mock react-native-safe-area-context — useSafeAreaInsets is called by
// BottomSheet (and other aurora primitives). Return zero insets so layout
// math is deterministic in tests.
jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const insets = { top: 0, bottom: 0, left: 0, right: 0 };
  const SafeAreaProvider = ({ children }) =>
    React.createElement("SafeAreaProvider", null, children);
  const SafeAreaConsumer = ({ children }) => children(insets);
  return {
    SafeAreaProvider,
    SafeAreaConsumer,
    SafeAreaView: ({ children, ...props }) =>
      React.createElement("SafeAreaView", props, children),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => ({
      x: 0,
      y: 0,
      width: 393,
      height: 852,
    }),
  };
});

// Mock Expo modules
jest.mock("expo-camera", () => {
  const React = require("react");
  return {
    CameraView: React.forwardRef(function CameraView(props, ref) {
      return React.createElement("View", { ...props, ref });
    }),
    useCameraPermissions: jest.fn(() => [
      { granted: true, status: "granted" },
      jest.fn(),
    ]),
    CameraType: {
      back: "back",
      front: "front",
    },
  };
});

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: {
    Images: "Images",
  },
}));

jest.mock("expo-sqlite", () => ({
  openDatabase: jest.fn(),
}));

// Mock navigation
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

// Mock Zustand stores
jest.mock("./src/stores", () => ({
  useUserStore: jest.fn(),
  useWorkoutStore: jest.fn(),
  useDietStore: jest.fn(),
  useAppStore: jest.fn(),
}));

// Mock profileStore
jest.mock("@/stores/profileStore", () => {
  const state = { personalInfo: { country: "India" } };
  const fn = jest.fn(() => state);
  fn.getState = jest.fn(() => state);
  return {
    getProfileStoreState: jest.fn(() => state),
    useProfileStore: fn,
  };
});

// Mock environment variables
process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.EXPO_PUBLIC_GEMINI_API_KEY = "test-gemini-key";

// Global test timeout
jest.setTimeout(10000);

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
