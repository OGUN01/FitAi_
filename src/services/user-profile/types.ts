import type { Database } from "../supabase";
import { UserProfile, FitnessGoals } from "../../types/user";

export type DatabaseProfile = Database["public"]["Tables"]["profiles"]["Row"];
export type DatabaseFitnessGoals =
  Database["public"]["Tables"]["fitness_goals"]["Row"];

export interface UserProfileResponse {
  success: boolean;
  data?: UserProfile;
  error?: string;
}

export interface FitnessGoalsResponse {
  success: boolean;
  data?: FitnessGoals;
  error?: string;
}

export interface GenericResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
