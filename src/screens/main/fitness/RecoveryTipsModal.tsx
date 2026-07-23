/**
 * RecoveryTipsModal Component
 * Displays recovery tips and recommendations for rest days
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet, Modal, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, borderRadius } from "../../../theme/aurora-tokens";
import { rf, rw, rh, rp } from "../../../utils/responsive";
import { useProfileStore } from "../../../stores/profileStore";

interface RecoveryTipsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface RecoveryTip {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  gradient: [string, string];
  duration?: string;
}

const RECOVERY_TIPS: RecoveryTip[] = [
  {
    id: "sleep",
    icon: "moon",
    title: "Prioritize Sleep",
    description:
      "Aim for 7-9 hours of quality sleep. Your muscles repair and grow during deep sleep cycles.",
    gradient: [colors.primary, colors.primaryLight],
    duration: "7-9 hours",
  },
  {
    id: "hydration",
    icon: "water",
    title: "Stay Hydrated",
    description:
      "Drink plenty of water throughout the day. Proper hydration aids muscle recovery and reduces soreness.",
    gradient: ["#2196F3", "#03A9F4"],
    duration: "8+ glasses",
  },
  {
    id: "stretching",
    icon: "body",
    title: "Light Stretching",
    description:
      "Gentle stretching improves blood flow and flexibility. Focus on areas that feel tight or sore.",
    gradient: ["#11998e", "#38ef7d"],
    duration: "10-15 min",
  },
  {
    id: "nutrition",
    icon: "nutrition",
    title: "Protein & Nutrients",
    description:
      "Eat protein-rich foods to support muscle repair. Include anti-inflammatory foods like berries and leafy greens.",
    gradient: ["#FF6B6B", "#FF8E53"],
  },
  {
    id: "walking",
    icon: "walk",
    title: "Active Recovery",
    description:
      "A light 20-30 minute walk promotes blood circulation without stressing your muscles.",
    gradient: ["#f093fb", "#f5576c"],
    duration: "20-30 min",
  },
  {
    id: "foam-rolling",
    icon: "fitness",
    title: "Foam Rolling",
    description:
      "Self-myofascial release helps reduce muscle tension and can speed up recovery time.",
    gradient: ["#4facfe", "#00f2fe"],
    duration: "5-10 min",
  },
];


function buildPriorityScores(
  workoutPreferences: {
    intensity?: string;
    workout_types?: string[];
  } | null,
): Record<string, number> {
  const scores: Record<string, number> = {
    sleep: 0,
    hydration: 0,
    stretching: 0,
    nutrition: 0,
    walking: 0,
    "foam-rolling": 0,
  };

  if (!workoutPreferences) return scores;

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

  return scores;
}

const RecoveryTipCard: React.FC<{ tip: RecoveryTip; index: number }> = ({
  tip,
  index,
}) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 80)
        .duration(400)
        .springify()}
      style={styles.tipCard}
    >
      <View style={styles.tipContent}>
        <LinearGradient
          colors={tip.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tipIconContainer}
        >
          <Ionicons name={tip.icon} size={rf(20)} color={colors.white} />
        </LinearGradient>
        <View style={styles.tipTextContainer}>
          <View style={styles.tipHeader}>
            <Text style={styles.tipTitle}>{tip.title}</Text>
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

  const sortedTips = useMemo(() => {
    const scores = buildPriorityScores(workoutPreferences);
    return [...RECOVERY_TIPS].sort(
      (a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0),
    );
  }, [workoutPreferences]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          <Animated.View
            entering={FadeInUp.duration(400).springify()}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.header}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.headerIconContainer}
                >
                  <Ionicons name="leaf" size={rf(24)} color={colors.white} />
                </LinearGradient>
                <View style={styles.headerText}>
                  <Text style={styles.headerTitle}>Recovery Tips</Text>
                  <Text style={styles.headerSubtitle}>
                    Rest Day Recommendations
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

              {/* Content */}
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

              {/* Footer Button */}
              <View style={styles.footer}>
                <AnimatedPressable
                  onPress={onClose}
                  scaleValue={0.96}
                  hapticFeedback={true}
                  hapticType="medium"
                  style={styles.gotItButton}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gotItButtonGradient}
                  >
                    <Text style={styles.gotItButtonText}>Got It!</Text>
                    <Ionicons
                      name="checkmark-circle"
                      size={rf(18)}
                      color={colors.white}
                    />
                  </LinearGradient>
                </AnimatedPressable>
              </View>
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  safeArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: spacing.lg,
  },
  modalContainer: {
    width: "100%",
    maxHeight: rh(724),
  },
  modalContent: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerIconContainer: {
    width: rw(48),
    height: rw(48),
    borderRadius: rw(14),
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  headerTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  closeButton: {
    width: Math.max(rw(36), 44),
    height: Math.max(rw(36), 44),
    borderRadius: Math.max(rw(18), 22),
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    maxHeight: rh(400),
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  introCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  introText: {
    flex: 1,
    fontSize: rf(13),
    color: colors.text,
    lineHeight: rf(20),
  },
  tipCard: {
    marginBottom: spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  tipContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.md,
    gap: spacing.md,
  },
  tipIconContainer: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(12),
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: spacing.xs,
    paddingVertical: rp(2),
    borderRadius: borderRadius.sm,
    flexShrink: 0,
  },
  durationText: {
    fontSize: rf(10),
    color: colors.textSecondary,
  },
  tipDescription: {
    fontSize: rf(12),
    color: colors.textSecondary,
    lineHeight: rf(18),
  },
  quoteContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: "rgba(255, 107, 53, 0.15)",
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
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  gotItButton: {
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  gotItButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  gotItButtonText: {
    fontSize: rf(15),
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.5,
  },
});

export default RecoveryTipsModal;
