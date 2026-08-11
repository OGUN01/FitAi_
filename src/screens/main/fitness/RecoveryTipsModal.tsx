/**
 * RecoveryTipsModal Component
 * Displays recovery tips and recommendations for rest days.
 *
 * 2026 Editorial Dark migration:
 *  - Centered RN Modal overlay → BottomSheet (thumb-reachable, swipe-dismiss).
 *  - Gradient icon tiles → flat accent chips (icon on a tinted surface).
 *  - Gradient "Got It" CTA → GlassButton (the kit CTA standard).
 *  - glass/rgba literals → aurora tokens / hexToRgba(token).
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "../../../components/ui/aurora/BottomSheet";
import { GlassButton } from "../../../components/ui/aurora/GlassButton";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import {
  flatColors as colors,
  spacing,
  borderRadius,
  surface,
  border,
} from "../../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../../theme/fonts";
import { rf, rw, rp } from "../../../utils/responsive";
import { hexToRgba } from "../../../utils/colors";
import { useProfileStore } from "../../../stores/profileStore";
import { useFitnessStore } from "../../../stores/fitnessStore";
import { getCurrentWeekStart } from "../../../utils/weekUtils";

// Semantic accent per recovery-tip category, sourced from theme tokens (no
// fragile inline hex literals). Each accent drives the flat icon-chip tint.
const ACCENTS = {
  primary: colors.primary,
  blue: colors.blue,
  teal: colors.teal,
  coral: colors.orange,
  pink: colors.pink,
  cyan: colors.cyan,
} as const;

type AccentKey = keyof typeof ACCENTS;

interface RecoveryTipsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface RecoveryTip {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  accent: string;
  duration?: string;
}

const RECOVERY_TIPS: RecoveryTip[] = [
  {
    id: "sleep",
    icon: "moon",
    title: "Prioritize Sleep",
    description:
      "Aim for 7-9 hours of quality sleep. Your muscles repair and grow during deep sleep cycles.",
    accent: ACCENTS.primary,
    duration: "7-9 hours",
  },
  {
    id: "hydration",
    icon: "water",
    title: "Stay Hydrated",
    description:
      "Drink plenty of water throughout the day. Proper hydration aids muscle recovery and reduces soreness.",
    accent: ACCENTS.blue,
    duration: "8+ glasses",
  },
  {
    id: "stretching",
    icon: "body",
    title: "Light Stretching",
    description:
      "Gentle stretching improves blood flow and flexibility. Focus on areas that feel tight or sore.",
    accent: ACCENTS.teal,
    duration: "10-15 min",
  },
  {
    id: "nutrition",
    icon: "nutrition",
    title: "Protein & Nutrients",
    description:
      "Eat protein-rich foods to support muscle repair. Include anti-inflammatory foods like berries and leafy greens.",
    accent: ACCENTS.coral,
  },
  {
    id: "walking",
    icon: "walk",
    title: "Active Recovery",
    description:
      "A light 20-30 minute walk promotes blood circulation without stressing your muscles.",
    accent: ACCENTS.pink,
    duration: "20-30 min",
  },
  {
    id: "foam-rolling",
    icon: "fitness",
    title: "Foam Rolling",
    description:
      "Self-myofascial release helps reduce muscle tension and can speed up recovery time.",
    accent: ACCENTS.cyan,
    duration: "5-10 min",
  },
];


// Real recovery signals, sourced from fitnessStore.completedSessions (SSOT
// for actual training history) rather than static onboarding preferences.
interface RecoverySignals {
  /** workoutSnapshot.category of the most recently completed session. */
  lastSessionCategory?: string;
  /** Days elapsed since the most recently completed session (0 = today). */
  daysSinceLastSession?: number;
  /** Count of completed sessions in the current calendar week. */
  sessionsThisWeek: number;
}

