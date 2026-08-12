/**
 * Unit tests for FitAIWorkersClient's retry/timeout wiring.
 *
 * Prior review flagged two behaviors in fitaiWorkersClient.ts as completely
 * unverified by any test:
 *  - `maxRetryWallClockMs`: the cumulative wall-clock budget threaded through
 *    the recursive retry chain (`makeRequest` -> `makeRequest`). It must stop
 *    retrying once the budget is spent even when `retryCount` hasn't hit
 *    `maxRetries` yet — otherwise a slow/degraded worker can compound
 *    retries into a very long hang despite the cap existing.
 *  - The `AbortSignal` merge: a caller-supplied `options.signal` must abort
 *    the underlying `fetch`, both when the signal is already aborted before
 *    the request starts and when it fires mid-flight.
 *
 * Both are exercised directly against the real `FitAIWorkersClient` class
 * with `global.fetch` mocked — no network, no timers trickery needed because
 * the retry delays below are kept in the low-millisecond range.
 */

import { createSupabaseMock, SupabaseMock } from "../helpers/supabaseMock";

// `mockSupabase` is assigned in `beforeEach` (after module setup), so the
// mock factory reads it through a getter rather than closing over it
// directly — the factory runs the first time `../../services/supabase` is
// required, which (due to import hoisting) can happen before a top-level
// `const` assignment in this file would have run.
let mockSupabase: SupabaseMock;
jest.mock("../../services/supabase", () => ({
  get supabase() {
    return mockSupabase;
  },
}));

import { FitAIWorkersClient, WorkersAPIError } from "../../services/fitaiWorkersClient";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `status ${status}`,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

const originalFetch = global.fetch;

const validSession = {
  data: {
    session: {
      access_token: "test-token",
      // Far from expiry so getAuthToken's proactive-refresh branch never fires.
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: "test-user-id" },
    },
  },
  error: null,
};

beforeEach(() => {
  mockSupabase = createSupabaseMock();
  mockSupabase.auth.getSession.mockResolvedValue(validSession);
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

describe("FitAIWorkersClient retry wall-clock cap", () => {
  it("stops retrying once the cumulative wall-clock budget is exhausted, even though retryCount budget remains", async () => {
    const client = new FitAIWorkersClient({
      maxRetries: 10,
      retryDelay: 30,
      maxRetryWallClockMs: 10,
    });
    let callCount = 0;
    global.fetch = jest.fn(async () => {
      callCount += 1;
      return jsonResponse(500, { error: "server exploded" });
    }) as unknown as typeof fetch;

    await expect(client.healthCheck()).rejects.toThrow(WorkersAPIError);
    // 1st attempt: elapsed ~0ms < 10ms budget -> retries, sleeping 30ms.
    // That 30ms backoff alone blows past the 10ms wall-clock cap, so the 2nd
    // attempt's retry check sees the cumulative budget already exhausted and
    // throws instead of scheduling a 3rd attempt. This proves the cap is
    // cumulative across the recursive retry chain, not reset per-attempt.
    expect(callCount).toBe(2);
  });

  it("keeps retrying up to maxRetries when comfortably inside the wall-clock budget", async () => {
    const client = new FitAIWorkersClient({
      maxRetries: 2,
      retryDelay: 1,
      maxRetryWallClockMs: 60000,
    });
    let callCount = 0;
    global.fetch = jest.fn(async () => {
      callCount += 1;
      return jsonResponse(500, { error: "server exploded" });
    }) as unknown as typeof fetch;

    await expect(client.healthCheck()).rejects.toThrow(WorkersAPIError);
    // initial attempt + 2 retries = 3 total calls, unaffected by the
    // generous wall-clock budget.
    expect(callCount).toBe(3);
  });
});

describe("FitAIWorkersClient AbortSignal merge", () => {
  const workoutRequest = {
    profile: {
      age: 30,
      gender: "male",
      weight: 80,
      height: 180,
      fitnessGoal: "strength",
      experienceLevel: "beginner",
      availableEquipment: [],
    },
    weeklyPlan: { workoutsPerWeek: 3 },
  } as any;

  it("aborts the underlying fetch immediately when the external signal is already aborted", async () => {
    const client = new FitAIWorkersClient({ maxRetries: 0 });
    const externalController = new AbortController();
    externalController.abort();

    let capturedSignal: AbortSignal | undefined;
    global.fetch = jest.fn(async (_url: any, init: any) => {
      capturedSignal = init?.signal;
      if (init?.signal?.aborted) {
        const err = new Error("The operation was aborted");
        err.name = "AbortError";
        throw err;
      }
      return jsonResponse(200, { success: true });
    }) as unknown as typeof fetch;

    const result = await client.generateWorkoutPlan(workoutRequest, {
      signal: externalController.signal,
    });

    // fetch is called with the internal per-attempt controller's signal, not
    // the external one directly — but that internal signal must already be
    // aborted because the external signal was aborted before the call.
    expect(capturedSignal?.aborted).toBe(true);
    // maxRetries: 0 means the AbortError is not retried — it surfaces as a
    // typed offline result rather than an unhandled throw.
    expect(result.isOffline).toBe(true);
  });

  it("aborts the underlying fetch when the external signal fires mid-request", async () => {
    const client = new FitAIWorkersClient({ maxRetries: 0 });
    const externalController = new AbortController();

    let capturedSignal: AbortSignal | undefined;
    // Resolved once `fetch` is actually invoked, i.e. once makeRequest has
    // registered its internal-controller <-> external-signal listener. Only
    // abort after that point so this exercises the "abort fires while the
    // listener is live" path rather than the "already aborted before setup"
    // path already covered by the previous test — generateWorkoutPlan awaits
    // isAuthenticated()/getAuthToken() before reaching makeRequest, so
    // aborting synchronously right after the call would race ahead of that
    // listener registration.
    let resolveFetchCalled: () => void;
    const fetchCalled = new Promise<void>((resolve) => {
      resolveFetchCalled = resolve;
    });

    global.fetch = jest.fn((_url: any, init: any) => {
      capturedSignal = init?.signal;
      resolveFetchCalled();
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    }) as unknown as typeof fetch;

    const pending = client.generateWorkoutPlan(workoutRequest, {
      signal: externalController.signal,
    });

    await fetchCalled;
    externalController.abort();
    const result = await pending;

    expect(capturedSignal?.aborted).toBe(true);
    expect(result.isOffline).toBe(true);
  });
});
