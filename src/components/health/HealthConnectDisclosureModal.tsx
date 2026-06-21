/**
 * HealthConnectDisclosureModal
 *
 * Prominent in-app disclosure dialog shown BEFORE the system Health Connect
 * permission sheet. Required by the Google Play User Data Policy for apps that
 * read health/fitness data: the user must be told what data is accessed, why,
 * and how it is stored/shared, and must explicitly acknowledge before the OS
 * permission request fires.
 *
 * Visual style mirrors LogoutConfirmationModal (GlassCard + BlurView + gradient
 * confirm button) so it matches the rest of the app's modal language.
 */

import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  Text,
  Pressable,
  ScrollView,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, borderRadius } from "../../theme/aurora-tokens";
import { rf, rw, rh } from "../../utils/responsive";
import { gradients, toLinearGradientProps } from "../../theme/gradients";
import { haptics } from "../../utils/haptics";

// Every Health Connect record type FitAI reads or writes. Keeping this list in
// sync with the permissions declared in app.config.js / core.ts is what makes
// the disclosure "prominent and accurate" per Play policy.
const READ_DATA_TYPES = [
  "Steps",
  "Heart Rate",
  "Resting Heart Rate",
  "Active & Total Calories",
  "Distance",
  "Weight",
  "Sleep",
  "Exercise Sessions",
  "Heart Rate Variability (HRV)",
  "Blood Oxygen (SpO2)",
  "Body Fat",
];

const WRITTEN_DATA_TYPES = ["Exercise Sessions", "Active Calories"];

interface HealthConnectDisclosureModalProps {
  visible: boolean;
  onAcknowledge: () => void;
  onDismiss: () => void;
}

export const HealthConnectDisclosureModal: React.FC<
  HealthConnectDisclosureModalProps
> = ({ visible, onAcknowledge, onDismiss }) => {
  const handleAcknowledge = () => {
    haptics.medium();
    onAcknowledge();
  };

  const handleDismiss = () => {
    haptics.light();
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        <BlurView intensity={80} style={styles.blurContainer} pointerEvents="none" />
        <View style={styles.dialogWrapper}>
          <GlassCard
            elevation={5}
            blurIntensity="heavy"
            padding="lg"
            borderRadius="xl"
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name="heart-circle-outline"
                size={rf(44)}
                color={colors.primary}
              />
            </View>

            <Text style={styles.title}>Health Connect Permission</Text>
            <Text style={styles.subtitle}>
              FitAI wants to access your health data to provide personalized
              fitness coaching.
            </Text>

            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons
                    name="download-outline"
                    size={rf(14)}
                    color={colors.primary}
                  />
                  <Text style={styles.sectionHeaderText}>
                    Data we read
                  </Text>
                </View>
                <Text style={styles.listText}>
                  {READ_DATA_TYPES.join("  •  ")}
                </Text>
              </View>

              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons
                    name="create-outline"
                    size={rf(14)}
                    color={colors.success}
                  />
                  <Text style={styles.sectionHeaderText}>
                    Data we write back
                  </Text>
                </View>
                <Text style={styles.listText}>
                  {WRITTEN_DATA_TYPES.join("  •  ")}
                </Text>
              </View>

              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={rf(14)}
                    color={colors.info}
                  />
                  <Text style={styles.sectionHeaderText}>
                    How your data is used & stored
                  </Text>
                </View>
                <Text style={styles.bodyText}>
                  Your health data is used to personalize workout and nutrition
                  plans and to track your progress. It is stored securely in your
                  private FitAI account (Supabase), linked to your user ID and
                  protected by row-level security. We never sell your data, and it
                  is never shared with third parties for advertising.
                </Text>
                <Text style={styles.bodyText}>
                  You can revoke access at any time in Settings → Health Connect.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.actions}>
              <AnimatedPressable
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleDismiss}
                scaleValue={0.95}
                hapticFeedback={false}
              >
                <Text style={styles.cancelButtonText}>Not now</Text>
              </AnimatedPressable>

              <AnimatedPressable
                style={[styles.actionButton, styles.confirmButton]}
                onPress={handleAcknowledge}
                scaleValue={0.95}
                hapticFeedback={false}
              >
                <LinearGradient
                  {...toLinearGradientProps(gradients.button.primary)}
                  style={styles.confirmButtonGradient}
                >
                  <Text style={styles.confirmButtonText}>
                    Acknowledge &amp; continue
                  </Text>
                </LinearGradient>
              </AnimatedPressable>
            </View>
          </GlassCard>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  dialogWrapper: {
    width: "90%",
    maxWidth: 420,
    maxHeight: "85%",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: rf(20),
    fontWeight: "700",
    color: colors.white,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: rf(14),
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(20),
    marginBottom: spacing.md,
  },
  scrollArea: {
    maxHeight: rh(280),
    marginBottom: spacing.md,
  },
  scrollContent: {
    paddingBottom: spacing.sm,
  },
  sectionBlock: {
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionHeaderText: {
    fontSize: rf(13),
    fontWeight: "700",
    color: colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  listText: {
    fontSize: rf(13),
    color: colors.textSecondary,
    lineHeight: rf(19),
  },
  bodyText: {
    fontSize: rf(13),
    color: colors.textSecondary,
    lineHeight: rf(19),
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  confirmButton: {
    overflow: "hidden",
  },
  confirmButtonGradient: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: colors.white,
  },
  confirmButtonText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: colors.white,
  },
});

export default HealthConnectDisclosureModal;
