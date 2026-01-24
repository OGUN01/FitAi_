import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { rf } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";

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
    marginLeft: ResponsiveTheme.spacing.xs,
  },

  iconButton: {
    width: rf(20),
    height: rf(20),
    borderRadius: rf(10),
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },

  icon: {
    fontSize: rf(14),
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: ResponsiveTheme.spacing.lg,
  },

  tooltipContainer: {
    maxWidth: 400,
    width: "100%",
  },

  tooltipContent: {
    backgroundColor: ResponsiveTheme.colors.background,
    borderRadius: ResponsiveTheme.borderRadius.xl,
    padding: ResponsiveTheme.spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },

  tooltipTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  tooltipDescription: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(22),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  closeButton: {
    alignSelf: "flex-end",
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.lg,
  },

  closeButtonText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: "#FFFFFF",
  },
});
