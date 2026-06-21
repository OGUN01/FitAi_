// Manual mock for expo-haptics.
//
// Native haptics module — no unit-testable logic. It pulls ESM transitively
// that crashes Jest's node env ("Cannot use import statement outside a
// module") in suites that import components using haptics (via src/utils/haptics).
// Mocking as no-op async functions lets those suites run.
module.exports = {
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  selection: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: {
    Success: "success",
    Warning: "warning",
    Error: "error",
  },
};
