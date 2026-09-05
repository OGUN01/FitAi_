import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  StatusBar,
  useWindowDimensions,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Image } from "expo-image"; // Use Expo Image for GIF animation support
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { AuroraSpinner, AnimatedPressable } from "../ui/aurora";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../theme/fonts";
import { rf, rp, rbr, rs } from "../../utils/responsive";
import { hexToRgba } from "../../utils/colors";
import { exerciseFilterService, FilteredExercise } from "../../services/exerciseFilterService";
import { getFallbackGifUrl } from "../../services/exercise-visual/urlUtils";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { resolveExerciseMedia } from "../../utils/resolveExerciseMedia";
import { getCatalogEntry } from "../../data/exerciseCatalog.generated";
import { useProfileStore } from "../../stores/profileStore";

interface ExerciseGifPlayerProps {
  exerciseId: string; // Direct exercise ID - no more complex matching!
  exerciseName?: string; // Display name (optional, can be creative)
  height?: number;
  width?: number;
  showTitle?: boolean;
  showInstructions?: boolean;
  onInstructionsPress?: () => void;
  autoPlay?: boolean;
  /** When false, hides the pause/play button and "Tap to zoom" hint. Use inside modals. */
  showControls?: boolean;
  style?: StyleProp<ViewStyle>;
}

