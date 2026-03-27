import {
  startTimer,
  getRemainingTime,
  isExpired,
} from "../../services/restTimerService";

describe("restTimerService", () => {
  describe("startTimer", () => {
    it("returns target end time = Date.now() + durationSeconds * 1000", () => {
      const before = Date.now();
      const target = startTimer(60);
      const after = Date.now();

      // targetEndTime should be within the bracket of before/after + 60s
      expect(target).toBeGreaterThanOrEqual(before + 60 * 1000);
      expect(target).toBeLessThanOrEqual(after + 60 * 1000);
    });

    it("handles 0-second duration", () => {
      const before = Date.now();
      const target = startTimer(0);
      const after = Date.now();

      expect(target).toBeGreaterThanOrEqual(before);
      expect(target).toBeLessThanOrEqual(after);
    });

    it("handles fractional seconds by truncating to integer math", () => {
      const before = Date.now();
      const target = startTimer(1.5);
      const after = Date.now();

      expect(target).toBeGreaterThanOrEqual(before + 1500);
      expect(target).toBeLessThanOrEqual(after + 1500);
    });
  });

  describe("getRemainingTime", () => {
    it("returns seconds remaining, rounded up", () => {
      // Target 30 seconds from now
      const targetEndTime = Date.now() + 30 * 1000;
      const remaining = getRemainingTime(targetEndTime);

      // Should be approximately 30 (within 1 second tolerance)
      expect(remaining).toBeGreaterThanOrEqual(29);
      expect(remaining).toBeLessThanOrEqual(30);
    });

    it("returns 0 when target is in the past", () => {
      const targetEndTime = Date.now() - 5000;
      expect(getRemainingTime(targetEndTime)).toBe(0);
    });

    it("returns 0 when target is exactly now", () => {
      const targetEndTime = Date.now();
      expect(getRemainingTime(targetEndTime)).toBe(0);
    });

    it("never returns negative values", () => {
      const targetEndTime = Date.now() - 100000;
      expect(getRemainingTime(targetEndTime)).toBe(0);
    });
  });

  describe("isExpired", () => {
    it("returns false when target is in the future", () => {
      const targetEndTime = Date.now() + 30000;
      expect(isExpired(targetEndTime)).toBe(false);
    });

    it("returns true when target is in the past", () => {
      const targetEndTime = Date.now() - 1000;
      expect(isExpired(targetEndTime)).toBe(true);
    });

    it("returns true when target is exactly now", () => {
      // Use a fixed time to avoid race conditions
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      expect(isExpired(now)).toBe(true);

      (Date.now as jest.Mock).mockRestore();
    });
  });

  describe("integration: startTimer + getRemainingTime + isExpired", () => {
    it("freshly started timer is not expired and has remaining time", () => {
      const target = startTimer(60);
      expect(isExpired(target)).toBe(false);
      expect(getRemainingTime(target)).toBeGreaterThan(0);
    });

    it("zero-duration timer is immediately expired", () => {
      const target = startTimer(0);
      // Tiny race possible, so target could equal Date.now()
      expect(isExpired(target)).toBe(true);
      expect(getRemainingTime(target)).toBe(0);
    });
  });
});
