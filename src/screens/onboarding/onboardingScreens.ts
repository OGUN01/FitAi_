/**
 * onboardingScreens — the single source of truth for the 7-screen motivation-first
 * onboarding flow ("Better than 2026" redesign).
 *
 * Order = what the user WANTS to answer before what they DREAD:
 *   You → Goal → Body → Fuel → Training → Rhythm → Plan
 * (dream → measure → plan; not organized by database table).
 *
 * Everything that drives tab count, the AuroraBeam, navigation bounds, and the
 * per-screen validation map derives from this array — one place to change.
 *
 * Data model + store slices are UNCHANGED; only screen routing + validation gating
 * change. See docs/onboarding-blueprint.md §10 + plan polished-dancing-bear.md.
 */

export interface OnboardingScreenConfig {
  /** 1-based screen number (matches currentTab). */
  id: number;
  /** Short label for the AuroraBeam / a11y. AuroraBeam shows NO labels by
   *  default, but the label is used for a11y + the legacy OnboardingTabBar. */
  title: string;
  /** The human lead question shown by QuestionHero. */
  question: string;
  /** One-line reassurance under the question. */
  reassurance: string;
  /** Brand accent for this screen's controls + beam segment. Orange anchors the
   *  flow to brand; only Plan gets the spectrum/pink "reveal" accent. */
  accent: string;
  /** The store slice this screen primarily writes to (for validation routing). */
  store: "personalInfo" | "bodyAnalysis" | "workoutPreferences" | "dietPreferences" | "advancedReview";
  /** Which required fields THIS screen is responsible for (block its Next).
   *  Derived from onboardingService.ts validators. Body (S3) is optional. */
  requiredFields: string[];
}

// Accents: brand orange leads, only the final Plan screen carries the "reveal"
// pink. Imported lazily here as plain hex to avoid a theme import cycle; the
// theme tokens are the source of truth for these exact values
// (colors.primary.DEFAULT #FF6B35, chart[6] #EC4899, chart[5] #FBBF24,
//  chart[2] #00D4FF, chart[1] #FF6B35).
const ORANGE = "#FF6B35";
const AMBER = "#FBBF24";
const CYAN = "#00D4FF";
const PINK = "#EC4899";

export const ONBOARDING_SCREENS: OnboardingScreenConfig[] = [
  {
    id: 1,
    title: "You",
    question: "What should we call you?",
    reassurance: "This takes about a minute.",
    accent: ORANGE,
    store: "personalInfo",
    requiredFields: ["first_name", "last_name", "age", "gender"],
  },
  {
    id: 2,
    title: "Goal",
    question: "What do you want to achieve?",
    reassurance: "We’ll shape everything around this.",
    accent: ORANGE,
    store: "workoutPreferences",
    requiredFields: ["primary_goals"],
  },
  {
    id: 3,
    title: "Body",
    question: "Let’s size your plan.",
    reassurance: "Optional — skip and we’ll use safe defaults.",
    accent: ORANGE,
    store: "bodyAnalysis",
    requiredFields: [], // Body is optional/skippable (validateBodyAnalysis returns is_valid:true when empty)
  },
  {
    id: 4,
    title: "Fuel",
    question: "How do you eat?",
    reassurance: "So your meals actually fit your life.",
    accent: AMBER,
    store: "dietPreferences",
    requiredFields: ["diet_type", "meals"],
  },
  {
    id: 5,
    title: "Training",
    question: "How do you move?",
    reassurance: "Where and how hard you like to train.",
    accent: ORANGE,
    store: "workoutPreferences",
    requiredFields: ["activity_level", "location", "intensity"],
  },
  {
    id: 6,
    title: "Rhythm",
    question: "When do you live?",
    reassurance: "Sleep and where you are.",
    accent: CYAN,
    store: "personalInfo",
    requiredFields: ["wake_time", "sleep_time", "country", "state"],
  },
  {
    id: 7,
    title: "Plan",
    question: "Here’s what we built for you.",
    reassurance: "Your daily targets, ready to generate.",
    accent: PINK,
    store: "advancedReview",
    requiredFields: [], // the completion gate validates all store slices, not a per-screen list
  },
];

export const ONBOARDING_SCREEN_COUNT = ONBOARDING_SCREENS.length; // 7
export const FINAL_SCREEN_ID = ONBOARDING_SCREEN_COUNT; // 7 (Plan)

/** AuroraBeam segment colors in flow order. */
export const ONBOARDING_BEAM_COLORS = ONBOARDING_SCREENS.map((s) => s.accent);

/** Look up a screen config by id (1-based). */
export function getScreen(id: number): OnboardingScreenConfig | undefined {
  return ONBOARDING_SCREENS.find((s) => s.id === id);
}
