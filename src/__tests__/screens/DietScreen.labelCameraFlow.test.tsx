import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { DietScreen } from "../../screens/main/DietScreen";

const mockSetParams = jest.fn();

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

jest.mock("../../utils/crossPlatformAlert", () => ({
  crossPlatformAlert: jest.fn(),
}));

jest.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isGuestMode: false,
    user: { id: "user-1" },
  }),
}));

jest.mock("../../stores", () => ({
  useNutritionStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      weeklyMealPlan: null,
      mealProgress: {},
      dailyMeals: [],
      setWeeklyMealPlan: jest.fn(),
      saveWeeklyMealPlan: jest.fn(),
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
      dismissPaywall: jest.fn(),
      canUseFeature: jest.fn(() => true),
      incrementUsage: jest.fn(),
      triggerPaywall: jest.fn(),
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

jest.mock("../../stores/profileStore", () => ({
  useProfileStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      personalInfo: null,
      workoutPreferences: null,
      dietPreferences: null,
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

jest.mock("../../hooks/useNutritionData", () => ({
  useNutritionData: () => ({
    loadDailyNutrition: jest.fn(() => Promise.resolve()),
    refreshAll: jest.fn(() => Promise.resolve()),
  }),
}));

jest.mock("../../hooks/useCalculatedMetrics", () => ({
  useCalculatedMetrics: () => ({
    getCalorieTarget: jest.fn(() => 2000),
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
      calories: 2000,
      protein: 120,
      carbs: 220,
      fat: 60,
    }),
    dailyNutrition: null,
    foodsLoading: false,
    foodsError: null,
    refreshAll: jest.fn(() => Promise.resolve()),
    clearErrors: jest.fn(),
    getTodaysConsumedNutrition: jest.fn(() => []),
    showWaterIntakeModal: false,
    setShowWaterIntakeModal: jest.fn(),
    handleAddWater: jest.fn(),
  }),
}));

jest.mock("../../services/recognizedFoodLogger", () => ({
  recognizedFoodLogger: {
    logRecognizedFoods: jest.fn(() =>
      Promise.resolve({ success: true, mealId: "meal-log-1" }),
    ),
  },
}));

jest.mock("../../services/foodRecognitionService", () => ({
  foodRecognitionService: null,
}));

jest.mock("../../services/foodRecognitionFeedbackService", () => ({
  foodRecognitionFeedbackService: {},
}));

jest.mock("../../services/barcodeService", () => ({
  barcodeService: {
    lookupProduct: jest.fn(),
  },
}));

jest.mock("../../services/fitaiWorkersClient", () => ({
  fitaiWorkersClient: {
    scanNutritionLabel: jest.fn(),
  },
}));

jest.mock("../../ai", () => ({
  aiService: {},
}));

jest.mock("../../utils/imageDataUrl", () => ({
  imageAssetToDataUrl: jest.fn(),
  imageUriToDataUrl: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("../../components/ui", () => {
  const React = require("react");
  const { Text, TouchableOpacity } = require("react-native");
  return {
    Button: ({
      title,
      onPress,
    }: {
      title: string;
      onPress?: () => void;
    }) => (
      <TouchableOpacity onPress={onPress}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock("../../components/ui/aurora/AnimatedPressable", () => {
  const React = require("react");
  const { TouchableOpacity } = require("react-native");
  return {
    AnimatedPressable: ({
      children,
      onPress,
    }: {
      children: React.ReactNode;
      onPress?: () => void;
    }) => <TouchableOpacity onPress={onPress}>{children}</TouchableOpacity>,
  };
});

jest.mock("../../components/ui/aurora/GlassCard", () => ({
  GlassCard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("../../components/ui/aurora/AuroraSpinner", () => ({
  AuroraSpinner: () => null,
}));

jest.mock("../../components/ui/aurora/AuroraBackground", () => ({
  AuroraBackground: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock("../../components/diet/NutritionSummaryCard", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    NutritionSummaryCard: () => <Text>Nutrition Summary</Text>,
  };
});

jest.mock("../../components/diet/MealPlanView", () => ({
  MealPlanView: () => null,
}));

jest.mock("../../components/diet/WaterIntakeModal", () => ({
  WaterIntakeModal: () => null,
}));

jest.mock("../../components/diet/DietScreenHeader", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    DietScreenHeader: () => <Text>Diet Header</Text>,
  };
});

jest.mock("../../components/diet/MealSuggestions", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    MealSuggestions: () => <Text>Meal Suggestions</Text>,
  };
});

jest.mock("../../components/diet/DietQuickActions", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    DietQuickActions: () => <Text>Diet Quick Actions</Text>,
  };
});

jest.mock("../../components/diet/DietModals", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  return {
    DietModals: (props: any) =>
      props.showCamera && props.cameraMode === "label" ? (
        <View>
          <Text>Label Camera</Text>
          <TouchableOpacity
            onPress={() => {
              props.setShowCamera(false);
              props.setCameraMode("food");
            }}
          >
            <Text>Close Label Camera</Text>
          </TouchableOpacity>
        </View>
      ) : null,
  };
});

jest.mock("../../components/diet/ManualBarcodeEntry", () => ({
  ManualBarcodeEntry: () => null,
}));

jest.mock("../../components/DatabaseDownloadBanner", () => () => null);

jest.mock("../../components/diet/LogMealModal", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  return {
    LogMealModal: ({
      visible,
      onRequestLabelScan,
    }: {
      visible: boolean;
      onRequestLabelScan?: (
        mealType: "breakfast" | "lunch" | "dinner" | "snack",
      ) => Promise<void> | void;
    }) =>
      visible ? (
        <View>
          <Text>Log Meal Modal</Text>
          <TouchableOpacity onPress={() => void onRequestLabelScan?.("lunch")}>
            <Text>Open Label Camera</Text>
          </TouchableOpacity>
        </View>
      ) : null,
  };
});

jest.mock("../../components/diet/MealDetailModal", () => ({
  MealDetailModal: () => null,
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

jest.mock("../../components/subscription/PaywallModal", () => () => null);

jest.mock("../../screens/main/GuestSignUpScreen", () => ({
  GuestSignUpScreen: () => null,
}));

describe("DietScreen label camera flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens the prep modal from navigation params and launches the label camera after confirmation", async () => {
    const navigation = {
      setParams: mockSetParams,
      navigate: jest.fn(),
    };

    const screen = render(
      <DietScreen
        navigation={navigation}
        route={{ params: { openLabelScanPrep: true } }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Scan Nutrition Label")).toBeTruthy();
      expect(screen.getByText("Serving size (optional)")).toBeTruthy();
    });

    expect(mockSetParams).toHaveBeenCalledWith({
      openLabelScanPrep: undefined,
    });

    fireEvent.press(screen.getByText("Scan Label"));

    await waitFor(() => {
      expect(screen.getByText("Label Camera")).toBeTruthy();
    });
  });

  it("reopens the log meal modal when the label camera is closed without a result", async () => {
    const navigation = {
      setParams: mockSetParams,
      navigate: jest.fn(),
    };

    const screen = render(
      <DietScreen
        navigation={navigation}
        route={{ params: { openLogMeal: true } }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Log Meal Modal")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Open Label Camera"));

    await waitFor(() => {
      expect(screen.getByText("Label Camera")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Close Label Camera"));

    await waitFor(() => {
      expect(screen.getByText("Log Meal Modal")).toBeTruthy();
    });
  });

});
