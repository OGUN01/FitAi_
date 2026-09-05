/**
 * FitAI — Exercise media resolver (Workout Engine v2, Phase 2 consumer side).
 *
 * Picks the best media to show for an exercise, given the viewer's stored
 * gender. `CatalogEntry.media[]` is ordered/tiered but NOT gender-partitioned
 * by position — a `3d_video` entry can be tagged 'male', 'female', or
 * untagged (gender-neutral) — so picking "the first entry" is not enough;
 * this is the single place that applies the actual selection policy:
 *
 *   1. A 3d_video tagged with the viewer's own gender.
 *   2. An untagged (gender-neutral) 3d_video, if the library ever ships one.
 *   3. Any other available 3d_video (e.g. only the opposite gender was
 *      matched for this exercise) — a video beats no video regardless of
 *      which model performs it.
 *   4. The exercisedb_gif entry.
 *   5. null — caller falls back to its own "no demo" UI.
 *
 * A chosen video's poster_frame is looked up by the SAME gender tag as the
 * chosen video (so a male video never gets paired with a female poster).
 */
import { getCatalogEntry, CatalogMediaAsset } from '../data/exerciseCatalog.generated';

/** Matches PersonalInfo['gender'] (src/types/user.ts) — 'other' and
 * 'prefer_not_to_say' are treated identically to unset: no gender
 * preference, so the neutral/first-available fallback chain applies. */
export type ViewerGender = 'male' | 'female' | 'other' | 'prefer_not_to_say' | null | undefined;

export interface ResolvedExerciseMedia {
  type: '3d_video' | 'exercisedb_gif';
  /** Set only when type === '3d_video'. */
  videoUrl?: string;
  /** Set only when type === '3d_video' and a same-gender poster exists. */
  posterUrl?: string;
  /** Set only when type === 'exercisedb_gif'. */
  gifUrl?: string;
}

function isVideo(a: CatalogMediaAsset): boolean {
  return a.type === '3d_video';
}

export function resolveExerciseMedia(
  exerciseId: string | undefined,
  gender: ViewerGender,
): ResolvedExerciseMedia | null {
  const entry = getCatalogEntry(exerciseId);
  if (!entry) return null;

  const videos = entry.media.filter(isVideo);
  const wantGender = gender === 'male' || gender === 'female' ? gender : undefined;

  const chosenVideo =
    (wantGender && videos.find((v) => v.gender === wantGender)) ||
    videos.find((v) => v.gender === undefined) ||
    videos[0];

  if (chosenVideo) {
    const poster = entry.media.find(
      (m) => m.type === 'poster_frame' && m.gender === chosenVideo.gender,
    );
    return {
      type: '3d_video',
      videoUrl: chosenVideo.url,
      posterUrl: poster?.url,
    };
  }

  const gif = entry.media.find((m) => m.type === 'exercisedb_gif');
  if (gif) {
    return { type: 'exercisedb_gif', gifUrl: gif.url };
  }

  return null;
}
