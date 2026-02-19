import { supabase } from "../supabase";
import { CreateProfileRequest, UpdateProfileRequest } from "../../types/user";
import { toDb, fromDb } from "../../utils/transformers/fieldNameTransformers";
import { UserProfileResponse } from "./types";
import { mapDatabaseProfileToUserProfile } from "./mappers";

export async function createProfile(
  profileData: CreateProfileRequest,
): Promise<UserProfileResponse> {
  try {
    const dbData = toDb(profileData);

    const { data, error } = await supabase
      .from("profiles")
      .insert([dbData])
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    const transformedData = fromDb(data);
    const userProfile = mapDatabaseProfileToUserProfile(transformedData);
    return {
      success: true,
      data: userProfile,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create profile",
    };
  }
}

export async function getProfile(userId: string): Promise<UserProfileResponse> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    const transformedData = fromDb(data);
    const userProfile = mapDatabaseProfileToUserProfile(transformedData);
    return {
      success: true,
      data: userProfile,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get profile",
    };
  }
}

export async function updateProfile(
  userId: string,
  updates: UpdateProfileRequest,
): Promise<UserProfileResponse> {
  try {
    const dbUpdates = toDb(updates);

    const { data, error } = await supabase
      .from("profiles")
      .update(dbUpdates)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    const transformedData = fromDb(data);
    const userProfile = mapDatabaseProfileToUserProfile(transformedData);
    return {
      success: true,
      data: userProfile,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update profile",
    };
  }
}

export async function deleteProfile(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("profiles").delete().eq("id", userId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete profile",
    };
  }
}
