// Canonical tier -> accent color map for the achievements system.
//
// Achievement.tier only ever holds bronze/silver/gold/platinum/diamond/legendary
// (see services/achievements/types.ts). This single map is the source of truth
// for tier accent colors so the same achievement renders the same color
// everywhere it appears — AchievementCard, AchievementsSection,
// AchievementCelebration, AchievementDetailModal, and AchievementShowcase all
// import from here instead of hand-maintaining their own copies.
import { chart } from "../../theme/aurora-tokens";

export const TIER_COLOR_MAP: Record<string, string> = {
  bronze: chart[1],
  silver: chart[2],
  gold: chart[5],
  platinum: chart[3],
  diamond: chart[6],
  legendary: chart[4],
};
