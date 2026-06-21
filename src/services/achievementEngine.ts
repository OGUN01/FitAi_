// Achievement Engine — the runtime evaluator for FitAI achievements.
//
// Responsibilities:
//   1. Own the achievement catalog (loaded from ./achievements/definitions).
//   2. Evaluate each AchievementRequirement against an activityData snapshot.
//   3. Track per-user progress (Map<userId+achievementId, UserAchievement>).
//   4. Emit "achievementUnlocked" events so the store can show celebrations +
//      persist to Supabase. Idempotent — never re-unlocks an already-completed
//      achievement.
//   5. Aggregate stats (total / completed / byTier / byCategory / FitCoins).
//
// The store is the runtime source of truth for UI; this engine is the
// evaluation + emission layer the store delegates to. The catalog
// (definitions.ts) is the single source of achievement DEFINITIONS.

export type {
  Achievement,
  UserAchievement,
  AchievementCategory,
  AchievementTier,
  AchievementRequirement,
  AchievementReward,
} from "./achievements/types";

import type {
  Achievement,
  UserAchievement,
  AchievementCategory,
  AchievementTier,
  AchievementRequirement,
} from "./achievements/types";
import { ACHIEVEMENTS } from "./achievements/definitions";

// ──────────────────────────────────────────────────────────────────────────
// Minimal typed event emitter (Node-style on/emit/removeAllListeners).
// We can't extend the global Node EventEmitter in RN without pulling in
// `events`, so this is a tiny self-contained implementation. The store's
// `achievementUnlocked` listener depends on `emit` actually firing.
// ──────────────────────────────────────────────────────────────────────
type EventListener = (...args: any[]) => void;

class EventEmitter {
  private listeners: Map<string, Set<EventListener>> = new Map();

