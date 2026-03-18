export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface AppConfigRow {
  key: string;
  value: unknown;
  description: string | null;
  category: 'ai' | 'subscription' | 'features' | 'maintenance' | 'app';
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  tier: 'free' | 'basic' | 'pro';
  name: string;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  razorpay_plan_id_monthly: string | null;
  razorpay_plan_id_yearly: string | null;
  ai_generations_per_day: number | null;
  ai_generations_per_month: number | null;
  scans_per_day: number | null;
  unlimited_scans: boolean;
  unlimited_ai: boolean;
  analytics: boolean;
  coaching: boolean;
  active: boolean;
  updated_at: string;
}

export interface UserListItem {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
  tier: 'free' | 'basic' | 'pro';
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  razorpay_subscription_id: string;
  tier: string;
  status: string;
  billing_cycle: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  notes: Record<string, unknown>;
  created_at: string;
}

export interface WebhookEvent {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  processed_at: string;
}

export interface FoodContribution {
  id: string;
  user_id: string;
  name: string;
  is_approved: boolean | null;
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: { free: number; basic: number; pro: number };
  aiCallsToday: number;
  revenueInrPaisa: number;
  maintenanceMode: boolean;
}