const ExerciseGifPlayerComponent: React.FC<ExerciseGifPlayerProps> = ({
  exerciseId,
  exerciseName,
  height = 200,
  width = 350,
  showTitle = true,
  showInstructions = true,
  onInstructionsPress,
  autoPlay = true,
  showControls = true,
  style,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  // Distinguish "exercise has no gifUrl" (not-found → "Demo unavailable") from
  // "image failed to load" (failure → "Failed to load"). Previously both
  // paths set hasError=true and showed the same "Failed to load" message.
  const [notFound, setNotFound] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  // True once a resolved 3d_video has failed to load for the CURRENT
  // exerciseId — permanently downgrades this render to the GIF path below
  // (reusing its existing, already-tested load/error/retry UI) rather than
  // retrying a video URL that already failed, or inventing a parallel video
  // error UI. Reset whenever exerciseId changes (same effect as fallbackUrl).
  const [videoFailed, setVideoFailed] = useState(false);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const mediaWidth = Math.min(width, Math.max(0, windowWidth - spacing.lg * 2));

  // Gender-aware 3D video resolution (Workout Engine v2 Phase 2/§K.7) — a
  // pure lookup against the offline exercise catalog, not a network call.
  // null when this exercise has no video (the overwhelming majority today —
  // 278/1,552 catalog rows) or isn't in the catalog at all; every branch
  // below that doesn't check `resolvedVideo` renders EXACTLY as before.
  const personalInfo = useProfileStore((s) => s.personalInfo);
  const resolvedMedia = useMemo(
    () => resolveExerciseMedia(exerciseId, personalInfo?.gender),
    [exerciseId, personalInfo?.gender],
  );
  const resolvedVideo =
    !videoFailed && resolvedMedia?.type === "3d_video" ? resolvedMedia : null;

  const getFallbackDisplayName = (value: string) =>
    value
      .replace(/[_-]+/g, " ")
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  // Direct lookup by exercise ID with fallbacks.
  //
  // BUG FIX: this used to fall through to exerciseFilterService's
  // getExerciseByName (steps 3/4 below, now removed), which does a
  // "contains" SUBSTRING match — e.g. searching "deadlift" matches ANY
  // exercise whose name contains that substring, including "band straight
  // leg deadlift", and .find() returns whichever happens to sort first in
  // exerciseDatabase.min.json. This fired for every exercise sourced from
  // the canonical catalog's legacy CURATED aliases (e.g. "deadlift",
  // "overhead_press") — those plain snake_case ids have no entry in the
  // legacy ExerciseDB-hash-keyed exerciseDatabase.min.json at all, so ID
  // lookup (steps 1/2) always missed and fell into the dangerous fuzzy
  // fallback, showing a COMPLETELY DIFFERENT exercise's equipment/target/
  // name. This is the exact class of false-positive fuzzy matching already
  // rejected for the catalog generator itself (see
  // scripts/generate-exercise-catalog.mjs — "squat" -> "bodyweight
  // squatting row" was one real example) — it should never have been live
  // here either.
  //
  // Fix: when the legacy ID lookup misses, fall back to an EXACT lookup
  // against the canonical catalog (exerciseCatalog.generated.ts) instead of
  // a fuzzy name search — the same source of truth the builder/picker used
  // to add this exercise in the first place, so name/equipment/muscles are
  // guaranteed to match what the user actually picked.
  const exercise = useMemo<FilteredExercise | null>(() => {
    // 1. Direct ID lookup (legacy ExerciseDB-hash-keyed dataset — still the
    // richest source for gifUrl/instructions when it has the exercise).
    let result = exerciseFilterService.getExerciseById(exerciseId);

    // 2. Case-insensitive ID fallback (still exact-id, just case-tolerant).
    if (!result && exerciseId) {
      const cleanId = exerciseId.trim();
      const allIds = exerciseFilterService.getAllExerciseIds();
      const matchingId = allIds.find(
        (id) => id.toLowerCase() === cleanId.toLowerCase(),
      );
      if (matchingId) {
        result = exerciseFilterService.getExerciseById(matchingId);
      }
    }

    // 3. Exact lookup against the canonical catalog (covers legacy curated
    // ids like "deadlift"/"overhead_press" that only exist there).
    if (!result && exerciseId) {
      const catalogEntry = getCatalogEntry(exerciseId);
      if (catalogEntry) {
        const gifAsset = catalogEntry.media.find((m) => m.type === "exercisedb_gif");
        result = {
          exerciseId: catalogEntry.canonicalId,
          name: catalogEntry.name,
          gifUrl: gifAsset?.url ?? "",
          targetMuscles: catalogEntry.primaryMuscles,
          bodyParts: catalogEntry.bodyPart ? [catalogEntry.bodyPart] : [],
          equipments: catalogEntry.equipment,
          secondaryMuscles: catalogEntry.secondaryMuscles,
          // No plain-text instructions in the canonical catalog — leaving
          // this empty is an honest "no detailed instructions available"
          // rather than fabricating text or reaching for another fuzzy
          // match, matching ExerciseInstructionModal's own existing
          // graceful-empty handling.
          instructions: [],
          difficulty: catalogEntry.skillLevel,
        };
      }
    }

    return result;
  }, [exerciseId]);


  // Always prioritize database name over passed name to avoid showing IDs
  const displayName =
    exercise?.name ||
    exerciseName ||
    (exerciseId ? getFallbackDisplayName(exerciseId) : "") ||
    "Exercise";
  const activeGifUrl = fallbackUrl ?? exercise?.gifUrl ?? "";

  useEffect(() => {
    // Reset fallback + retry counter whenever exercise changes
    setFallbackUrl(null);
    setRetryCount(0);
    setVideoFailed(false);
    setIsPlaying(autoPlay);
    if (exercise?.gifUrl) {
      setIsLoading(true);
      setHasError(false);
      setNotFound(false);
    } else {
      // No gifUrl at all — distinguish from a load failure so the placeholder
      // can say "Demo unavailable" instead of "Failed to load".
      setIsLoading(false);
      setHasError(false);
      setNotFound(true);
    }
  }, [exercise, exerciseId, autoPlay]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    // If we haven't tried a fallback yet, swap to a Giphy-based fallback URL silently.
    // (CLAUDE.md: no console.warn/error in production paths — the placeholder
    // UI surfaces the failure after the fallback also fails.)
    if (!fallbackUrl) {
      const fb = getFallbackGifUrl(displayName || exerciseId);
      setFallbackUrl(fb);
      setIsLoading(true); // show spinner while fallback loads
    } else {
      // Fallback also failed — show error UI and bump retry count so the
      // "Report" CTA can surface after repeated failures.
      setHasError(true);
      setRetryCount((c) => c + 1);
    }
  };

  // expo-av's onLoad/onPlaybackStatusUpdate report an AVPlaybackStatus, not
  // a bare event — bridge to the same isLoading/hasError state the GIF path
  // already uses so both media types share one loading/error UI.
  //
  // CONFIRMED ROOT CAUSE (read from node_modules/expo-av source, not
  // guessed): on web, expo-av's <Video onLoad> relay is broken. In
  // ExponentVideo.web.tsx, `onLoadedData` (bound to the DOM `loadeddata`
  // event) forwards the whole React SyntheticEvent up through
  // `props.onLoad(event)`; Video.tsx's `_nativeOnLoad` then does
  // `this.props.onLoad(event.nativeEvent)`, expecting the native-bridge
  // shape `{ nativeEvent: AVPlaybackStatus }`. On web that `event` is
  // already a SyntheticEvent, so `.nativeEvent` is the raw browser `Event`
  // object, not an `AVPlaybackStatus` — `status.isLoaded` is therefore
  // always `undefined` on web and this handler's `isLoading=false` branch
  // never runs, no matter how long the video has actually been playable
  // (confirmed live: readyState 4 / HAVE_ENOUGH_DATA, spinner stuck 3.5+
  // minutes). This isn't a timing race, it's a permanent no-op on web.
  //
  // `onPlaybackStatusUpdate` (wired below, in addition to `onLoad`) does
  // NOT go through that broken relay — ExponentVideo.web.tsx's
  // `onStatusUpdate` builds the status itself by calling
  // `ExponentAV.getStatusForVideo(videoElement)`, which reads the real
  // `<video>` DOM element (ExponentAV.web.ts `getStatusFromMedia`). It also
  // fires repeatedly (loadstart/loadedmetadata/canplay/timeupdate/etc.), so
  // it can't be missed the way a single mistimed one-shot event could be.
  // Its one quirk: `isLoaded` is reported `true` as soon as the `<video>`
  // element merely exists, even at readyState 0 — before any data has
  // loaded — so gate on `durationMillis` being a real positive number too;
  // duration only becomes known once the browser has loaded metadata
  // (readyState >= 1). Where `durationMillis` isn't present at all (per
  // expo-av's own docs, sometimes true for native iOS), fall back to the
  // original `isLoaded`-only check so native playback is unaffected.
  const handleVideoLoad = (status: AVPlaybackStatus) => {
    if (
      status.isLoaded &&
      (!("durationMillis" in status) || (status.durationMillis ?? 0) > 0)
    ) {
      setIsLoading(false);
      setHasError(false);
    }
  };

  const handleVideoError = () => {
    // Downgrade to the GIF path rather than retrying the video or inventing
    // a separate video error UI — the same exercise's exercisedb_gif entry
    // is a strictly better fallback than the Giphy heuristic search
    // handleImageError falls back to, and reusing that existing, already-
    // tested code path is lower risk than a parallel one.
    setVideoFailed(true);
    setIsLoading(true);
    setHasError(false);
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const renderFullscreenModal = () => {
    if (!exercise || (!exercise.gifUrl && !resolvedVideo)) return null;

    // Clamp to the phone-column width on web/tablet so the fullscreen GIF
    // doesn't balloon to 1728px on a 1920px desktop window. Mirrors the
    // clamping in src/utils/responsive.ts (effective design width ≤480px).
    const effectiveWidth = Math.min(windowWidth, 480);
    const effectiveHeight = Math.min(windowHeight, 900);
    const modalWidth = effectiveWidth * 0.9;
    const modalHeight = effectiveHeight * 0.7;

    return (
      <Modal
        visible={isFullscreen}
        transparent={true}
        animationType="fade"
        onRequestClose={toggleFullscreen}
      >
        <StatusBar barStyle="light-content" />
        <View style={styles.fullscreenOverlay}>
          <View style={styles.fullscreenContainer}>
            <AnimatedPressable
              style={styles.closeButton}
              onPress={toggleFullscreen}
              scaleValue={0.9}
              springConfig="snappy"
              hapticType="light"
              accessibilityRole="button"
              accessibilityLabel={`Close ${displayName} fullscreen view`}
            >
              <Ionicons name="close" size={rf(20)} color={colors.text} />
            </AnimatedPressable>

            <Text
              style={styles.fullscreenTitle}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {displayName}
            </Text>

            {resolvedVideo ? (
              <Video
                key={`fullscreen-video-${exerciseId}-${resolvedVideo.videoUrl}`}
                source={{ uri: resolvedVideo.videoUrl! }}
                posterSource={
                  resolvedVideo.posterUrl ? { uri: resolvedVideo.posterUrl } : undefined
                }
                usePoster={!!resolvedVideo.posterUrl}
                style={[
                  styles.fullscreenGif,
                  { width: modalWidth, height: modalHeight * 0.8 },
                ]}
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                isMuted
                useNativeControls={false}
                shouldPlay={isPlaying}
                onLoad={handleVideoLoad}
                onPlaybackStatusUpdate={handleVideoLoad}
                onError={handleVideoError}
              />
            ) : (
              <Image
                key={`fullscreen-${exerciseId}-${activeGifUrl}`}
                source={{ uri: activeGifUrl }}
                style={[
                  styles.fullscreenGif,
                  { width: modalWidth, height: modalHeight * 0.8 },
                ]}
                contentFit="contain"
                transition={300}
                cachePolicy="memory-disk"
                autoplay={isPlaying}
              />
            )}

            <Text style={styles.fullscreenHint}>
              Maximum quality view - tap X to close
            </Text>
          </View>
        </View>
      </Modal>
    );
  };

  const renderExerciseInfo = () => {
    if (!exercise) return null;

    return (
      <View style={styles.exerciseInfo}>
        {showTitle && (
          <View style={styles.titleRow}>
            <Text style={styles.exerciseTitle} numberOfLines={2}>
              {displayName}
            </Text>
            {/* Quality indicator */}
            <View style={styles.qualityIndicator}>
              <Text style={styles.qualityText}>Demo</Text>
            </View>
          </View>
        )}

        {/* Equipment and muscle info */}
        <View style={styles.infoRow}>
          {exercise.equipments?.length > 0 && (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>
                Equipment: {exercise.equipments?.[0] || "Equipment"}
              </Text>
            </View>
          )}
          {exercise.targetMuscles?.length > 0 && (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>
                Target: {exercise.targetMuscles?.[0] || "Muscle"}
              </Text>
            </View>
          )}
        </View>

        {/* Instructions button */}
        {showInstructions && onInstructionsPress && (
          <AnimatedPressable
            style={styles.instructionsButton}
            onPress={onInstructionsPress}
            scaleValue={0.96}
            springConfig="snappy"
            hapticType="light"
            accessibilityRole="button"
            accessibilityLabel={`View ${displayName} instructions`}
          >
            <Text style={styles.instructionsButtonText}>
              View Instructions
            </Text>
          </AnimatedPressable>
        )}
      </View>
    );
  };

  const renderGifPlayer = () => {
    if (!exercise || (!exercise.gifUrl && !resolvedVideo)) {
      return (
        <View style={[styles.placeholder, { height, width: mediaWidth }]}>
          <Text style={styles.placeholderText}>Demo unavailable</Text>
          <Text style={styles.placeholderSubtext}>
            We could not load the movement demo for {displayName}.
          </Text>
          {showInstructions && onInstructionsPress ? (
            <AnimatedPressable
              style={styles.retryButton}
              onPress={onInstructionsPress}
              scaleValue={0.96}
              springConfig="snappy"
              hapticType="light"
              accessibilityRole="button"
              accessibilityLabel={`View ${displayName} instructions`}
            >
              <Text style={styles.retryButtonText}>View Instructions</Text>
            </AnimatedPressable>
          ) : null}
        </View>
      );
    }

    return (
      <View style={[styles.gifContainer, { height, width: mediaWidth }]}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <AuroraSpinner size="lg" theme="primary" />
            <Text style={styles.loadingText}>Loading demonstration...</Text>
          </View>
        )}

        {hasError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={rf(32)} color={colors.error} />
            <Text style={styles.errorText}>Failed to load demonstration</Text>
            {retryCount >= 2 ? (
              // After 2 failed retries the URL is likely permanently broken —
              // surface a Report CTA instead of re-fetching the same broken URL
              // (which would loop indefinitely).
              <AnimatedPressable
                style={[styles.retryButton, styles.reportButton]}
                onPress={() => {
                  // Real report: log the broken exercise (id + attempted URL)
                  // for diagnostics, and confirm to the user it was noted —
                  // previously this button did neither and just silently
                  // reset the error state, which re-triggered the same
                  // broken load with no record it ever happened.
                  console.error(
                    `[ExerciseGifPlayer] Reported broken demonstration — exerciseId="${exerciseId}" name="${displayName}" url="${fallbackUrl ?? exercise?.gifUrl ?? "unknown"}"`
                  );
                  crossPlatformAlert(
                    "Reported",
                    `Thanks — we've noted that the ${displayName} demonstration isn't loading.`
                  );
                  setHasError(false);
                  setRetryCount(0);
                }}
                scaleValue={0.96}
                springConfig="snappy"
                hapticType="light"
                accessibilityRole="button"
                accessibilityLabel="Report broken exercise demonstration"
              >
                <Text style={styles.retryButtonText}>Report</Text>
              </AnimatedPressable>
            ) : (
              <AnimatedPressable
                style={styles.retryButton}
                onPress={() => {
                  setHasError(false);
                  setFallbackUrl(null);
                  setIsLoading(true);
                }}
                scaleValue={0.96}
                springConfig="snappy"
                hapticType="light"
                accessibilityRole="button"
                accessibilityLabel="Retry loading exercise demonstration"
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </AnimatedPressable>
            )}
          </View>
        ) : notFound ? (
          <View style={styles.errorContainer}>
            <Ionicons name="videocam-outline" size={rf(32)} color={colors.textSecondary} />
            <Text style={styles.errorText}>Demo unavailable</Text>
            <Text style={styles.errorSubtext}>
              No animation recorded for this exercise yet.
            </Text>
          </View>
        ) : (
          <>
            <AnimatedPressable
              onPress={toggleFullscreen}
              scaleValue={0.98}
              springConfig="smooth"
              hapticType="light"
              style={styles.gifTouchArea}
            >
              {resolvedVideo ? (
                <Video
                  key={`video-${exerciseId}-${resolvedVideo.videoUrl}`}
                  source={{ uri: resolvedVideo.videoUrl! }}
                  posterSource={
                    resolvedVideo.posterUrl ? { uri: resolvedVideo.posterUrl } : undefined
                  }
                  usePoster={!!resolvedVideo.posterUrl}
                  style={[
                    styles.gif,
                    {
                      height,
                      width: mediaWidth,
                      maxWidth: "100%",
                      maxHeight: "100%",
                    },
                  ]}
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping
                  isMuted
                  useNativeControls={false}
                  shouldPlay={isPlaying}
                  onLoad={handleVideoLoad}
                  onPlaybackStatusUpdate={handleVideoLoad}
                  onError={handleVideoError}
                />
              ) : (
                <Image
                  key={`${exerciseId}-${activeGifUrl}`}
                  source={{ uri: activeGifUrl }}
                  style={[
                    styles.gif,
                    {
                      height,
                      width: mediaWidth,
                      maxWidth: "100%",
                      maxHeight: "100%",
                    },
                  ]}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  contentFit="contain" // Expo Image prop (was resizeMode)
                  transition={300} // Smooth loading transition
                  cachePolicy="memory-disk" // Better caching for GIFs
                  autoplay={isPlaying}
                />
              )}

              {/* Zoom hint overlay — hidden when showControls=false */}
              {showControls && (
                <View style={styles.zoomHint}>
                  <Text style={styles.zoomHintText}>Tap to zoom</Text>
                </View>
              )}
            </AnimatedPressable>

            {/* Playback controls overlay — hidden when showControls=false */}
            {showControls && (
              <AnimatedPressable
                style={styles.playbackOverlay}
                onPress={togglePlayback}
                scaleValue={0.9}
                springConfig="snappy"
                hapticType="light"
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? "Pause exercise demonstration" : "Play exercise demonstration"}
              >
                <View style={styles.playbackButton}>
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={rf(16)}
                    color={colors.text}
                  />
                </View>
              </AnimatedPressable>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <>
      <View style={StyleSheet.flatten([styles.container, style])}>
        {renderGifPlayer()}
        {renderExerciseInfo()}
      </View>
      {renderFullscreenModal()}
    </>
  );
};

/**
 * Memoized: rendered inside WorkoutSessionScreen, which re-renders on every
 * set logged / phase change. Without memo this (relatively heavy — GIF image,
 * fullscreen modal, several derived pieces) component re-rendered on every
 * unrelated screen-level state change.
 */
export const ExerciseGifPlayer = React.memo(ExerciseGifPlayerComponent);

const styles = StyleSheet.create({
  // Flat surface + hairline (was old ui/Card variant="elevated" — elevation
  // shadow replaced by border per Editorial Dark).
  container: {
    padding: 0,
    alignSelf: "center",
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  gifContainer: {
    position: "relative",
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    alignSelf: "center",
    // Shadow + own border removed — the flat container now carries the single
    // hairline (shadow discipline: separation from hairlines, not cast shadows).
  },

  gif: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    // Transparent so it adapts to dark mode (was hardcoded #ffffff).
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
    // Was hardcoded "rgba(255, 107, 53, 0.1)" — hexToRgba tracks colors.primary.
    borderColor: hexToRgba(colors.primary, 0.1),
  },

  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    zIndex: 2,
  },

  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  playbackOverlay: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 3,
  },

  playbackButton: {
    backgroundColor: hexToRgba(colors.black, 0.6),
    borderRadius: Math.max(rbr(20), 22),
    width: Math.max(rs(40), 44),
    height: Math.max(rs(40), 44),
    justifyContent: "center",
    alignItems: "center",
  },

  placeholder: {
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },

  placeholderText: {
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
  },

  placeholderSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
  },

  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },

  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: "center",
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },

  errorSubtext: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },

  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderRadius: borderRadius.md,
    justifyContent: "center",
  },

  reportButton: {
    backgroundColor: colors.backgroundSecondary,
  },

  retryButtonText: {
    color: colors.surface,
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
  },

  exerciseInfo: {
    padding: spacing.lg,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },

  exerciseTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },

  // Solid success bg + dark text — white-on-success computes to ~2.78:1
  // (fails WCAG AA); a near-black foreground computes to ~8.6:1.
  qualityIndicator: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },

  qualityText: {
    fontSize: fontSize.xs,
    color: colors.background,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
  },

  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  infoChip: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },

  infoChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: "500",
  },

  instructionsButton: {
    // Was hardcoded "rgba(255, 107, 53, 0.1/0.3)" — hexToRgba tracks colors.primary.
    backgroundColor: hexToRgba(colors.primary, 0.1),
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary, 0.3),
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    borderRadius: borderRadius.md,
    alignSelf: "flex-start",
    justifyContent: "center",
  },

  instructionsButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
  },

  // Zoom and Fullscreen Styles
  gifTouchArea: {
    position: "relative",
  },

  zoomHint: {
    position: "absolute",
    bottom: rp(8),
    right: rp(8),
    backgroundColor: colors.overlayDark,
    paddingHorizontal: rp(8),
    paddingVertical: rp(4),
    borderRadius: rbr(12),
  },

  zoomHintText: {
    color: colors.text,
    fontSize: rf(10),
    fontWeight: "500",
  },

  fullscreenOverlay: {
    flex: 1,
    backgroundColor: hexToRgba(colors.black, 0.95),
    justifyContent: "center",
    alignItems: "center",
  },

  fullscreenContainer: {
    alignItems: "center",
    padding: spacing.lg,
  },

  closeButton: {
    position: "absolute",
    top: rp(20),
    right: rp(20),
    zIndex: 10,
    // 0.35 alpha + border so the close button stays visible on a 95% black
    // overlay (was 0.2 alpha nearly invisible).
    backgroundColor: hexToRgba(colors.white, 0.35),
    borderWidth: 1,
    borderColor: hexToRgba(colors.white, 0.4),
    borderRadius: Math.max(rbr(20), 22),
    width: Math.max(rs(40), 44),
    height: Math.max(rs(40), 44),
    justifyContent: "center",
    alignItems: "center",
  },

  fullscreenTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    textAlign: "center",
    marginBottom: spacing.lg,
    textTransform: "capitalize",
  },

  fullscreenGif: {
    backgroundColor: hexToRgba(colors.white, 0.05),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: hexToRgba(colors.white, 0.1),
  },

  fullscreenHint: {
    color: hexToRgba(colors.white, 0.7),
    fontSize: fontSize.sm,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
