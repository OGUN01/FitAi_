import { supabase } from "../../services/supabase";
import type { Discrepancy, ConsistencyReport, DataType } from "./types";
import { compareLocalData, determineSeverity } from "./comparators";
import { validateDataIntegrity } from "./validators";
import { createReport, getSummary } from "./reporters";

export class ConsistencyChecker {
  private discrepancies: Discrepancy[] = [];
  private currentReport: ConsistencyReport | null = null;

  constructor() {
    this.log("ConsistencyChecker initialized");
  }

  private log(message: string, data?: any): void {
    if (data !== undefined) {
      console.log(`[ConsistencyChecker] ${message}`, data);
    } else {
      console.log(`[ConsistencyChecker] ${message}`);
    }
  }

  private logWarning(message: string, data?: any): void {
    if (data !== undefined) {
      console.warn(`[ConsistencyChecker] WARNING: ${message}`, data);
    } else {
      console.warn(`[ConsistencyChecker] WARNING: ${message}`);
    }
  }

  private logError(message: string, data?: any): void {
    if (data !== undefined) {
      console.error(`[ConsistencyChecker] ERROR: ${message}`, data);
    } else {
      console.error(`[ConsistencyChecker] ERROR: ${message}`);
    }
  }

  private addDiscrepancy(
    dataType: string,
    field: string,
    oldValue: any,
    newValue: any,
  ): void {
    const severity = determineSeverity(dataType, field);

    const discrepancy: Discrepancy = {
      dataType,
      field,
      oldValue,
      newValue,
      severity,
    };

    this.discrepancies.push(discrepancy);

    if (severity === "error") {
      this.logError(`Critical mismatch in ${dataType}.${field}`, {
        old: oldValue,
        new: newValue,
      });
    } else if (severity === "warning") {
      this.logWarning(`Mismatch in ${dataType}.${field}`, {
        old: oldValue,
        new: newValue,
      });
    } else {
      this.log(`Info: Difference in ${dataType}.${field}`, {
        old: oldValue,
        new: newValue,
      });
    }
  }

  compareLocalData(oldData: any, newData: any): boolean {
    this.log("Starting local data comparison");
    this.discrepancies = [];

    const { isMatch, discrepancies } = compareLocalData(oldData, newData);
    this.discrepancies = discrepancies;

    for (const discrepancy of discrepancies) {
      if (discrepancy.severity === "error") {
        this.logError(
          `Critical mismatch in ${discrepancy.dataType}.${discrepancy.field}`,
          {
            old: discrepancy.oldValue,
            new: discrepancy.newValue,
          },
        );
      } else if (discrepancy.severity === "warning") {
        this.logWarning(
          `Mismatch in ${discrepancy.dataType}.${discrepancy.field}`,
          {
            old: discrepancy.oldValue,
            new: discrepancy.newValue,
          },
        );
      } else {
        this.log(
          `Info: Difference in ${discrepancy.dataType}.${discrepancy.field}`,
          {
            old: discrepancy.oldValue,
            new: discrepancy.newValue,
          },
        );
      }
    }

    this.log(`Local data comparison complete. Match: ${isMatch}`);
    return isMatch;
  }

  async compareDatabaseData(userId: string): Promise<boolean> {
    this.log(`Starting database comparison for user: ${userId}`);
    this.discrepancies = [];

    try {
      const [
        { data: profileData, error: profileError },
        { data: dietData, error: dietError },
        { data: bodyData, error: bodyError },
        { data: workoutData, error: workoutError },
        { data: advancedData, error: advancedError },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase
          .from("diet_preferences")
          .select("*")
          .eq("user_id", userId)
          .single(),
        supabase
          .from("body_analysis")
          .select("*")
          .eq("user_id", userId)
          .single(),
        supabase
          .from("workout_preferences")
          .select("*")
          .eq("user_id", userId)
          .single(),
        supabase
          .from("advanced_review")
          .select("*")
          .eq("user_id", userId)
          .single(),
      ]);

      if (profileError && profileError.code !== "PGRST116") {
        this.logWarning("Error fetching profile", profileError);
      }
      if (dietError && dietError.code !== "PGRST116") {
        this.logWarning("Error fetching diet preferences", dietError);
      }
      if (bodyError && bodyError.code !== "PGRST116") {
        this.logWarning("Error fetching body analysis", bodyError);
      }
      if (workoutError && workoutError.code !== "PGRST116") {
        this.logWarning("Error fetching workout preferences", workoutError);
      }
      if (advancedError && advancedError.code !== "PGRST116") {
        this.logWarning("Error fetching advanced review", advancedError);
      }

      const databaseData = {
        profiles: profileData,
        diet_preferences: dietData,
        body_analysis: bodyData,
        workout_preferences: workoutData,
        advanced_review: advancedData,
      };

      let allValid = true;

      for (const [tableName, data] of Object.entries(databaseData)) {
        if (data) {
          const validation = validateDataIntegrity(data, tableName as DataType);
          if (!validation.isValid) {
            allValid = false;
            this.log(`Validation failed for ${tableName}`, validation.errors);
          }
        }
      }

      this.log(`Database comparison complete. All valid: ${allValid}`);
      return allValid && this.discrepancies.length === 0;
    } catch (error) {
      this.logError("Database comparison failed", error);
      throw error;
    }
  }

  validateDataIntegrity(data: any, dataType: DataType) {
    this.log(`Validating data integrity for: ${dataType}`);
    const result = validateDataIntegrity(data, dataType);
    this.log(`Validation result for ${dataType}:`, result);
    return result;
  }

  async runFullAudit(userId?: string): Promise<ConsistencyReport> {
    this.log(`Starting full audit${userId ? ` for user: ${userId}` : ""}`);
    this.discrepancies = [];

    const checks = {
      localStorageMatch: true,
      databaseMatch: true,
      schemaValid: true,
    };

    if (userId) {
      try {
        checks.databaseMatch = await this.compareDatabaseData(userId);
      } catch {
        checks.databaseMatch = false;
      }
    }

    checks.schemaValid = !this.discrepancies.some(
      (d) => d.severity === "error" && d.field.includes("type"),
    );

    this.currentReport = createReport(
      userId || null,
      [...this.discrepancies],
      checks,
    );

    this.log("Full audit complete", this.currentReport);
    return this.currentReport;
  }

  generateReport(): ConsistencyReport {
    if (this.currentReport) {
      return this.currentReport;
    }

    const checks = {
      localStorageMatch: this.discrepancies.length === 0,
      databaseMatch: true,
      schemaValid: !this.discrepancies.some((d) => d.severity === "error"),
    };

    const report = createReport(null, [...this.discrepancies], checks);
    this.log("Report generated", report);
    return report;
  }

  clear(): void {
    this.discrepancies = [];
    this.currentReport = null;
    this.log("Cleared all discrepancies and reports");
  }

  getDiscrepancies(): Discrepancy[] {
    return [...this.discrepancies];
  }

  hasCriticalErrors(): boolean {
    return this.discrepancies.some((d) => d.severity === "error");
  }

  getSummary(): { errors: number; warnings: number; info: number } {
    return getSummary(this.discrepancies);
  }
}

export const consistencyChecker = new ConsistencyChecker();

export default ConsistencyChecker;
