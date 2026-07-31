/**
 * currency — country → currency, and localized weekly grocery-budget ranges.
 *
 * Single source of truth for budget DISPLAY strings. Onboarding stores only
 * `budget_level` ("low" | "medium" | "high") — never amounts — so these
 * helpers exist purely to render the right currency at display time
 * (S3 "Fuel" food-budget rail). Pure functions, no user-data fallbacks:
 * unknown / "Other" / custom-typed countries resolve to the USD default.
 *
 * Country keys mirror COUNTRIES_WITH_STATES in
 * src/components/onboarding/PersonalInfoConstants.ts (the S1 country picker)
 * plus the "Other" sentinel that picker can store.
 */

export interface CountryCurrency {
  /** ISO 4217 currency code. */
  code: string;
  /** Display symbol. Disambiguating prefix where the bare "$" would mislead. */
  symbol: string;
}

export type BudgetTier = "low" | "medium" | "high";

/** Localized weekly grocery-budget display strings per tier. */
export type BudgetRanges = Record<BudgetTier, string>;

const USD: CountryCurrency = { code: "USD", symbol: "$" };

/**
 * Country name (as stored in personalInfo.country) → currency.
 * Matching is exact first, then case-insensitive (see getCurrencyForCountry).
 */
export const COUNTRY_CURRENCY: Record<string, CountryCurrency> = {
  "United States": USD,
  India: { code: "INR", symbol: "₹" },
  Canada: { code: "CAD", symbol: "CA$" },
  "United Kingdom": { code: "GBP", symbol: "£" },
  Australia: { code: "AUD", symbol: "A$" },
  Germany: { code: "EUR", symbol: "€" },
  /** "Other" sentinel from the S1 picker — custom text lands here too via fallback. */
  Other: USD,
};

/**
 * Resolve a stored country value to its currency. Unknown, "Other", or
 * free-typed custom countries fall back to USD (the global default).
 */
export const getCurrencyForCountry = (
  country?: string | null,
): CountryCurrency => {
  if (!country) return USD;
  const exact = COUNTRY_CURRENCY[country];
  if (exact) return exact;
  const lowered = country.trim().toLowerCase();
  for (const [name, currency] of Object.entries(COUNTRY_CURRENCY)) {
    if (name.toLowerCase() === lowered) return currency;
  }
  return USD;
};

/** Global default (USD) weekly grocery-budget ranges. */
const DEFAULT_BUDGET_RANGES: BudgetRanges = {
  low: "$50–100/week",
  medium: "$100–200/week",
  high: "$200+/week",
};

/**
 * Weekly grocery-budget ranges keyed by ISO currency code. Values are
 * realistic per-week grocery spends for each market (single person → small
 * household), formatted with the local symbol and digit grouping.
 */
const BUDGET_RANGES_BY_CURRENCY: Record<string, BudgetRanges> = {
  USD: DEFAULT_BUDGET_RANGES,
  INR: {
    low: "₹2,000–3,500/week",
    medium: "₹3,500–6,000/week",
    high: "₹6,000+/week",
  },
  CAD: {
    low: "CA$70–140/week",
    medium: "CA$140–280/week",
    high: "CA$280+/week",
  },
  GBP: {
    low: "£40–80/week",
    medium: "£80–160/week",
    high: "£160+/week",
  },
  AUD: {
    low: "A$80–160/week",
    medium: "A$160–300/week",
    high: "A$300+/week",
  },
  EUR: {
    low: "€45–90/week",
    medium: "€90–180/week",
    high: "€180+/week",
  },
};

/**
 * Localized weekly grocery-budget display strings for a stored country value
 * (e.g. personalInfo.country). India → INR ranges; US/unknown → USD ranges.
 * Display-only — never persist these strings.
 */
export const getBudgetRanges = (country?: string | null): BudgetRanges =>
  BUDGET_RANGES_BY_CURRENCY[getCurrencyForCountry(country).code] ??
  DEFAULT_BUDGET_RANGES;
