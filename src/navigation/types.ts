// Navigation Types
//
// NOTE: FitAI does NOT use React Navigation. The app shell is a hand-rolled
// boolean-flag state machine implemented in
// src/components/navigation/MainNavigation.tsx (tabs + overlay "sessions"
// like workoutSession, mealSession, templateLibrarySession, etc., each
// toggled via plain useState). There is no generated stack/tab navigator, so
// most React-Navigation-style param-list types have no real consumer.
//
// RootStackParamList is kept below only because WorkoutSessionScreen.tsx
// references it in a comment for context; if that reference goes away this
// file can be deleted along with the barrel export in index.ts.

import { DayWorkout, DayMeal } from "../types/ai";

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  WorkoutSession: { workout: DayWorkout; sessionId?: string; resumeExerciseIndex?: number; isExtra?: boolean };
  CookingSession: { meal: DayMeal };
  /**
   * Auth deep-link target for Supabase password-reset (`type=recovery`) links.
   * `token` is optional: in the PKCE flow the session is established by the
   * time the screen mounts (Supabase exchanges the `code` automatically), so
   * the screen re-derives its state from `supabase.auth.getSession()` rather
   * than the token. The token is surfaced for diagnostic/fallback use only.
   */
  PasswordReset: { token?: string };
};
