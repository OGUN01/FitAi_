import {
  createSupabaseMock,
  createQueryBuilder,
  mockWorkoutSession,
  mockExerciseSet,
  mockExercisePR,
  mockWorkoutTemplate,
  SupabaseMock,
} from "./supabaseMock";

describe("supabaseMock", () => {
  let mock: SupabaseMock;

  beforeEach(() => {
    mock = createSupabaseMock();
  });

  it("chains .from().select().eq().order().limit() without throwing", () => {
    const query = mock.from("exercise_sets");
    expect(query.select).toBeDefined();
    query.select("*").eq("user_id", "u1").order("completed_at").limit(10);
    expect(mock.from).toHaveBeenCalledWith("exercise_sets");
  });

  it("resolves awaited chain with default { data: null, error: null }", async () => {
    const result = await mock.from("exercise_sets").select("*");
    expect(result).toEqual({ data: null, error: null });
  });

  it("resolves with custom data via _resolve", async () => {
    const sets = [mockExerciseSet(), mockExerciseSet({ set_number: 2 })];
    mock.from("exercise_sets");
    mock._tables["exercise_sets"]._resolve({ data: sets, error: null });

    const result = await mock
      .from("exercise_sets")
      .select("*")
      .eq("user_id", "test-user-id");
    expect(result.data).toHaveLength(2);
    expect((result.data as any[])[1].set_number).toBe(2);
  });

  it("reuses the same query builder for repeated .from() calls on the same table", () => {
    const q1 = mock.from("exercise_prs");
    const q2 = mock.from("exercise_prs");
    expect(q1).toBe(q2);
  });

  it("creates separate builders for different tables", () => {
    const q1 = mock.from("exercise_sets");
    const q2 = mock.from("exercise_prs");
    expect(q1).not.toBe(q2);
  });

  it("auth.getUser returns default test user", async () => {
    const { data } = await mock.auth.getUser();
    expect(data.user.id).toBe("test-user-id");
  });

  it("mockWorkoutSession applies overrides", () => {
    const session = mockWorkoutSession({ calories_burned: 500, rating: 5 });
    expect(session.calories_burned).toBe(500);
    expect(session.rating).toBe(5);
    expect(session.user_id).toBe("test-user-id");
  });

  it("mockExerciseSet applies overrides", () => {
    const set = mockExerciseSet({ weight_kg: 60, reps: 8, set_type: "warmup" });
    expect(set.weight_kg).toBe(60);
    expect(set.set_type).toBe("warmup");
  });

  it("mockExercisePR applies overrides", () => {
    const pr = mockExercisePR({ pr_type: "estimated_1rm", value: 100 });
    expect(pr.pr_type).toBe("estimated_1rm");
    expect(pr.value).toBe(100);
  });

  it("mockWorkoutTemplate applies overrides", () => {
    const tpl = mockWorkoutTemplate({ name: "Custom", is_public: true });
    expect(tpl.name).toBe("Custom");
    expect(tpl.is_public).toBe(true);
  });

  it("createQueryBuilder accepts a custom default response", async () => {
    const data = [{ id: "1" }];
    const qb = createQueryBuilder({ data, error: null });
    const result = await qb.select("*");
    expect(result.data).toEqual(data);
  });

  it("supports insert chain", async () => {
    const newSet = mockExerciseSet();
    mock.from("exercise_sets");
    mock._tables["exercise_sets"]._resolve({ data: newSet, error: null });

    const result = await mock
      .from("exercise_sets")
      .insert(newSet)
      .select()
      .single();
    expect(result.data).toEqual(newSet);
  });
});
