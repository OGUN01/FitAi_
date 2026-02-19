export interface WaterLog {
  id: string;
  userId: string;
  date: string;
  amount: number;
  timestamp: string;
  source?: WaterSource;
  temperature?: WaterTemperature;
  notes?: string;
}

export type WaterSource =
  | "tap"
  | "bottled"
  | "filtered"
  | "sparkling"
  | "flavored"
  | "other";

export type WaterTemperature = "cold" | "room_temp" | "warm" | "hot";

export interface WaterGoal {
  dailyTarget: number;
  reminderInterval: number;
  reminderEnabled: boolean;
  customReminders: WaterReminder[];
}

export interface WaterReminder {
  time: string;
  message: string;
  enabled: boolean;
}
