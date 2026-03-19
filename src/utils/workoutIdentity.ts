import type { DayWorkout, WeeklyWorkoutPlan } from "../ai";
import type { CompletedSession } from "../stores/fitness/types";
import {
  getCurrentWeekStart,
  getDayNameForDate,
  getLocalDateString,
  getWeekStartForDate,
} from "./weekUtils";

export function getWorkoutDayKey(
  workout: Pick<DayWorkout, "dayOfWeek"> | null | undefined,
): string {
  return workout?.dayOfWeek?.toLowerCase() || "unknown";
}

export function getWorkoutSlotKey(
  workout: Pick<DayWorkout, "id" | "dayOfWeek">,
  workoutsOrPlan?: WeeklyWorkoutPlan | Array<Pick<DayWorkout, "id" | "dayOfWeek">>,
): string {
  const workouts = Array.isArray(workoutsOrPlan)
    ? workoutsOrPlan
    : workoutsOrPlan?.workouts || [];
  const dayKey = getWorkoutDayKey(workout);
  const dayWorkouts = workouts.filter(
    (candidate) => getWorkoutDayKey(candidate as DayWorkout) === dayKey,
  );
  const slotIndex = Math.max(
    dayWorkouts.findIndex((candidate) => candidate.id === workout.id),
    0,
  );

  return `${dayKey}:${slotIndex}`;
}

export function getCompletedSessionDayKey(
  session: Pick<CompletedSession, "completedAt" | "plannedDayKey">,
): string {
  return session.plannedDayKey || getDayNameForDate(session.completedAt);
}

export function getCompletedSessionWeekStart(
  session: Pick<CompletedSession, "completedAt" | "weekStart">,
): string {
  return session.weekStart || getWeekStartForDate(session.completedAt);
}

export function findCompletedSessionForWorkout(params: {
  completedSessions: CompletedSession[];
  workout: DayWorkout;
  plan?: WeeklyWorkoutPlan | null;
  weekStart?: string;
}): CompletedSession | null {
  const {
    completedSessions,
    workout,
    plan,
    weekStart = getCurrentWeekStart(),
  } = params;
  const dayKey = getWorkoutDayKey(workout);
  const slotKey = getWorkoutSlotKey(workout, plan || undefined);

  const matches = completedSessions.filter((session) => {
    if (session.type !== "planned") return false;
    if (getCompletedSessionWeekStart(session) !== weekStart) return false;
    if (getCompletedSessionDayKey(session) !== dayKey) return false;
    if (session.planSlotKey) return session.planSlotKey === slotKey;
    return session.workoutId === workout.id;
  });

  return (
    matches.sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    )[0] || null
  );
}

export function hasCompletedSessionForDay(params: {
  completedSessions: CompletedSession[];
  dayKey: string;
  weekStart?: string;
}): boolean {
  const { completedSessions, dayKey, weekStart = getCurrentWeekStart() } = params;

  return completedSessions.some(
    (session) =>
      session.type === "planned" &&
      getCompletedSessionWeekStart(session) === weekStart &&
      getCompletedSessionDayKey(session) === dayKey,
  );
}

export function getCompletedSessionsForDate(
  completedSessions: CompletedSession[],
  value?: string | Date,
): CompletedSession[] {
  const dateKey = getLocalDateString(value);
  return completedSessions.filter(
    (session) => getLocalDateString(session.completedAt) === dateKey,
  );
}

export function getPlanIdentityForWorkoutId(
  workoutId: string | null | undefined,
  plan?: WeeklyWorkoutPlan | null,
): { plannedDayKey?: string; planSlotKey?: string } {
  if (!workoutId || !plan?.workouts?.length) {
    return {};
  }

  const workout = plan.workouts.find((candidate) => candidate.id === workoutId);
  if (!workout) {
    return {};
  }

  return {
    plannedDayKey: getWorkoutDayKey(workout),
    planSlotKey: getWorkoutSlotKey(workout, plan),
  };
}

export function findPlanWorkoutBySessionIdentity(params: {
  plan?: WeeklyWorkoutPlan | null;
  workoutId?: string | null;
  plannedDayKey?: string | null;
  planSlotKey?: string | null;
}): DayWorkout | undefined {
  const { plan, workoutId, plannedDayKey, planSlotKey } = params;
  const workouts = plan?.workouts || [];

  if (planSlotKey) {
    const bySlot = workouts.find(
      (workout) => getWorkoutSlotKey(workout, plan || undefined) === planSlotKey,
    );
    if (bySlot) return bySlot;
  }

  if (plannedDayKey) {
    const sameDay = workouts.filter(
      (workout) => getWorkoutDayKey(workout) === plannedDayKey,
    );
    const byDayAndId = sameDay.find((workout) => workout.id === workoutId);
    if (byDayAndId) return byDayAndId;
    if (sameDay.length === 1) return sameDay[0];
  }

  return workouts.find((workout) => workout.id === workoutId);
}
