import { supabase } from "../supabase";
import {
  PersonalInfoData,
  TabValidationResult,
  ProfilesRow,
} from "../../types/onboarding";

// ============================================================================
// PERSONAL INFO SERVICE
// ============================================================================

export class PersonalInfoService {
  static async save(userId: string, data: PersonalInfoData): Promise<boolean> {
    try {
      // CRITICAL: Get user email from auth session - required NOT NULL field in profiles table
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userEmail = session?.user?.email || "";

      if (!userEmail) {
        console.warn(
          "[DB-SERVICE] PersonalInfoService: No email found in auth session",
        );
      }

      // Ensure NOT NULL fields have fallback values
      const firstName = data.first_name || "";
      const lastName = data.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim() || "User";

      const profileData: Partial<ProfilesRow> = {
        id: userId,
        email: userEmail, // Required NOT NULL field
        first_name: firstName,
        last_name: lastName,
        name: fullName, // Computed full name with fallback
        age: data.age || 25, // NOT NULL - default to 25 if missing
        gender: data.gender || "prefer_not_to_say", // NOT NULL - safe default
        country: data.country,
        state: data.state,
        region: data.region || null,
        wake_time: data.wake_time,
        sleep_time: data.sleep_time,
        occupation_type: data.occupation_type,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(profileData, {
        onConflict: "id",
        ignoreDuplicates: false,
      });

      if (error) {
        console.error(
          "[DB-SERVICE] PersonalInfoService: Database error:",
          error,
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "[DB-SERVICE] PersonalInfoService: Unexpected error:",
        error,
      );
      return false;
    }
  }

  static async load(userId: string): Promise<PersonalInfoData | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error(
          "[DB-SERVICE] PersonalInfoService: Database error:",
          error,
        );
        return null;
      }

      if (!data) {
        return null;
      }

      // VALIDATION: CRITICAL FIELDS - no fallbacks allowed
      if (!data.age || data.age === 0) {
        throw new Error("Age is required for accurate health calculations");
      }
      if (!data.gender || data.gender === "") {
        throw new Error(
          "Gender is required for accurate BMR and health calculations",
        );
      }

      const personalInfo: PersonalInfoData = {
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        name: data.name || "", // Load the name field from database
        age: data.age, // NO FALLBACK - validation above ensures it exists
        gender: data.gender, // NO FALLBACK - validation above ensures it exists
        country: data.country || "",
        state: data.state || "",
        region: data.region === null ? undefined : data.region,
        wake_time: data.wake_time || "07:00",
        sleep_time: data.sleep_time || "23:00",
        occupation_type: data.occupation_type || "desk_job",
      };

      return personalInfo;
    } catch (error) {
      console.error(
        "[DB-SERVICE] PersonalInfoService: Unexpected error:",
        error,
      );
      return null;
    }
  }

  static async delete(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) {
        console.error("PersonalInfoService: Database error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("PersonalInfoService: Unexpected error:", error);
      return false;
    }
  }

  /**
   * Calculate sleep duration from wake and sleep times
   */
  static calculateSleepDuration(wakeTime: string, sleepTime: string): number {
    const [wakeHour, wakeMin] = wakeTime.split(":").map(Number);
    const [sleepHour, sleepMin] = sleepTime.split(":").map(Number);

    const wakeMinutes = wakeHour * 60 + wakeMin;
    const sleepMinutes = sleepHour * 60 + sleepMin;

    let duration = wakeMinutes - sleepMinutes;
    if (duration <= 0) duration += 24 * 60; // Handle overnight sleep

    return duration / 60; // Return hours as decimal
  }

  /**
   * Validate personal info data
   */
  static validate(data: PersonalInfoData | null): TabValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      return {
        is_valid: false,
        errors: [
          "First name is required",
          "Last name is required",
          "Valid age (13-120) is required",
          "Gender selection is required",
          "Country is required",
          "Occupation type is required",
        ],
        warnings: [],
        completion_percentage: 0,
      };
    }

    // Required field validation
    if (!data.first_name?.trim()) errors.push("First name is required");
    if (!data.last_name?.trim()) errors.push("Last name is required");
    if (!data.age || data.age < 13 || data.age > 120)
      errors.push("Valid age (13-120) is required");
    if (!data.gender) errors.push("Gender selection is required");
    if (!data.country?.trim()) errors.push("Country is required");
    if (!data.occupation_type) errors.push("Occupation type is required");
    if (!data.wake_time) errors.push("Wake time is required");
    if (!data.sleep_time) errors.push("Sleep time is required");

    // Sleep duration warnings
    if (data.wake_time && data.sleep_time) {
      const sleepHours = this.calculateSleepDuration(
        data.wake_time,
        data.sleep_time,
      );
      if (sleepHours < 6)
        warnings.push("Consider getting more sleep (7-9 hours recommended)");
      if (sleepHours > 10) warnings.push("Very long sleep duration detected");
    }

    // Calculate completion percentage
    const requiredFields = [
      "first_name",
      "last_name",
      "age",
      "gender",
      "country",
      "occupation_type",
      "wake_time",
      "sleep_time",
    ];
    const completedFields = requiredFields.filter((field) => {
      const value = data[field as keyof PersonalInfoData];
      return (
        value !== null && value !== undefined && value !== "" && value !== 0
      );
    }).length;

    const completionPercentage = Math.round(
      (completedFields / requiredFields.length) * 100,
    );

    const result = {
      is_valid: errors.length === 0,
      errors,
      warnings,
      completion_percentage: completionPercentage,
    };

    return result;
  }
}
