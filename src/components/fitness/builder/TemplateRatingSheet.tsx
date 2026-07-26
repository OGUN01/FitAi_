/**
 * TemplateRatingSheet
 *
 * DetentBottomSheet for rating a community template (1-5 stars) with an
 * optional review TextInput. Calls `workoutTemplateService.rateTemplate`
 * on submit, then closes. Shows the template's current rating_avg +
 * rating_count as read-only context above the input.
 *
 * Haptics: a `selection` haptic fires on each star tap so the user feels
 * the rating change. On successful submit, a `success` notification haptic
 * fires (mirroring the celebration pattern in TemplateDetailSheet's fork).
 *
 * The sheet is self-contained: it fetches no data on its own (the parent
 * passes the template + the current user's id). This keeps it composable
 * with the shared TemplateDetailSheet which already owns the template
 * lifecycle.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  type TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import {
  workoutTemplateService,
  type WorkoutTemplate,
} from "../../../services/workoutTemplateService";
import { DetentBottomSheet } from "../../ui/aurora/DetentBottomSheet";
import { GlassButton } from "../../ui/aurora/GlassButton";
import { AnimatedPressable } from "../../ui/aurora/AnimatedPressable";
import {
  flatColors as colors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { haptics } from "../../../utils/haptics";
import { rf, rp, rw } from "../../../utils/responsive";

// ----------------------------------------------------------------------------
// TYPES & CONSTANTS
// ----------------------------------------------------------------------------

export interface TemplateRatingSheetProps {
  /** Controls visibility. */
  visible: boolean;
  /** Close handler (cancel / backdrop / drag-dismiss). */
  onClose: () => void;
  /** The template being rated. null hides content but keeps the sheet mounted. */
  template: WorkoutTemplate | null;
  /** Current user id — required to write a rating. The parent must supply it. */
  userId: string | null;
  /** Fires after a rating is successfully submitted (parent can refresh). */
  onRated?: (templateId: string, rating: number) => void;
  /** Test ID prefix. */
  testID?: string;
}

/** Narrow a typography.fontWeight token to RN's literal fontWeight union. */
const fw = (w: string): TextStyle["fontWeight"] =>
  w as TextStyle["fontWeight"];

const MAX_RATING = 5;
const REVIEW_MAX_LENGTH = 280;

// ----------------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------------

