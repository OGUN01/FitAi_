// Module-level flag shared between MainNavigation and WorkoutSessionScreen so
// the Android hardware back button behaves correctly when the ExerciseHistory
// overlay is open on top of an active workout session.
//
// React Native's BackHandler invokes listeners LIFO (most-recently-registered
// first). WorkoutSessionScreen registers its own 'hardwareBackPress' listener
// after MainNavigation's, so without this flag WorkoutSessionScreen's handler
// always intercepts the press first and shows the "Exit Workout?" alert —
// MainNavigation's ExerciseHistory-only-close special case in goBack() is
// never reached via the hardware button.
//
// MainNavigation sets `isOpen` whenever exerciseHistorySession is active on
// top of an active workoutSession. WorkoutSessionScreen's back handler checks
// it first and, when true, returns `false` (unhandled) so RN falls through to
// the next-registered listener — MainNavigation's — which closes only the
// ExerciseHistory overlay and keeps the workout session alive.
export const exerciseHistoryOverlayFlag = {
  isOpen: false,
};
