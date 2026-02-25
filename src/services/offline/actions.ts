import { supabase } from "../supabase";
import { OfflineAction, SupabaseResponse } from "./types";

function isValidSupabaseResponse(
  response: unknown,
): response is SupabaseResponse {
  if (!response || typeof response !== "object") {
    return false;
  }
  return true;
}

function validateSupabaseResponse(
  response: unknown,
  operation: string,
  table: string,
): { valid: boolean; error?: string } {
  if (!isValidSupabaseResponse(response)) {
    const errorMsg = `Received malformed Supabase response for ${operation} on ${table}: ${typeof response}`;
    console.error(errorMsg, response);
    return { valid: false, error: errorMsg };
  }

  const supabaseRes = response as SupabaseResponse;

  if (supabaseRes.error) {
    const errorMsg = `Supabase error for ${operation} on ${table}: ${supabaseRes.error.message}`;
    console.error(errorMsg, supabaseRes.error);
    return { valid: false, error: errorMsg };
  }

  return { valid: true };
}


// Map LocalWorkoutSession camelCase fields to Supabase snake_case columns
function mapSessionToDb(data: Record<string, unknown>) {
  return {
    user_id: data.userId,
    workout_plan_id: null, // data.workoutId is not a UUID FK to user_workout_plans
    workout_name: typeof data.notes === 'string' ? data.notes?.split(' - ')[1] || 'Workout' : 'Workout',
    workout_type: 'general',
    started_at: data.startedAt,
    completed_at: data.completedAt,
    total_duration_minutes: data.duration,
    calories_burned: data.caloriesBurned,
    exercises_completed: data.exercises,
    notes: data.notes || '',
    enjoyment_rating: data.rating || 0,
    is_completed: data.isCompleted,
    completion_percentage: data.isCompleted ? 100 : 0,
  };
}

export async function executeAction(action: OfflineAction): Promise<void> {
  const { type, table, data } = action;
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `🔄 Attempting ${type} on ${table} (attempt ${attempt}/${maxRetries})`,
      );

      switch (type) {
        case "CREATE":
          const insertData = table === 'workout_sessions' ? mapSessionToDb(data as Record<string, unknown>) : data;
          const createResponse = await supabase.from(table).insert([insertData]);
          const createValidation = validateSupabaseResponse(
            createResponse,
            "CREATE",
            table,
          );
          if (!createValidation.valid) {
            throw new Error(createValidation.error);
          }
          console.log(`✅ Successfully created record in ${table}`);
          break;

        case "UPDATE":
          const { id, ...updateData } = data;
          if (!id) {
            throw new Error(
              `UPDATE operation missing required 'id' field for table ${table}`,
            );
          }
          const updateResponse = await supabase
            .from(table)
            .update(updateData)
            .eq("id", id);
          const updateValidation = validateSupabaseResponse(
            updateResponse,
            "UPDATE",
            table,
          );
          if (!updateValidation.valid) {
            throw new Error(updateValidation.error);
          }
          console.log(`✅ Successfully updated record ${id} in ${table}`);
          break;

        case "DELETE":
          if (!data.id) {
            throw new Error(
              `DELETE operation missing required 'id' field for table ${table}`,
            );
          }
          const deleteResponse = await supabase
            .from(table)
            .delete()
            .eq("id", data.id);
          const deleteValidation = validateSupabaseResponse(
            deleteResponse,
            "DELETE",
            table,
          );
          if (!deleteValidation.valid) {
            throw new Error(deleteValidation.error);
          }
          console.log(
            `✅ Successfully deleted record ${data.id} from ${table}`,
          );
          break;

        default:
          throw new Error(`Unknown action type: ${type}`);
      }

      return;
    } catch (error) {
      lastError = error as Error;
      console.error(
        `❌ Attempt ${attempt} failed for ${type} on ${table}:`,
        error,
      );

      if (attempt < maxRetries) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`⏳ Retrying in ${backoffDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  }

  const errorMessage = `Failed to execute ${type} on ${table} after ${maxRetries} attempts: ${lastError?.message}`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}
