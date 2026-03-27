import React from "react";
import { render } from "@testing-library/react-native";

const mockDismissPaywall = jest.fn();
const mockSetShowProductModal = jest.fn();
const mockHandleAddProductToMeal = jest.fn();
const mockSharedModal = jest.fn(
  ({ visible = true, children, ...props }: any) =>
    visible ? React.createElement("SharedModal", props, children) : null,
);
const mockProduct = {
  barcode: "8900000000012",
  name: "Sabudana Khichdi",
  brand: "FitAI",
  source: "openfoodfacts+gemini-estimation",
  confidence: 40,
  isAIEstimated: true,
  nutrition: {
    calories: 152,
    protein: 4.5,
    carbs: 28,
    fat: 2.1,
    fiber: 1.9,
    sugar: 3.4,
    sodium: 0.21,
    servingSize: 100,
    servingUnit: "g",
  },
} as any;

jest.mock("react-native", () => {
  const React = require("react");
  const createComponent = (name: string) =>
    React.forwardRef((props: any, ref) =>
      React.createElement(name, { ...props, ref }, props.children),
    );
  const MockModal = ({ visible = true, children, ...props }: any) =>
    visible ? React.createElement("Modal", props, children) : null;

  return {
    View: createComponent("View"),
    Text: createComponent("Text"),
    Image: createComponent("Image"),
    ScrollView: createComponent("ScrollView"),
    RefreshControl: createComponent("RefreshControl"),
    Modal: MockModal,
    Pressable: createComponent("Pressable"),
    TextInput: createComponent("TextInput"),
    TouchableOpacity: createComponent("TouchableOpacity"),
    ActivityIndicator: createComponent("ActivityIndicator"),
    KeyboardAvoidingView: createComponent("KeyboardAvoidingView"),
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: any) =>
        Array.isArray(style)
          ? Object.assign({}, ...style.filter(Boolean))
          : (style ?? {}),
      hairlineWidth: 1,
      absoluteFillObject: {},
    },
    Platform: {
      OS: "android",
    },
  };
});

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("../../components/ui/aurora/AnimatedPressable", () => ({
  AnimatedPressable: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("../../components/ui/aurora/GlassCard", () => ({
  GlassCard: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("../../components/ui/aurora/AuroraSpinner", () => ({
  AuroraSpinner: () => null,
}));

jest.mock("../../components/ui/aurora/AuroraBackground", () => ({
  AuroraBackground: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("../../components/ui", () => ({
  Button: ({ title }: { title: string }) => {
    const React = require("react");
    return React.createElement("Text", null, title);
  },
}));

jest.mock("../../components/diet/NutritionSummaryCard", () => ({
  NutritionSummaryCard: () => {
    const React = require("react");
    return React.createElement("Text", null, "Nutrition Summary");
  },
}));

jest.mock("../../components/diet/MealPlanView", () => ({
  MealPlanView: () => null,
}));

jest.mock("../../components/diet/WaterIntakeModal", () => ({
  WaterIntakeModal: () => null,
}));

jest.mock("../../components/diet/DietScreenHeader", () => ({
  DietScreenHeader: () => {
    const React = require("react");
    return React.createElement("Text", null, "Diet Header");
  },
}));

jest.mock("../../components/diet/MealSuggestions", () => ({
  MealSuggestions: () => {
    const React = require("react");
    return React.createElement("Text", null, "Meal Suggestions");
  },
}));

jest.mock("../../components/diet/DietModals", () => ({
  DietModals: () => {
    const React = require("react");
    return React.createElement("Text", null, "Diet Modals");
  },
}));

jest.mock("../../components/diet/DietQuickActions", () => ({
  DietQuickActions: () => {
    const React = require("react");
    return React.createElement("Text", null, "Diet Quick Actions");
  },
}));

jest.mock("../../components/diet/ManualBarcodeEntry", () => ({
  ManualBarcodeEntry: () => null,
}));

jest.mock("../../components/DatabaseDownloadBanner", () => () => null);

jest.mock("../../components/diet/LogMealModal", () => ({
  LogMealModal: () => null,
}));

jest.mock("../../components/diet/MealDetailModal", () => ({
  MealDetailModal: () => null,
}));

jest.mock("../../components/diet/FoodScanLoadingOverlay", () => ({
  FoodScanLoadingOverlay: () => null,
}));

jest.mock("../../components/diet/ScanResultModal", () => ({
  ScanResultModal: () => null,
}));

jest.mock("../../components/subscription/PaywallModal", () => () => null);

jest.mock("../../components/diet/HealthScoreIndicator", () => ({
  HealthScoreIndicator: () => null,
}));

jest.mock("@/components/ui/Modal", () => ({
  Modal: (props: any) => mockSharedModal(props),
}));

jest.mock("../../screens/main/GuestSignUpScreen", () => ({
  GuestSignUpScreen: () => null,
}));

jest.mock("../../utils/constants", () => ({
  ResponsiveTheme: {
    colors: {
      background: "#0a0f1c",
      backgroundSecondary: "#1a1f2e",
      surface: "#1e2332",
      border: "#333844",
      text: "#ffffff",
      textSecondary: "#b0b0b0",
      textMuted: "#8a8a8a",
      white: "#ffffff",
      primary: "#FF6B35",
      neutral: "#9E9E9E",
      overlay: "rgba(0, 0, 0, 0.5)",
      overlayDark: "rgba(0, 0, 0, 0.7)",
      successAlt: "#10B981",
      errorAlt: "#EF4444",
      teal: "#4ECDC4",
      info: "#2196f3",
      warning: "#ff9800",
      error: "#f44336",
      errorLight: "#FF6B6B",
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    borderRadius: {
      xs: 2,
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
      xxl: 24,
      full: 9999,
    },
    fontSize: {
      micro: 12,
      xs: 13,
      sm: 14,
      md: 16,
      lg: 20,
      xl: 24,
      xxl: 32,
    },
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      extrabold: "800",
    },
    shadows: {
      sm: {},
      md: {},
      lg: {},
    },
  },
}));

jest.mock("../../utils/responsive", () => ({
  rf: (value: number) => value,
  rw: (value: number) => value,
  rp: (value: number) => value,
  rh: (value: number) => value,
}));

jest.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isGuestMode: false,
  }),
}));

jest.mock("../../stores", () => ({
  useNutritionStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      mealProgress: {},
      dailyMeals: [],
    };
    return selector ? selector(state) : state;
  }),
  useAppStateStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      selectedDay: "Wednesday",
      selectedDate: "2026-03-25",
      shiftSelectedDate: jest.fn(),
      setSelectedDay: jest.fn(),
    };
    return selector ? selector(state) : state;
  }),
  useProfileStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      personalInfo: null,
      bodyAnalysis: null,
      dietPreferences: null,
      workoutPreferences: null,
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock("../../stores/subscriptionStore", () => ({
  useSubscriptionStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      showPaywall: false,
      paywallReason: null,
      dismissPaywall: mockDismissPaywall,
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock("../../stores/userStore", () => ({
  useUserStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      profile: {},
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock("../../hooks/useMealPlanning", () => ({
  useMealPlanning: () => ({
    weeklyMealPlan: null,
    isGeneratingPlan: false,
    asyncJob: null,
    todaysMeals: [],
    generateWeeklyMealPlan: jest.fn(),
    cancelAsyncGeneration: jest.fn(),
    handleDeleteMeal: jest.fn(),
    forceRefresh: jest.fn(),
    handleStartMeal: jest.fn(),
    completeMealPreparation: jest.fn(),
  }),
}));

jest.mock("../../hooks/useNutritionTracking", () => ({
  useNutritionTracking: () => ({
    waterIntakeML: 0,
    waterGoalML: 2500,
    waterConsumedLiters: 0,
    waterGoalLiters: 2.5,
    hydrationAddWater: jest.fn(),
    calculatedMetrics: null,
    getCalorieTarget: () => 2000,
    getMacroTargets: () => ({
      protein: 120,
      carbs: 200,
      fat: 60,
    }),
    dailyNutrition: { mealsCount: 0 },
    foodsLoading: false,
    foodsError: null,
    refreshAll: jest.fn(),
    clearErrors: jest.fn(),
    getTodaysConsumedNutrition: () => ({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    }),
    showWaterIntakeModal: false,
    setShowWaterIntakeModal: jest.fn(),
    handleAddWater: jest.fn(),
  }),
}));

jest.mock("../../hooks/useAIMealGeneration", () => ({
  useAIMealGeneration: () => ({
    isGeneratingMeal: false,
    showCamera: false,
    setShowCamera: jest.fn(),
    cameraMode: "food",
    setCameraMode: jest.fn(),
    scannedProduct: mockProduct,
    productHealthAssessment: {
      overallScore: 62,
      category: "good",
      breakdown: {
        calories: { score: 70, status: "good", message: "Low calorie content" },
        macros: {
          score: 55,
          status: "acceptable",
          message: "4.5g protein, 28g carbs, 2.1g fat",
        },
        additives: {
          score: 60,
          status: "moderate",
          message: "Sugar content acceptable",
        },
        processing: {
          score: 80,
          status: "minimal",
          message: "Sodium levels acceptable",
        },
      },
      recommendations: ["Review label before logging"],
      alerts: [],
      healthBenefits: ["Low calorie option"],
      concerns: [],
    },
    showProductModal: true,
    setShowProductModal: mockSetShowProductModal,
    showMealTypeSelector: false,
    setShowMealTypeSelector: jest.fn(),
    portionData: null,
    setPortionData: jest.fn(),
    showPortionAdjustment: false,
    setShowPortionAdjustment: jest.fn(),
    feedbackData: null,
    setFeedbackData: jest.fn(),
    showFeedbackModal: false,
    setShowFeedbackModal: jest.fn(),
    handleMealTypeSelected: jest.fn(),
    handleBarcodeScanned: jest.fn(),
    handleCameraCapture: jest.fn(),
    handleAddProductToMeal: mockHandleAddProductToMeal,
    handleScanFood: jest.fn(),
    handleScanProduct: jest.fn(),
    handleBarcodeCameraClose: jest.fn(),
    handleLabelScanned: jest.fn(),
    handleManualLookupResolved: jest.fn(),
    handleFeedbackSubmit: jest.fn(),
    handlePortionAdjustmentComplete: jest.fn(),
    isProcessingBarcode: false,
    barcodeCameraState: "idle",
    barcodeStatusMessage: null,
    barcodeInlineActions: [],
    portionGrams: null,
    setPortionGrams: jest.fn(),
    showWeightPrompt: false,
    confirmPhotoRecognition: jest.fn(),
    dismissWeightPrompt: jest.fn(),
    setLogMealScanCallback: jest.fn(),
    scanResult: null,
    showScanResult: false,
    handleScanResultAccept: jest.fn(),
    handleScanResultAdjust: jest.fn(),
    handleScanResultFeedback: jest.fn(),
    handleScanResultDismiss: jest.fn(),
  }),
}));

jest.mock("../../utils/mealSchedule", () => ({
  calculateMealSchedule: () => [],
}));

jest.mock("../../utils/weekUtils", () => ({
  getLocalDateString: () => "2026-03-25",
}));

jest.mock("../../utils/profileLegacyAdapter", () => ({
  buildLegacyProfileAdapter: () => ({}),
}));

import { DietScreen } from "../../screens/main/DietScreen";

describe("DietScreen barcode weak-data flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSharedModal.mockClear();
  });

  it("renders product details at screen level when barcode weak-data is accepted", () => {
    const screen = render(
      <DietScreen
        navigation={{ navigate: jest.fn(), setParams: jest.fn() }}
        route={{ params: {} }}
      />,
    );

    expect(screen.queryByText("Diet Modals")).toBeNull();
    expect(screen.getByText("Sabudana Khichdi")).toBeTruthy();
    expect(screen.getByText("Barcode: 8900000000012")).toBeTruthy();
    expect(screen.getByText("Nutrition for 100g")).toBeTruthy();
    expect(screen.getByText("152")).toBeTruthy();
    expect(mockSharedModal).toHaveBeenCalled();
  });
});