export const TemplateRatingSheet: React.FC<TemplateRatingSheetProps> = ({
  visible,
  onClose,
  template,
  userId,
  onRated,
  testID,
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset transient state whenever the sheet opens or the template changes.
  useEffect(() => {
    if (visible) {
      setRating(0);
      setHoveredRating(0);
      setReview("");
      setSubmitting(false);
      setSubmitted(false);
      setError(null);
    }
  }, [visible, template?.id]);

  const displayRating = hoveredRating > 0 ? hoveredRating : rating;

  const handleStarPress = useCallback(
    (star: number) => {
      if (submitting || submitted) return;
      haptics.selection();
      setRating(star);
      setError(null);
    },
    [submitting, submitted],
  );

  const handleStarHover = useCallback(
    (star: number) => {
      if (submitting || submitted) return;
      setHoveredRating(star);
    },
    [submitting, submitted],
  );

  const handleStarHoverEnd = useCallback(() => {
    setHoveredRating(0);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!template || !userId) return;
    if (rating < 1 || rating > MAX_RATING) {
      haptics.warning();
      setError("Please select a rating from 1 to 5 stars.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await workoutTemplateService.rateTemplate(template.id, userId, {
        templateId: template.id,
        rating,
        review: review.trim() || undefined,
      });
      setSubmitted(true);
      haptics.success();
      onRated?.(template.id, rating);
      // Auto-close after a short beat so the user sees the "Rated!" confirmation.
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error("[TemplateRatingSheet] submit failed:", err);
      haptics.error();
      setError(
        err instanceof Error
          ? err.message
          : "Could not submit your rating. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [template, userId, rating, review, onRated, onClose]);

  // ── Empty / null guard ────────────────────────────────────────────────────
  if (!template) {
    return (
      <DetentBottomSheet
        visible={visible}
        onClose={onClose}
        snapPoints={[0.4, 0.7]}
        initialSnapIndex={1}
        testID={testID}
      >
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No template selected.</Text>
        </View>
      </DetentBottomSheet>
    );
  }

  const ratingAvg = template.ratingAvg ?? 0;
  const ratingCount = template.ratingCount ?? 0;

  return (
    <DetentBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={[0.5, 0.8]}
      initialSnapIndex={1}
      testID={testID}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
        style={styles.kavWrap}
      >
      <View style={styles.container} testID={`${testID ?? "rating-sheet"}-${template.id}`}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(40).duration(300)}>
          <Text style={styles.title}>Rate this template</Text>
          <Text style={styles.templateName} numberOfLines={1}>
            {template.name}
          </Text>
        </Animated.View>

        {/* Current rating context (read-only) */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.contextRow}>
          <Ionicons name="star" size={rf(typography.fontSize.body)} color={colors.amber} />
          <Text style={styles.contextText}>
            {ratingAvg > 0
              ? `${ratingAvg.toFixed(1)} avg · ${ratingCount} rating${
                  ratingCount === 1 ? "" : "s"
                }`
              : "Be the first to rate this template"}
          </Text>
        </Animated.View>

        {/* Star input */}
        <Animated.View
          entering={FadeInDown.delay(160).duration(300)}
          style={styles.starRow}
          onResponderGrant={() => {
            // no-op — required for responder to fire
          }}
        >
          {Array.from({ length: MAX_RATING }, (_, i) => i + 1).map((star) => {
            const active = star <= displayRating;
            return (
              <AnimatedPressableStar
                key={star}
                star={star}
                active={active}
                disabled={submitting || submitted}
                onPress={() => handleStarPress(star)}
                onPressIn={() => handleStarHover(star)}
                onPressOut={handleStarHoverEnd}
                testID={`rating-star-${star}`}
              />
            );
          })}
        </Animated.View>

        {/* Rating label */}
        <Text style={styles.ratingLabel}>
          {submitted
            ? "Thanks for your feedback!"
            : rating > 0
              ? `${rating} / ${MAX_RATING}`
              : "Tap a star to rate"}
        </Text>

        {/* Optional review */}
        {!submitted ? (
          <Animated.View entering={FadeInDown.delay(220).duration(300)}>
            <Text style={styles.reviewLabel}>Review (optional)</Text>
            <TextInput
              style={styles.reviewInput}
              value={review}
              onChangeText={setReview}
              placeholder="Share what worked for you…"
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={REVIEW_MAX_LENGTH}
              textAlignVertical="top"
              accessibilityLabel="Optional review text"
              testID="rating-review-input"
            />
            <Text style={styles.charCount}>
              {review.length} / {REVIEW_MAX_LENGTH}
            </Text>
          </Animated.View>
        ) : null}

        {/* Error */}
        {error ? (
          <Animated.View entering={FadeIn.duration(150)}>
            <Text style={styles.errorText} testID="rating-error">
              {error}
            </Text>
          </Animated.View>
        ) : null}

        {/* Actions */}
        {!submitted ? (
          <Animated.View
            entering={FadeInDown.delay(280).duration(300)}
            style={styles.actions}
          >
            <GlassButton
              label="Cancel"
              onPress={onClose}
              variant="secondary"
              style={styles.actionBtn}
              hapticType="light"
              disabled={submitting}
              testID="rating-cancel-button"
            />
            <GlassButton
              label="Submit Rating"
              onPress={handleSubmit}
              variant="primary"
              icon="star"
              style={styles.actionBtn}
              loading={submitting}
              disabled={rating < 1}
              hapticType="medium"
              testID="rating-submit-button"
            />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(200)} style={styles.successWrap}>
            <Ionicons
              name="checkmark-circle"
              size={rf(40)}
              color={colors.success}
            />
            <Text style={styles.successText}>Rated!</Text>
          </Animated.View>
        )}
      </View>
      </KeyboardAvoidingView>
    </DetentBottomSheet>
  );
};

// ----------------------------------------------------------------------------
// STAR (wraps AnimatedPressable-like behavior without the press-scale spring
// conflict with press-in hover — we use a plain Pressable + a scale style on
// press to keep the hover highlight snappy.)
// ----------------------------------------------------------------------------

interface StarProps {
  star: number;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
  testID?: string;
}

const AnimatedPressableStar: React.FC<StarProps> = ({
  star,
  active,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  testID,
}) => (
  <Animated.View entering={FadeIn.delay(star * 40).duration(200)}>
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      scaleValue={0.9}
      springConfig="snappy"
      hapticType="selection"
      style={styles.starBtn}
      accessibilityRole="button"
      accessibilityLabel={`Rate ${star} star${star === 1 ? "" : "s"}`}
      accessibilityState={{ selected: active, disabled }}
      testID={testID}
    >
      <Ionicons
        name={active ? "star" : "star-outline"}
        size={rf(36)}
        color={active ? colors.amber : colors.textTertiary}
      />
    </AnimatedPressable>
  </Animated.View>
);


// ----------------------------------------------------------------------------
// STYLES
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    gap: rp(spacing.md),
    paddingBottom: rp(spacing.lg),
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rp(spacing.xl),
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: rf(typography.fontSize.body),
  },
  title: {
    color: colors.text,
    fontSize: rf(typography.fontSize.h2),
    fontWeight: fw(typography.fontWeight.bold),
    marginBottom: rp(spacing.xxs),
  },
  templateName: {
    color: colors.textSecondary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.medium),
  },
  contextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    backgroundColor: colors.glassSurface,
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    borderRadius: borderRadius.lg,
    alignSelf: "flex-start",
  },
  contextText: {
    color: colors.textSecondary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.medium),
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: rp(spacing.xs),
    paddingVertical: rp(spacing.sm),
  },
  starBtn: {
    flex: 1,
    minWidth: Math.max(rw(44), 44),
    minHeight: Math.max(rw(44), 44),
    maxWidth: rw(56),
    alignItems: "center",
    justifyContent: "center",
  },
  kavWrap: {
    flex: 1,
  },
  ratingLabel: {
    color: colors.textSecondary,
    fontSize: rf(typography.fontSize.caption),
    textAlign: "center",
    fontWeight: fw(typography.fontWeight.medium),
  },
  reviewLabel: {
    color: colors.text,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.semibold),
    marginBottom: rp(spacing.xs),
  },
  reviewInput: {
    backgroundColor: colors.glassSurface,
    color: colors.text,
    fontSize: rf(typography.fontSize.body),
    borderRadius: borderRadius.lg,
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.md),
    minHeight: rp(96),
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  charCount: {
    color: colors.textTertiary,
    fontSize: rf(typography.fontSize.micro),
    textAlign: "right",
    marginTop: rp(spacing.xxs),
  },
  errorText: {
    color: colors.error,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.medium),
  },
  actions: {
    flexDirection: "row",
    gap: rp(spacing.sm),
    marginTop: rp(spacing.xs),
  },
  actionBtn: {
    flex: 1,
  },
  successWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rp(spacing.lg),
    gap: rp(spacing.sm),
  },
  successText: {
    color: colors.success,
    fontSize: rf(typography.fontSize.body),
    fontWeight: fw(typography.fontWeight.bold),
  },
});

export default TemplateRatingSheet;
