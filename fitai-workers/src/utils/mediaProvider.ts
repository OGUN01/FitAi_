/**
 * FitAI Workers - Media Provider Registry System
 *
 * Plug-and-play architecture for multiple GIF/video libraries
 * Supports:
 * - ExerciseDB (default, free, 1500+ exercises)
 * - Future: Gym Animations 3D (premium)
 * - Future: Exercise Animatic (premium)
 * - Future: wrkout/exercises.json (free backup)
 *
 * DESIGN PATTERN: Registry + Strategy Pattern
 * - Each provider implements MediaProvider interface
 * - Fallback chain: User preference → ExerciseDB (ultimate fallback)
 * - Easy to add new providers without modifying existing code
 */

import type { Exercise } from './exerciseDatabase';

// ============================================================================
// TYPES
// ============================================================================

export type MediaLibrary = 'exercisedb' | 'gymAnimations' | 'exerciseAnimatic' | 'wrkout' | 'auto';

export interface MediaSource {
  url: string;
  format: 'gif' | 'mp4' | 'webm';
  quality: 'standard' | 'hd' | '4k';
  provider: MediaLibrary;
}

export interface MediaProvider {
  id: MediaLibrary;
  name: string;
  description: string;
  isPremium: boolean;
  priority: number; // Lower = higher priority

  /**
   * Check if this provider has media for given exercise
   */
  hasMedia(exercise: Exercise): boolean;

  /**
   * Get media URL for given exercise
   * Returns null if not available
   */
  getMediaUrl(exercise: Exercise): string | null;

  /**
   * Get media sources (with format/quality info)
   */
  getMediaSources(exercise: Exercise): MediaSource[];
}

// ============================================================================
// EXERCISEDB PROVIDER (DEFAULT, FREE)
// ============================================================================

class ExerciseDBProvider implements MediaProvider {
  id: MediaLibrary = 'exercisedb';
  name = 'ExerciseDB';
  description = 'Free, open-source exercise GIFs (1500+ exercises)';
  isPremium = false;
  priority = 10; // Default fallback

  hasMedia(exercise: Exercise): boolean {
    return !!exercise.gifUrl;
  }

  getMediaUrl(exercise: Exercise): string | null {
    if (!exercise.gifUrl) return null;

    // Fix broken CDN URL (v1.cdn → static)
    return this.fixGifUrl(exercise.gifUrl);
  }

  getMediaSources(exercise: Exercise): MediaSource[] {
    const url = this.getMediaUrl(exercise);
    if (!url) return [];

    return [
      {
        url,
        format: 'gif',
        quality: 'standard',
        provider: 'exercisedb',
      },
    ];
  }

  private fixGifUrl(gifUrl: string): string {
    return gifUrl.replace('v1.cdn.exercisedb.dev', 'static.exercisedb.dev');
  }
}

// ============================================================================
// GYM ANIMATIONS PROVIDER (PREMIUM, 3D)
// ============================================================================

class GymAnimationsProvider implements MediaProvider {
  id: MediaLibrary = 'gymAnimations';
  name = 'Gym Animations 3D';
  description = 'Premium 3D realistic animations (7000+ exercises, $299-$798)';
  isPremium = true;
  priority = 5; // Higher priority if user has premium

  // TODO: Implement mapping from exerciseId to Gym Animations asset ID
  private exerciseMapping = new Map<string, string>();

  hasMedia(exercise: Exercise): boolean {
    // TODO: Check if we have mapping for this exercise
    return this.exerciseMapping.has(exercise.exerciseId);
  }

  getMediaUrl(exercise: Exercise): string | null {
    const assetId = this.exerciseMapping.get(exercise.exerciseId);
    if (!assetId) return null;

    // TODO: Return actual Gym Animations URL
    return `https://cdn.gymanimations.com/media/${assetId}.mp4`;
  }

  getMediaSources(exercise: Exercise): MediaSource[] {
    const url = this.getMediaUrl(exercise);
    if (!url) return [];

    return [
      {
        url,
        format: 'mp4',
        quality: 'hd',
        provider: 'gymAnimations',
      },
    ];
  }
}