function buildPriorityScores(
  workoutPreferences: {
    intensity?: string;
    workout_types?: string[];
  } | null,
  signals: RecoverySignals,
): Record<string, number> {
  const scores: Record<string, number> = {
    sleep: 0,
    hydration: 0,
    stretching: 0,
    nutrition: 0,
    walking: 0,
    "foam-rolling": 0,
  };

  if (workoutPreferences) {
    const { intensity, workout_types = [] } = workoutPreferences;

    if (intensity === "advanced" || intensity === "intermediate") {
      scores["foam-rolling"] += 3;
      scores["stretching"] += 2;
      scores["nutrition"] += 2;
    } else if (intensity === "beginner") {
      scores["sleep"] += 3;
      scores["hydration"] += 2;
      scores["walking"] += 2;
    }

    const lowerTypes = workout_types.map((t) => t.toLowerCase());

    const isStrength = lowerTypes.some(
      (t) =>
        t.includes("strength") ||
        t.includes("weight_training") ||
        t.includes("weight training"),
    );
    const isCardio = lowerTypes.some(
      (t) => t.includes("cardio") || t.includes("running"),
    );

    if (isStrength) {
      scores["nutrition"] += 3;
      scores["foam-rolling"] += 2;
    }
    if (isCardio) {
      scores["hydration"] += 3;
      scores["stretching"] += 2;
    }
  }

  // ── Real training-history signals (fitnessStore.completedSessions) ──
  const category = signals.lastSessionCategory?.toLowerCase();
  if (category === "strength" || category === "hiit") {
    scores["foam-rolling"] += 3;
    scores["nutrition"] += 2;
  } else if (category === "cardio") {
    scores["hydration"] += 3;
    scores["stretching"] += 2;
  } else if (category === "flexibility" || category === "yoga" || category === "pilates") {
    scores["walking"] += 1;
    scores["hydration"] += 1;
  }

  if (signals.daysSinceLastSession === 0) {
    // Trained today — freshest fatigue, prioritize sleep + tissue recovery.
    scores["sleep"] += 3;
    scores["foam-rolling"] += 2;
  } else if (signals.daysSinceLastSession != null && signals.daysSinceLastSession >= 3) {
    // Idle for a few days — ease back in with light movement rather than
    // deep-recovery tips that assume recent training stress.
    scores["walking"] += 2;
  }

  if (signals.sessionsThisWeek >= 4) {
    // High weekly volume — recovery matters more than usual this week.
    scores["sleep"] += 2;
    scores["hydration"] += 1;
  }

  return scores;
}

const RecoveryTipCard: React.FC<{ tip: RecoveryTip; index: number }> = ({
  tip,
  index,
}) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 80).springify()}
      style={styles.tipCard}
    >
      <View style={styles.tipContent}>
        {/* Flat accent chip (was gradient-filled disc). */}
        <View
          style={[
            styles.tipIconContainer,
            { backgroundColor: hexToRgba(tip.accent, 0.18) },
          ]}
        >
          <Ionicons name={tip.icon} size={rf(20)} color={tip.accent} />
        </View>
        <View style={styles.tipTextContainer}>
          <View style={styles.tipHeader}>
            <Text style={styles.tipTitle} numberOfLines={2}>{tip.title}</Text>
            {tip.duration && (
              <View style={styles.durationBadge}>
                <Ionicons
                  name="time-outline"
                  size={rf(10)}
                  color={colors.textSecondary}
                />
                <Text style={styles.durationText}>{tip.duration}</Text>
              </View>
            )}
          </View>
          <Text style={styles.tipDescription}>{tip.description}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

