import {
  HeartRateCalculator,
  heartRateCalculator,
} from "../../../utils/healthCalculations/calculators/heartRateCalculator";

describe("heartRateCalculator", () => {
  // ---------------------------------------------------------------------------
  // calculateMaxHR
  // ---------------------------------------------------------------------------
  describe("calculateMaxHR", () => {
    const calc = new HeartRateCalculator();

    it("returns the measured HR when a positive measured value is provided (priority 1)", () => {
      // measured=195 short-circuits all formula logic
      expect(calc.calculateMaxHR(30, "male", 195)).toBe(195);
      expect(calc.calculateMaxHR(30, "female", 195)).toBe(195);
    });

    it("falls through to the formula when measured is 0 (falsy)", () => {
      // measured=0 is falsy, so Gulati applies for female age 30:
      // Math.round(206 - 0.88*30) = Math.round(179.6) = 180
      expect(calc.calculateMaxHR(30, "female", 0)).toBe(180);
      // Tanaka for male age 30: Math.round(208 - 0.7*30) = Math.round(187) = 187
      expect(calc.calculateMaxHR(30, "male", 0)).toBe(187);
    });

    it("falls through to the formula when measured is undefined", () => {
      expect(calc.calculateMaxHR(30, "female")).toBe(180);
      expect(calc.calculateMaxHR(30, "male")).toBe(187);
    });

    it("uses Gulati (206 - 0.88*age) for females", () => {
      // age 30: Math.round(206 - 26.4) = Math.round(179.6) = 180
      expect(calc.calculateMaxHR(30, "female")).toBe(180);
    });

    it("uses Tanaka (208 - 0.7*age) for males", () => {
      // age 30: Math.round(208 - 21) = Math.round(187) = 187
      expect(calc.calculateMaxHR(30, "male")).toBe(187);
    });

    it("uses Tanaka for 'other' gender", () => {
      // age 40: Math.round(208 - 28) = Math.round(180) = 180
      expect(calc.calculateMaxHR(40, "other")).toBe(180);
    });

    it("uses Tanaka for 'prefer_not_to_say' gender", () => {
      // age 40: Math.round(208 - 28) = 180
      expect(calc.calculateMaxHR(40, "prefer_not_to_say")).toBe(180);
    });

    it("applies Gulati for female regardless of age (female takes priority over Tanaka)", () => {
      // age 40 female: Math.round(206 - 0.88*40) = Math.round(206 - 35.2) = Math.round(170.8) = 171
      // (NOT the Tanaka value of 180)
      expect(calc.calculateMaxHR(40, "female")).toBe(171);
      expect(calc.calculateMaxHR(40, "female")).not.toBe(180);
    });

    it("ignores measured value when measured is negative (falsy branch not hit, but >0 check fails)", () => {
      // measured=-5: `measured && measured > 0` -> -5 is truthy, but -5 > 0 is false,
      // so the whole condition is false -> falls through to Tanaka for male age 30 -> 187
      expect(calc.calculateMaxHR(30, "male", -5)).toBe(187);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateZones
  // ---------------------------------------------------------------------------
  describe("calculateZones", () => {
    const calc = new HeartRateCalculator();

    it("computes Karvonen zones for a male (age 30, resting 70)", () => {
      // max = Tanaka(30) = 187; reserve = 187 - 70 = 117
      // zone1: min = round(70 + 117*0.5) = round(128.5) = 129
      //        max = round(70 + 117*0.6) = round(140.2) = 140
      // zone2: min = 140, max = round(70 + 117*0.7) = round(151.9) = 152
      // zone3: min = 152, max = round(70 + 117*0.8) = round(163.6) = 164
      // zone4: min = 164, max = round(70 + 117*0.9) = round(175.3) = 175
      // zone5: min = 175, max = 187 (max)
      const zones = calc.calculateZones(30, "male", 70);

      expect(zones.maxHeartRate).toBe(187);
      expect(zones.restingHeartRate).toBe(70);

      expect(zones.zone1).toEqual({
        name: "Recovery",
        min: 129,
        max: 140,
        description: "Active recovery, warm-up (50-60%)",
      });
      expect(zones.zone2).toEqual({
        name: "Aerobic",
        min: 140,
        max: 152,
        description: "Steady cardio, fat burn (60-70%)",
      });
      expect(zones.zone3).toEqual({
        name: "Tempo",
        min: 152,
        max: 164,
        description: "Tempo runs, moderate intensity (70-80%)",
      });
      expect(zones.zone4).toEqual({
        name: "Threshold",
        min: 164,
        max: 175,
        description: "Intervals, hard efforts (80-90%)",
      });
      expect(zones.zone5).toEqual({
        name: "VO2 Max",
        min: 175,
        max: 187,
        description: "Max intervals, sprints (90-100%)",
      });
    });

    it("computes Karvonen zones for a female (age 25, resting 75)", () => {
      // max = Gulati(25) = round(206 - 0.88*25) = round(206 - 22) = round(184) = 184
      // reserve = 184 - 75 = 109
      // zone1.min = round(75 + 109*0.5) = round(75 + 54.5) = round(129.5) = 130
      // zone1.max = round(75 + 109*0.6) = round(75 + 65.4) = round(140.4) = 140
      const zones = calc.calculateZones(25, "female", 75);

      expect(zones.maxHeartRate).toBe(184);
      expect(zones.restingHeartRate).toBe(75);
      expect(zones.zone1.min).toBe(130);
      expect(zones.zone1.max).toBe(140);
      expect(zones.zone1.name).toBe("Recovery");
    });

    it("defaults restingHR to 70 for males when not provided", () => {
      const zones = calc.calculateZones(30, "male");
      expect(zones.restingHeartRate).toBe(70);
      // With default resting=70 and max=187, zone1.min = round(70 + 117*0.5) = 129
      expect(zones.zone1.min).toBe(129);
    });

    it("defaults restingHR to 75 for females when not provided", () => {
      const zones = calc.calculateZones(25, "female");
      expect(zones.restingHeartRate).toBe(75);
      // max = 184, reserve = 184 - 75 = 109, zone1.min = round(75 + 54.5) = 130
      expect(zones.zone1.min).toBe(130);
    });

    it("defaults restingHR to 70 for 'other' gender when not provided", () => {
      const zones = calc.calculateZones(40, "other");
      expect(zones.restingHeartRate).toBe(70);
    });

    it("uses the maxHR override instead of calculating from age/gender", () => {
      // Override max to 190 (not 187). resting=70 -> reserve = 190 - 70 = 120
      // zone1.min = round(70 + 120*0.5) = round(130) = 130
      // zone1.max = round(70 + 120*0.6) = round(70 + 72) = 142
      // zone5.max = 190 (the override)
      const zones = calc.calculateZones(30, "male", 70, 190);

      expect(zones.maxHeartRate).toBe(190);
      expect(zones.zone1.min).toBe(130);
      expect(zones.zone1.max).toBe(142);
      expect(zones.zone5.max).toBe(190);
    });

    it("passes the maxHR override through calculateMaxHR (override >0 wins over formula)", () => {
      // Even though female age 25 would give max=184, override 200 wins.
      const zones = calc.calculateZones(25, "female", 75, 200);
      expect(zones.maxHeartRate).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // classifyRestingHR
  // ---------------------------------------------------------------------------
  describe("classifyRestingHR", () => {
    const calc = new HeartRateCalculator();

    describe("male thresholds (excellent<=55, good<=60, average<=70, belowAverage<=78)", () => {
      it("classifies 50 as Excellent", () => {
        expect(calc.classifyRestingHR(50, 30, "male")).toEqual({
          classification: "Excellent",
          description: "Athletic heart rate",
          healthImplications:
            "Indicates excellent cardiovascular fitness and heart health.",
        });
      });

      it("classifies 58 as Good", () => {
        expect(calc.classifyRestingHR(58, 30, "male")).toEqual({
          classification: "Good",
          description: "Above average fitness",
          healthImplications: "Good cardiovascular fitness. Heart is efficient.",
        });
      });

      it("classifies 65 as Average", () => {
        expect(calc.classifyRestingHR(65, 30, "male")).toEqual({
          classification: "Average",
          description: "Normal heart rate",
          healthImplications:
            "Average cardiovascular fitness. Room for improvement through exercise.",
        });
      });

      it("classifies 76 as Below Average", () => {
        expect(calc.classifyRestingHR(76, 30, "male")).toEqual({
          classification: "Below Average",
          description: "Higher than ideal",
          healthImplications:
            "Consider increasing cardiovascular exercise to improve heart efficiency.",
        });
      });

      it("classifies 85 as Poor", () => {
        expect(calc.classifyRestingHR(85, 30, "male")).toEqual({
          classification: "Poor",
          description: "Elevated resting heart rate",
          healthImplications:
            "Consult healthcare provider. May indicate deconditioning or health issues.",
        });
      });

      it("treats the boundary 55 as Excellent (<=)", () => {
        expect(calc.classifyRestingHR(55, 30, "male").classification).toBe(
          "Excellent",
        );
      });

      it("treats the boundary 78 as Below Average (<=)", () => {
        expect(calc.classifyRestingHR(78, 30, "male").classification).toBe(
          "Below Average",
        );
      });
    });

    describe("female thresholds (excellent<=60, good<=65, average<=75, belowAverage<=82)", () => {
      it("classifies 58 as Excellent", () => {
        expect(calc.classifyRestingHR(58, 30, "female").classification).toBe(
          "Excellent",
        );
      });

      it("classifies 63 as Good", () => {
        expect(calc.classifyRestingHR(63, 30, "female").classification).toBe(
          "Good",
        );
      });

      it("classifies 73 as Average", () => {
        expect(calc.classifyRestingHR(73, 30, "female").classification).toBe(
          "Average",
        );
      });

      it("classifies 80 as Below Average", () => {
        expect(calc.classifyRestingHR(80, 30, "female").classification).toBe(
          "Below Average",
        );
      });

      it("classifies 90 as Poor", () => {
        expect(calc.classifyRestingHR(90, 30, "female").classification).toBe(
          "Poor",
        );
      });

      it("treats the female boundary 60 as Excellent (<=)", () => {
        expect(calc.classifyRestingHR(60, 30, "female").classification).toBe(
          "Excellent",
        );
      });

      it("treats the female boundary 82 as Below Average (<=)", () => {
        expect(calc.classifyRestingHR(82, 30, "female").classification).toBe(
          "Below Average",
        );
      });
    });

    it("uses male thresholds for 'other' gender", () => {
      // 'other' is not 'female', so male thresholds apply: 58 -> Good (<=60)
      expect(calc.classifyRestingHR(58, 30, "other").classification).toBe(
        "Good",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // calculateTargetHR
  // ---------------------------------------------------------------------------
  describe("calculateTargetHR", () => {
    const calc = new HeartRateCalculator();

    it("computes target, range, and zone for male age 30 at intensity 75", () => {
      // max=187 (Tanaka), resting=70, reserve=117
      // target = round(70 + 117*0.75) = round(70 + 87.75) = round(157.75) = 158
      // range.min = round(70 + 117*0.70) = round(70 + 81.9) = round(151.9) = 152
      // range.max = round(70 + 117*0.80) = round(70 + 93.6) = round(163.6) = 164
      // 75 is in [70,80) -> "Tempo"
      const result = calc.calculateTargetHR(30, "male", 75, 70, 187);

      expect(result.target).toBe(158);
      expect(result.range).toEqual({ min: 152, max: 164 });
      expect(result.zone).toBe("Tempo");
    });

    it("uses default resting HR (70) for males when not provided", () => {
      // max=187, resting=70 (default), reserve=117
      // target = round(70 + 117*0.75) = 158
      const result = calc.calculateTargetHR(30, "male", 75);
      expect(result.target).toBe(158);
    });

    it("uses default resting HR (75) for females when not provided", () => {
      // max=Gulati(25)=184, resting=75 (default), reserve=109
      // target = round(75 + 109*0.75) = round(75 + 81.75) = round(156.75) = 157
      const result = calc.calculateTargetHR(25, "female", 75);
      expect(result.target).toBe(157);
    });

    it("uses provided maxHR override instead of calculating", () => {
      // max=190 (override), resting=70, reserve=120
      // target = round(70 + 120*0.75) = round(70 + 90) = 160
      const result = calc.calculateTargetHR(30, "male", 75, 70, 190);
      expect(result.target).toBe(160);
    });

    it("classifies intensity 50 as Recovery (<60)", () => {
      const result = calc.calculateTargetHR(30, "male", 50, 70, 187);
      expect(result.zone).toBe("Recovery");
    });

    it("classifies intensity 65 as Aerobic ([60,70))", () => {
      const result = calc.calculateTargetHR(30, "male", 65, 70, 187);
      expect(result.zone).toBe("Aerobic");
    });

    it("classifies intensity 75 as Tempo ([70,80))", () => {
      const result = calc.calculateTargetHR(30, "male", 75, 70, 187);
      expect(result.zone).toBe("Tempo");
    });

    it("classifies intensity 85 as Threshold ([80,90))", () => {
      const result = calc.calculateTargetHR(30, "male", 85, 70, 187);
      expect(result.zone).toBe("Threshold");
    });

    it("classifies intensity 95 as VO2 Max (>=90)", () => {
      const result = calc.calculateTargetHR(30, "male", 95, 70, 187);
      expect(result.zone).toBe("VO2 Max");
    });

    it("treats the boundary 60 as Aerobic (not Recovery)", () => {
      // 60 is NOT < 60, so it falls to the [60,70) -> Aerobic branch
      const result = calc.calculateTargetHR(30, "male", 60, 70, 187);
      expect(result.zone).toBe("Aerobic");
    });

    it("treats the boundary 90 as VO2 Max (not Threshold)", () => {
      // 90 is NOT < 90, so it falls to the else -> VO2 Max
      const result = calc.calculateTargetHR(30, "male", 90, 70, 187);
      expect(result.zone).toBe("VO2 Max");
    });
  });

  // ---------------------------------------------------------------------------
  // estimateFitnessFromRHR
  // ---------------------------------------------------------------------------
  describe("estimateFitnessFromRHR", () => {
    const calc = new HeartRateCalculator();

    it("returns Excellent / score 95 for male resting 50", () => {
      // 50 <= 55 (male excellent) -> Excellent -> score 95
      expect(calc.estimateFitnessFromRHR(50, 30, "male")).toEqual({
        fitnessLevel: "Excellent",
        score: 95,
      });
    });

    it("returns Average / score 60 for male resting 65", () => {
      // 65 <= 70 (male average) -> Average -> score 60
      expect(calc.estimateFitnessFromRHR(65, 30, "male")).toEqual({
        fitnessLevel: "Average",
        score: 60,
      });
    });

    it("returns Poor / score 20 for male resting 85", () => {
      // 85 > 78 (male belowAverage) -> Poor -> score 20
      expect(calc.estimateFitnessFromRHR(85, 30, "male")).toEqual({
        fitnessLevel: "Poor",
        score: 20,
      });
    });

    it("returns Excellent / score 95 for female resting 58", () => {
      // 58 <= 60 (female excellent) -> Excellent -> score 95
      expect(calc.estimateFitnessFromRHR(58, 30, "female")).toEqual({
        fitnessLevel: "Excellent",
        score: 95,
      });
    });

    it("maps Good -> score 80", () => {
      // male resting 58 -> Good -> score 80
      expect(calc.estimateFitnessFromRHR(58, 30, "male")).toEqual({
        fitnessLevel: "Good",
        score: 80,
      });
    });

    it("maps Below Average -> score 40", () => {
      // male resting 76 -> Below Average -> score 40
      expect(calc.estimateFitnessFromRHR(76, 30, "male")).toEqual({
        fitnessLevel: "Below Average",
        score: 40,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Singleton parity — the exported `heartRateCalculator` instance must behave
  // identically to a freshly constructed HeartRateCalculator.
  // ---------------------------------------------------------------------------
  describe("heartRateCalculator singleton", () => {
    it("is an instance of HeartRateCalculator", () => {
      expect(heartRateCalculator).toBeInstanceOf(HeartRateCalculator);
    });

    it("calculateMaxHR matches the class instance", () => {
      const instance = new HeartRateCalculator();
      expect(heartRateCalculator.calculateMaxHR(30, "male", 195)).toBe(195);
      expect(heartRateCalculator.calculateMaxHR(30, "female")).toBe(180);
      expect(heartRateCalculator.calculateMaxHR(30, "male")).toBe(187);
      expect(heartRateCalculator.calculateMaxHR(40, "other")).toBe(180);
      // parity with a fresh instance
      expect(heartRateCalculator.calculateMaxHR(40, "female")).toBe(
        instance.calculateMaxHR(40, "female"),
      );
    });

    it("calculateZones matches the class instance", () => {
      const instance = new HeartRateCalculator();
      const singletonZones = heartRateCalculator.calculateZones(30, "male", 70);
      const instanceZones = instance.calculateZones(30, "male", 70);
      expect(singletonZones).toEqual(instanceZones);
      expect(singletonZones.maxHeartRate).toBe(187);
      expect(singletonZones.zone1.min).toBe(129);
      expect(singletonZones.zone5.max).toBe(187);
    });

    it("classifyRestingHR matches the class instance", () => {
      const instance = new HeartRateCalculator();
      expect(
        heartRateCalculator.classifyRestingHR(50, 30, "male"),
      ).toEqual(instance.classifyRestingHR(50, 30, "male"));
      expect(
        heartRateCalculator.classifyRestingHR(90, 30, "female").classification,
      ).toBe("Poor");
    });

    it("calculateTargetHR matches the class instance", () => {
      const instance = new HeartRateCalculator();
      expect(
        heartRateCalculator.calculateTargetHR(30, "male", 75, 70, 187),
      ).toEqual(instance.calculateTargetHR(30, "male", 75, 70, 187));
      expect(
        heartRateCalculator.calculateTargetHR(30, "male", 75, 70, 187).target,
      ).toBe(158);
    });

    it("estimateFitnessFromRHR matches the class instance", () => {
      const instance = new HeartRateCalculator();
      expect(
        heartRateCalculator.estimateFitnessFromRHR(50, 30, "male"),
      ).toEqual(instance.estimateFitnessFromRHR(50, 30, "male"));
      expect(
        heartRateCalculator.estimateFitnessFromRHR(85, 30, "male"),
      ).toEqual({ fitnessLevel: "Poor", score: 20 });
    });
  });
});
