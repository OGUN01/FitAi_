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
    withSpring: (value) => value,
    withTiming: (value) => value,
    withDelay: (_delay, value) => value,
    withRepeat: (value) => value,
    withSequence: (...values) => values[values.length - 1],
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
jest.mock("react-native-gesture-handler", () => ({
  State: {},
  PanGestureHandler: "PanGestureHandler",
  TapGestureHandler: "TapGestureHandler",
  TouchableOpacity: "TouchableOpacity",
  TouchableHighlight: "TouchableHighlight",
  TouchableWithoutFeedback: "TouchableWithoutFeedback",
  NativeViewGestureHandler: "NativeViewGestureHandler",
  Directions: {},
}));

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

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
jest.mock("@/stores/profileStore", () => ({
  getProfileStoreState: jest.fn(() => ({
    personalInfo: { country: "India" },
  })),
  useProfileStore: jest.fn(() => ({
    personalInfo: { country: "India" },
  })),
}));

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
