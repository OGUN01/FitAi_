import { supabase } from './supabase';
import { crudOperations } from './crudOperations';
import { dataManager } from './dataManager';
import { AuthUser } from '../types/user';
import { BodyMeasurement } from '../types/localData';

// Types for progress data
export interface ProgressEntry {
  id: string;
  user_id: string;
  entry_date: string;
  weight_kg: number;
  body_fat_percentage?: number;
  muscle_mass_kg?: number;
  measurements: {
    chest?: number;
    waist?: number;
    hips?: number;
    bicep?: number;
    thigh?: number;
    neck?: number;
  };
  progress_photos?: string[];
  notes?: string;
  created_at: string;
}

export interface BodyAnalysis {
  id: string;
  user_id: string;
  photos: {
    front?: string;
    side?: string;
    back?: string;
  };
  analysis: {
    body_type?: string;
    estimated_body_fat?: number;
    muscle_definition?: string;
    posture_notes?: string;
    recommendations?: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface ProgressStats {
  totalEntries: number;
  weightChange: {
    current: number;
    previous: number;
    change: number;
    changePercentage: number;
  };
  bodyFatChange: {
    current: number;
    previous: number;
    change: number;
  };
  muscleChange: {
    current: number;
    previous: number;
    change: number;
  };
  measurementChanges: {
    [key: string]: {
      current: number;
      previous: number;
      change: number;
    };
  };
  timeRange: number; // days
  // Additional properties used in ProgressScreen
  totalWorkouts?: number;
  totalDuration?: number; // in minutes
  totalCalories?: number;
  currentStreak?: number;
}

export interface ProgressGoals {
  id: string;
  user_id: string;
  target_weight_kg?: number;
  target_body_fat_percentage?: number;
  target_muscle_mass_kg?: number;
  target_measurements?: {
    [key: string]: number;
  };
  target_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ProgressDataResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ProgressDataService {
  private static instance: ProgressDataService;

  private constructor() {}

  static getInstance(): ProgressDataService {
    if (!ProgressDataService.instance) {
      ProgressDataService.instance = new ProgressDataService();
    }
    return ProgressDataService.instance;
  }

  /**
   * Initialize the service with Track B integration
   */
  async initialize(): Promise<void> {
    try {
      await crudOperations.initialize();
      console.log('Progress Data Service initialized with Track B integration');
    } catch (error) {
      console.error('Failed to initialize Progress Data Service:', error);
      throw error;
    }
  }

  /**
   * Get user's progress entries using Track B's data layer
   */
  async getUserProgressEntries(
    userId: string,
    limit?: number
  ): Promise<ProgressDataResponse<ProgressEntry[]>> {
    try {
      // First try to get from Track B's local storage
      const localMeasurements = await crudOperations.readBodyMeasurements(limit);

      if (localMeasurements.length > 0) {
        // Convert Track B's BodyMeasurement format to our ProgressEntry format
        const entries = localMeasurements.map(this.convertBodyMeasurementToProgressEntry);
        return {
          success: true,
          data: entries,
        };
      }

      // Fallback to direct Supabase query
      let query = supabase
        .from('progress_entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching progress entries:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error('Error in getUserProgressEntries:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch progress entries',
      };
    }
  }

  /**
   * Create a new progress entry using Track B's data layer
   */
  async createProgressEntry(
    userId: string,
    entryData: {
      weight_kg: number;
      body_fat_percentage?: number;
      muscle_mass_kg?: number;
      measurements?: {
        chest?: number;
        waist?: number;
        hips?: number;
        bicep?: number;
        thigh?: number;
        neck?: number;
      };
      progress_photos?: string[];
      notes?: string;
    }
  ): Promise<ProgressDataResponse<ProgressEntry>> {
    try {
      const entryDate = new Date().toISOString().split('T')[0];

      // Create body measurement for Track B
      const bodyMeasurement: BodyMeasurement = {
        id: `progress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: entryDate,
        weight: entryData.weight_kg,
        bodyFat: entryData.body_fat_percentage,
        muscleMass: entryData.muscle_mass_kg,
        photos: entryData.progress_photos || [],
        notes: entryData.notes,
        syncStatus: 'pending',
      } as any; // measurements assignment deferred for type compatibility

      // Store using Track B's CRUD operations
      await crudOperations.createBodyMeasurement(bodyMeasurement);

      // Also create in Supabase for immediate access
      const { data, error } = await supabase
        .from('progress_entries')
        .insert({
          user_id: userId,
          entry_date: entryDate,
          weight_kg: entryData.weight_kg,
          body_fat_percentage: entryData.body_fat_percentage,
          muscle_mass_kg: entryData.muscle_mass_kg,
          measurements: entryData.measurements || {},
          progress_photos: entryData.progress_photos || [],
          notes: entryData.notes,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating progress entry:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error in createProgressEntry:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create progress entry',
      };
    }
  }

  /**
   * Get user's body analysis
   */
  async getUserBodyAnalysis(userId: string): Promise<ProgressDataResponse<BodyAnalysis>> {
    try {
      const { data, error } = await supabase
        .from('body_analysis')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching body analysis:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error in getUserBodyAnalysis:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch body analysis',
      };
    }
  }

  /**
   * Calculate progress statistics
   */
  async getProgressStats(
    userId: string,
    timeRange: number = 30
  ): Promise<ProgressDataResponse<ProgressStats>> {
    try {
      const entriesResponse = await this.getUserProgressEntries(userId);

      if (!entriesResponse.success || !entriesResponse.data || entriesResponse.data.length < 2) {
        return {
          success: false,
          error: 'Not enough data to calculate progress statistics',
        };
      }

      const entries = entriesResponse.data;
      const latest = entries[0];
      const previous = entries[1];

      // Calculate weight change
      const weightChange = {
        current: latest.weight_kg,
        previous: previous.weight_kg,
        change: latest.weight_kg - previous.weight_kg,
        changePercentage: ((latest.weight_kg - previous.weight_kg) / previous.weight_kg) * 100,
      };

      // Calculate body fat change
      const bodyFatChange = {
        current: latest.body_fat_percentage || 0,
        previous: previous.body_fat_percentage || 0,
        change: (latest.body_fat_percentage || 0) - (previous.body_fat_percentage || 0),
      };

      // Calculate muscle mass change
      const muscleChange = {
        current: latest.muscle_mass_kg || 0,
        previous: previous.muscle_mass_kg || 0,
        change: (latest.muscle_mass_kg || 0) - (previous.muscle_mass_kg || 0),
      };

      // Calculate measurement changes
      const measurementChanges: {
        [K in 'chest' | 'waist' | 'hips' | 'bicep' | 'thigh' | 'neck']?: {
          current: number;
          previous: number;
          change: number;
        };
      } = {};
      const measurementKeys = ['chest', 'waist', 'hips', 'bicep', 'thigh', 'neck'] as const;

      measurementKeys.forEach((key) => {
        const current = (latest as any).measurements?.[key] || 0;
        const prev = (previous as any).measurements?.[key] || 0;
        measurementChanges[key] = {
          current,
          previous: prev,
          change: current - prev,
        };
      });

      const stats: ProgressStats = {
        totalEntries: entries.length,
        weightChange,
        bodyFatChange,
        muscleChange,
        measurementChanges,
        timeRange,
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error('Error in getProgressStats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate progress statistics',
      };
    }
  }

  /**
   * Convert Track B's BodyMeasurement to our ProgressEntry format
   */
  private convertBodyMeasurementToProgressEntry(measurement: BodyMeasurement): ProgressEntry {
    return {
      id: measurement.id,
      user_id: 'local-user',
      entry_date: measurement.date,
      weight_kg: measurement.weight ?? 0,
      body_fat_percentage: measurement.bodyFat,
      muscle_mass_kg: measurement.muscleMass,
      measurements: (measurement as any).measurements || {},
      progress_photos: measurement.photos || [],
      notes: measurement.notes,
      created_at: measurement.date,
    };
  }
}

export const progressDataService = ProgressDataService.getInstance();
