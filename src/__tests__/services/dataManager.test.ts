/**
 * DataBridge Tests
 * Test suite for profile data management
 *
 * NOTE: DataBridge uses ProfileStore as the source of truth for onboarding data.
 * Save operations update ProfileStore and optionally sync to database.
 * Load operations return data from ProfileStore.
 */

import { dataBridge } from "../../services/DataBridge";
import { useProfileStore } from "../../stores/profileStore";

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
}));

jest.mock("../../services/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      upsert: jest.fn(() => Promise.resolve({ error: null })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  },
}));

describe("DataBridge", () => {
  const mockUserId = "test-user-123";

  const mockPersonalInfo = {
    first_name: "John",
    last_name: "Doe",
    age: 25,
    gender: "male" as const,
    country: "USA",
    state: "CA",
    wake_time: "07:00",
    sleep_time: "23:00",
    occupation_type: "desk_job" as const,
    name: "John Doe",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useProfileStore.getState().reset();
    dataBridge.setUserId(mockUserId);
    dataBridge.setOnlineStatus(true);
  });

  describe("Personal Info Management", () => {
    it("should save personal info and return SaveResult", async () => {
      const result = await dataBridge.savePersonalInfo(mockPersonalInfo);

      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("errors");
      expect(result.errors).toEqual([]);
    });

    it("should update ProfileStore when saving", async () => {
      await dataBridge.savePersonalInfo(mockPersonalInfo);

      const profileState = useProfileStore.getState();
      expect(profileState.personalInfo).not.toBeNull();
      expect(profileState.personalInfo?.name).toBe(mockPersonalInfo.name);
    });

    it("should load personal info from ProfileStore in guest mode", async () => {
      dataBridge.setUserId(null);

      await dataBridge.savePersonalInfo(mockPersonalInfo);

      const result = await dataBridge.loadPersonalInfo();

      expect(result).not.toBeNull();
      expect(result?.name).toBe(mockPersonalInfo.name);
    });

    it("should return null when ProfileStore has no personal info", async () => {
      const result = await dataBridge.loadPersonalInfo();
      expect(result).toBeNull();
    });
  });

  describe("User ID Management", () => {
    it("should set user ID via setUserId method", () => {
      const newUserId = "new-user-456";
      dataBridge.setUserId(newUserId);

      const result = (dataBridge as any).currentUserId;
      expect(result).toBe(newUserId);
    });

    it("should handle guest mode (null user ID)", async () => {
      dataBridge.setUserId(null);

      const result = await dataBridge.savePersonalInfo(mockPersonalInfo);

      expect(result.success).toBe(true);
    });
  });

  describe("Online/Offline Behavior", () => {
    it("should queue for sync when database save fails", async () => {
      const { supabase } = require("../../services/supabase");
      supabase.from().upsert.mockRejectedValueOnce(new Error("Network error"));

      const result = await dataBridge.savePersonalInfo(mockPersonalInfo);

      expect(result.success).toBe(true);
      expect(result.newSystemSuccess).toBe(false);
    });

    it("should save to local storage in guest mode", async () => {
      dataBridge.setUserId(null);

      const result = await dataBridge.savePersonalInfo(mockPersonalInfo);

      expect(result.success).toBe(true);

      const AsyncStorage = require("@react-native-async-storage/async-storage");
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe("Data Clearing", () => {
    it("should clear local data and reset ProfileStore", async () => {
      await dataBridge.savePersonalInfo(mockPersonalInfo);

      await dataBridge.clearLocalData();

      const profileState = useProfileStore.getState();
      expect(profileState.personalInfo).toBeNull();
    });
  });

  describe("Error Handling", () => {
    it("should handle Supabase errors gracefully", async () => {
      const { supabase } = require("../../services/supabase");
      supabase.from().upsert.mockRejectedValueOnce(new Error("Database error"));

      const result = await dataBridge.savePersonalInfo(mockPersonalInfo);

      expect(result.success).toBe(true);
      expect(result.newSystemSuccess).toBe(false);
    });
  });

  describe("Integration Tests", () => {
    it("should complete full save-load cycle in guest mode", async () => {
      dataBridge.setUserId(null);

      const saveResult = await dataBridge.savePersonalInfo(mockPersonalInfo);
      expect(saveResult.success).toBe(true);

      const loadResult = await dataBridge.loadPersonalInfo();
      expect(loadResult).not.toBeNull();
      expect(loadResult?.name).toBe(mockPersonalInfo.name);
      expect(loadResult?.age).toBe(mockPersonalInfo.age);
    });
  });
});
