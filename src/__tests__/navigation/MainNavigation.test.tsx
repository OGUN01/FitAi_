import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const screenMountCounts = {
  diet: 0,
};

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => style ?? {},
  },
  BackHandler: {
    addEventListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    exitApp: jest.fn(),
  },
  Platform: {
    OS: "ios",
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("../../hooks/useAppConfig", () => ({
  useAppConfig: () => ({
    config: {
      featureFoodContributions: true,
      featureAnalytics: true,
    },
  }),
}));

jest.mock("../../components/icons/TabIcons", () => {
  const React = require("react");
  const icon = (label: string) =>
    function Icon() {
      return React.createElement("Text", null, label);
    };

  return {
    HomeIcon: icon("home-icon"),
    FitnessIcon: icon("fitness-icon"),
    DietIcon: icon("diet-icon"),
    ProgressIcon: icon("progress-icon"),
    ProfileIcon: icon("profile-icon"),
    AnalyticsIcon: icon("analytics-icon"),
  };
});

jest.mock("../../components/navigation/TabBar", () => ({
  TabBar: ({
    tabs,
    onTabPress,
  }: {
    tabs: Array<{ key: string; title: string }>;
    onTabPress: (tab: string) => void;
  }) => {
    const React = require("react");
    return React.createElement(
      "View",
      null,
      ...tabs.map((tab) =>
        React.createElement(
          "Pressable",
          {
            key: tab.key,
            onPress: () => onTabPress(tab.key),
            testID: `tab-${tab.key}`,
          },
          React.createElement("Text", null, tab.title),
        ),
      ),
    );
  },
}));

jest.mock("../../utils/responsive", () => ({
  rf: (value: number) => value,
  rp: (value: number) => value,
  rh: (value: number) => value,
  rw: (value: number) => value,
  rs: (value: number) => value,
}));

jest.mock("../../utils/constants", () => ({
  ResponsiveTheme: {
    colors: {
      background: "#000",
      text: "#fff",
      textSecondary: "#ccc",
      border: "#333",
    },
  },
}));

jest.mock("../../utils/crossPlatformAlert", () => ({
  crossPlatformAlert: jest.fn(),
}));

jest.mock("../../screens/main/HomeScreen", () => ({
  HomeScreen: ({
    onNavigateToTab,
  }: {
    onNavigateToTab?: (tab: string, params?: Record<string, unknown>) => void;
  }) => {
    const React = require("react");
    return React.createElement(
      "View",
      null,
      React.createElement("Text", null, "Home Screen"),
      React.createElement(
        "Pressable",
        {
          onPress: () => onNavigateToTab?.("diet", { openWaterModal: true }),
          testID: "open-water-quick-action",
        },
        React.createElement("Text", null, "Open Water Quick Action"),
      ),
    );
  },
}));

jest.mock("../../screens/main/FitnessScreen", () => ({
  FitnessScreen: () => {
    const React = require("react");
    return React.createElement("Text", null, "Fitness Screen");
  },
}));

jest.mock("../../screens/main/ProgressScreen", () => ({
  ProgressScreen: () => {
    const React = require("react");
    return React.createElement("Text", null, "Progress Screen");
  },
}));

jest.mock("../../screens/main/ProgressTrendsScreen", () => ({
  ProgressTrendsScreen: () => {
    const React = require("react");
    return React.createElement("Text", null, "Progress Trends Screen");
  },
}));

jest.mock("../../screens/main/AchievementsScreen", () => ({
  AchievementsScreen: () => {
    const React = require("react");
    return React.createElement("Text", null, "Achievements Screen");
  },
}));

jest.mock("../../screens/main/AnalyticsScreen", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return React.createElement("Text", null, "Analytics Screen");
  },
}));

jest.mock("../../screens/workout/WorkoutSessionScreen", () => ({
  WorkoutSessionScreen: () => {
    const React = require("react");
    return React.createElement("Text", null, "Workout Session");
  },
}));

jest.mock("../../screens/session/MealSession", () => ({
  MealSession: () => {
    const React = require("react");
    return React.createElement("Text", null, "Meal Session");
  },
}));

jest.mock("../../screens/onboarding/OnboardingContainer", () => ({
  OnboardingContainer: () => {
    const React = require("react");
    return React.createElement("Text", null, "Onboarding Container");
  },
}));

jest.mock("../../screens/ContributeFood", () => ({
  ContributeFood: () => {
    const React = require("react");
    return React.createElement("Text", null, "Contribute Food");
  },
}));

