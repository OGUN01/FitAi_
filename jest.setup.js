// Jest setup file for React Native testing

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

// Mock react-native-reanimated
jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.default.call = () => {};
  return Reanimated;
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
