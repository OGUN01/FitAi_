import { supabase } from "../supabase";
import {
  OnboardingProgressData,
  OnboardingProgressRow,
} from "../../types/onboarding";

export class OnboardingProgressService {
  static async save(
    userId: string,
    progress: OnboardingProgressData,
  ): Promise<boolean> {
    try {
      const progressData: Partial<OnboardingProgressRow> = {
        user_id: userId,
        current_tab: progress.current_tab,
        completed_tabs: progress.completed_tabs,
        tab_validation_status: progress.tab_validation_status,
        total_completion_percentage: progress.total_completion_percentage,
        last_updated: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("onboarding_progress")
        .upsert(progressData, {
          onConflict: "user_id",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(
          "[DB-SERVICE] OnboardingProgressService: Database error:",
          error,
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "[DB-SERVICE] OnboardingProgressService: Unexpected error:",
        error,
      );
      return false;
    }
  }

  static async load(userId: string): Promise<OnboardingProgressData | null> {
    try {
      const { data, error } = await supabase
        .from("onboarding_progress")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error(
          "[DB-SERVICE] OnboardingProgressService: Database error:",
          error,
        );
        return null;
      }

      if (!data) {
        const initialProgress: OnboardingProgressData = {
          current_tab: 1,
          completed_tabs: [],
          tab_validation_status: {},
          total_completion_percentage: 0,
        };

        await this.save(userId, initialProgress);
        return initialProgress;
      }

      const progress: OnboardingProgressData = {
        current_tab: data.current_tab || 1,
        completed_tabs: data.completed_tabs || [],
        tab_validation_status: data.tab_validation_status || {},
        total_completion_percentage: data.total_completion_percentage || 0,
        started_at: data.started_at,
        completed_at: data.completed_at,
        last_updated: data.last_updated,
      };

      return progress;
    } catch (error) {
      console.error("OnboardingProgressService: Unexpected error:", error);
      return null;
    }
  }

  static async markComplete(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("onboarding_progress")
        .update({
          completed_at: new Date().toISOString(),
          total_completion_percentage: 100,
          completed_tabs: [1, 2, 3, 4, 5],
          last_updated: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        console.error("OnboardingProgressService: Database error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("OnboardingProgressService: Unexpected error:", error);
      return false;
    }
  }
}