jest.mock("../../screens/main/DietScreen", () => ({
  DietScreen: ({
    navigation,
    route,
  }: {
    navigation: { navigate: (screen: string, params?: unknown) => void };
    route?: {
      params?: {
        mealCompleted?: boolean;
        openWaterModal?: boolean;
      };
    };
  }) => {
    const React = require("react");
    React.useEffect(() => {
      screenMountCounts.diet += 1;
    }, []);
    return React.createElement(
      "View",
      null,
      React.createElement(
        "Text",
        { testID: "diet-state" },
        route?.params?.mealCompleted
          ? "Diet Completed"
          : route?.params?.openWaterModal
            ? "Diet Water Modal"
            : "Diet Screen",
      ),
      React.createElement(
        "Pressable",
        {
          onPress: () =>
            navigation.navigate("CookingSession", {
              meal: { id: "meal-1", name: "Soup" },
            }),
          testID: "open-cooking",
        },
        React.createElement("Text", null, "Open Cooking"),
      ),
      React.createElement(
        "Pressable",
        {
          onPress: () =>
            navigation.navigate("Settings", { screen: "Notifications" }),
          testID: "open-settings",
        },
        React.createElement("Text", null, "Open Settings"),
      ),
    );
  },
}));

jest.mock("../../screens/cooking/CookingSessionScreen", () => ({
  __esModule: true,
  default: ({
    navigation,
  }: {
    navigation: { navigate: (screen: string, params?: unknown) => void };
  }) => {
    const React = require("react");
    return React.createElement(
      "Pressable",
      {
        onPress: () =>
          navigation.navigate("Diet", {
            mealCompleted: true,
            completedMealId: "meal-1",
          }),
        testID: "finish-cooking",
      },
      React.createElement("Text", null, "Finish Cooking"),
    );
  },
}));

jest.mock("../../screens/main/ProfileScreen", () => ({
  ProfileScreen: ({ route }: { route?: { params?: { settingsScreen?: string } } }) => {
    const React = require("react");
    return React.createElement(
      "Text",
      { testID: "profile-state" },
      route?.params?.settingsScreen
        ? `Profile Settings:${route.params.settingsScreen}`
        : "Profile Screen",
    );
  },
}));

import { MainNavigation } from "../../components/navigation/MainNavigation";

describe("MainNavigation", () => {
  beforeEach(() => {
    screenMountCounts.diet = 0;
  });

  it("routes cooking completion back to Diet with route params", () => {
    const screen = render(<MainNavigation initialTab="diet" />);

    fireEvent.press(screen.getByTestId("open-cooking"));
    expect(screen.getByTestId("finish-cooking")).toBeTruthy();

    fireEvent.press(screen.getByTestId("finish-cooking"));
    expect(screen.getByTestId("diet-state").props.children).toBe("Diet Completed");
  });

  it("routes Settings navigation into the profile settings surface", async () => {
    const screen = render(<MainNavigation initialTab="diet" />);

    fireEvent.press(screen.getByTestId("open-settings"));
    await waitFor(() => {
      expect(screen.getByTestId("profile-state").props.children).toBe(
        "Profile Settings:notifications",
      );
    });
  });

  it("passes Home quick-action intent params through to the Diet screen", () => {
    const screen = render(<MainNavigation initialTab="home" />);

    fireEvent.press(screen.getByTestId("open-water-quick-action"));
    expect(screen.getByTestId("diet-state").props.children).toBe("Diet Water Modal");
  });

  it("switches tabs through the tab bar press handler", async () => {
    const screen = render(<MainNavigation initialTab="home" />);

    expect(screen.getByText("Home Screen")).toBeTruthy();

    fireEvent.press(screen.getByTestId("tab-diet"));
    await waitFor(() => {
      expect(screen.getByTestId("diet-state").props.children).toBe("Diet Screen");
    });

    fireEvent.press(screen.getByTestId("tab-profile"));
    await waitFor(() => {
      expect(screen.getByTestId("profile-state").props.children).toBe("Profile Screen");
    });
  });

  it("keeps the Diet tab mounted after it has been visited", async () => {
    const screen = render(<MainNavigation initialTab="home" />);

    fireEvent.press(screen.getByTestId("tab-diet"));
    await waitFor(() => {
      expect(screenMountCounts.diet).toBe(1);
    });

    fireEvent.press(screen.getByTestId("tab-home"));
    fireEvent.press(screen.getByTestId("tab-diet"));

    await waitFor(() => {
      expect(screen.getByTestId("diet-state").props.children).toBe("Diet Screen");
      expect(screenMountCounts.diet).toBe(1);
    });
  });

  it("clears stale profile settings params on a normal Profile tab open", async () => {
    const screen = render(<MainNavigation initialTab="diet" />);

    fireEvent.press(screen.getByTestId("open-settings"));
    await waitFor(() => {
      expect(screen.getByTestId("profile-state").props.children).toBe(
        "Profile Settings:notifications",
      );
    });

    fireEvent.press(screen.getByTestId("tab-home"));
    fireEvent.press(screen.getByTestId("tab-profile"));

    await waitFor(() => {
      expect(screen.getByTestId("profile-state").props.children).toBe("Profile Screen");
    });
  });
});
