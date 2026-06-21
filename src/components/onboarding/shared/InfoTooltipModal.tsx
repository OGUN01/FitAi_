import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../../utils/responsive";
interface InfoTooltipModalProps {
  visible: boolean;
  title: string;
  description: string;
  benefits?: string[];
  onClose: () => void;
}

export const InfoTooltipModal: React.FC<InfoTooltipModalProps> = ({
  visible,
  title,
  description,
  benefits,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Close ${title}`}
            >
              <Ionicons
                name="close-circle"
                size={rf(24)}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalDescription}>{description}</Text>
          {benefits && benefits.length > 0 && (
            <View style={styles.modalBenefits}>
              <Text style={styles.modalBenefitsTitle}>Benefits:</Text>
              {benefits.map((benefit, index) => (
                <View key={index} style={styles.modalBenefitItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={rf(16)}
                    color={colors.success}
                  />
                  <Text style={styles.modalBenefitText}>{benefit}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: "transparent",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  modalCloseButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  modalDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: rf(22),
    marginBottom: spacing.md,
  },
  modalBenefits: {
    backgroundColor: `${colors.success}10`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  modalBenefitsTitle: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  modalBenefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  modalBenefitText: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
});
