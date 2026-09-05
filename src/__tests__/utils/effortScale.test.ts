import {
  EFFORT_BUCKET_TO_RPE10,
  rpe10ToBucket,
  rpeToRir,
  isHardSet,
  HARD_SET_RPE_THRESHOLD,
  RPE_LABELS,
} from "../../utils/effortScale";

describe("effortScale", () => {
  describe("EFFORT_BUCKET_TO_RPE10", () => {
    it("maps the 3-tap bucket to the RPE values shown in SetLogModal's UI", () => {
      expect(EFFORT_BUCKET_TO_RPE10[1]).toBe(4); // Easy
      expect(EFFORT_BUCKET_TO_RPE10[2]).toBe(7); // Just Right
      expect(EFFORT_BUCKET_TO_RPE10[3]).toBe(9); // Hard
    });
  });

  describe("rpe10ToBucket", () => {
    it("round-trips EFFORT_BUCKET_TO_RPE10's own values back to their bucket", () => {
      expect(rpe10ToBucket(EFFORT_BUCKET_TO_RPE10[1])).toBe(1);
      expect(rpe10ToBucket(EFFORT_BUCKET_TO_RPE10[2])).toBe(2);
      expect(rpe10ToBucket(EFFORT_BUCKET_TO_RPE10[3])).toBe(3);
    });

    it("buckets the full 1-10 range without gaps", () => {
      expect(rpe10ToBucket(1)).toBe(1);
      expect(rpe10ToBucket(5)).toBe(1);
      expect(rpe10ToBucket(6)).toBe(2);
      expect(rpe10ToBucket(7)).toBe(2);
      expect(rpe10ToBucket(8)).toBe(3);
      expect(rpe10ToBucket(10)).toBe(3);
    });
  });

  describe("rpeToRir", () => {
    it("is a pure display conversion — RIR = 10 - RPE", () => {
      expect(rpeToRir(10)).toBe(0);
      expect(rpeToRir(7)).toBe(3);
      expect(rpeToRir(1)).toBe(9);
    });
  });

  describe("isHardSet", () => {
    it("treats RPE >= 7 (RIR <= 3) as hard", () => {
      expect(HARD_SET_RPE_THRESHOLD).toBe(7);
      expect(isHardSet(7)).toBe(true);
      expect(isHardSet(10)).toBe(true);
      expect(isHardSet(6)).toBe(false);
      expect(isHardSet(null)).toBe(false);
      expect(isHardSet(undefined)).toBe(false);
    });
  });

  describe("RPE_LABELS", () => {
    it("covers the full 1-10 scale", () => {
      for (let i = 1; i <= 10; i++) {
        expect(RPE_LABELS[i]).toBeTruthy();
      }
    });
  });
});
