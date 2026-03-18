import { Animated } from "react-native";

// State types
export interface ProgressScreenState {
  selectedPeriod: string;
  refreshing: boolean;
  isLoading: boolean;
  showWeightModal: boolean;
  showAnalytics: boolean;
  showAllActivities: boolean;
  weeklyProgress: any;
  recentActivities: any[];
  realWeeklyData: any[];
  allActivities: any[];
  activitiesPage: number;
  loadingMoreActivities: boolean;
  hasMoreActivities: boolean;
  todaysData: any;
  user: any;
  isAuthenticated: boolean;
  healthMetrics: any;
  syncError: any;
  isWearableConnected: boolean;
  progressLoading: boolean;
  progressError: any;
  analysisError: any;
  statsError: any;
  statsLoading: boolean;
  calculatedMetrics: any;
  hasCalculatedMetrics: boolean;
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  trackBStatus: any;
  progressEntries: any[];
  progressStats: any;
  weightHistory: Array<{ date: string; weight: number }>;
}

// Computed types
export interface Period {
  id: string;
  label: string;
}

export interface StatData {
  current: number | null;
  change: number | null;
  unit: string;
  goal: number | null;
  trend: "increasing" | "decreasing" | "stable";
  weeklyAvg: number | null;
}

export interface Stats {
  weight: StatData;
  bodyFat: StatData;
  muscle: StatData;
  bmi: StatData;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  date: string;
  completed: boolean;
  category: string;
  points: number;
  rarity: string;
  progress?: number;
  target?: number;
}

export interface WeeklyDataPoint {
  day: string;
  workouts: number;
  meals: number;
  calories: number;
  duration: number;
}

export interface ComputedData {
  periods: Period[];
  stats: Stats;
  achievements: Achievement[];
  weeklyData: WeeklyDataPoint[];
}

// Actions types
export interface ProgressScreenActions {
  setSelectedPeriod: (period: string) => void;
  setRefreshing: (value: boolean) => void;
  setShowWeightModal: (value: boolean) => void;
  setShowAnalytics: (value: boolean) => void;
  setShowAllActivities: (value: boolean) => void;
  onRefresh: () => Promise<void>;
  handleAddProgressEntry: () => Promise<void>;
  handleShareProgress: () => Promise<void>;
  loadMoreActivities: () => void;
}

// Hook return type
export interface UseProgressScreenReturn {
  state: ProgressScreenState;
  computed: ComputedData;
  actions: ProgressScreenActions;
}
