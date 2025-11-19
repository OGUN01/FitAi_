/**
 * Aurora Design System - Main Export
 * Central export point for all design tokens, gradients, and animations
 */

// Export all design tokens
export * from './aurora-tokens';
export * from './gradients';
export * from './animations';

// Re-export as named exports for convenience
export { auroraTokens as tokens } from './aurora-tokens';
export { gradients } from './gradients';
export { animations } from './animations';

// Export default Aurora theme object
import { auroraTokens } from './aurora-tokens';
import { gradients } from './gradients';
import { animations } from './animations';

export const auroraTheme = {
  ...auroraTokens,
  gradients,
  animations,
} as const;

export default auroraTheme;
