// Usage:
//   jest.mock('../../services/supabase', () => ({ supabase: createSupabaseMock() }));

export interface SupabaseResponse<T = unknown> {
  data: T | null;
  error: { message: string; code: string } | null;
}

export interface QueryBuilderMock {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  upsert: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  gt: jest.Mock;
  gte: jest.Mock;
  lt: jest.Mock;
  lte: jest.Mock;
  in: jest.Mock;
  is: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  range: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  match: jest.Mock;
  filter: jest.Mock;
  or: jest.Mock;
  not: jest.Mock;
  _resolve: (response: SupabaseResponse) => void;
  _response: SupabaseResponse;
}

export interface SupabaseMock {
  from: jest.Mock;
  auth: {
    getUser: jest.Mock;
    getSession: jest.Mock;
    signOut: jest.Mock;
    onAuthStateChange: jest.Mock;
  };
  rpc: jest.Mock;
  _lastQuery: QueryBuilderMock | null;
  _tables: Record<string, QueryBuilderMock>;
}

// Thenable chain: every method returns `this`, `await` resolves to _response
export function createQueryBuilder(
  defaultResponse: SupabaseResponse = { data: null, error: null },
): QueryBuilderMock {
  const builder: Partial<QueryBuilderMock> = {};
  let response: SupabaseResponse = { ...defaultResponse };

  const chainMethods = [
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "in",
    "is",
    "order",
    "limit",
    "range",
    "single",
    "maybeSingle",
    "match",
    "filter",
    "or",
    "not",
  ] as const;

  for (const method of chainMethods) {
    (builder as any)[method] = jest.fn().mockReturnValue(builder);
  }

  // Thenable so `await supabase.from(t).select()` resolves to response
  (builder as any).then = (
    resolve: (v: SupabaseResponse) => void,
    reject?: (e: unknown) => void,
  ) => {
    return Promise.resolve(response).then(resolve, reject);
  };

  builder._resolve = (r: SupabaseResponse) => {
    response = r;
  };

  Object.defineProperty(builder, "_response", {
    get: () => response,
    set: (r: SupabaseResponse) => {
      response = r;
    },
  });

  return builder as QueryBuilderMock;
}

export function createSupabaseMock(): SupabaseMock {
  const tables: Record<string, QueryBuilderMock> = {};
  let lastQuery: QueryBuilderMock | null = null;

  const fromMock = jest.fn((table: string) => {
    if (!tables[table]) {
      tables[table] = createQueryBuilder();
    }
    lastQuery = tables[table];
    return tables[table];
  });

  return {
    from: fromMock,
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "test-user-id" } },
        error: null,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: "test-user-id" } } },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    get _lastQuery() {
      return lastQuery;
    },
    _tables: tables,
  };
}

export interface MockWorkoutSession {
  id: string;
  user_id: string;
  workout_id: string | null;
  started_at: string;
  completed_at: string | null;
  duration: number;
  calories_burned: number;
  exercises: unknown[];
  notes: string;
  rating: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export function mockWorkoutSession(
  overrides: Partial<MockWorkoutSession> = {},
): MockWorkoutSession {
  return {
    id: "ws-test-001",
    user_id: "test-user-id",
    workout_id: "workout-plan-001",
    started_at: "2026-03-26T10:00:00.000Z",
    completed_at: "2026-03-26T10:45:00.000Z",
    duration: 2700,
    calories_burned: 320,
    exercises: [],
    notes: "",
    rating: 4,
    is_completed: true,
    created_at: "2026-03-26T10:00:00.000Z",
    updated_at: "2026-03-26T10:45:00.000Z",
    ...overrides,
  };
}

export interface MockExerciseSet {
  id: string;
  user_id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  set_type: "normal" | "warmup" | "failure" | "drop";
  is_completed: boolean;
  completed_at: string;
  created_at: string;
}

export function mockExerciseSet(
  overrides: Partial<MockExerciseSet> = {},
): MockExerciseSet {
  return {
    id: "es-test-001",
    user_id: "test-user-id",
    session_id: "ws-test-001",
    exercise_id: "push_up",
    set_number: 1,
    weight_kg: null,
    reps: 12,
    duration_seconds: null,
    set_type: "normal",
    is_completed: true,
    completed_at: "2026-03-26T10:05:00.000Z",
    created_at: "2026-03-26T10:05:00.000Z",
    ...overrides,
  };
}

export interface MockExercisePR {
  id: string;
  user_id: string;
  exercise_id: string;
  pr_type: "weight" | "estimated_1rm";
  value: number;
  reps: number | null;
  session_id: string | null;
  achieved_at: string;
  created_at: string;
}

export function mockExercisePR(
  overrides: Partial<MockExercisePR> = {},
): MockExercisePR {
  return {
    id: "pr-test-001",
    user_id: "test-user-id",
    exercise_id: "dumbbell_bench_press",
    pr_type: "weight",
    value: 40.0,
    reps: 8,
    session_id: "ws-test-001",
    achieved_at: "2026-03-26T10:15:00.000Z",
    created_at: "2026-03-26T10:15:00.000Z",
    ...overrides,
  };
}

export interface MockWorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  exercises: unknown[];
  target_muscle_groups: string[];
  estimated_duration_minutes: number | null;
  is_public: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export function mockWorkoutTemplate(
  overrides: Partial<MockWorkoutTemplate> = {},
): MockWorkoutTemplate {
  return {
    id: "wt-test-001",
    user_id: "test-user-id",
    name: "Push Pull Legs - Push Day",
    description: "Chest, shoulders, and triceps focus",
    exercises: [
      { exercise_id: "dumbbell_bench_press", sets: 4, reps: "8-10", rest: 90 },
      { exercise_id: "push_up", sets: 3, reps: "12-15", rest: 60 },
    ],
    target_muscle_groups: ["chest", "shoulders", "triceps"],
    estimated_duration_minutes: 50,
    is_public: false,
    usage_count: 0,
    last_used_at: null,
    created_at: "2026-03-26T08:00:00.000Z",
    updated_at: "2026-03-26T08:00:00.000Z",
    ...overrides,
  };
}
