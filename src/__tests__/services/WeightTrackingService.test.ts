import {
  weightTrackingService,
  WeightChangeEvent,
  WeightChangeCallback,
} from "../../services/WeightTrackingService";

describe("WeightTrackingService", () => {
  beforeEach(() => {
    weightTrackingService.removeAllListeners();
  });

  afterEach(() => {
    weightTrackingService.removeAllListeners();
    jest.clearAllMocks();
  });

  describe("getCurrentWeight", () => {
    it("should return null when no weight is set", () => {
      expect(weightTrackingService.getCurrentWeight()).toBeNull();
    });

    it("should return the current weight after setWeight is called", () => {
      weightTrackingService.setWeight(75.5);
      expect(weightTrackingService.getCurrentWeight()).toBe(75.5);
    });
  });

  describe("setWeight", () => {
    it("should update the current weight", () => {
      weightTrackingService.setWeight(80);
      expect(weightTrackingService.getCurrentWeight()).toBe(80);
    });

    it("should emit WEIGHT_CHANGED event when weight is set", () => {
      const callback = jest.fn();
      weightTrackingService.subscribe("WEIGHT_CHANGED", callback);

      weightTrackingService.setWeight(70);

      expect(callback).toHaveBeenCalledWith({
        type: "WEIGHT_CHANGED",
        data: {
          previousWeight: null,
          currentWeight: 70,
          timestamp: expect.any(String),
        },
      });
    });

    it("should include previous weight in event data", () => {
      weightTrackingService.setWeight(75);
      const callback = jest.fn();
      weightTrackingService.subscribe("WEIGHT_CHANGED", callback);

      weightTrackingService.setWeight(74);

      expect(callback).toHaveBeenCalledWith({
        type: "WEIGHT_CHANGED",
        data: {
          previousWeight: 75,
          currentWeight: 74,
          timestamp: expect.any(String),
        },
      });
    });

    it("should not emit event if weight is unchanged", () => {
      weightTrackingService.setWeight(75);
      const callback = jest.fn();
      weightTrackingService.subscribe("WEIGHT_CHANGED", callback);

      weightTrackingService.setWeight(75);

      expect(callback).not.toHaveBeenCalled();
    });

    it("should handle weight with decimal precision", () => {
      weightTrackingService.setWeight(72.35);
      expect(weightTrackingService.getCurrentWeight()).toBe(72.35);
    });
  });

  describe("subscribe", () => {
    it("should return an unsubscribe function", () => {
      const callback = jest.fn();
      const unsubscribe = weightTrackingService.subscribe(
        "WEIGHT_CHANGED",
        callback,
      );

      expect(typeof unsubscribe).toBe("function");
    });

    it("should allow multiple subscribers", () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      weightTrackingService.subscribe("WEIGHT_CHANGED", callback1);
      weightTrackingService.subscribe("WEIGHT_CHANGED", callback2);

      weightTrackingService.setWeight(80);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it("should stop receiving events after unsubscribe", () => {
      const callback = jest.fn();
      const unsubscribe = weightTrackingService.subscribe(
        "WEIGHT_CHANGED",
        callback,
      );

      weightTrackingService.setWeight(75);
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      weightTrackingService.setWeight(76);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("removeAllListeners", () => {
    it("should remove all subscriptions", () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      weightTrackingService.subscribe("WEIGHT_CHANGED", callback1);
      weightTrackingService.subscribe("WEIGHT_CHANGED", callback2);

      weightTrackingService.removeAllListeners();

      weightTrackingService.setWeight(80);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    it("should reset current weight to null", () => {
      weightTrackingService.setWeight(75);
      weightTrackingService.removeAllListeners();

      expect(weightTrackingService.getCurrentWeight()).toBeNull();
    });
  });

  describe("getWeightHistory", () => {
    it("should return empty array when no weight changes recorded", () => {
      expect(weightTrackingService.getWeightHistory()).toEqual([]);
    });

    it("should track weight change history", () => {
      weightTrackingService.setWeight(75);
      weightTrackingService.setWeight(74.5);
      weightTrackingService.setWeight(74);

      const history = weightTrackingService.getWeightHistory();

      expect(history).toHaveLength(3);
      expect(history[0].weight).toBe(75);
      expect(history[1].weight).toBe(74.5);
      expect(history[2].weight).toBe(74);
    });
  });

  describe("initializeFromBodyAnalysis", () => {
    it("should set weight from body analysis data", () => {
      weightTrackingService.initializeFromBodyAnalysis({
        current_weight_kg: 78.5,
      });

      expect(weightTrackingService.getCurrentWeight()).toBe(78.5);
    });

    it("should not emit event during initialization", () => {
      const callback = jest.fn();
      weightTrackingService.subscribe("WEIGHT_CHANGED", callback);

      weightTrackingService.initializeFromBodyAnalysis({
        current_weight_kg: 78.5,
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("should handle null weight in body analysis", () => {
      weightTrackingService.initializeFromBodyAnalysis({
        current_weight_kg: null,
      });

      expect(weightTrackingService.getCurrentWeight()).toBeNull();
    });
  });
});
