import { PersonalInfo } from "../../types/user";
import { VALIDATION_RULES } from "./constants";

export function isValidString(
  value: string,
  rules: { minLength: number; maxLength: number; pattern: RegExp },
): boolean {
  return (
    value.length >= rules.minLength &&
    value.length <= rules.maxLength &&
    rules.pattern.test(value)
  );
}

export function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  return (
    date instanceof Date &&
    !isNaN(date.getTime()) &&
    dateString === date.toISOString()
  );
}

export function sanitizeString(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function sanitizeNumber(value: any, min: number, max: number): number {
  const num = parseFloat(value);
  if (isNaN(num)) return min;
  return Math.max(min, Math.min(max, num));
}

export function sanitizeGender(
  gender: string | undefined,
): "male" | "female" | "other" | "prefer_not_to_say" {
  const validGenders: Array<"male" | "female" | "other" | "prefer_not_to_say"> =
    ["male", "female", "other", "prefer_not_to_say"];
  if (
    gender &&
    validGenders.includes(gender as (typeof validGenders)[number])
  ) {
    return gender as (typeof validGenders)[number];
  }
  return "other";
}

export function sanitizeActivityLevel(level: string): string {
  const validLevels = ["sedentary", "light", "moderate", "active", "extreme"];
  return validLevels.includes(level) ? level : "moderate";
}

export function sanitizePersonalInfo(
  info: Partial<PersonalInfo>,
): PersonalInfo {
  const firstName = sanitizeString(info.first_name || "");
  const lastName = sanitizeString(info.last_name || "");

  return {
    first_name: firstName,
    last_name: lastName,
    name: sanitizeString(info.name || `${firstName} ${lastName}`),
    email: info.email ? sanitizeEmail(info.email) : undefined,
    age: sanitizeNumber(
      info.age,
      VALIDATION_RULES.AGE.min,
      VALIDATION_RULES.AGE.max,
    ),
    gender: sanitizeGender(info.gender || "other"),
    country: info.country || "",
    state: info.state || "",
    region: info.region,
    wake_time: info.wake_time || "07:00",
    sleep_time: info.sleep_time || "23:00",
    occupation_type: info.occupation_type || "desk_job",
    height:
      info.height !== undefined
        ? sanitizeNumber(
            info.height,
            VALIDATION_RULES.HEIGHT.min,
            VALIDATION_RULES.HEIGHT.max,
          )
        : undefined,
    weight:
      info.weight !== undefined
        ? sanitizeNumber(
            info.weight,
            VALIDATION_RULES.WEIGHT.min,
            VALIDATION_RULES.WEIGHT.max,
          )
        : undefined,
  };
}
