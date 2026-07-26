import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Pressable,
  KeyboardAvoidingView,
} from "react-native";
import { BlurView } from "expo-blur";
import {
  Achievement,
  UserAchievement,
} from "../../services/achievements/types";
import { flatColors as colors } from "../../theme/aurora-tokens";
import { rf, rh, rw, rp, rbr } from "../../utils/responsive";
import { hexToRgba, TINT_ALPHA_LOW, TINT_ALPHA_MEDIUM } from "../../utils/colors";
import { Ionicons } from "@expo/vector-icons";

interface AchievementDetailModalProps {
  visible: boolean;
  achievement: Achievement | null;
  userAchievement?: UserAchievement;
  onClose: () => void;
}

export const AchievementDetailModal: React.FC<AchievementDetailModalProps> = ({
  visible,
  achievement,
  userAchievement,
  onClose,
}) => {
  const getTierColor = (tier: string) => {
    switch (tier) {
      case "bronze":
        return "#CD7F32";
      case "silver":
        return "#C0C0C0";
      case "gold":
        return colors.gold;
      case "platinum":
        return "#E5E4E2";
      case "diamond":
        return "#B9F2FF";
      case "legendary":
        return "#FF5555";
      default:
        return colors.textSecondary;
    }
  };

  const isUnlocked = userAchievement?.isCompleted || false;
  const progress = userAchievement?.progress || 0;
  const maxProgress =
    userAchievement?.maxProgress || achievement?.requirements[0]?.target || 1;
  const progressPercent = Math.min((progress / maxProgress) * 100, 100);
  const tierColor = achievement ? getTierColor(achievement.tier) : "#CD7F32";
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {!achievement ? (
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      ) : (
      <View style={styles.overlay}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlayDark }]} />
        )}

        {/*
          Backdrop tap target rendered BEFORE the modal card so it sits in the
          z-stack below the content. Previously it was an absoluteFillObject
          placed after the BlurView, which let it intercept taps meant for the
          modal content. Now it only catches taps on the area outside the card.
        */}
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
          accessibilityLabel="Dismiss modal overlay"
          accessibilityRole="button"
        />

        <KeyboardAvoidingView
          style={styles.modalContent}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.header}>
            <View
              style={[styles.iconContainer, !isUnlocked && styles.grayscale]}
            >
              <Text style={styles.icon}>{achievement.icon}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close achievement details"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={rf(22)}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>{achievement.title}</Text>

          <View style={[styles.tierBadge, { borderColor: tierColor }]}>
            <Text style={[styles.tierText, { color: tierColor }]} numberOfLines={1}>
              {(achievement.tier ?? 'unknown').toUpperCase()} TIER
            </Text>
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentInner}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.description}>{achievement.description}</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>REQUIREMENTS</Text>
              {achievement.requirements.map((req, index) => (
                <View key={index} style={styles.requirementRow}>
                  <Ionicons
                    name={
                      isUnlocked || progress >= req.target
                        ? "checkbox"
                        : "square-outline"
                    }
                    size={rf(20)}
                    color={
                      isUnlocked || progress >= req.target
                        ? colors.success
                        : colors.textTertiary
                    }
                  />
                  <Text style={styles.requirementText} numberOfLines={3}>
                    {req.target} {req.type.replace(/_/g, " ")}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>REWARDS</Text>
              <View style={styles.rewardRow}>
                <Ionicons name="ribbon-outline" size={rf(18)} color={colors.primary} style={styles.rewardIcon} />
                <Text style={styles.rewardText} numberOfLines={1}>
                  {achievement.reward.value} FitCoins
                </Text>
              </View>
              <Text style={styles.rewardDesc} numberOfLines={3}>
                {achievement.reward.description}
              </Text>
            </View>

            {!isUnlocked && progress > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel} numberOfLines={1}>Current Progress</Text>
                  <Text style={styles.progressValue} numberOfLines={1}>
                    {Math.round(progressPercent)}%
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${progressPercent}%`,
                        backgroundColor: tierColor,
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {isUnlocked && userAchievement?.unlockedAt && (
              <View style={styles.unlockedContainer}>
                <Ionicons name="trophy" size={rf(20)} color={colors.gold} />
                <Text style={styles.unlockedText} numberOfLines={2}>
                  Unlocked on{" "}
                  {new Date(userAchievement.unlockedAt).toLocaleDateString()}
                </Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: rw(20),
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  modalContent: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: colors.backgroundTertiary,
    borderRadius: rbr(24),
    padding: rw(24),
    borderWidth: 1,
    borderColor: colors.glassHighlight,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    marginBottom: rh(16),
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    right: 0,
    top: 0,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    width: rw(72),
    height: rw(72),
    borderRadius: rw(36),
    backgroundColor: colors.glassSurface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glassHighlight,
  },
  grayscale: {
    opacity: 0.5,
    backgroundColor: colors.overlayDark,
  },
  icon: {
    fontSize: rf(36),
  },
  title: {
    fontSize: rf(22),
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: rh(8),
  },
  tierBadge: {
    alignSelf: "center",
    paddingHorizontal: rw(12),
    paddingVertical: rh(4),
    borderRadius: rbr(12),
    borderWidth: 1,
    marginBottom: rh(20),
  },
  tierText: {
    fontSize: rf(12),
    fontWeight: "700",
    letterSpacing: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentInner: {
    paddingBottom: rh(16),
  },
  description: {
    fontSize: rf(14),
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: rh(20),
    lineHeight: rf(20),
  },
  section: {
    marginBottom: rh(20),
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: rw(16),
    borderRadius: rbr(16),
  },
  sectionTitle: {
    fontSize: rf(11),
    color: colors.textTertiary,
    fontWeight: "700",
    marginBottom: rh(12),
    letterSpacing: 1,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rh(8),
  },
  requirementText: {
    marginLeft: rw(12),
    color: colors.text,
    fontSize: rf(14),
    flex: 1,
    flexShrink: 1,
  },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rh(4),
  },
  rewardIcon: {
    marginRight: rw(8),
  },
  rewardText: {
    color: colors.primary,
    fontSize: rf(16),
    fontWeight: "700",
  },
  rewardDesc: {
    color: colors.textSecondary,
    fontSize: rf(12),
    marginTop: rh(4),
  },
  progressContainer: {
    marginBottom: rh(20),
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: rh(8),
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: rf(12),
  },
  progressValue: {
    color: colors.text,
    fontWeight: "700",
    fontSize: rf(12),
  },
  progressBarBg: {
    height: rp(8),
    backgroundColor: colors.glassHighlight,
    borderRadius: rbr(4),
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: rbr(4),
  },
  unlockedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    // Darken gold tint to meet WCAG AA contrast for white text. The previous
    // 10% gold was nearly invisible and made the "Unlocked on" badge wash out.
    backgroundColor: hexToRgba(colors.gold, TINT_ALPHA_LOW + 0.18),
    padding: rw(12),
    borderRadius: rbr(12),
    marginTop: rh(8),
    gap: rw(8),
  },
  unlockedText: {
    color: colors.gold,
    fontWeight: "700",
    fontSize: rf(12),
    flex: 1,
  },
});
