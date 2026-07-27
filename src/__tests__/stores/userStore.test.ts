/**
 * Integration tests for src/stores/userStore.ts
 *
 * Verifies:
 *  - Initial state shape
 *  - Every service-wrapping action: success path (state updated, isLoading
 *    transitions, error null), service-failure path (error set), and thrown-
 *    error path (error set, isLoading false)
 *  - isLoading is true while awaiting, false at rest
 *  - FitnessGoals actions branch on profile existence
 *  - checkProfileComplete correctness
 *  - Deprecated methods warn + update profile
 *  - reset/clear actions restore initial state
 */
jest.mock("../../utils/safeAsyncStorage", () => ({
  // No-op storage so the persist middleware never touches AsyncStorage
  createDebouncedStorage: () => ({
    getItem: async () => null,
    setItem: () => {},
    removeItem: async () => {},
  }),
  safeAsyncStorage: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
}));

jest.mock("../../services/userProfile", () => ({
  userProfileService: {
    createProfile: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    createFitnessGoals: jest.fn(),
    getFitnessGoals: jest.fn(),
    updateFitnessGoals: jest.fn(),
    getCompleteProfile: jest.fn(),
    deleteProfile: jest.fn(),
  },
  // Type-only exports — provide empty objects so the runtime import resolves.
  UserProfileResponse: {},
  FitnessGoalsResponse: {},
}));

// Override the global jest.setup.js profileStore mock. The global mock returns
// { personalInfo: { country: "India" } } (no name/age/gender, no workoutPrefs),
// which would make checkProfileComplete ALWAYS return false by shadowing the
// passed-in profile. Return nulls so checkProfileComplete falls back to the
// profile argument (the legacy code path under test).
jest.mock("../../stores/profileStore", () => {
  const state = { personalInfo: null, workoutPreferences: null };
  const fn = jest.fn(() => state);
  (fn as any).getState = jest.fn(() => state);
  return { useProfileStore: fn };
});

import { useUserStore } from "../../stores/userStore";
import { userProfileService } from "../../services/userProfile";
import type { UserProfile, FitnessGoals } from "../../types/user";

// ---------------------------------------------------------------------------
// Helpers / fixtures
// ---------------------------------------------------------------------------

const completeProfile: UserProfile = {
  id: "user-123",
  email: "test@example.com",
  personalInfo: {
    first_name: "John",
    last_name: "Doe",
    name: "John Doe",
    age: 30,
    gender: "male",
    country: "US",
    state: "CA",
    wake_time: "07:00",
    sleep_time: "23:00",
  },
  fitnessGoals: {
    primary_goals: ["weight_loss"],
    time_commitment: "30min",
    experience: "beginner",
    experience_level: "beginner",
  },
  workoutPreferences: {
    location: "home",
    equipment: [],
    time_preference: 30,
    intensity: "beginner",
    workout_types: ["strength"],
    primary_goals: ["weight_loss"],
  },
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  preferences: { units: "metric", notifications: true, darkMode: false },
  stats: {
    totalWorkouts: 0,
    totalCaloriesBurned: 0,
    currentStreak: 0,
    longestStreak: 0,
  },
} as unknown as UserProfile;

// Profile with personalInfo but NO workoutPreferences → isProfileComplete false
const incompleteProfile: UserProfile = {
  ...completeProfile,
  id: "user-incomplete",
  workoutPreferences: undefined,
} as unknown as UserProfile;

const mockGoals: FitnessGoals = {
  primary_goals: ["muscle_gain"],
  time_commitment: "45min",
  experience: "intermediate",
  experience_level: "intermediate",
};

