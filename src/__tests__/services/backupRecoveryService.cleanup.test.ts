import { BackupRecoveryService } from "../../services/backupRecoveryService";
import { AppState } from "react-native";

// Mock dependencies
jest.mock("../../services/localStorage");
jest.mock("../../services/DataBridge");
jest.mock("../../utils/validation");
jest.mock("../../services/supabase");
jest.mock("@react-native-async-storage/async-storage");
jest.mock("expo-crypto");

describe("BackupRecoveryService - Timer Cleanup", () => {
  let service: BackupRecoveryService;
  let clearIntervalSpy: jest.SpyInstance;
  let setIntervalSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
    clearIntervalSpy = jest.spyOn(global, "clearInterval");
    setIntervalSpy = jest.spyOn(global, "setInterval");

    service = new BackupRecoveryService({
      enableAutoBackup: true,
      backupIntervalMs: 1000,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe("destroy() method", () => {
    it("should clear backup timer when destroy is called", async () => {
      // Start auto backup (creates timer)
      await service.initialize();

      // Verify timer was created
      expect(setIntervalSpy).toHaveBeenCalled();

      // Call destroy
      service.destroy();

      // Verify clearInterval was called
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it("should set timer reference to null after destroy", async () => {
      await service.initialize();

      service.destroy();

      // Accessing private property for testing - timer should be null
      expect((service as any).backupTimer).toBeNull();
    });

    it("should not throw error if destroy called when no timer exists", () => {
      expect(() => {
        service.destroy();
      }).not.toThrow();
    });

    it("should prevent memory leak by clearing timer on multiple destroy calls", async () => {
      await service.initialize();

      clearIntervalSpy.mockClear();

      service.destroy();
      service.destroy();
      service.destroy();

      // Should only clear once (subsequent calls do nothing)
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("AppState background integration", () => {
    it("should cleanup timer when app goes to background", async () => {
      await service.initialize();

      clearIntervalSpy.mockClear();

      // Simulate app going to background
      const appStateHandler = (AppState.addEventListener as jest.Mock).mock
        .calls[0][1];
      appStateHandler("background");

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it("should restart timer when app becomes active", async () => {
      await service.initialize();

      // App goes to background
      const appStateHandler = (AppState.addEventListener as jest.Mock).mock
        .calls[0][1];
      appStateHandler("background");

      setIntervalSpy.mockClear();

      // App becomes active again
      appStateHandler("active");

      expect(setIntervalSpy).toHaveBeenCalled();
    });

    it("should remove AppState listener on destroy", async () => {
      const mockRemove = jest.fn();
      (AppState.addEventListener as jest.Mock).mockReturnValue({
        remove: mockRemove,
      });

      await service.initialize();
      service.destroy();

      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe("stop() method", () => {
    it("should call stopAutoBackup which clears timer", async () => {
      await service.initialize();

      clearIntervalSpy.mockClear();

      await service.stop();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe("memory leak prevention", () => {
    it("should not accumulate timers on config updates", async () => {
      await service.initialize();

      setIntervalSpy.mockClear();
      clearIntervalSpy.mockClear();

      // Update config multiple times
      service.updateConfig({ backupIntervalMs: 2000 });
      service.updateConfig({ backupIntervalMs: 3000 });
      service.updateConfig({ backupIntervalMs: 4000 });

      // Should clear old timer each time (3 clears)
      expect(clearIntervalSpy).toHaveBeenCalledTimes(3);
      // Should create new timer each time (3 creates)
      expect(setIntervalSpy).toHaveBeenCalledTimes(3);
    });

    it("should properly cleanup when toggling auto backup", async () => {
      await service.initialize();

      clearIntervalSpy.mockClear();

      // Disable auto backup
      service.updateConfig({ enableAutoBackup: false });
      expect(clearIntervalSpy).toHaveBeenCalled();

      setIntervalSpy.mockClear();

      // Enable auto backup again
      service.updateConfig({ enableAutoBackup: true });
      expect(setIntervalSpy).toHaveBeenCalled();
    });
  });
});
