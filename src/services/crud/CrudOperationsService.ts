import { dataBridge } from "../DataBridge";
import {
  OnboardingData,
  LocalWorkoutSession,
  MealLog,
  BodyMeasurement,
  LocalStorageSchema,
  ValidationResult,
  UserPreferences,
} from "../../types/localData";
import { BatchResult, DataStatistics } from "./types";
import * as userOps from "./userOperations";
import * as workoutOps from "./workoutOperations";
import * as mealOps from "./mealOperations";
import * as measurementOps from "./measurementOperations";
import * as batchOps from "./batchOperations";
import * as dataUtils from "./dataUtilities";

export class CrudOperationsService {
  private static instance: CrudOperationsService;

  private constructor() {}

  static getInstance(): CrudOperationsService {
    if (!CrudOperationsService.instance) {
      CrudOperationsService.instance = new CrudOperationsService();
    }
    return CrudOperationsService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await dataBridge.initialize();
    } catch (error) {
      console.error("Failed to initialize CRUD Operations Service:", error);
      throw error;
    }
  }

  async createOnboardingData(data: OnboardingData): Promise<void> {
    return userOps.createOnboardingData(data);
  }

  async readOnboardingData(): Promise<OnboardingData | null> {
    return userOps.readOnboardingData();
  }

  async updateOnboardingData(updates: Partial<OnboardingData>): Promise<void> {
    return userOps.updateOnboardingData(updates);
  }

  async updateUserPreferences(
    preferences: Partial<UserPreferences>,
  ): Promise<void> {
    return userOps.updateUserPreferences(preferences);
  }

  async readUserPreferences(): Promise<UserPreferences | null> {
    return userOps.readUserPreferences();
  }

  async createWorkoutSession(session: LocalWorkoutSession): Promise<void> {
    return workoutOps.createWorkoutSession(session, () => this.initialize());
  }

  async readWorkoutSessions(limit?: number): Promise<LocalWorkoutSession[]> {
    return workoutOps.readWorkoutSessions(limit, () => this.initialize());
  }

  async readWorkoutSession(
    sessionId: string,
  ): Promise<LocalWorkoutSession | null> {
    return workoutOps.readWorkoutSession(sessionId, () => this.initialize());
  }

  async updateWorkoutSession(
    sessionId: string,
    updates: Partial<LocalWorkoutSession>,
  ): Promise<void> {
    return workoutOps.updateWorkoutSession(sessionId, updates, () =>
      this.initialize(),
    );
  }

  async deleteWorkoutSession(sessionId: string): Promise<void> {
    return workoutOps.deleteWorkoutSession(sessionId, () => this.initialize());
  }

  async createMealLog(mealLog: MealLog): Promise<void> {
    return mealOps.createMealLog(mealLog, () => this.initialize());
  }

  async readMealLogs(date?: string, limit?: number): Promise<MealLog[]> {
    return mealOps.readMealLogs(date, limit, () => this.initialize());
  }

  async readMealLog(logId: string): Promise<MealLog | null> {
    return mealOps.readMealLog(logId, () => this.initialize());
  }

  async updateMealLog(logId: string, updates: Partial<MealLog>): Promise<void> {
    return mealOps.updateMealLog(logId, updates, () => this.initialize());
  }

  async deleteMealLog(logId: string): Promise<void> {
    return mealOps.deleteMealLog(logId, () => this.initialize());
  }

  async createBodyMeasurement(measurement: BodyMeasurement): Promise<void> {
    return measurementOps.createBodyMeasurement(measurement, () =>
      this.initialize(),
    );
  }

  async readBodyMeasurements(limit?: number): Promise<BodyMeasurement[]> {
    return measurementOps.readBodyMeasurements(limit, () => this.initialize());
  }

  async readBodyMeasurement(
    measurementId: string,
  ): Promise<BodyMeasurement | null> {
    return measurementOps.readBodyMeasurement(measurementId, () =>
      this.initialize(),
    );
  }

  async updateBodyMeasurement(
    measurementId: string,
    updates: Partial<BodyMeasurement>,
  ): Promise<void> {
    return measurementOps.updateBodyMeasurement(measurementId, updates, () =>
      this.initialize(),
    );
  }

  async deleteBodyMeasurement(measurementId: string): Promise<void> {
    return measurementOps.deleteBodyMeasurement(measurementId, () =>
      this.initialize(),
    );
  }

  async batchCreateWorkoutSessions(
    sessions: LocalWorkoutSession[],
  ): Promise<BatchResult> {
    return batchOps.batchCreateWorkoutSessions(sessions, () =>
      this.initialize(),
    );
  }

  async batchCreateMealLogs(logs: MealLog[]): Promise<BatchResult> {
    return batchOps.batchCreateMealLogs(logs, () => this.initialize());
  }

  async validateAllData(): Promise<ValidationResult> {
    return dataUtils.validateAllData();
  }

  async getDataStatistics(): Promise<DataStatistics> {
    return dataUtils.getDataStatistics();
  }

  async exportAllData(): Promise<LocalStorageSchema | null> {
    return dataUtils.exportAllData();
  }

  async importData(data: LocalStorageSchema): Promise<void> {
    return dataUtils.importData(data);
  }

  async clearAllData(): Promise<void> {
    return dataUtils.clearAllData();
  }

  async getStorageInfo(): Promise<any> {
    return dataUtils.getStorageInfo();
  }

  async isQuotaExceeded(): Promise<boolean> {
    return dataUtils.isQuotaExceeded();
  }
}

export const crudOperations = CrudOperationsService.getInstance();
export default crudOperations;