export const RecoveryTipsModal: React.FC<RecoveryTipsModalProps> = ({
  visible,
  onClose,
}) => {
  const workoutPreferences = useProfileStore(
    (state) => state.workoutPreferences,
  );
  const completedSessions = useFitnessStore((state) => state.completedSessions);

  const signals = useMemo<RecoverySignals>(() => {
    if (completedSessions.length === 0) {
      return { sessionsThisWeek: 0 };
    }
    const sorted = [...completedSessions].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );
    const lastSession = sorted[0];
    const daysSinceLastSession = Math.floor(
      (Date.now() - new Date(lastSession.completedAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    const currentWeekStart = getCurrentWeekStart();
    const sessionsThisWeek = completedSessions.filter(
      (s) => s.weekStart === currentWeekStart,
    ).length;
    return {
      lastSessionCategory: lastSession.workoutSnapshot?.category,
      daysSinceLastSession,
      sessionsThisWeek,
    };
  }, [completedSessions]);

  const sortedTips = useMemo(() => {
    const scores = buildPriorityScores(workoutPreferences, signals);
    return [...RECOVERY_TIPS].sort(
      (a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0),
    );
  }, [workoutPreferences, signals]);

  // Honest subtitle: only claim personalization when there's real training
  // history to base it on; otherwise say plainly that this is general
  // guidance rather than implying a computed insight that doesn't exist yet.
  const headerSubtitle =
    signals.lastSessionCategory && signals.daysSinceLastSession != null
      ? signals.daysSinceLastSession === 0
        ? `Based on today's ${signals.lastSessionCategory} session`
        : `Based on your last ${signals.lastSessionCategory} session, ${signals.daysSinceLastSession}d ago`
      : "General Recovery Guidance";

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      showCloseButton={false}
      maxHeightFraction={0.9}
      testID="recovery-tips-sheet"
      contentStyle={styles.sheetContent}
    >
      {/* Header — flat accent chip + title + 44pt close affordance. */}
      <View style={styles.header}>
        <View
          style={[
            styles.headerIconContainer,
            { backgroundColor: hexToRgba(colors.primary, 0.18) },
          ]}
        >
          <Ionicons name="leaf" size={rf(24)} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>Recovery Tips</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {headerSubtitle}
          </Text>
        </View>
        <AnimatedPressable
          onPress={onClose}
          scaleValue={0.9}
          hapticFeedback={true}
          hapticType="light"
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Close recovery tips"
        >
          <Ionicons
            name="close"
            size={rf(24)}
            color={colors.textSecondary}
          />
        </AnimatedPressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro Card */}
        <Animated.View entering={FadeIn.delay(50).duration(300)}>
          <View style={styles.introCard}>
            <Ionicons name="sparkles" size={rf(18)} color={colors.gold} />
            <Text style={styles.introText}>
              Rest days are crucial for muscle recovery, preventing
              overtraining, and achieving your fitness goals. Here's how
              to make the most of your recovery:
            </Text>
          </View>
        </Animated.View>

        {/* Tips List */}
        {sortedTips.map((tip, index) => (
          <RecoveryTipCard key={tip.id} tip={tip} index={index} />
        ))}

        {/* Bottom Quote */}
        <Animated.View entering={FadeInDown.delay(600).duration(400)}>
          <View style={styles.quoteContainer}>
            <Text style={styles.quoteText}>
              "Recovery is not a sign of weakness, it's a sign of
              wisdom."
            </Text>
            <Text style={styles.quoteAuthor}>
              — Smart Training Philosophy
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer CTA — GlassButton (was gradient-filled button). */}
      <View style={styles.footer}>
        <GlassButton
          label="Got It!"
          icon="checkmark-circle"
          onPress={onClose}
          fullWidth
          testID="recovery-tips-got-it"
          accessibilityLabel="Got it"
        />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
    paddingTop: rp(spacing.xs),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: border.subtle,
    gap: spacing.md,
  },
  headerIconContainer: {
    width: Math.max(rw(48), 44),
    height: Math.max(rw(48), 44),
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: rf(18),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: surface[2],
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  introCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: hexToRgba(colors.gold, 0.18),
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  introText: {
    flex: 1,
    fontSize: rf(13),
    color: colors.text,
    lineHeight: rf(20),
  },
  tipCard: {
    backgroundColor: surface[1],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: border.subtle,
    overflow: "hidden",
  },
  tipContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.md,
    gap: spacing.md,
  },
  tipIconContainer: {
    width: Math.max(rw(40), 44),
    height: Math.max(rw(40), 44),
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  tipTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: rp(4),
    gap: spacing.sm,
  },
  tipTitle: {
    fontSize: rf(14),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(3),
    backgroundColor: surface[2],
    paddingHorizontal: spacing.xs,
    paddingVertical: rp(spacing.xs),
    borderRadius: borderRadius.sm,
    flexShrink: 0,
  },
  durationText: {
    fontSize: rf(11),
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  tipDescription: {
    fontSize: rf(12),
    color: colors.textSecondary,
    lineHeight: rf(18),
  },
  quoteContainer: {
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: hexToRgba(colors.primary, 0.18),
    borderRadius: borderRadius.md,
  },
  quoteText: {
    fontSize: rf(13),
    fontStyle: "italic",
    color: colors.text,
    lineHeight: rf(20),
  },
  quoteAuthor: {
    fontSize: rf(11),
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  footer: {
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: border.subtle,
  },
});

export default RecoveryTipsModal;