// ============================================================================
// EXERCISE ANIMATIC PROVIDER (PREMIUM, 4K)
// ============================================================================

class ExerciseAnimaticProvider implements MediaProvider {
  id: MediaLibrary = 'exerciseAnimatic';
  name = 'Exercise Animatic';
  description = 'Premium 4K animations (2000+ exercises, $499)';
  isPremium = true;
  priority = 6; // Premium alternative

  private exerciseMapping = new Map<string, string>();

  hasMedia(exercise: Exercise): boolean {
    return this.exerciseMapping.has(exercise.exerciseId);
  }

  getMediaUrl(exercise: Exercise): string | null {
    const assetId = this.exerciseMapping.get(exercise.exerciseId);
    if (!assetId) return null;

    return `https://cdn.exerciseanimatic.com/media/${assetId}.mp4`;
  }

  getMediaSources(exercise: Exercise): MediaSource[] {
    const url = this.getMediaUrl(exercise);
    if (!url) return [];

    return [
      {
        url,
        format: 'mp4',
        quality: '4k',
        provider: 'exerciseAnimatic',
      },
    ];
  }
}

// ============================================================================
// WRKOUT PROVIDER (FREE, BACKUP)
// ============================================================================

class WrkoutProvider implements MediaProvider {
  id: MediaLibrary = 'wrkout';
  name = 'Wrkout Exercises';
  description = 'Free public domain exercises (2500+ with videos)';
  isPremium = false;
  priority = 9; // Backup to ExerciseDB

  private exerciseMapping = new Map<string, string>();

  hasMedia(exercise: Exercise): boolean {
    return this.exerciseMapping.has(exercise.exerciseId);
  }

  getMediaUrl(exercise: Exercise): string | null {
    const assetId = this.exerciseMapping.get(exercise.exerciseId);
    if (!assetId) return null;

    return `https://raw.githubusercontent.com/wrkout/exercises.json/master/media/${assetId}.gif`;
  }

  getMediaSources(exercise: Exercise): MediaSource[] {
    const url = this.getMediaUrl(exercise);
    if (!url) return [];

    return [
      {
        url,
        format: 'gif',
        quality: 'standard',
        provider: 'wrkout',
      },
    ];
  }
}

// ============================================================================
// MEDIA PROVIDER REGISTRY
// ============================================================================

class MediaProviderRegistry {
  private providers = new Map<MediaLibrary, MediaProvider>();
  private defaultProvider: MediaProvider;

  constructor() {
    // Register all providers
    this.registerProvider(new ExerciseDBProvider());
    this.registerProvider(new GymAnimationsProvider());
    this.registerProvider(new ExerciseAnimaticProvider());
    this.registerProvider(new WrkoutProvider());

    // Set default fallback
    this.defaultProvider = this.providers.get('exercisedb')!;
  }

  registerProvider(provider: MediaProvider): void {
    this.providers.set(provider.id, provider);
    console.log(`[Media Registry] Registered provider: ${provider.name} (${provider.isPremium ? 'PREMIUM' : 'FREE'})`);
  }

  getProvider(library: MediaLibrary): MediaProvider | null {
    return this.providers.get(library) || null;
  }

  getAllProviders(): MediaProvider[] {
    return Array.from(this.providers.values()).sort((a, b) => a.priority - b.priority);
  }

  getDefaultProvider(): MediaProvider {
    return this.defaultProvider;
  }
}

// Singleton registry
const registry = new MediaProviderRegistry();

// ============================================================================
// MAIN API
// ============================================================================

/**
 * Get media URL for exercise with fallback chain
 *
 * Fallback order:
 * 1. User's preferred library (if has media)
 * 2. Premium libraries (if user has access)
 * 3. ExerciseDB (ultimate fallback)
 */
