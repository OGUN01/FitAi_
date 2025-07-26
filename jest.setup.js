// Jest setup file for React Native testing

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
  })),
  useNetInfo: jest.fn(() => ({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
  })),
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  State: {},
  PanGestureHandler: 'PanGestureHandler',
  TapGestureHandler: 'TapGestureHandler',
  TouchableOpacity: 'TouchableOpacity',
  TouchableHighlight: 'TouchableHighlight',
  TouchableWithoutFeedback: 'TouchableWithoutFeedback',
  NativeViewGestureHandler: 'NativeViewGestureHandler',
  Directions: {},
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Expo modules
jest.mock('expo-camera', () => ({
  Camera: {
    useCameraPermissions: () => [null, jest.fn()],
  },
  CameraType: {
    back: 'back',
    front: 'front',
  },
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

jest.mock('expo-sqlite', () => ({
  openDatabase: jest.fn(),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
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
jest.mock('./src/stores', () => ({
  useUserStore: jest.fn(),
  useWorkoutStore: jest.fn(),
  useDietStore: jest.fn(),
  useAppStore: jest.fn(),
}));

// Mock environment variables
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-gemini-key';

// Global test timeout
jest.setTimeout(10000);

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
