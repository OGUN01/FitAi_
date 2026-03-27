import React from "react";

jest.mock("react-native", () => ({
  View: ({ children, testID, style, ...props }: any) => {
    const RealReact = require("react");
    return RealReact.createElement(
      "View",
      { testID, style, ...props },
      children,
    );
  },
  Text: ({ children, style, ...props }: any) => {
    const RealReact = require("react");
    return RealReact.createElement("Text", { style, ...props }, children);
  },
  TextInput: ({
    testID,
    value,
    onChangeText,
    style,
    keyboardType,
    placeholder,
    ...props
  }: any) => {
    const RealReact = require("react");
    return RealReact.createElement("TextInput", {
      testID,
      value,
      onChangeText,
      style,
      keyboardType,
      placeholder,
      ...props,
    });
  },
  TouchableOpacity: ({ children, testID, onPress, style, ...props }: any) => {
    const RealReact = require("react");
    return RealReact.createElement(
      "TouchableOpacity",
      { testID, onPress, style, ...props },
      children,
    );
  },
  StyleSheet: {
    create: (s: any) => s,
    flatten: (s: any) =>
      Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s || {},
  },
  Platform: { OS: "ios", select: (o: any) => o?.ios },
}));

import { render, fireEvent, waitFor, act } from "@testing-library/react-native";

jest.mock("../../../services/exerciseHistoryService", () => ({
  exerciseHistoryService: {
    getLastSession: jest.fn(),
    getPersonalRecords: jest.fn(),
  },
}));

jest.mock("../../../services/prDetectionService", () => ({
  prDetectionService: {
    checkForPR: jest.fn(),
    recordPR: jest.fn(),
  },
}));

jest.mock("../../../stores/fitnessStore", () => ({
  useFitnessStore: {
    getState: jest.fn(() => ({
      updateSetData: jest.fn(),
    })),
  },
}));

import {
  ExerciseCard,
  SetCompletionData,
} from "../../../features/workouts/components/ExerciseCard";
import { exerciseHistoryService } from "../../../services/exerciseHistoryService";

const mockGetLastSession = exerciseHistoryService.getLastSession as jest.Mock;
const mockGetPersonalRecords =
  exerciseHistoryService.getPersonalRecords as jest.Mock;

function makeExercise(overrides: Record<string, any> = {}) {
  return {
    exerciseId: "bench_press",
    exerciseName: "Bench Press",
    sets: 3,
    reps: 10,
    restTime: 90,
    ...overrides,
  };
}

