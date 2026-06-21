import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { rf, rp } from "../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";

// ============================================================================
// TYPES
// ============================================================================

interface InfoTooltipProps {
  title: string;
  description: string;
  icon?: string;
  position?: "top" | "bottom" | "left" | "right";
}

// ============================================================================
// COMPONENT
// ============================================================================

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  title,
  description,
  icon = "ℹ️",
  position = "bottom",
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setIsVisible(true)}
        style={styles.iconButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.icon}>{icon}</Text>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsVisible(false)}
        >
          <View style={styles.tooltipContainer}>
            <View style={styles.tooltipContent}>
              <Text style={styles.tooltipTitle}>{title}</Text>
              <Text style={styles.tooltipDescription}>{description}</Text>
              <TouchableOpacity
                onPress={() => setIsVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginLeft: spacing.xs,
  },

  iconButton: {
    width: rf(20),
    height: rf(20),
    borderRadius: rf(10),
    backgroundColor: `${colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },

  icon: {
    fontSize: rf(14),
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },

  tooltipContainer: {
    maxWidth: rp(400),
    width: "100%",
  },

  tooltipContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.25)',
    elevation: 5,
  },

  tooltipTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  tooltipDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: rf(22),
    marginBottom: spacing.md,
  },

  closeButton: {
    alignSelf: "flex-end",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },

  closeButtonText: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
});
