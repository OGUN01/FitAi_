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

const makeProps = () => ({
  selectedDate: new Date("2026-07-24T12:00:00"),
  streakDays: 12,
  onMenuPress: jest.fn(),
  onPrevDay: jest.fn(),
  onNextDay: jest.fn(),
  onSelectDate: jest.fn(),
  onOpenPlan: jest.fn(),
});

describe("DietScreenHeader", () => {
  it("renders the compact dashboard hierarchy and opens the selected plan", () => {
    const props = makeProps();
    const screen = render(<DietScreenHeader {...props} />);

    expect(screen.getByText("Diet")).toBeTruthy();
    expect(screen.getByText("12 day streak")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Open diet settings"));
    fireEvent.press(screen.getByLabelText("Previous day"));
    fireEvent.press(screen.getByLabelText("Next day"));
    const datePill = screen.getByLabelText("Open Friday, July 24 meal plan");
    expect(StyleSheet.flatten(datePill.props.style)).toMatchObject({
      minHeight: 44,
    });
    fireEvent.press(datePill);

    expect(props.onMenuPress).toHaveBeenCalledTimes(1);
    expect(props.onPrevDay).toHaveBeenCalledTimes(1);
    expect(props.onNextDay).toHaveBeenCalledTimes(1);
    expect(props.onOpenPlan).toHaveBeenCalledWith(props.selectedDate);
  });

  it("shows seven equal day cells that select the date without opening the plan", () => {
    const props = makeProps();
    const screen = render(<DietScreenHeader {...props} />);
    const dayCells = screen.getAllByLabelText(/^Select .*$/);

    expect(dayCells).toHaveLength(7);
    dayCells.forEach((cell) => {
      // flex:1 is asserted on style (kept for test identity); the runtime flex
      // item is the AnimatedPressable wrapper, sized via containerStyle
      // (styles.dayCellContainer) — see DietScreenHeader render note.
      expect(cell.props.style).toEqual(expect.objectContaining({ flex: 1 }));
    });

    fireEvent.press(screen.getByLabelText("Select Mon Jul 20 2026"));

    const monday = props.onSelectDate.mock.calls[0][0] as Date;
    expect(monday).toEqual(new Date("2026-07-20T12:00:00"));
    // Week-strip tap selects the date only; it must NOT open the full Plan
    // (that is the "View Today's Plan" CTA's job).
    expect(props.onOpenPlan).not.toHaveBeenCalled();
  });
});

const nutritionTargets = {
  calories: { current: 450, target: 1856 },
  protein: { current: 8, target: 185 },
  carbs: { current: 42, target: 195 },
  fat: { current: 28, target: 37 },
  fiber: { current: 5, target: 25 },
};

describe("NutritionSummaryCard", () => {
  it("renders the compact calorie summary and three macro columns", () => {
    const onEditGoal = jest.fn();
    const view = render(
      <NutritionSummaryCard
        nutritionTargets={nutritionTargets}
        onEditGoal={onEditGoal}
      />,
    );

    expect(view.getByText("Calories")).toBeTruthy();
    // Consumed is primary in the arc center; remaining is the secondary "left" line.
    expect(view.getByText("450")).toBeTruthy();
    expect(view.getByText("1,406 left")).toBeTruthy();
    expect(view.getByText("450 / 1,856 kcal")).toBeTruthy();
    expect(view.getAllByTestId("dashboard-macro")).toHaveLength(3);
    expect(view.queryByText("Fiber")).toBeNull();

    fireEvent.press(view.getByLabelText("Edit calorie goal"));
    expect(onEditGoal).toHaveBeenCalledTimes(1);
  });

  it("preserves the missing-target notice and zero progress semantics", () => {
    const view = render(
      <NutritionSummaryCard
        nutritionTargets={{
          calories: { current: 0, target: 0 },
          protein: { current: 0, target: 0 },
          carbs: { current: 0, target: 0 },
          fat: { current: 0, target: 0 },
          fiber: { current: 0, target: 0 },
        }}
        onEditGoal={jest.fn()}
      />,
    );

    expect(
      view.getByText(
        "Complete your profile to see personalized nutrition targets",
      ),
    ).toBeTruthy();
    expect(view.getByRole("progressbar").props.accessibilityValue).toEqual({
      min: 0,
      max: 0,
      now: 0,
    });
  });

  it("announces calorie overflow without reporting a negative remainder", () => {
    const view = render(
      <NutritionSummaryCard
        nutritionTargets={{
          ...nutritionTargets,
          calories: { current: 2100, target: 1856 },
        }}
        onEditGoal={jest.fn()}
      />,
    );

    // Consumed is primary in the arc center; overflow is shown as "+N over",
    // never as a negative remainder.
    expect(view.getByText("2,100")).toBeTruthy();
    expect(view.getByText("kcal eaten")).toBeTruthy();
    expect(view.getByText("+244 over")).toBeTruthy();
    expect(view.getByRole("progressbar").props.accessibilityValue).toEqual({
      min: 0,
      max: 1856,
      now: 2100,
    });
  });
});

const makeActionCallbacks = () => ({
  onScanFood: jest.fn(),
  onScanBarcode: jest.fn(),
  onScanLabel: jest.fn(),
  onLogMeal: jest.fn(),
  onLogWater: jest.fn(),
  onViewRecipes: jest.fn(),
});

describe("DietQuickActions", () => {
  it("renders six accessible actions in a fixed two-row grid", () => {
    const callbacks = makeActionCallbacks();
    const screen = render(<DietQuickActions {...callbacks} />);
    const actions = screen.getAllByTestId("diet-quick-action");

    expect(actions).toHaveLength(6);
    expect(
      StyleSheet.flatten(
        screen.getByTestId("diet-quick-actions-grid").props.style,
      ),
    ).toMatchObject({
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: 8,
      rowGap: 8,
    });
    // The sizing lives on the cell View (the real flex item); the pressable
    // inside fills it. See DietQuickActions render comment.
    const cells = screen.getAllByTestId("diet-quick-action-cell");
    expect(cells).toHaveLength(6);
    cells.forEach((cell) => {
      expect(StyleSheet.flatten(cell.props.style)).toMatchObject({
        width: "31.5%",
        minHeight: 64,
      });
    });
    expect(actions).toHaveLength(6);

    fireEvent.press(screen.getByLabelText("More"));
    expect(callbacks.onViewRecipes).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("Recipes")).toBeNull();
  });
});

