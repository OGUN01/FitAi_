import React from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { rf, rw, rh, rp } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";

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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} style={styles.blurContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="warning" size={rf(28)} color="#F59E0B" />
              </View>
              <Text style={styles.headerTitle}>Eating Below BMR</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="close"
                  size={rf(24)}
                  color={ResponsiveTheme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* BMR Explanation */}
            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.bmrCard}>
                <Text style={styles.bmrLabel}>Your BMR</Text>
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
                    color={ResponsiveTheme.colors.error}
                  />
                  <Text style={styles.functionText}>
                    Keep your heart beating
                  </Text>
                </View>
                <View style={styles.functionItem}>
                  <Ionicons
                    name="bulb"
                    size={rf(16)}
                    color={ResponsiveTheme.colors.warning}
                  />
                  <Text style={styles.functionText}>
                    Maintain brain function
                  </Text>
                </View>
                <View style={styles.functionItem}>
                  <Ionicons
                    name="body"
                    size={rf(16)}
                    color={ResponsiveTheme.colors.primary}
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
                        color="#EF4444"
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
                  color={ResponsiveTheme.colors.primary}
                  style={styles.noteIcon}
                />
                <Text style={styles.noteText}>
                  You CAN still choose an aggressive goal - we won't stop you.
                  But we recommend a sustainable pace for long-term success.
                </Text>
              </View>
            </ScrollView>

            {/* Action Button */}
            <TouchableOpacity style={styles.actionButton} onPress={onClose}>
              <Text style={styles.actionButtonText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  blurContainer: {
    width: "90%",
    maxWidth: rw(400),
    maxHeight: "85%",
    borderRadius: rp(20),
    overflow: "hidden",
  },
  modalContent: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rp(20),
    padding: rp(20),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(16),
  },
  headerIcon: {
    width: rf(44),
    height: rf(44),
    borderRadius: rf(22),
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: rp(12),
  },
  headerTitle: {
    flex: 1,
    fontSize: rf(18),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  closeButton: {
    padding: rp(4),
  },
  scrollContent: {
    maxHeight: rh(400),
  },
  bmrCard: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: rp(12),
    padding: rp(16),
    alignItems: "center",
    marginBottom: rp(16),
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
  },
  bmrLabel: {
    fontSize: rf(12),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: rp(4),
  },
  bmrValue: {
    fontSize: rf(32),
    fontWeight: "800",
    color: ResponsiveTheme.colors.primary,
  },
  bmrUnit: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(2),
  },
  explanation: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
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
    fontSize: rf(13),
    color: ResponsiveTheme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: ResponsiveTheme.colors.border,
    marginVertical: rp(16),
  },
  risksTitle: {
    fontSize: rf(15),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
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
    borderRadius: rf(8),
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  riskContent: {
    flex: 1,
  },
  riskTitle: {
    fontSize: rf(13),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: rp(2),
  },
  riskDescription: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },
  noteCard: {
    flexDirection: "row",
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    borderRadius: rp(10),
    padding: rp(12),
    marginTop: rp(8),
  },
  noteIcon: {
    marginRight: rp(10),
    marginTop: rp(2),
  },
  noteText: {
    flex: 1,
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(18),
  },
  actionButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: rp(12),
    paddingVertical: rp(14),
    alignItems: "center",
    marginTop: rp(16),
  },
  actionButtonText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default BMRInfoModal;
