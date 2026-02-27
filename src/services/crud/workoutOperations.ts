import { dataBridge } from "../DataBridge";
import { offlineService } from "../offline";
import { supabase } from "../supabase";
import { LocalWorkoutSession } from "../../types/localData";

export async function createWorkoutSession(
  session: LocalWorkoutSession,
  initialize: () => Promise<void>,
): Promise<void> {
  try {
    console.log("📝 Creating workout session:", {
      id: session.id,
      workoutId: session.workoutId,
      duration: session.duration,
      calories: session.caloriesBurned,
      exerciseCount: session.exercises?.length || 0,
    });

    await initialize();
    await dataBridge.storeWorkoutSession(session);
    console.log(
      `✅ Workout session ${session.id} created successfully in local storage`,
    );

    const stored = await readWorkoutSession(session.id, initialize);
    if (!stored) {
      console.warn("⚠️ Workout session was not found after creation");
    } else {
      console.log("✅ Workout session verified in local storage");
    }

    await syncWorkoutSessionToSupabase(session);
  } catch (error) {
    console.error("❌ Failed to create workout session:", error);
    console.error("Session data:", JSON.stringify(session, null, 2));
    throw error;
  }
}

async function syncWorkoutSessionToSupabase(
  session: LocalWorkoutSession,
): Promise<void> {
  try {
    const userId = session.userId;

    if (!userId || userId.startsWith("guest") || userId === "local-user") {
      console.log("⏭️ Skipping Supabase sync for guest/local user");
      return;
    }

    const { error } = await supabase.from("workout_sessions").upsert({
      id: session.id,
      user_id: userId,
      workout_id: session.workoutId || null,
      started_at: session.startedAt,
      completed_at: session.completedAt,
      duration: session.duration,
      calories_burned: session.caloriesBurned,
      exercises: session.exercises,
      notes: session.notes || "",
      rating: session.rating || 0,
      is_completed: session.isCompleted,
    }, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      console.warn(
        "⚠️ Failed to sync workout session to Supabase:",
        error.message,
      );
      offlineService.queueAction({
        type: "CREATE",
        table: "workout_sessions",
        data: {
          id: session.id,
          user_id: session.userId,
          workout_id: session.workoutId,
          started_at: session.startedAt,
          completed_at: session.completedAt,
          duration: session.duration,
          calories_burned: session.caloriesBurned,
          exercises: session.exercises,
          notes: session.notes || "",
          rating: session.rating || 0,
          is_completed: session.isCompleted,
        },
        userId: userId,
        maxRetries: 3,
      });
    } else {
      console.log("✅ Workout session synced to Supabase:", session.id);
    }
  } catch (syncError) {
    console.warn("⚠️ Supabase sync error (will retry later):", syncError);
    offlineService.queueAction({
      type: "CREATE",
      table: "workout_sessions",
      data: {
        id: session.id,
        user_id: session.userId,
        workout_id: session.workoutId,
        started_at: session.startedAt,
        completed_at: session.completedAt,
        duration: session.duration,
        calories_burned: session.caloriesBurned,
        exercises: session.exercises,
        notes: session.notes || "",
        rating: session.rating || 0,
        is_completed: session.isCompleted,
      },
      userId: session.userId || "unknown",
      maxRetries: 3,
    });
  }
}

export async function readWorkoutSessions(
  limit: number | undefined,
  initialize: () => Promise<void>,
): Promise<LocalWorkoutSession[]> {
  try {
    await initialize();
    return await dataBridge.getWorkoutSessions(limit);
  } catch (error) {
    console.error("Failed to read workout sessions:", error);
    return [];
  }
}

export async function readWorkoutSession(
  sessionId: string,
  initialize: () => Promise<void>,
): Promise<LocalWorkoutSession | null> {
  try {
    await initialize();
    const sessions = await dataBridge.getWorkoutSessions();
    return sessions.find((session) => session.id === sessionId) || null;
  } catch (error) {
    console.error("Failed to read workout session:", error);
    return null;
  }
}

export async function updateWorkoutSession(
  sessionId: string,
  updates: Partial<LocalWorkoutSession>,
  initialize: () => Promise<void>,
): Promise<void> {
  try {
    await initialize();
    await dataBridge.updateWorkoutSession(sessionId, updates);
    console.log(
      `Workout session ${sessionId} updated successfully in local storage`,
    );

    const updatedSession = await readWorkoutSession(sessionId, initialize);
    if (updatedSession) {
      await syncWorkoutSessionToSupabase(updatedSession);
    }
  } catch (error) {
    console.error("Failed to update workout session:", error);
    throw error;
  }
}

export async function deleteWorkoutSession(
  sessionId: string,
  initialize: () => Promise<void>,
): Promise<void> {
  try {
    await initialize();
    // Delete from Supabase directly

    // Also delete from Supabase
    try {
      const { error } = await supabase
        .from("workout_sessions")
        .delete()
        .eq("id", sessionId);
      if (error) {
        console.warn("\u26a0\ufe0f Failed to delete from Supabase:", error.message);
      }
    } catch (syncError) {
      console.warn("\u26a0\ufe0f Supabase delete sync error:", syncError);
    }

    console.log(`Workout session ${sessionId} deleted`);
  } catch (error) {
    console.error("Failed to delete workout session:", error);
    throw error;
  }
}
