import { useAppStateStore } from "../../stores/appStateStore";

describe("appStateStore", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-18T12:00:00"));
    useAppStateStore.getState().reset();
  });

  afterEach(() => {
    useAppStateStore.getState().reset();
    jest.useRealTimers();
  });

  it("initializes selectedDay from the selectedDate source of truth", () => {
    const state = useAppStateStore.getState();

    expect(state.selectedDate).toBe("2026-03-18");
    expect(state.selectedDay).toBe("wednesday");
    expect(state.isSelectedDayToday()).toBe(true);
  });

  it("shifts the selected date across week boundaries without jumping to the wrong week", () => {
    useAppStateStore.getState().setSelectedDate("2026-03-17");

    useAppStateStore.getState().shiftSelectedDate(-2);

    expect(useAppStateStore.getState().selectedDate).toBe("2026-03-15");
    expect(useAppStateStore.getState().selectedDay).toBe("sunday");

    useAppStateStore.getState().shiftSelectedDate(-1);

    expect(useAppStateStore.getState().selectedDate).toBe("2026-03-14");
    expect(useAppStateStore.getState().selectedDay).toBe("saturday");
  });

  it("keeps setSelectedDay anchored to the currently selected week", () => {
    useAppStateStore.getState().setSelectedDate("2026-03-18");

    useAppStateStore.getState().setSelectedDay("monday");

    expect(useAppStateStore.getState().selectedDate).toBe("2026-03-16");
    expect(useAppStateStore.getState().selectedDay).toBe("monday");
  });
});