describe("DatabaseDownloadBanner", () => {
  it("renders the compact offline prompt with accessible 44px actions", () => {
    const onDismiss = jest.fn();
    const screen = render(<DatabaseDownloadBanner onDismiss={onDismiss} />);

    expect(screen.getByText("Offline food database")).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByTestId("offline-database-row").props.style),
    ).toMatchObject({ flexDirection: "row", alignItems: "center" });

    const download = screen.getByLabelText("Download offline database");
    const dismiss = screen.getByLabelText(
      "Dismiss offline database banner",
    );
    expect(StyleSheet.flatten(download.props.style)).toMatchObject({
      minHeight: 44,
    });
    expect(StyleSheet.flatten(dismiss.props.style)).toMatchObject({
      minHeight: 44,
      minWidth: 44,
    });

    fireEvent.press(dismiss);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Offline food database")).toBeNull();
  });

  it("keeps pause and cancel available while downloading", async () => {
    mockDownloadState = "downloading";

    const paused = render(<DatabaseDownloadBanner />);
    const pause = paused.getByLabelText("Pause offline database download");
    expect(StyleSheet.flatten(pause.props.style)).toMatchObject({ minHeight: 44 });
    fireEvent.press(pause);
    await waitFor(() => expect(mockCancelDownload).toHaveBeenCalledTimes(1));
    paused.unmount();

    mockDownloadState = "downloading";
    const cancelled = render(<DatabaseDownloadBanner />);
    const cancel = cancelled.getByLabelText("Cancel offline database download");
    expect(StyleSheet.flatten(cancel.props.style)).toMatchObject({
      minHeight: 44,
    });
    fireEvent.press(cancel);
    await waitFor(() => expect(mockCancelDownload).toHaveBeenCalledTimes(2));
  });

  it("offers an accessible retry after a failed download", () => {
    mockDownloadState = "error";
    const screen = render(<DatabaseDownloadBanner />);
    const retry = screen.getByLabelText("Retry offline database download");

    expect(StyleSheet.flatten(retry.props.style)).toMatchObject({ minHeight: 44 });
    fireEvent.press(retry);
    expect(mockDownloadDatabase).toHaveBeenCalledTimes(1);
  });

  it("briefly shows success and then dismisses it", () => {
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
