import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "../ui/aurora/BottomSheet";
import { rf, rw, rh, rp, rbr } from "../../utils/responsive";
// ============================================================================
// TYPES
// ============================================================================

interface BMRInfoModalProps {
  visible: boolean;
  onClose: () => void;
  userBMR: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const BMRInfoModal: React.FC<BMRInfoModalProps> = ({
  visible,
  onClose,
  userBMR,
}) => {
  const risks = [
    {
      icon: "fitness-outline" as const,
      title: "Muscle Loss",
      description: "Your body burns muscle for energy when starved",
    },
    {
      icon: "trending-down-outline" as const,
      title: "Metabolic Slowdown",
      description: "Makes future weight loss harder",
    },
    {
      icon: "battery-dead-outline" as const,
      title: "Fatigue & Brain Fog",
      description: "Low energy, difficulty concentrating",
    },
    {
      icon: "nutrition-outline" as const,
      title: "Nutrient Deficiencies",
      description: "Hard to get vitamins/minerals with fewer calories",
    },
    {
      icon: "leaf-outline" as const,
      title: "Hair Loss & Brittle Nails",
      description: "Body prioritizes vital organs over appearance",
    },
  ];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      showCloseButton={false}
      closeOnOverlayPress
      dismissOnDrag
      contentStyle={styles.content}
    >
      {/* Header — flat, hairline-separated; preserves the per-title close
          affordance label the onboarding tests rely on. */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="warning" size={rf(28)} color={colors.warningAlt} />
        </View>
        <Text style={styles.headerTitle}>Eating Below BMR</Text>
        <Pressable
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Close BMR info"
        >
          <Ionicons
            name="close"
            size={rf(24)}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>

      {/* BMR Explanation */}
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bmrCard}>
          <Text style={styles.bmrLabel}>Your BMR</Text>
          {/* Metric readout — tabular-nums for stable digit width. */}
          <Text style={styles.bmrValue}>{userBMR}</Text>
          <Text style={styles.bmrUnit}>calories/day</Text>
        </View>

        <Text style={styles.explanation}>
          Your BMR (Basal Metabolic Rate) is the minimum energy your body
          needs to:
        </Text>

        <View style={styles.bmrFunctions}>
          <View style={styles.functionItem}>
            <Ionicons
              name="heart"
              size={rf(16)}
              color={colors.error}
            />
            <Text style={styles.functionText}>
              Keep your heart beating
            </Text>
          </View>
          <View style={styles.functionItem}>
            <Ionicons
              name="bulb"
              size={rf(16)}
              color={colors.warning}
            />
            <Text style={styles.functionText}>
              Maintain brain function
            </Text>
          </View>
          <View style={styles.functionItem}>
            <Ionicons
              name="body"
              size={rf(16)}
              color={colors.primary}
            />
            <Text style={styles.functionText}>
              Support breathing and organ function
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.risksTitle}>Risks of Eating Below BMR</Text>

        <View style={styles.risksList}>
          {risks.map((risk, index) => (
            <View key={index} style={styles.riskItem}>
              <View style={styles.riskIconContainer}>
                <Ionicons
                  name={risk.icon}
                  size={rf(18)}
                  color={colors.errorAlt}
                />
              </View>
              <View style={styles.riskContent}>
                <Text style={styles.riskTitle}>{risk.title}</Text>
                <Text style={styles.riskDescription}>
                  {risk.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.noteCard}>
          <Ionicons
            name="information-circle"
            size={rf(18)}
            color={colors.primary}
            style={styles.noteIcon}
          />
          <Text style={styles.noteText}>
            You CAN still choose an aggressive goal - we won't stop you.
            But we recommend a sustainable pace for long-term success.
          </Text>
        </View>
      </ScrollView>

      {/* Action Button — flat accent surface, no gradient fill. */}
      <Pressable
        style={styles.actionButton}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="I understand"
      >
        <Text style={styles.actionButtonText}>I Understand</Text>
      </Pressable>
    </BottomSheet>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(16),
  },
  headerIcon: {
    width: rf(44),
    height: rf(44),
    borderRadius: rbr(22),
    backgroundColor: colors.warningTint,
    justifyContent: "center",
    alignItems: "center",
    marginRight: rp(12),
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    maxHeight: rh(400),
  },
  // Flat hero stat card — depth from hairline + type hierarchy, not a tinted
  // glass fill.
  bmrCard: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: rbr(12),
    padding: rp(16),
    alignItems: "center",
    marginBottom: rp(16),
    borderWidth: 1,
    borderColor: colors.border,
  },
  bmrLabel: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: rp(4),
  },
  bmrValue: {
    fontSize: typography.fontSize.h1,
    fontWeight: typography.fontWeight.extrabold,
    color: colors.primary,
    fontVariant: ["tabular-nums"],
  },
  bmrUnit: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  explanation: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: rf(20),
    marginBottom: rp(12),
  },
  bmrFunctions: {
    gap: rp(8),
    marginBottom: rp(16),
  },
  functionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(10),
  },
  functionText: {
    fontSize: fontSize.xs,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: rp(16),
  },
  risksTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: rp(12),
  },
  risksList: {
    gap: rp(12),
    marginBottom: rp(16),
  },
  riskItem: {
    flexDirection: "row",
    gap: rp(12),
  },
  riskIconContainer: {
    width: rf(32),
    height: rf(32),
    borderRadius: rbr(8),
    backgroundColor: colors.errorTint,
    justifyContent: "center",
    alignItems: "center",
  },
  riskContent: {
    flex: 1,
  },
  riskTitle: {
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: rp(2),
  },
  riskDescription: {
    fontSize: fontSize.micro,
    color: colors.textSecondary,
    lineHeight: rf(16),
  },
  noteCard: {
    flexDirection: "row",
    backgroundColor: colors.backgroundTertiary,
    borderRadius: rbr(10),
    padding: rp(12),
    marginTop: rp(8),
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteIcon: {
    marginRight: rp(10),
    marginTop: rp(2),
  },
  noteText: {
    flex: 1,
    fontSize: fontSize.micro,
    color: colors.textSecondary,
    lineHeight: rf(18),
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: rbr(12),
    paddingVertical: rp(14),
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: rp(16),
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
});

export default BMRInfoModal;
