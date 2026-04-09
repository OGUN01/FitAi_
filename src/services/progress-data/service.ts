import { crudOperations } from "../crudOperations";
import {
  ProgressEntry,
  ProgressBodyAnalysis,
  ProgressStats,
  ProgressGoals,
  ProgressDataResponse,
  CreateProgressEntryData,
  UpdateProgressGoalsData,
} from "./types";
import { getUserProgressEntries, createProgressEntry } from "./entries";
import { getProgressStats } from "./stats";
import { getProgressGoals, updateProgressGoals } from "./goals";
import { getUserBodyAnalysis } from "./analysis";

export class ProgressDataService {
  private static instance: ProgressDataService;

  private constructor() {}

  static getInstance(): ProgressDataService {
    if (!ProgressDataService.instance) {
      ProgressDataService.instance = new ProgressDataService();
    }
    return ProgressDataService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await crudOperations.initialize();
    } catch (error) {
      console.error("Failed to initialize Progress Data Service:", error);
      throw error;
    }
  }

  async getUserProgressEntries(
    userId: string,
    limit?: number,
  ): Promise<ProgressDataResponse<ProgressEntry[]>> {
    return getUserProgressEntries(userId, limit);
  }

  async createProgressEntry(
    userId: string,
    entryData: CreateProgressEntryData,
  ): Promise<ProgressDataResponse<ProgressEntry>> {
    return createProgressEntry(userId, entryData);
  }

  async getUserBodyAnalysis(
    userId: string,
  ): Promise<ProgressDataResponse<ProgressBodyAnalysis>> {
    return getUserBodyAnalysis(userId);
  }

  async getProgressStats(
    userId: string,
    timeRange: number = 30,
  ): Promise<ProgressDataResponse<ProgressStats>> {
    return getProgressStats(userId, timeRange);
  }

  async getProgressGoals(
    userId: string,
  ): Promise<ProgressDataResponse<ProgressGoals>> {
    return getProgressGoals(userId);
  }

  async updateProgressGoals(
    userId: string,
    goals: UpdateProgressGoalsData,
  ): Promise<ProgressDataResponse<ProgressGoals>> {
    return updateProgressGoals(userId, goals);
  }
}

export const progressDataService = ProgressDataService.getInstance();
