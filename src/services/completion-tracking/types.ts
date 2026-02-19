export interface CompletionEvent {
  id: string;
  type: "workout" | "meal";
  itemId: string;
  completedAt: string;
  progress: number;
  data: any;
}

export interface CompletionStats {
  workouts: {
    completed: number;
    total: number;
    completionRate: number;
  };
  meals: {
    completed: number;
    total: number;
    completionRate: number;
  };
  totalCaloriesBurned: number;
  totalCaloriesConsumed: number;
}

export interface TodaysCompletions {
  workout: { completed: boolean; progress: number } | null;
  meals: { completed: number; total: number; progress: number };
}

export type CompletionListener = (event: CompletionEvent) => void;
