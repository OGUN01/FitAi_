import React from "react";
import { StyleSheet } from "react-native";
import {
  act,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";

let mockDownloadState = "not_downloaded";
const mockDownloadDatabase = jest.fn();
const mockCancelDownload = jest.fn();

jest.mock("@/services/sqliteFood", () => ({
  sqliteFood: {
    getState: jest.fn(() => mockDownloadState),
    isDatabaseReady: jest.fn(() => mockDownloadState === "ready"),
    ensureDbReady: jest.fn().mockResolvedValue(undefined),
    downloadDatabase: (...args: unknown[]) => mockDownloadDatabase(...args),
    cancelDownload: (...args: unknown[]) => mockCancelDownload(...args),
  },
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/utils/haptics", () => ({
  haptics: {
    trigger: jest.fn(),
  },
}));

import { DietScreenHeader } from "@/components/diet/DietScreenHeader";
import { NutritionSummaryCard } from "@/components/diet/NutritionSummaryCard";
import { DietQuickActions } from "@/components/diet/DietQuickActions";
import DatabaseDownloadBanner from "@/components/DatabaseDownloadBanner";

beforeEach(() => {
  mockDownloadState = "not_downloaded";
  mockDownloadDatabase.mockReset().mockResolvedValue(undefined);
  mockCancelDownload.mockReset().mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// DietScreenHeader
// ---------------------------------------------------------------------------

describe("DietScreenHeader", () => {
  it('renders "Nutrition Plan" title, date navigator, and generate/search buttons; fires prev/next/generate/search callbacks', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const props = {
      isGeneratingPlan: false,
      hasPlan: false,
      onGenerateWeeklyPlan: jest.fn(),
      handleSearchFood: jest.fn(),
      selectedDate: today,
      onPrevDay: jest.fn(),
      onNextDay: jest.fn(),
    };
    const screen = render(<DietScreenHeader {...props} />);

    expect(screen.getByText("Nutrition Plan")).toBeTruthy();
    // dateLabel is "Today" because selectedDate IS today.
    expect(screen.getByText("Today")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Previous day"));
    expect(props.onPrevDay).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText("Next day"));
    expect(props.onNextDay).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText("Generate weekly plan"));
    expect(props.onGenerateWeeklyPlan).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText("Log Meal"));
    expect(props.handleSearchFood).toHaveBeenCalledTimes(1);

    // Button inner text reflects the not-hasPlan branch.
    expect(screen.getByText("Generate Week")).toBeTruthy();
  });

  it("shows Refresh label when hasPlan, and shows spinner (disabled) while isGeneratingPlan", () => {
    const baseProps = {
      hasPlan: true,
      onGenerateWeeklyPlan: jest.fn(),
      handleSearchFood: jest.fn(),
      selectedDate: (() => {
        const d = new Date();
        d.setHours(12, 0, 0, 0);
        return d;
      })(),
      onPrevDay: jest.fn(),
      onNextDay: jest.fn(),
    };

    const screen = render(<DietScreenHeader {...baseProps} isGeneratingPlan={false} />);

    expect(screen.getByText("Refresh Week")).toBeTruthy();
    expect(screen.getByLabelText("Refresh weekly plan")).toBeTruthy();
    expect(screen.queryByText("Generate Week")).toBeNull();

    screen.rerender(<DietScreenHeader {...baseProps} isGeneratingPlan={true} />);

    // AuroraSpinner replaces the inner text/icon, so the label text is gone.
    expect(screen.queryByText("Refresh Week")).toBeNull();

    // AnimatedPressable wraps the inner Pressable in an Animated.View. The
    // accessibilityState set on the Pressable ({ disabled: true }) bubbles up
    // to the wrapper, which is what getByLabelText returns. Asserting on
    // accessibilityState is the stable contract across the reanimated mock.
    const generateBtn = screen.getByLabelText("Refresh weekly plan");
    expect(generateBtn.props.accessibilityState).toEqual({ disabled: true });
  });
});

// ---------------------------------------------------------------------------
// NutritionSummaryCard
// ---------------------------------------------------------------------------

const nutritionTargets = {
  calories: { current: 450, target: 1856 },
  protein: { current: 8, target: 185 },
  carbs: { current: 42, target: 195 },
  fat: { current: 28, target: 37 },
};