export function getMediaUrl(
  exercise: Exercise,
  preferredLibrary: MediaLibrary = 'auto',
  userHasPremium: boolean = false
): string {

  // AUTO mode: Select best available provider
  if (preferredLibrary === 'auto') {
    return getMediaUrlWithFallback(exercise, userHasPremium);
  }

  // Try user's preferred library
  const preferredProvider = registry.getProvider(preferredLibrary);
  if (preferredProvider && preferredProvider.hasMedia(exercise)) {
    // Check premium access
    if (preferredProvider.isPremium && !userHasPremium) {
      console.warn(`[Media Provider] User requested premium library ${preferredLibrary} but lacks access`);
      return getMediaUrlWithFallback(exercise, false);
    }

    const url = preferredProvider.getMediaUrl(exercise);
    if (url) {
      console.log(`[Media Provider] Using ${preferredProvider.name} for exercise ${exercise.exerciseId}`);
      return url;
    }
  }

  // Fallback to default
  return getMediaUrlWithFallback(exercise, userHasPremium);
}

/**
 * Get media URL with automatic fallback
 */
function getMediaUrlWithFallback(exercise: Exercise, userHasPremium: boolean): string {
  const providers = registry.getAllProviders();

  // Try premium providers first if user has access
  if (userHasPremium) {
    for (const provider of providers) {
      if (provider.isPremium && provider.hasMedia(exercise)) {
        const url = provider.getMediaUrl(exercise);
        if (url) return url;
      }
    }
  }

  // Try free providers
  for (const provider of providers) {
    if (!provider.isPremium && provider.hasMedia(exercise)) {
      const url = provider.getMediaUrl(exercise);
      if (url) return url;
    }
  }

  // Ultimate fallback: ExerciseDB default provider
  const defaultProvider = registry.getDefaultProvider();
  const url = defaultProvider.getMediaUrl(exercise);

  if (!url) {
    console.error(`[Media Provider] No media available for exercise ${exercise.exerciseId}`);
    return ''; // Return empty string instead of null
  }

  return url;
}

/**
 * Get all available media sources for exercise (useful for multi-format support)
 */
export function getMediaSources(
  exercise: Exercise,
  userHasPremium: boolean = false
): MediaSource[] {

  const sources: MediaSource[] = [];
  const providers = registry.getAllProviders();

  for (const provider of providers) {
    // Skip premium if user doesn't have access
    if (provider.isPremium && !userHasPremium) continue;

    if (provider.hasMedia(exercise)) {
      const providerSources = provider.getMediaSources(exercise);
      sources.push(...providerSources);
    }
  }

  return sources;
}

/**
 * Check if user has access to premium libraries
 * (Placeholder - integrate with subscription system later)
 */
export function checkPremiumAccess(userId?: string): boolean {
  // TODO: Integrate with subscription/payment system
  // For now, return false (free tier only)
  return false;
}

/**
 * Get available libraries for user
 */
export function getAvailableLibraries(userHasPremium: boolean): Array<{
  id: MediaLibrary;
  name: string;
  description: string;
  available: boolean;
}> {

  const providers = registry.getAllProviders();

  return providers.map(provider => ({
    id: provider.id,
    name: provider.name,
    description: provider.description,
    available: !provider.isPremium || userHasPremium,
  }));
}

// ============================================================================
// FUTURE: MAPPING HELPERS
// ============================================================================

/**
 * Load exercise mappings from JSON file (for premium providers)
 * TODO: Create mapping files for Gym Animations and Exercise Animatic
 */
export async function loadProviderMappings(library: MediaLibrary): Promise<void> {
  // TODO: Load mapping JSON file
  // Format: { "exerciseId": "providerAssetId", ... }
  console.log(`[Media Provider] TODO: Load mappings for ${library}`);
}

/**
 * Add manual mapping for exercise
 */
export function addExerciseMapping(
  exerciseId: string,
  library: MediaLibrary,
  assetId: string
): void {
  const provider = registry.getProvider(library);
  if (!provider) {
    console.error(`[Media Provider] Provider ${library} not found`);
    return;
  }

  // TODO: Store mapping (currently providers use private Maps)
  console.log(`[Media Provider] Added mapping: ${exerciseId} → ${library}:${assetId}`);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { registry as mediaProviderRegistry };