describe("ExerciseCard", () => {
  const defaultProps = {
    exercise: makeExercise(),
    exerciseIndex: 0,
    onSetComplete: jest.fn(),
    userId: "user-1",
    userUnits: "kg" as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLastSession.mockResolvedValue(null);
    mockGetPersonalRecords.mockResolvedValue([]);
  });

  it("renders set rows based on exercise.sets count", async () => {
    const { getAllByTestId } = render(<ExerciseCard {...defaultProps} />);

    await waitFor(() => {
      const rows = getAllByTestId(/^set-row-/);
      expect(rows).toHaveLength(3);
    });
  });

  it("renders exercise name in header", async () => {
    const { getByText } = render(<ExerciseCard {...defaultProps} />);

    await waitFor(() => {
      expect(getByText("Bench Press")).toBeTruthy();
    });
  });

  it("checkmark calls onSetComplete with correct data", async () => {
    const onSetComplete = jest.fn();
    const { getAllByTestId, getAllByPlaceholderText } = render(
      <ExerciseCard {...defaultProps} onSetComplete={onSetComplete} />,
    );

    await waitFor(() => {
      expect(getAllByTestId(/^set-row-/)).toHaveLength(3);
    });

    const weightInputs = getAllByTestId(/^weight-input-/);
    const repsInputs = getAllByTestId(/^reps-input-/);
    const checkmarks = getAllByTestId(/^checkmark-/);

    await act(async () => {
      fireEvent.changeText(weightInputs[0], "60");
      fireEvent.changeText(repsInputs[0], "10");
    });

    await act(async () => {
      fireEvent.press(checkmarks[0]);
    });

    expect(onSetComplete).toHaveBeenCalledWith(
      0,
      expect.objectContaining({
        weightKg: 60,
        reps: 10,
        setType: "normal",
        completed: true,
      }),
    );
  });

  it('shows "First time" when no history exists', async () => {
    mockGetLastSession.mockResolvedValue(null);

    const { getAllByText } = render(<ExerciseCard {...defaultProps} />);

    await waitFor(() => {
      const firstTimeLabels = getAllByText("First time");
      expect(firstTimeLabels.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows previous data when history exists", async () => {
    mockGetLastSession.mockResolvedValue({
      sessionId: "prev-session",
      completedAt: "2026-03-25T10:00:00.000Z",
      sets: [
        { setNumber: 1, weightKg: 60, reps: 10, setType: "normal" },
        { setNumber: 2, weightKg: 60, reps: 8, setType: "normal" },
        { setNumber: 3, weightKg: 55, reps: 6, setType: "failure" },
      ],
    });

    const { getByTestId } = render(<ExerciseCard {...defaultProps} />);

    await waitFor(() => {
      expect(getByTestId("previous-0")).toBeTruthy();
    });
  });

  it("tap-to-copy fills weight and reps inputs from PREVIOUS", async () => {
    mockGetLastSession.mockResolvedValue({
      sessionId: "prev-session",
      completedAt: "2026-03-25T10:00:00.000Z",
      sets: [{ setNumber: 1, weightKg: 60, reps: 10, setType: "normal" }],
    });

    const { getByTestId } = render(<ExerciseCard {...defaultProps} />);

    await waitFor(() => {
      expect(getByTestId("previous-0")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId("previous-0"));
    });

    const weightInput = getByTestId("weight-input-0");
    expect(weightInput.props.value).toBe("60");
  });

  it("tapping set type cycles through types", async () => {
    const { getAllByTestId } = render(<ExerciseCard {...defaultProps} />);

    await waitFor(() => {
      expect(getAllByTestId(/^set-type-/)).toHaveLength(3);
    });

    const setTypeButton = getAllByTestId(/^set-type-/)[0];

    expect(setTypeButton).toBeTruthy();

    await act(async () => {
      fireEvent.press(setTypeButton);
    });

    await waitFor(() => {
      const btn = getAllByTestId(/^set-type-/)[0];
      expect(btn.children.length).toBeGreaterThan(0);
    });
  });

  it("setType is included in onSetComplete callback data", async () => {
    const onSetComplete = jest.fn();
    const { getAllByTestId } = render(
      <ExerciseCard {...defaultProps} onSetComplete={onSetComplete} />,
    );

    await waitFor(() => {
      expect(getAllByTestId(/^set-row-/)).toHaveLength(3);
    });

    const setTypeButtons = getAllByTestId(/^set-type-/);
    const weightInputs = getAllByTestId(/^weight-input-/);
    const repsInputs = getAllByTestId(/^reps-input-/);
    const checkmarks = getAllByTestId(/^checkmark-/);

    await act(async () => {
      fireEvent.press(setTypeButtons[0]);
    });

    await act(async () => {
      fireEvent.changeText(weightInputs[0], "50");
      fireEvent.changeText(repsInputs[0], "12");
      fireEvent.press(checkmarks[0]);
    });

    expect(onSetComplete).toHaveBeenCalledWith(
      0,
      expect.objectContaining({
        setType: "warmup",
      }),
    );
  });

  it("pre-fills weight from currentWeightKg prop", async () => {
    const { getAllByTestId } = render(
      <ExerciseCard {...defaultProps} currentWeightKg={75} />,
    );

    await waitFor(() => {
      const weightInputs = getAllByTestId(/^weight-input-/);
      expect(weightInputs[0].props.value).toBe("75");
    });
  });

  it("converts weight display to lbs when userUnits is lbs", async () => {
    const { getAllByTestId } = render(
      <ExerciseCard {...defaultProps} currentWeightKg={60} userUnits="lbs" />,
    );

    await waitFor(() => {
      const weightInputs = getAllByTestId(/^weight-input-/);
      const displayedWeight = parseFloat(weightInputs[0].props.value);
      expect(displayedWeight).toBeCloseTo(132.3, 0);
    });
  });

  it("shows loading state while fetching history", () => {
    mockGetLastSession.mockReturnValue(new Promise(() => {}));

    const { getAllByText } = render(<ExerciseCard {...defaultProps} />);

    expect(getAllByText("...").length).toBeGreaterThanOrEqual(1);
  });

  it("does not crash when getPersonalRecords returns empty array", async () => {
    mockGetPersonalRecords.mockResolvedValue([]);

    const onSetComplete = jest.fn();
    const { getAllByTestId } = render(
      <ExerciseCard {...defaultProps} onSetComplete={onSetComplete} />,
    );

    await waitFor(() => {
      expect(getAllByTestId(/^set-row-/)).toHaveLength(3);
    });

    const weightInputs = getAllByTestId(/^weight-input-/);
    const repsInputs = getAllByTestId(/^reps-input-/);
    const checkmarks = getAllByTestId(/^checkmark-/);

    await act(async () => {
      fireEvent.changeText(weightInputs[0], "60");
      fireEvent.changeText(repsInputs[0], "10");
    });

    await act(async () => {
      fireEvent.press(checkmarks[0]);
    });

    expect(onSetComplete).toHaveBeenCalledWith(
      0,
      expect.objectContaining({
        weightKg: 60,
        reps: 10,
        completed: true,
      }),
    );
  });
});
