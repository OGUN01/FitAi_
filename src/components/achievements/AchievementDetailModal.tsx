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
} from "react-native";
import { BlurView } from "expo-blur";
import {
  Achievement,
  UserAchievement,
} from "../../services/achievements/types";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rh, rw, rp, rbr } from "../../utils/responsive";
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
        return ResponsiveTheme.colors.gold;
      case "platinum":
        return "#E5E4E2";
      case "diamond":
        return "#B9F2FF";
      case "legendary":
        return "#FF5555";
      default:
        return ResponsiveTheme.colors.textSecondary;
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
          <View style={[StyleSheet.absoluteFill, { backgroundColor: ResponsiveTheme.colors.overlayDark }]} />
        )}

        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View
              style={[styles.iconContainer, !isUnlocked && styles.grayscale]}
            >
              <Text style={styles.icon}>{achievement.icon}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons
                name="close"
                size={24}
                color={ResponsiveTheme.colors.text}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{achievement.title}</Text>

          <View style={[styles.tierBadge, { borderColor: tierColor }]}>
            <Text style={[styles.tierText, { color: tierColor }]}>
              {(achievement.tier ?? 'unknown').toUpperCase()} TIER
            </Text>
          </View>

          <ScrollView
            style={styles.scrollContent}
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
                    size={20}
                    color={
                      isUnlocked || progress >= req.target
                        ? ResponsiveTheme.colors.success
                        : ResponsiveTheme.colors.textTertiary
                    }
                  />
                  <Text style={styles.requirementText}>
                    {req.target} {req.type.replace(/_/g, " ")}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>REWARDS</Text>
              <View style={styles.rewardRow}>
                <Text style={styles.rewardIcon}>🪙</Text>
                <Text style={styles.rewardText}>
                  {achievement.reward.value} FitCoins
                </Text>
              </View>
              <Text style={styles.rewardDesc}>
                {achievement.reward.description}
              </Text>
            </View>

            {!isUnlocked && progress > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Current Progress</Text>
                  <Text style={styles.progressValue}>
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
                <Ionicons name="trophy" size={20} color={ResponsiveTheme.colors.gold} />
                <Text style={styles.unlockedText}>
                  Unlocked on{" "}
                  {new Date(userAchievement.unlockedAt).toLocaleDateString()}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
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
    padding: rw(5),
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: "100%",
    maxHeight: rh(70),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: rbr(24),
    padding: rw(6),
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.glassHighlight,
    shadowColor: ResponsiveTheme.colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    marginBottom: rh(2),
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    right: 0,
    top: 0,
    padding: rp(4),
  },
  iconContainer: {
    width: rw(20),
    height: rw(20),
    borderRadius: rw(10),
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.glassHighlight,
  },
  grayscale: {
    opacity: 0.5,
    backgroundColor: ResponsiveTheme.colors.overlayDark,
  },
  icon: {
    fontSize: rf(5),
  },
  title: {
    fontSize: rf(2.4),
    fontWeight: "800",
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginBottom: rh(1),
  },
  tierBadge: {
    alignSelf: "center",
    paddingHorizontal: rw(3),
    paddingVertical: rh(0.5),
    borderRadius: rbr(12),
    borderWidth: 1,
    marginBottom: rh(3),
  },
  tierText: {
    fontSize: rf(1.4),
    fontWeight: "700",
    letterSpacing: 1,
  },
  scrollContent: {
    flexGrow: 0,
  },
  description: {
    fontSize: rf(1.6),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: rh(3),
    lineHeight: rf(2.2),
  },
  section: {
    marginBottom: rh(3),
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: rw(4),
    borderRadius: rbr(16),
  },
  sectionTitle: {
    fontSize: rf(1.2),
    color: ResponsiveTheme.colors.textTertiary,
    fontWeight: "700",
    marginBottom: rh(1.5),
    letterSpacing: 1,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rh(1),
  },
  requirementText: {
    marginLeft: rw(3),
    color: ResponsiveTheme.colors.text,
    fontSize: rf(1.6),
  },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rh(0.5),
  },
  rewardIcon: {
    fontSize: rf(2),
    marginRight: rw(2),
  },
  rewardText: {
    color: ResponsiveTheme.colors.primary,
    fontSize: rf(1.8),
    fontWeight: "700",
  },
  rewardDesc: {
    color: ResponsiveTheme.colors.textSecondary,
    fontSize: rf(1.4),
    marginTop: rh(0.5),
  },
  progressContainer: {
    marginBottom: rh(3),
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: rh(1),
  },
  progressLabel: {
    color: ResponsiveTheme.colors.textSecondary,
    fontSize: rf(1.4),
  },
  progressValue: {
    color: ResponsiveTheme.colors.text,
    fontWeight: "700",
    fontSize: rf(1.4),
  },
  progressBarBg: {
    height: rp(8),
    backgroundColor: ResponsiveTheme.colors.glassHighlight,
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
    backgroundColor: "rgba(255,215,0,0.1)",
    padding: rw(3),
    borderRadius: rbr(12),
    marginTop: rh(1),
  },
  unlockedText: {
    color: ResponsiveTheme.colors.gold,
    fontWeight: "700",
    marginLeft: rw(2),
    fontSize: rf(1.4),
  },
});
