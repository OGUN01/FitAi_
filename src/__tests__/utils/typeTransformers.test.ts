import {
  toDbFormat,
  normalizeToSnakeCase,
  mapActivityLevelForHealthCalc,
  mapActivityLevelForOnboarding,
  mapDietTypeForHealthCalc,
  mapDietTypeForOnboarding,
} from "../../utils/typeTransformers";
import typeTransformers from "../../utils/typeTransformers";

describe("typeTransformers", () => {
  describe("toDbFormat", () => {
    it("converts simple camelCase object keys to snake_case", () => {
      const input = { firstName: "X", primaryGoals: ["a"] };
      expect(toDbFormat(input)).toEqual({
        first_name: "X",
        primary_goals: ["a"],
      });
    });

    it("converts nested object keys recursively", () => {
      const input = { personalInfo: { firstName: "X" } };
      expect(toDbFormat(input)).toEqual({
        personal_info: { first_name: "X" },
      });
    });

    it("converts each object inside an array of objects", () => {
      const input = [{ firstName: "A" }, { firstName: "B" }];
      expect(toDbFormat(input)).toEqual([
        { first_name: "A" },
        { first_name: "B" },
      ]);
    });

    it("passes already-snake keys through unchanged", () => {
      const input = { first_name: "X" };
      expect(toDbFormat(input)).toEqual({ first_name: "X" });
    });

    it("returns null for null input", () => {
      expect(toDbFormat(null as any)).toBeNull();
    });

    it("returns undefined for undefined input", () => {
      expect(toDbFormat(undefined as any)).toBeUndefined();
    });

    it("preserves Date instances instead of converting them to {}", () => {
      const date = new Date("2026-01-15T10:00:00Z");
      const input = { createdAt: date };
      const result = toDbFormat(input);
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.created_at).toBe(date);
    });

    it("returns non-object primitives as-is (string)", () => {
      expect(toDbFormat("hello" as any)).toBe("hello");
    });

    it("returns non-object primitives as-is (number)", () => {
      expect(toDbFormat(42 as any)).toBe(42);
    });

    it("does not transform primitives inside arrays", () => {
      const input = ["a", "b"];
      expect(toDbFormat(input as any)).toEqual(["a", "b"]);
    });

    it("preserves primitive values (numbers, booleans) on converted keys", () => {
      const input = { isActive: true, ageCount: 5 };
      expect(toDbFormat(input)).toEqual({ is_active: true, age_count: 5 });
    });

    it("prefers the raw snake_case value over a camelCase alias regardless of key order (camelCase first)", () => {
      const input = { firstName: "A", first_name: "B" };
      expect(toDbFormat(input)).toEqual({ first_name: "B" });
    });

    it("prefers the raw snake_case value over a camelCase alias regardless of key order (snake_case first)", () => {
      const input = { first_name: "B", firstName: "A" };
      expect(toDbFormat(input)).toEqual({ first_name: "B" });
    });
  });

  describe("normalizeToSnakeCase", () => {
    it("maps known camelCase fields via FIELD_MAPPINGS lookup", () => {
      expect(normalizeToSnakeCase({ firstName: "X" })).toEqual({
        first_name: "X",
      });
    });

    it("passes unknown fields through unchanged", () => {
      expect(normalizeToSnakeCase({ randomField: 1 })).toEqual({
        randomField: 1,
      });
    });

    it("recurses into nested objects (only mapped keys are renamed)", () => {
      // NOTE: `personalInfo` is NOT in FIELD_MAPPINGS, so it passes through
      // unchanged at the top level; only the inner mapped key `wakeTime`
      // becomes `wake_time`. normalizeToSnakeCase only renames known keys.
      const input = { personalInfo: { wakeTime: "6am" } };
      expect(normalizeToSnakeCase(input)).toEqual({
        personalInfo: { wake_time: "6am" },
      });
    });

    it("recurses into arrays of objects", () => {
      const input = { items: [{ firstName: "A" }, { firstName: "B" }] };
      expect(normalizeToSnakeCase(input)).toEqual({
        items: [{ first_name: "A" }, { first_name: "B" }],
      });
    });

    it("returns string input as-is (isPlainObject guard)", () => {
      expect(normalizeToSnakeCase("hello" as any)).toBe("hello");
    });

    it("returns number input as-is (isPlainObject guard)", () => {
      expect(normalizeToSnakeCase(42 as any)).toBe(42);
    });

    it("returns null input as-is (isPlainObject guard)", () => {
      expect(normalizeToSnakeCase(null as any)).toBeNull();
    });

    it("does not transform Date values inside objects (treats as terminal)", () => {
      const date = new Date("2026-01-15T10:00:00Z");
      const input = { createdAt: date };
      const result = normalizeToSnakeCase(input);
      // createdAt is NOT in FIELD_MAPPINGS, so it passes through as createdAt
      expect(result.createdAt).toBe(date);
    });

    it("leaves primitives inside arrays untouched", () => {
      const input = { tags: ["a", "b"] };
      expect(normalizeToSnakeCase(input)).toEqual({ tags: ["a", "b"] });
    });
  });

  describe("mapActivityLevelForHealthCalc", () => {
    it("maps 'extreme' to 'very_active'", () => {
      expect(mapActivityLevelForHealthCalc("extreme")).toBe("very_active");
    });

    it("passes 'sedentary' through unchanged", () => {
      expect(mapActivityLevelForHealthCalc("sedentary")).toBe("sedentary");
    });

    it("passes 'light' through unchanged", () => {
      expect(mapActivityLevelForHealthCalc("light")).toBe("light");
    });

    it("passes 'moderate' through unchanged", () => {
      expect(mapActivityLevelForHealthCalc("moderate")).toBe("moderate");
    });

    it("passes 'active' through unchanged", () => {
      expect(mapActivityLevelForHealthCalc("active")).toBe("active");
    });
  });

  describe("mapActivityLevelForOnboarding", () => {
    it("maps 'very_active' to 'extreme'", () => {
      expect(mapActivityLevelForOnboarding("very_active")).toBe("extreme");
    });

    it("maps 'extreme' to 'extreme'", () => {
      expect(mapActivityLevelForOnboarding("extreme")).toBe("extreme");
    });

    it("passes 'sedentary' through unchanged", () => {
      expect(mapActivityLevelForOnboarding("sedentary")).toBe("sedentary");
    });

    it("passes 'light' through unchanged", () => {
      expect(mapActivityLevelForOnboarding("light")).toBe("light");
    });

    it("passes 'moderate' through unchanged", () => {
      expect(mapActivityLevelForOnboarding("moderate")).toBe("moderate");
    });

    it("passes 'active' through unchanged", () => {
      expect(mapActivityLevelForOnboarding("active")).toBe("active");
    });

    it("falls back to 'moderate' for unknown values and warns", () => {
      const warnSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      try {
        expect(mapActivityLevelForOnboarding("foo")).toBe("moderate");
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain("foo");
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  describe("mapDietTypeForHealthCalc", () => {
    it("passes 'vegetarian' through unchanged", () => {
      expect(mapDietTypeForHealthCalc("vegetarian")).toBe("vegetarian");
    });

    it("passes 'vegan' through unchanged", () => {
      expect(mapDietTypeForHealthCalc("vegan")).toBe("vegan");
    });

    it("passes 'pescatarian' through unchanged", () => {
      expect(mapDietTypeForHealthCalc("pescatarian")).toBe("pescatarian");
    });

    it("maps 'non-veg' to 'omnivore'", () => {
      expect(mapDietTypeForHealthCalc("non-veg")).toBe("omnivore");
    });

    it("maps 'balanced' to 'omnivore'", () => {
      expect(mapDietTypeForHealthCalc("balanced")).toBe("omnivore");
    });

    it("maps 'non_veg' (legacy underscore spelling) to 'omnivore'", () => {
      expect(mapDietTypeForHealthCalc("non_veg")).toBe("omnivore");
    });

    it("passes 'keto' through unchanged", () => {
      expect(mapDietTypeForHealthCalc("keto")).toBe("keto");
    });

    it("passes 'omnivore' through unchanged", () => {
      expect(mapDietTypeForHealthCalc("omnivore")).toBe("omnivore");
    });

    it("passes 'mediterranean' through unchanged", () => {
      expect(mapDietTypeForHealthCalc("mediterranean")).toBe("mediterranean");
    });

    it("passes 'paleo' through unchanged", () => {
      expect(mapDietTypeForHealthCalc("paleo")).toBe("paleo");
    });

    it("maps every value in the live diet_type CHECK constraint to a known health-calc DietType without warning", () => {
      // Mirrors supabase/migrations/20260729000001_expand_diet_type_check_constraint.sql
      // and .../20260729000002_align_legacy_diet_type_check.sql — every one of
      // these values is legal in the live DB and must not fall through to the
      // 'Unknown onboarding diet_type' default/warn branch.
      const liveCheckConstraintValues = [
        "vegetarian",
        "vegan",
        "non-veg",
        "non_veg",
        "pescatarian",
        "keto",
        "omnivore",
        "balanced",
        "mediterranean",
        "paleo",
      ];
      const warnSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      try {
        for (const dietType of liveCheckConstraintValues) {
          expect(() => mapDietTypeForHealthCalc(dietType)).not.toThrow();
        }
        expect(warnSpy).not.toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    });

    it("falls back to 'omnivore' for unknown values and warns", () => {
      const warnSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      try {
        expect(mapDietTypeForHealthCalc("foo")).toBe("omnivore");
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain("foo");
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  describe("mapDietTypeForOnboarding", () => {
    it("passes 'vegetarian' through unchanged", () => {
      expect(mapDietTypeForOnboarding("vegetarian")).toBe("vegetarian");
    });

    it("passes 'vegan' through unchanged", () => {
      expect(mapDietTypeForOnboarding("vegan")).toBe("vegan");
    });

    it("passes 'pescatarian' through unchanged", () => {
      expect(mapDietTypeForOnboarding("pescatarian")).toBe("pescatarian");
    });

    it("maps 'omnivore' to 'balanced'", () => {
      expect(mapDietTypeForOnboarding("omnivore")).toBe("balanced");
    });

    it("maps 'keto' to 'balanced'", () => {
      expect(mapDietTypeForOnboarding("keto")).toBe("balanced");
    });

    it("maps 'low_carb' to 'balanced'", () => {
      expect(mapDietTypeForOnboarding("low_carb")).toBe("balanced");
    });

    it("maps 'paleo' to 'balanced'", () => {
      expect(mapDietTypeForOnboarding("paleo")).toBe("balanced");
    });

    it("maps 'mediterranean' to 'balanced'", () => {
      expect(mapDietTypeForOnboarding("mediterranean")).toBe("balanced");
    });

    it("falls back to 'balanced' for unknown values and warns", () => {
      const warnSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      try {
        expect(mapDietTypeForOnboarding("foo")).toBe("balanced");
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain("foo");
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  describe("default export", () => {
    it("exposes all six transformation functions", () => {
      expect(typeTransformers.toDbFormat).toBe(toDbFormat);
      expect(typeTransformers.normalizeToSnakeCase).toBe(normalizeToSnakeCase);
      expect(typeTransformers.mapActivityLevelForHealthCalc).toBe(
        mapActivityLevelForHealthCalc,
      );
      expect(typeTransformers.mapActivityLevelForOnboarding).toBe(
        mapActivityLevelForOnboarding,
      );
      expect(typeTransformers.mapDietTypeForHealthCalc).toBe(
        mapDietTypeForHealthCalc,
      );
      expect(typeTransformers.mapDietTypeForOnboarding).toBe(
        mapDietTypeForOnboarding,
      );
    });
  });
});
