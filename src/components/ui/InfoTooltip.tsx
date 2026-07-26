import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp, rh } from "../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { hexToRgba, TINT_ALPHA_LOW } from "../../utils/colors";

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
  icon,
  position = "bottom",
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setIsVisible(true)}
        style={styles.iconButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={`More info: ${title}`}
        accessibilityHint="Opens a tooltip with details"
      >
        <Ionicons
          name="information-circle-outline"
          size={rf(16)}
          color={colors.primary}
        />
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
          accessibilityRole="button"
          accessibilityLabel="Dismiss tooltip"
          accessibilityHint="Closes the tooltip"
        >
          <View style={styles.tooltipContainer}>
            <View style={styles.tooltipContent}>
              <Text style={styles.tooltipTitle} numberOfLines={2}>{title}</Text>
              <Text style={styles.tooltipDescription} numberOfLines={10}>{description}</Text>
              <TouchableOpacity
                onPress={() => setIsVisible(false)}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Dismiss tooltip"
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
    minWidth: Math.max(rf(20), 44),
    minHeight: Math.max(rf(20), 44),
    justifyContent: "center",
    alignItems: "center",
    borderRadius: rf(10),
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW + 0.03),
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
    elevation: 5,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
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
    minHeight: Math.max(rh(44), 44),
    justifyContent: "center",
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