  on(event: string, listener: EventListener): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return this;
  }

  off(event: string, listener: EventListener): this {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return false;
    // Clone to a array so listeners can remove themselves mid-emit without
    // mutating the Set we're iterating.
    for (const listener of Array.from(set)) {
      try {
        listener(...args);
      } catch (err) {
        // Never let one listener's throw break the others.
        console.error(`[achievementEngine] listener error for "${event}":`, err);
      }
    }
    return true;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Requirement evaluation
// ──────────────────────────────────────────────────────────────────────
// Maps an AchievementRequirement.type to the activityData field that holds
// the metric's current value. `custom` type reads the field name from
// requirement.metadata.field (lets us express rich metrics — e.g.
// workoutsBefore8am, uniqueWorkoutTypes — without bloating the type union).
const TYPE_TO_FIELD: Record<AchievementRequirement["type"], string> = {
  workout_count: "totalWorkouts",
  workout_streak: "workoutStreak",
  calories_burned: "totalCalories",
  weight_goal: "weightGoalAchieved",
  nutrition_log: "nutritionLogs",
  water_intake: "waterGoalsHit",
  sleep_hours: "sleepHours",
  steps: "steps",
  friend_count: "friendsCount",
  challenge_wins: "challengesWon",
  consistency_days: "consistentDays",
  custom: "", // resolved per-requirement via metadata.field
};

function resolveRequirementField(req: AchievementRequirement): string {
  if (req.type === "custom") {
    const metaField = req.metadata?.field;
    if (typeof metaField === "string" && metaField.length > 0) {
      return metaField;
    }
    console.warn(
      `[achievementEngine] custom requirement has no metadata.field (target=${req.target}); falling back to 0`,
    );
    return "";
  }
  return TYPE_TO_FIELD[req.type] ?? "";
}

function getNumericValue(
  activityData: Record<string, any>,
  field: string,
): number {
  if (!field) return 0;
  const raw = activityData?.[field];
  if (typeof raw === "number") return raw;
  if (typeof raw === "boolean") return raw ? 1 : 0;
  if (raw == null) return 0;
  // Arrays/objects: count length as a sensible default (e.g. workoutTypeCounts).
  if (Array.isArray(raw)) return raw.length;
  if (typeof raw === "object") return Object.keys(raw).length;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Returns the current metric value for a single requirement.
function evaluateRequirementValue(
  req: AchievementRequirement,
  activityData: Record<string, any>,
): number {
  const field = resolveRequirementField(req);
  return getNumericValue(activityData, field);
}

// Returns true when the requirement's threshold is met.
function isRequirementMet(
  req: AchievementRequirement,
  activityData: Record<string, any>,
): boolean {
  return evaluateRequirementValue(req, activityData) >= req.target;
}

// The progress "maxProgress" for a multi-requirement achievement: use the
// largest target across requirements (so the progress bar scales sensibly).
// For single-requirement achievements this is just that requirement's target.
function maxTargetFor(achievement: Achievement): number {
  if (achievement.requirements.length === 0) return 1;
  return Math.max(...achievement.requirements.map((r) => r.target));
}

// ──────────────────────────────────────────────────────────────────────────
// Engine
// ──────────────────────────────────────────────────────────────────────
class AchievementEngine extends EventEmitter {
  private achievements: Achievement[] = [];
  // Keyed by `${userId}::${achievementId}` to keep per-user state isolated
  // even when multiple users share a session (e.g. guest → real user swap).
  private userAchievements: Map<string, UserAchievement> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    // Catalog is static — load synchronously into memory. Wrapped in a Promise
    // to preserve the existing async contract the store relies on.
    this.achievements = Array.from(ACHIEVEMENTS);
    this.initialized = true;
  }

  // Public for callers that need to re-sync progress from a UserAchievement
  // row loaded from Supabase (store.loadFromSupabase pushes these in via
  // checkAchievements-adjacent path; we expose a direct setter to avoid
  // re-evaluating stale activity data).
  setUserAchievement(userId: string, ua: UserAchievement): void {
    if (!userId || !ua?.achievementId) return;
    this.userAchievements.set(this.key(userId, ua.achievementId), ua);
  }

  getAllAchievements(): Achievement[] {
    return this.achievements;
  }

  getAchievementsByCategory(category: AchievementCategory): Achievement[] {
    return this.achievements.filter((a) => a.category === category);
  }

  getUserCompletedAchievements(userId: string): UserAchievement[] {
    return Array.from(this.userAchievements.values()).filter(
      (ua) => ua.userId === userId && ua.isCompleted,
    );
  }

  getUserAchievementProgress(userId: string): Map<string, UserAchievement> {
    const userProgress = new Map<string, UserAchievement>();
    this.userAchievements.forEach((achievement) => {
      if (achievement.userId === userId) {
        userProgress.set(achievement.achievementId, achievement);
      }
    });
    return userProgress;
  }

  /**
   * Evaluate every achievement against `activityData` for `userId`.
   *
   * - For each achievement: compute the best-progress value across its
   *   requirements (so multi-requirement achievements show partial progress).
   * - If ALL requirements are now met AND the achievement wasn't already
   *   completed → mark completed, set unlockedAt, emit "achievementUnlocked".
   * - Idempotent: an already-completed achievement is never re-emitted or
   *   re-rewarded, even if activityData regresses (we keep the completed state).
   * - Returns the list of NEWLY unlocked UserAchievements (empty if none).
   */
  async checkAchievements(
    userId: string,
    activityData: Record<string, any>,
  ): Promise<UserAchievement[]> {
    if (!userId || !this.initialized) {
      if (!userId) return [];
      // Auto-initialize if a caller forgot — catalog is sync-loadable.
      if (!this.initialized) {
        await this.initialize();
      }
    }

    const safeData = activityData || {};
    const newlyUnlocked: UserAchievement[] = [];

    for (const achievement of this.achievements) {
      const key = this.key(userId, achievement.id);
      const existing = this.userAchievements.get(key);

      // Skip re-evaluation once locked in as completed (idempotency).
      if (existing?.isCompleted) {
        continue;
      }

      // Per-requirement current values; progress = best fraction * its target,
      // expressed as an absolute number capped at the requirement's target.
      let bestFraction = 0;
      let allMet = true;

      for (const req of achievement.requirements) {
        const current = evaluateRequirementValue(req, safeData);
        const met = current >= req.target;
        if (!met) allMet = false;
        const fraction =
          req.target > 0 ? Math.min(current / req.target, 1) : met ? 1 : 0;
        if (fraction > bestFraction) bestFraction = fraction;
      }

      const maxProgress = maxTargetFor(achievement);
      const progress = Math.min(
        Math.round(bestFraction * maxProgress),
        maxProgress,
      );

      if (allMet) {
        // Newly completed.
        const unlockedAt = new Date().toISOString();
        const userAchievement: UserAchievement = {
          id: `${userId}-${achievement.id}-${unlockedAt}`,
          achievementId: achievement.id,
          userId,
          unlockedAt,
          progress: maxProgress,
          maxProgress,
          isCompleted: true,
          celebrationShown: false,
          fitCoinsEarned:
            achievement.reward.type === "fitcoins" &&
            typeof achievement.reward.value === "number"
              ? achievement.reward.value
              : 0,
        };
        this.userAchievements.set(key, userAchievement);
        newlyUnlocked.push(userAchievement);

        // Emit AFTER state is persisted so listeners that read engine state
        // (via getUserAchievementProgress) see the completed row.
        try {
          this.emit("achievementUnlocked", achievement, userAchievement);
        } catch (err) {
          // No silent failures — log but don't break the unlock loop.
          console.error(
            `[achievementEngine] emit("achievementUnlocked") failed for ${achievement.id}:`,
            err,
          );
        }
      } else if (existing) {
        // Update progress in place for an already-tracked (in-progress) row.
        if (progress !== existing.progress) {
          this.userAchievements.set(key, {
            ...existing,
            progress,
            maxProgress,
          });
        }
      } else {
        // First time we see this achievement — create an in-progress row
        // only if there's actual progress to show (avoids polluting the map
        // with 0-progress rows for every achievement on a brand-new user).
        if (progress > 0) {
          this.userAchievements.set(key, {
            id: `${userId}-${achievement.id}`,
            achievementId: achievement.id,
            userId,
            unlockedAt: "",
            progress,
            maxProgress,
            isCompleted: false,
            celebrationShown: false,
            fitCoinsEarned: 0,
          });
        }
      }
    }

    return newlyUnlocked;
  }

  getUserAchievementStats(userId: string): {
    total: number;
    completed: number;
    inProgress: number;
    completionRate: number;
    totalFitCoinsEarned: number;
    byTier: Record<AchievementTier, number>;
    byCategory: Record<AchievementCategory, number>;
  } {
    const total = this.achievements.length;

    const byTier: Record<AchievementTier, number> = {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
      legendary: 0,
    };

    const byCategory: Record<AchievementCategory, number> = {
      fitness: 0,
      nutrition: 0,
      consistency: 0,
      social: 0,
      milestone: 0,
      streak: 0,
      challenge: 0,
      exploration: 0,
      wellness: 0,
      special: 0,
    };

    const userProgress = this.getUserAchievementProgress(userId);
    let completed = 0;
    let inProgress = 0;
    let totalFitCoinsEarned = 0;

    // Index achievements by id for tier/category lookup.
    const byId = new Map(this.achievements.map((a) => [a.id, a]));

    userProgress.forEach((ua) => {
      const def = byId.get(ua.achievementId);
      if (!def) return;
      if (ua.isCompleted) {
        completed++;
        byTier[def.tier] = (byTier[def.tier] || 0) + 1;
        byCategory[def.category] = (byCategory[def.category] || 0) + 1;
        totalFitCoinsEarned += ua.fitCoinsEarned || 0;
      } else if (ua.progress > 0) {
        inProgress++;
      }
    });

    return {
      total,
      completed,
      inProgress,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      totalFitCoinsEarned,
      byTier,
      byCategory,
    };
  }

  private key(userId: string, achievementId: string): string {
    return `${userId}::${achievementId}`;
  }
}

export const achievementEngine = new AchievementEngine();
export default achievementEngine;
