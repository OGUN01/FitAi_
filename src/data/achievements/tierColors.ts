// Canonical tier -> accent color map for the achievements system.
//
// Achievement.tier only ever holds bronze/silver/gold/platinum/diamond/legendary
// (see services/achievements/types.ts). This single map is the source of truth
// for tier accent colors so the same achievement renders the same color
// everywhere it appears — AchievementCard, AchievementsSection,
// AchievementCelebration, AchievementDetailModal, and AchievementShowcase all
// import from here instead of hand-maintaining their own copies.
import { chart } from "../../theme/aurora-tokens";

// Colors are chosen to read as an ascending premium ladder (metal -> gem),
// matching real-world tier expectations: bronze/gold stay close to their
// literal metal tones, silver/platinum are grey/ice-toned, diamond is a
// bright icy blue, and legendary — the rarest tier — gets the most
// saturated, distinct hue in the set rather than reusing a "success" green.
export const TIER_COLOR_MAP: Record<string, string> = {
  bronze: chart[1], // orange — closest chart token to real bronze
  silver: "#C0C6CC", // metallic grey
  gold: chart[5], // amber
  platinum: "#CFE8EF", // pale ice-blue/white, cooler & lighter than diamond
  diamond: chart[2], // electric cyan — bright icy blue
  legendary: chart[3], // purple — most premium/rare accent, distinct from the blues
};
