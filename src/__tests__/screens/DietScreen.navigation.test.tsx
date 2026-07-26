import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

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
    Platform: { OS: "android" },
    UIManager: {
      setLayoutAnimationEnabledExperimental: jest.fn(),
    },
    LayoutAnimation: {
      configureNext: jest.fn(),
      Presets: { easeInEaseOut: {} },
    },
  };
});

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("expo-linear-gradient", () => {
  const { View: MockView } = jest.requireActual("react-native");
  return {
    LinearGradient: ({ children, ...props }: React.ComponentProps<typeof MockView>) => (
      <MockView {...props}>{children}</MockView>
    ),
  };
});

jest.mock("@/utils/haptics", () => ({
  haptics: { trigger: jest.fn() },
}));

jest.mock("../../components/ui/aurora/AnimatedPressable", () => {
  const React = require("react");
  const { Pressable } = require("react-native");
  return {
    AnimatedPressable: React.forwardRef((props: any, ref: any) =>
      React.createElement(Pressable, { ...props, ref }, props.children),
    ),
  };
});

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

// Real DietScreenHeader, MealPlanView, and MealDetailModal are used; the
// remaining heavy/visual children are stubbed so the navigation contract is
// the only thing under test.
jest.mock("../../components/diet/NutritionSummaryCard", () => {
  const React = require("react");
  return {
    NutritionSummaryCard: () => React.createElement("Text", null, "Nutrition Summary"),
  };
});
jest.mock("../../components/diet/DietQuickActions", () => {
  const React = require("react");
  return { DietQuickActions: () => React.createElement("Text", null, "Quick Actions") };
});
jest.mock("../../components/DatabaseDownloadBanner", () => () => null);
jest.mock("../../components/diet/MealSuggestions", () => ({
  MealSuggestions: () => null,
}));
jest.mock("../../components/diet/DietModals", () => ({
  DietModals: () => null,
}));
jest.mock("../../components/diet/ManualBarcodeEntry", () => ({
  ManualBarcodeEntry: () => null,
}));
jest.mock("../../components/diet/LogMealModal", () => ({
  LogMealModal: () => null,
}));
jest.mock("../../components/diet/WaterIntakeModal", () => ({
  WaterIntakeModal: () => null,
}));
jest.mock("../../components/diet/ProductDetailsModal", () => ({
  ProductDetailsModal: () => null,
}));
jest.mock("../../components/diet/FoodScanLoadingOverlay", () => ({
  FoodScanLoadingOverlay: () => null,
}));
jest.mock("../../components/diet/ScanResultModal", () => ({
  ScanResultModal: () => null,
}));

jest.mock("../../components/diet/ContributionPromptModal", () => ({
  ContributionPromptModal: () => null,
}));
jest.mock("../../components/subscription/PaywallModal", () => () => null);
jest.mock("../../screens/main/GuestSignUpScreen", () => ({
  GuestSignUpScreen: () => null,
}));

jest.mock("../../utils/responsive", () => ({
  rf: (v: number) => v,
  rw: (v: number) => v,
  rp: (v: number) => v,
  rh: (v: number) => v,
  rs: (v: number) => v,
  rbr: (v: number) => v,
}));

jest.mock("../../utils/mealSchedule", () => ({
  calculateMealSchedule: () => ({
    breakfast: "7:45 AM",
    morningSnack: "10:30 AM",
    lunch: "12:00 PM",
    afternoonSnack: "3:00 PM",
    dinner: "8:00 PM",
  }),
}));

jest.mock("../../utils/weekUtils", () => ({
  getLocalDateString: () => "2026-07-24",
}));

jest.mock("../../utils/profileLegacyAdapter", () => ({
  buildLegacyProfileAdapter: () => ({}),
}));

jest.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, isGuestMode: false }),
}));

const meal = {
  id: "breakfast-1",
  type: "breakfast",
  name: "Paneer Stuffed Moong Dal Chilla",
  description: "Protein-rich breakfast",
  items: [],
  totalCalories: 450,
  totalMacros: { protein: 30, carbohydrates: 50, fat: 14, fiber: 8 },
  preparationTime: 10,
  cookingTime: 20,
  difficulty: "easy",
  tags: [],
  dayOfWeek: "Friday",
  isPersonalized: true,
  aiGenerated: true,
  createdAt: "2026-07-24T00:00:00.000Z",
} as any;

jest.mock("../../stores", () => ({
  useNutritionStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      mealProgress: {},
      dailyMeals: [],
      loadMealsForDate: jest.fn().mockResolvedValue(undefined),
      getConsumedNutritionForDate: jest.fn(() => ({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        meals: [],
      })),
    };
    return selector ? selector(state) : state;
  }),
  useAppStateStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      selectedDay: "Friday",
      selectedDate: "2026-07-24",
      shiftSelectedDate: jest.fn(),
      setSelectedDate: jest.fn(),
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
  useAchievementStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = { currentStreak: 12 };
    return selector ? selector(state) : state;
  }),
}));

jest.mock("../../stores/subscriptionStore", () => ({
  useSubscriptionStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      showPaywall: false,
      paywallReason: null,
      dismissPaywall: jest.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock("../../hooks/useMealPlanning", () => ({
  useMealPlanning: () => ({
    isGeneratingPlan: false,
    asyncJob: null,
    aiError: null,
    todaysMeals: [meal],
    generateWeeklyMealPlan: jest.fn(),
    cancelAsyncGeneration: jest.fn(),
    handleDeleteMeal: jest.fn(async () => true),
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
    getCalorieTarget: () => 1856,
    getMacroTargets: () => ({ protein: 120, carbs: 200, fat: 60 }),
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
    scannedProduct: null,
    productHealthAssessment: null,
    showProductModal: false,
    setShowProductModal: jest.fn(),
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
    handleAddProductToMeal: jest.fn(),
    handleScanFood: jest.fn(),
    handleScanProduct: jest.fn(),
    handleBarcodeCameraClose: jest.fn(),
    handleLabelScanned: jest.fn(),
    handleLabelLibraryPick: jest.fn(),
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
    generateAIMeal: jest.fn(),
  }),
}));

import { DietScreen } from "../../screens/main/DietScreen";

describe("DietScreen dashboard → plan → detail navigation", () => {
  it("opens the plan and detail surfaces and returns in order", () => {
    const view = render(
      <DietScreen navigation={{ navigate: jest.fn(), setParams: jest.fn() }} route={{}} />,
    );

    // Dashboard is mounted; the plan is not.
    expect(view.getByText("Diet")).toBeTruthy();
    expect(view.queryByText("Today's Plan")).toBeNull();
    expect(view.getByTestId("main-diet-dashboard")).toBeTruthy();

    // Open the plan from the dashboard date pill.
    fireEvent.press(view.getByLabelText(/Open .* meal plan/));
    expect(view.getByText("Today's Plan")).toBeTruthy();
    expect(view.queryByTestId("main-diet-dashboard")).toBeNull();

    // Open meal details from a plan card.
    fireEvent.press(view.getByLabelText(`Open ${meal.name}`));
    expect(view.getByText("Meal Details")).toBeTruthy();

    // Detail → Plan.
    fireEvent.press(view.getByLabelText("Back to meal plan"));
    expect(view.getByText("Today's Plan")).toBeTruthy();

    // Plan → Dashboard.
    fireEvent.press(view.getByLabelText("Back to diet dashboard"));
    expect(view.getByTestId("main-diet-dashboard")).toBeTruthy();
  });
});
