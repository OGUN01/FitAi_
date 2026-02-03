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
import { ResponsiveTheme } from "../../../utils/constants";

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
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons
                name="close-circle"
                size={rf(24)}
                color={ResponsiveTheme.colors.textSecondary}
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
                    color={ResponsiveTheme.colors.success}
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
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  modalContent: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.xl,
    padding: ResponsiveTheme.spacing.xl,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: "transparent",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  modalTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },
  modalCloseButton: {
    padding: ResponsiveTheme.spacing.xs,
  },
  modalDescription: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(22),
    marginBottom: ResponsiveTheme.spacing.md,
  },
  modalBenefits: {
    backgroundColor: `${ResponsiveTheme.colors.success}10`,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: ResponsiveTheme.spacing.md,
  },
  modalBenefitsTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.success,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  modalBenefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  modalBenefitText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },
});
