/**
 * Aurora UI Components - Barrel Export
 * Custom components for Aurora design language
 */

// Core Components (Phase 1)
export { AuroraBackground } from './AuroraBackground';
export { GlassView } from './GlassView';
export { GlassCard } from './GlassCard';
export { AnimatedPressable } from './AnimatedPressable';
export { AnimatedSection } from './AnimatedSection';

// Advanced Components (Phase A - Foundation)
export { HeroSection } from './HeroSection';
export { MetricCard } from './MetricCard';
export { FeatureGrid } from './FeatureGrid';
export type { Feature, FeatureGridProps } from './FeatureGrid';
export { AnimatedIcon } from './AnimatedIcon';
export { DynamicTabBar } from './DynamicTabBar';
export type { TabItem, DynamicTabBarProps } from './DynamicTabBar';
export { GestureCard } from './GestureCard';
export type { SwipeAction, GestureCardProps } from './GestureCard';

// Micro-Interaction Components (Phase 4)
export { AuroraSpinner } from './AuroraSpinner';
export {
  SkeletonLoader,
  SkeletonText,
  SkeletonCard,
  SkeletonListItem,
  SkeletonProfile
} from './SkeletonLoader';
export {
  ProgressRing,
  MiniProgressRing,
  LargeProgressRing
} from './ProgressRing';

// Default exports
export { default as AuroraBackgroundDefault } from './AuroraBackground';
export { default as GlassViewDefault } from './GlassView';
export { default as GlassCardDefault } from './GlassCard';
export { default as AnimatedPressableDefault } from './AnimatedPressable';
export { default as HeroSectionDefault } from './HeroSection';
export { default as MetricCardDefault } from './MetricCard';
export { default as FeatureGridDefault } from './FeatureGrid';
export { default as AnimatedIconDefault } from './AnimatedIcon';
export { default as DynamicTabBarDefault } from './DynamicTabBar';
export { default as GestureCardDefault } from './GestureCard';
export { default as AuroraSpinnerDefault } from './AuroraSpinner';
export { default as SkeletonLoaderDefault } from './SkeletonLoader';
export { default as ProgressRingDefault } from './ProgressRing';