function resetServiceMocks() {
  const svc = userProfileService as unknown as Record<string, jest.Mock>;
  Object.values(svc).forEach((fn) => {
    if (jest.isMockFunction(fn)) fn.mockReset();
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("userStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetServiceMocks();
    useUserStore.getState().reset();
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------
  describe("initial state", () => {
    it("starts with profile null, isLoading false, error null, isProfileComplete false", () => {
      const s = useUserStore.getState();
      expect(s.profile).toBeNull();
      expect(s.isLoading).toBe(false);
      expect(s.error).toBeNull();
      expect(s.isProfileComplete).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // createProfile
  // -------------------------------------------------------------------------
  describe("createProfile", () => {
    const req = {
      first_name: "John",
      last_name: "Doe",
      age: 30,
      gender: "male" as const,
      country: "US",
      state: "CA",
      wake_time: "07:00",
      sleep_time: "23:00",
    };

    it("sets profile, clears error, computes isProfileComplete on success", async () => {
      (
        userProfileService.createProfile as jest.Mock
      ).mockResolvedValueOnce({ success: true, data: completeProfile });

      const res = await useUserStore.getState().createProfile(req);

      expect(res).toEqual({ success: true, data: completeProfile });
      const s = useUserStore.getState();
      expect(s.profile).toEqual(completeProfile);
      expect(s.isLoading).toBe(false);
      expect(s.error).toBeNull();
      expect(s.isProfileComplete).toBe(true);
    });

    it("sets error when service returns failure (success:false)", async () => {
      (
        userProfileService.createProfile as jest.Mock
      ).mockResolvedValueOnce({ success: false, error: "Validation failed" });

      const res = await useUserStore.getState().createProfile(req);

      expect(res.success).toBe(false);
      const s = useUserStore.getState();
      expect(s.error).toBe("Validation failed");
      expect(s.isLoading).toBe(false);
      expect(s.profile).toBeNull();
    });

    it("sets a default error when service failure has no error string", async () => {
      (
        userProfileService.createProfile as jest.Mock
      ).mockResolvedValueOnce({ success: false });

      await useUserStore.getState().createProfile(req);

      expect(useUserStore.getState().error).toBe("Failed to create profile");
    });

    it("catches thrown errors, sets error, returns failure response", async () => {
      (
        userProfileService.createProfile as jest.Mock
      ).mockRejectedValueOnce(new Error("Network failure"));

      const res = await useUserStore.getState().createProfile(req);

      expect(res).toEqual({ success: false, error: "Network failure" });
      const s = useUserStore.getState();
      expect(s.error).toBe("Network failure");
      expect(s.isLoading).toBe(false);
    });

    it("catches non-Error throws with a default message", async () => {
      (
        userProfileService.createProfile as jest.Mock
      ).mockRejectedValueOnce("boom");

      const res = await useUserStore.getState().createProfile(req);

      expect(res.success).toBe(false);
      expect(useUserStore.getState().error).toBe("Failed to create profile");
    });

    it("sets isLoading true while the service call is in flight", async () => {
      let resolveFn!: (v: unknown) => void;
      const pending = new Promise((r) => {
        resolveFn = r;
      });
      (userProfileService.createProfile as jest.Mock).mockReturnValueOnce(pending);

      const promise = useUserStore.getState().createProfile(req);

      expect(useUserStore.getState().isLoading).toBe(true);
      expect(useUserStore.getState().error).toBeNull();

      resolveFn({ success: true, data: completeProfile });
      await promise;

      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getProfile
  // -------------------------------------------------------------------------
  describe("getProfile", () => {
    it("sets profile and isProfileComplete on success", async () => {
      (
        userProfileService.getProfile as jest.Mock
      ).mockResolvedValueOnce({ success: true, data: completeProfile });

      const res = await useUserStore.getState().getProfile("user-123");

      expect(res).toEqual({ success: true, data: completeProfile });
      const s = useUserStore.getState();
      expect(s.profile).toEqual(completeProfile);
      expect(s.isLoading).toBe(false);
      expect(s.error).toBeNull();
      expect(s.isProfileComplete).toBe(true);
    });

    it("sets error when service returns failure", async () => {
      (
        userProfileService.getProfile as jest.Mock
      ).mockResolvedValueOnce({ success: false, error: "Not found" });

      await useUserStore.getState().getProfile("user-123");

      const s = useUserStore.getState();
      expect(s.error).toBe("Not found");
      expect(s.isLoading).toBe(false);
      expect(s.profile).toBeNull();
    });

    it("catches thrown errors and sets error", async () => {
      (
        userProfileService.getProfile as jest.Mock
      ).mockRejectedValueOnce(new Error("Network failure"));

      const res = await useUserStore.getState().getProfile("user-123");

      expect(res).toEqual({ success: false, error: "Network failure" });
      expect(useUserStore.getState().error).toBe("Network failure");
      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // updateProfile
  // -------------------------------------------------------------------------
  describe("updateProfile", () => {
    it("updates profile and recomputes isProfileComplete on success", async () => {
      (
        userProfileService.updateProfile as jest.Mock
      ).mockResolvedValueOnce({ success: true, data: completeProfile });

      const res = await useUserStore
        .getState()
        .updateProfile("user-123", { age: 31 });

      expect(res).toEqual({ success: true, data: completeProfile });
      const s = useUserStore.getState();
      expect(s.profile).toEqual(completeProfile);
      expect(s.isLoading).toBe(false);
      expect(s.error).toBeNull();
      expect(s.isProfileComplete).toBe(true);
    });

    it("sets error when service returns failure", async () => {
      (
        userProfileService.updateProfile as jest.Mock
      ).mockResolvedValueOnce({ success: false, error: "Denied" });

      await useUserStore.getState().updateProfile("user-123", { age: 31 });

      expect(useUserStore.getState().error).toBe("Denied");
      expect(useUserStore.getState().isLoading).toBe(false);
    });

    it("catches thrown errors and sets error", async () => {
      (
        userProfileService.updateProfile as jest.Mock
      ).mockRejectedValueOnce(new Error("Network failure"));

      const res = await useUserStore
        .getState()
        .updateProfile("user-123", { age: 31 });

      expect(res).toEqual({ success: false, error: "Network failure" });
      expect(useUserStore.getState().error).toBe("Network failure");
      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // createFitnessGoals
  // -------------------------------------------------------------------------
  describe("createFitnessGoals", () => {
    it("merges fitnessGoals into existing profile on success", async () => {
      // Pre-seed a profile so the merge branch runs
      useUserStore.getState().setProfile(completeProfile);
      (
        userProfileService.createFitnessGoals as jest.Mock
      ).mockResolvedValueOnce({ success: true, data: mockGoals });

      const res = await useUserStore
        .getState()
        .createFitnessGoals(mockGoals as any);

      expect(res).toEqual({ success: true, data: mockGoals });
      const s = useUserStore.getState();
      expect(s.profile?.fitnessGoals).toEqual(mockGoals);
      expect(s.isLoading).toBe(false);
      expect(s.error).toBeNull();
    });

    it("does not set profile when profile is null (no profile to merge into)", async () => {
      (
        userProfileService.createFitnessGoals as jest.Mock
      ).mockResolvedValueOnce({ success: true, data: mockGoals });

      const res = await useUserStore
        .getState()
        .createFitnessGoals(mockGoals as any);

      expect(res).toEqual({ success: true, data: mockGoals });
      const s = useUserStore.getState();
      expect(s.profile).toBeNull();
      expect(s.isLoading).toBe(false);
      expect(s.error).toBeNull();
    });

    it("sets error when service returns failure", async () => {
      (
        userProfileService.createFitnessGoals as jest.Mock
      ).mockResolvedValueOnce({ success: false, error: "DB error" });

      await useUserStore.getState().createFitnessGoals(mockGoals as any);

      expect(useUserStore.getState().error).toBe("DB error");
      expect(useUserStore.getState().isLoading).toBe(false);
    });

    it("catches thrown errors and sets error", async () => {
      (
        userProfileService.createFitnessGoals as jest.Mock
      ).mockRejectedValueOnce(new Error("Network failure"));

      const res = await useUserStore
        .getState()
        .createFitnessGoals(mockGoals as any);

      expect(res).toEqual({ success: false, error: "Network failure" });
      expect(useUserStore.getState().error).toBe("Network failure");
      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getFitnessGoals
  // -------------------------------------------------------------------------
  describe("getFitnessGoals", () => {
    it("merges fitnessGoals into existing profile on success", async () => {
      useUserStore.getState().setProfile(completeProfile);
      (
        userProfileService.getFitnessGoals as jest.Mock
      ).mockResolvedValueOnce({ success: true, data: mockGoals });

      const res = await useUserStore.getState().getFitnessGoals("user-123");

      expect(res).toEqual({ success: true, data: mockGoals });
      expect(useUserStore.getState().profile?.fitnessGoals).toEqual(mockGoals);
      expect(useUserStore.getState().isLoading).toBe(false);
    });

    it("does not set profile when profile is null", async () => {
      (
        userProfileService.getFitnessGoals as jest.Mock
      ).mockResolvedValueOnce({ success: true, data: mockGoals });

      await useUserStore.getState().getFitnessGoals("user-123");

      expect(useUserStore.getState().profile).toBeNull();
      expect(useUserStore.getState().isLoading).toBe(false);
      expect(useUserStore.getState().error).toBeNull();
    });

    it("catches thrown errors and sets error", async () => {
      (
        userProfileService.getFitnessGoals as jest.Mock
      ).mockRejectedValueOnce(new Error("Network failure"));

      const res = await useUserStore.getState().getFitnessGoals("user-123");

      expect(res).toEqual({ success: false, error: "Network failure" });
      expect(useUserStore.getState().error).toBe("Network failure");
      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // updateFitnessGoals
  // -------------------------------------------------------------------------
  describe("updateFitnessGoals", () => {
    it("merges fitnessGoals into existing profile on success", async () => {
      useUserStore.getState().setProfile(completeProfile);
      (
        userProfileService.updateFitnessGoals as jest.Mock
      ).mockResolvedValueOnce({ success: true, data: mockGoals });

      const res = await useUserStore
        .getState()
        .updateFitnessGoals("user-123", { experience: "advanced" } as any);

      expect(res).toEqual({ success: true, data: mockGoals });
      expect(useUserStore.getState().profile?.fitnessGoals).toEqual(mockGoals);
      expect(useUserStore.getState().isLoading).toBe(false);
    });

    it("does not set profile when profile is null", async () => {
      (
        userProfileService.updateFitnessGoals as jest.Mock
      ).mockResolvedValueOnce({ success: true, data: mockGoals });

      await useUserStore
        .getState()
        .updateFitnessGoals("user-123", { experience: "advanced" } as any);

      expect(useUserStore.getState().profile).toBeNull();
      expect(useUserStore.getState().isLoading).toBe(false);
      expect(useUserStore.getState().error).toBeNull();
    });

    it("catches thrown errors and sets error", async () => {
      (
        userProfileService.updateFitnessGoals as jest.Mock
      ).mockRejectedValueOnce(new Error("Network failure"));

      const res = await useUserStore
        .getState()
        .updateFitnessGoals("user-123", { experience: "advanced" } as any);

      expect(res).toEqual({ success: false, error: "Network failure" });
      expect(useUserStore.getState().error).toBe("Network failure");
      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getCompleteProfile
  // -------------------------------------------------------------------------
  describe("getCompleteProfile", () => {
    it("sets profile and isProfileComplete on success", async () => {
      (
        userProfileService.getCompleteProfile as jest.Mock
      ).mockResolvedValueOnce({ success: true, data: completeProfile });

      const res = await useUserStore.getState().getCompleteProfile("user-123");

      expect(res).toEqual({ success: true, data: completeProfile });
      const s = useUserStore.getState();
      expect(s.profile).toEqual(completeProfile);
      expect(s.isLoading).toBe(false);
      expect(s.isProfileComplete).toBe(true);
    });

    it("sets error when service returns failure", async () => {
      (
        userProfileService.getCompleteProfile as jest.Mock
      ).mockResolvedValueOnce({ success: false, error: "Missing" });

      await useUserStore.getState().getCompleteProfile("user-123");

      expect(useUserStore.getState().error).toBe("Missing");
      expect(useUserStore.getState().isLoading).toBe(false);
    });

    it("catches thrown errors and sets error", async () => {
      (
        userProfileService.getCompleteProfile as jest.Mock
      ).mockRejectedValueOnce(new Error("Network failure"));

      const res = await useUserStore.getState().getCompleteProfile("user-123");

      expect(res).toEqual({ success: false, error: "Network failure" });
      expect(useUserStore.getState().error).toBe("Network failure");
      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // deleteProfile
  // -------------------------------------------------------------------------
  describe("deleteProfile", () => {
    it("clears profile and isProfileComplete on success", async () => {
      // Pre-seed a profile so we can verify it gets cleared
      useUserStore.getState().setProfile(completeProfile);
      expect(useUserStore.getState().profile).not.toBeNull();

      (
        userProfileService.deleteProfile as jest.Mock
      ).mockResolvedValueOnce({ success: true });

      const res = await useUserStore.getState().deleteProfile("user-123");

      expect(res).toEqual({ success: true });
      const s = useUserStore.getState();
      expect(s.profile).toBeNull();
      expect(s.isProfileComplete).toBe(false);
      expect(s.isLoading).toBe(false);
      expect(s.error).toBeNull();
    });

    it("sets error when service returns failure", async () => {
      (
        userProfileService.deleteProfile as jest.Mock
      ).mockResolvedValueOnce({ success: false, error: "Forbidden" });

      const res = await useUserStore.getState().deleteProfile("user-123");

      expect(res).toEqual({ success: false, error: "Forbidden" });
      expect(useUserStore.getState().error).toBe("Forbidden");
      expect(useUserStore.getState().isLoading).toBe(false);
    });

    it("catches thrown errors and sets error", async () => {
      (
        userProfileService.deleteProfile as jest.Mock
      ).mockRejectedValueOnce(new Error("Network failure"));

      const res = await useUserStore.getState().deleteProfile("user-123");

      expect(res).toEqual({ success: false, error: "Network failure" });
      expect(useUserStore.getState().error).toBe("Network failure");
      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Synchronous utility actions
  // -------------------------------------------------------------------------
  describe("clearError", () => {
    it("sets error to null", () => {
      useUserStore.setState({ error: "some error" });
      expect(useUserStore.getState().error).toBe("some error");

      useUserStore.getState().clearError();

      expect(useUserStore.getState().error).toBeNull();
    });
  });

  describe("clearProfile", () => {
    it("resets profile, isProfileComplete, and error", () => {
      useUserStore.getState().setProfile(completeProfile);
      useUserStore.setState({ error: "leftover" });

      useUserStore.getState().clearProfile();

      const s = useUserStore.getState();
      expect(s.profile).toBeNull();
      expect(s.isProfileComplete).toBe(false);
      expect(s.error).toBeNull();
    });
  });

  describe("setProfile", () => {
    it("sets profile and computes isProfileComplete=true for a complete profile", () => {
      useUserStore.getState().setProfile(completeProfile);

      expect(useUserStore.getState().profile).toEqual(completeProfile);
      expect(useUserStore.getState().isProfileComplete).toBe(true);
    });

    it("sets profile and computes isProfileComplete=false for incomplete profile", () => {
      useUserStore.getState().setProfile(incompleteProfile);

      expect(useUserStore.getState().profile).toEqual(incompleteProfile);
      expect(useUserStore.getState().isProfileComplete).toBe(false);
    });

    it("clears profile and isProfileComplete when passed null", () => {
      useUserStore.getState().setProfile(completeProfile);

      useUserStore.getState().setProfile(null);

      expect(useUserStore.getState().profile).toBeNull();
      expect(useUserStore.getState().isProfileComplete).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Deprecated methods
  // -------------------------------------------------------------------------
  describe("updatePersonalInfo (deprecated)", () => {
    it("warns and updates profile.personalInfo when profile exists", () => {
      useUserStore.getState().setProfile(completeProfile);
      const newPI = { ...completeProfile.personalInfo, age: 35 };

      useUserStore.getState().updatePersonalInfo(newPI as any);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("DEPRECATED"),
      );
      expect(useUserStore.getState().profile?.personalInfo.age).toBe(35);
    });

    it("is a no-op when profile is null", () => {
      expect(useUserStore.getState().profile).toBeNull();

      useUserStore.getState().updatePersonalInfo({
        first_name: "X",
        last_name: "Y",
        age: 1,
        gender: "male",
        country: "US",
        state: "CA",
        wake_time: "07:00",
        sleep_time: "23:00",
      } as any);

      expect(useUserStore.getState().profile).toBeNull();
    });
  });

  describe("updateFitnessGoalsLocal (deprecated)", () => {
    it("warns and updates profile.fitnessGoals when profile exists", () => {
      useUserStore.getState().setProfile(completeProfile);

      useUserStore.getState().updateFitnessGoalsLocal(mockGoals);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("DEPRECATED"),
      );
      expect(useUserStore.getState().profile?.fitnessGoals).toEqual(mockGoals);
    });

    it("is a no-op when profile is null", () => {
      expect(useUserStore.getState().profile).toBeNull();

      useUserStore.getState().updateFitnessGoalsLocal(mockGoals);

      expect(useUserStore.getState().profile).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // checkProfileComplete
  // -------------------------------------------------------------------------
  describe("checkProfileComplete", () => {
    it("returns true when profile has personalInfo (name, age, gender) and workoutPreferences (primary_goals)", () => {
      const result = useUserStore.getState().checkProfileComplete(completeProfile);
      expect(result).toBe(true);
    });

    it("returns false when profile has no workoutPreferences", () => {
      const result =
        useUserStore.getState().checkProfileComplete(incompleteProfile);
      expect(result).toBe(false);
    });

    it("returns false when profile.personalInfo is missing", () => {
      const noPI = { ...completeProfile, personalInfo: undefined } as unknown as UserProfile;
      expect(useUserStore.getState().checkProfileComplete(noPI)).toBe(false);
    });

    it("returns false when personalInfo has no name/age/gender", () => {
      const weakPI = {
        ...completeProfile,
        personalInfo: { country: "US", state: "CA" } as any,
      } as unknown as UserProfile;
      expect(useUserStore.getState().checkProfileComplete(weakPI)).toBe(false);
    });

    it("returns true when workoutPreferences has location+intensity but no goals array", () => {
      const profileWithLocIntensity = {
        ...completeProfile,
        workoutPreferences: {
          location: "gym",
          equipment: [],
          time_preference: 45,
          intensity: "advanced",
          workout_types: [],
          primary_goals: [],
        },
      } as unknown as UserProfile;
      // location && intensity → hasWorkoutPrefs true
      expect(
        useUserStore.getState().checkProfileComplete(profileWithLocIntensity),
      ).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // reset
  // -------------------------------------------------------------------------
  describe("reset", () => {
    it("restores initial state", () => {
      // Dirty the store
      useUserStore.getState().setProfile(completeProfile);
      useUserStore.setState({ error: "leftover", isLoading: true });

      useUserStore.getState().reset();

      const s = useUserStore.getState();
      expect(s.profile).toBeNull();
      expect(s.isProfileComplete).toBe(false);
      expect(s.isLoading).toBe(false);
      expect(s.error).toBeNull();
    });
  });
});