describe("NutritionSummaryCard", () => {
  it("renders calorie remaining, target, and macro labels with fiber absent when not provided", () => {
    const view = render(<NutritionSummaryCard nutritionTargets={nutritionTargets} />);

    // remaining = target - current = 1856 - 450 = 1406
    expect(view.getByText("1406")).toBeTruthy();
    expect(view.getByText("Calories left")).toBeTruthy();
    expect(view.getByText("of 1856")).toBeTruthy();

    expect(view.getByText("Protein")).toBeTruthy();
    expect(view.getByText("Carbs")).toBeTruthy();
    expect(view.getByText("Fats")).toBeTruthy();

    // fiber/sugar absent because not provided in nutritionTargets.
    expect(view.queryByText("Fiber")).toBeNull();
    expect(view.queryByText("Sugar")).toBeNull();
  });

  it("shows the missing-target notice and zero progress when all targets are zero and no consumed data", () => {
    const view = render(
      <NutritionSummaryCard
        nutritionTargets={{
          calories: { current: 0, target: 0 },
          protein: { current: 0, target: 0 },
          carbs: { current: 0, target: 0 },
          fat: { current: 0, target: 0 },
        }}
      />,
    );

    expect(
      view.getByText(
        "Complete your profile to see personalized nutrition targets",
      ),
    ).toBeTruthy();

    // calories.target is falsy → the component renders `0` (the `: 0` branch).
    expect(view.getByText("0")).toBeTruthy();
    // Not overflow (target=0) → "Calories left".
    expect(view.getByText("Calories left")).toBeTruthy();
  });

  it("announces calorie overflow as +N with 'Over target' label", () => {
    const view = render(
      <NutritionSummaryCard
        nutritionTargets={{
          ...nutritionTargets,
          calories: { current: 2100, target: 1856 },
        }}
      />,
    );

    // Math.round(2100 - 1856) = 244
    expect(view.getByText("+244")).toBeTruthy();
    expect(view.getByText("Over target")).toBeTruthy();
    expect(view.queryByText("Calories left")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// DietQuickActions
// ---------------------------------------------------------------------------

const makeActionCallbacks = () => ({
  onScanFood: jest.fn(),
  onScanBarcode: jest.fn(),
  onScanLabel: jest.fn(),
  onLogMeal: jest.fn(),
  onLogWater: jest.fn(),
  onViewRecipes: jest.fn(),
});

describe("DietQuickActions", () => {
  it("renders six accessible action buttons in a horizontal scroll and fires each callback", () => {
    const callbacks = makeActionCallbacks();
    const screen = render(<DietQuickActions {...callbacks} />);

    // All six labels render.
    expect(screen.getByText("Scan Food")).toBeTruthy();
    expect(screen.getByText("Barcode")).toBeTruthy();
    expect(screen.getByText("Scan Label")).toBeTruthy();
    expect(screen.getByText("Log Meal")).toBeTruthy();
    expect(screen.getByText("Log Water")).toBeTruthy();
    expect(screen.getByText("Recipes")).toBeTruthy();

    // Each pressable has accessibilityLabel === label and fires its callback.
    fireEvent.press(screen.getByLabelText("Scan Food"));
    expect(callbacks.onScanFood).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText("Barcode"));
    expect(callbacks.onScanBarcode).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText("Scan Label"));
    expect(callbacks.onScanLabel).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText("Log Meal"));
    expect(callbacks.onLogMeal).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText("Log Water"));
    expect(callbacks.onLogWater).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText("Recipes"));
    expect(callbacks.onViewRecipes).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// DatabaseDownloadBanner
// ---------------------------------------------------------------------------

describe("DatabaseDownloadBanner", () => {
  it("renders the not_downloaded banner with Download Now and Skip actions", () => {
    mockDownloadState = "not_downloaded";
    const onDismiss = jest.fn();
    const screen = render(<DatabaseDownloadBanner onDismiss={onDismiss} />);

    expect(screen.getByText("Offline food database available")).toBeTruthy();
    expect(screen.getByText("Download Now")).toBeTruthy();
    expect(screen.getByLabelText("Download Now")).toBeTruthy();
    expect(screen.getByText("Skip for Now")).toBeTruthy();
    expect(screen.getByLabelText("Skip for Now")).toBeTruthy();

    // primaryBtn style has minHeight: 42 (not 44).
    const download = screen.getByLabelText("Download Now");
    expect(StyleSheet.flatten(download.props.style)).toMatchObject({
      minHeight: 42,
    });

    fireEvent.press(screen.getByLabelText("Skip for Now"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    // After dismiss, isDismissed=true → component returns null.
    expect(screen.queryByText("Offline food database available")).toBeNull();
  });

  it("renders Pause and Cancel while downloading and both invoke cancelDownload", async () => {
    mockDownloadState = "downloading";

    const paused = render(<DatabaseDownloadBanner />);
    const pause = paused.getByLabelText("Pause");
    expect(StyleSheet.flatten(pause.props.style)).toMatchObject({ minHeight: 42 });
    fireEvent.press(pause);
    await waitFor(() => expect(mockCancelDownload).toHaveBeenCalledTimes(1));
    paused.unmount();

    mockCancelDownload.mockClear();
    mockDownloadState = "downloading";

    const cancelled = render(<DatabaseDownloadBanner />);
    const cancel = cancelled.getByLabelText("Cancel");
    expect(StyleSheet.flatten(cancel.props.style)).toMatchObject({ minHeight: 42 });
    fireEvent.press(cancel);
    await waitFor(() => expect(mockCancelDownload).toHaveBeenCalledTimes(1));
  });

  it("renders Retry in error state and invoking it calls downloadDatabase", async () => {
    mockDownloadState = "error";
    const screen = render(<DatabaseDownloadBanner />);

    expect(screen.getByLabelText("Retry")).toBeTruthy();
    expect(screen.getByText("Download failed")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Retry"));
    // handleRetry sets state to not_downloaded then calls handleDownload,
    // which sets state to "downloading" and awaits downloadDatabase.
    await waitFor(() => expect(mockDownloadDatabase).toHaveBeenCalledTimes(1));
  });

  it("shows Database ready then auto-dismisses after 3s calling onDismiss", () => {
    jest.useFakeTimers();
    mockDownloadState = "ready";
    const onDismiss = jest.fn();
    const screen = render(<DatabaseDownloadBanner onDismiss={onDismiss} />);

    expect(screen.getByText("Database ready")).toBeTruthy();

    act(() => jest.advanceTimersByTime(3000));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Database ready")).toBeNull();
    jest.useRealTimers();
  });
});
