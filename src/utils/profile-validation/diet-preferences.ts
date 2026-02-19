import { ValidationResult, FieldValidationRule } from "./types";
import { validateRules } from "./core-helpers";

export function validateDietPreferences(dietPrefs: any): ValidationResult {
  if (!dietPrefs) {
    return {
      isValid: false,
      missingFields: ["dietPreferences"],
      errors: ["Diet preferences are completely missing"],
    };
  }

  const rules: FieldValidationRule[] = [
    {
      field: "diet_type",
      validator: (v) => typeof v === "string" && v.trim().length > 0,
      errorMessage: "Diet type is required",
    },
  ];

  const result = validateRules(dietPrefs, rules, "Diet Preferences");

  const arrayValidations: ValidationResult[] = [];

  if (dietPrefs.allergies && !Array.isArray(dietPrefs.allergies)) {
    arrayValidations.push({
      isValid: false,
      missingFields: ["allergies"],
      errors: ["Allergies must be an array"],
    });
  }

  if (
    dietPrefs.dietary_restrictions &&
    !Array.isArray(dietPrefs.dietary_restrictions)
  ) {
    arrayValidations.push({
      isValid: false,
      missingFields: ["dietary_restrictions"],
      errors: ["Dietary restrictions must be an array"],
    });
  }

  if (dietPrefs.disliked_foods && !Array.isArray(dietPrefs.disliked_foods)) {
    arrayValidations.push({
      isValid: false,
      missingFields: ["disliked_foods"],
      errors: ["Disliked foods must be an array"],
    });
  }

  if (arrayValidations.length > 0) {
    const allArrayErrors = arrayValidations.flatMap((v) => v.errors);
    const allArrayMissing = arrayValidations.flatMap((v) => v.missingFields);

    return {
      isValid: false,
      missingFields: [...result.missingFields, ...allArrayMissing],
      errors: [...result.errors, ...allArrayErrors],
    };
  }

  return result;
}
