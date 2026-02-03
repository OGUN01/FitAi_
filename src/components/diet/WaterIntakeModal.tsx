/**
 * WaterIntakeModal - Modal for logging water intake
 *
 * SINGLE SOURCE OF TRUTH: Uses hydrationStore
 *
 * Features:
 * - Quick add buttons (250ml, 500ml, 1L)
 * - Custom amount input
 * - Visual water progress indicator
 * - Consistent with app design system
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { haptics } from "../../utils/haptics";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp } from "../../utils/responsive";

interface WaterIntakeModalProps {
  visible: boolean;
  onClose: () => void;
  onAddWater: (amountML: number) => void;
  currentIntakeML: number;
  goalML: number;
}

export const WaterIntakeModal: React.FC<WaterIntakeModalProps> = ({
  visible,
  onClose,
  onAddWater,
  currentIntakeML,
  goalML,
}) => {
  const insets = useSafeAreaInsets();
  const [customAmount, setCustomAmount] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate progress
  const currentLiters = currentIntakeML / 1000;
  const goalLiters = goalML / 1000;
  const progress =
    goalML > 0 ? Math.min((currentIntakeML / goalML) * 100, 100) : 0;
  const isGoalReached = currentIntakeML >= goalML;

  // Reset state when closing
  const handleClose = useCallback(() => {
    setCustomAmount("");
    setShowCustomInput(false);
    setError(null);
    onClose();
  }, [onClose]);

  // Handle quick add
  const handleQuickAdd = useCallback(
    (amountML: number) => {
      haptics.light();
      onAddWater(amountML);
      handleClose();
    },
    [onAddWater, handleClose],
  );

  // Handle custom amount submit
  const handleCustomSubmit = useCallback(() => {
    const amountLiters = parseFloat(customAmount);

    if (!customAmount || isNaN(amountLiters)) {
      setError("Please enter a valid amount");
      haptics.error();
      return;
    }

    if (amountLiters <= 0 || amountLiters > 5) {
      setError("Amount must be between 0.1 and 5 liters");
      haptics.error();
      return;
    }

    const amountML = amountLiters * 1000;
    haptics.success();
    onAddWater(amountML);
    handleClose();
  }, [customAmount, onAddWater, handleClose]);

  const quickOptions = [
    { label: "250ml", amount: 250, icon: "water-outline" as const },
    { label: "500ml", amount: 500, icon: "water" as const },
    { label: "1L", amount: 1000, icon: "beaker-outline" as const },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
              <View
                style={[
                  styles.modalContent,
                  { paddingBottom: insets.bottom + 20 },
                ]}
              >
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerLeft}>
                    <Ionicons
                      name="water"
                      size={rf(24)}
                      color={ResponsiveTheme.colors.primary}
                    />
                    <Text style={styles.title}>Log Water Intake</Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleClose}
                    style={styles.closeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Current Progress */}
                <View style={styles.progressSection}>
                  <View style={styles.progressInfo}>
                    <Text style={styles.progressLabel}>Today's Progress</Text>
                    <Text style={styles.progressValue}>
                      {currentLiters.toFixed(1)}L / {goalLiters.toFixed(1)}L
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <LinearGradient
                      colors={
                        isGoalReached
                          ? ["#10b981", "#059669"]
                          : [ResponsiveTheme.colors.primary, "#8B5CF6"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${progress}%` }]}
                    />
                  </View>
                  {isGoalReached && (
                    <View style={styles.goalReachedBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#10b981"
                      />
                      <Text style={styles.goalReachedText}>
                        Daily goal achieved!
                      </Text>
                    </View>
                  )}
                </View>

                {/* Quick Add Options */}
                {!showCustomInput ? (
                  <>
                    <Text style={styles.sectionTitle}>Quick Add</Text>
                    <View style={styles.quickOptionsContainer}>
                      {quickOptions.map((option) => (
                        <TouchableOpacity
                          key={option.label}
                          style={styles.quickOption}
                          onPress={() => handleQuickAdd(option.amount)}
                          activeOpacity={0.7}
                        >
                          <LinearGradient
                            colors={[
                              "rgba(99, 102, 241, 0.2)",
                              "rgba(139, 92, 246, 0.2)",
                            ]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.quickOptionGradient}
                          >
                            <Ionicons
                              name={option.icon}
                              size={rf(28)}
                              color={ResponsiveTheme.colors.primary}
                            />
                            <Text style={styles.quickOptionLabel}>
                              {option.label}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Custom Amount Button */}
                    <TouchableOpacity
                      style={styles.customButton}
                      onPress={() => setShowCustomInput(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={20}
                        color={ResponsiveTheme.colors.primary}
                      />
                      <Text style={styles.customButtonText}>Custom Amount</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* Custom Input */}
                    <Text style={styles.sectionTitle}>
                      Enter Amount (Liters)
                    </Text>
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="water-outline"
                        size={20}
                        color={ResponsiveTheme.colors.primary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        value={customAmount}
                        onChangeText={(text) => {
                          setCustomAmount(text);
                          setError(null);
                        }}
                        placeholder="e.g., 0.5"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        autoFocus
                        onSubmitEditing={handleCustomSubmit}
                      />
                      <Text style={styles.unitLabel}>L</Text>
                    </View>

                    {/* Error Message */}
                    {error && (
                      <View style={styles.errorContainer}>
                        <Ionicons
                          name="alert-circle"
                          size={16}
                          color="#FF6B6B"
                        />
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => {
                          setShowCustomInput(false);
                          setCustomAmount("");
                          setError(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cancelButtonText}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleCustomSubmit}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={[ResponsiveTheme.colors.primary, "#8B5CF6"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.submitButtonGradient}
                        >
                          <Ionicons name="add" size={20} color="#fff" />
                          <Text style={styles.submitButtonText}>Add Water</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </BlurView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  keyboardView: {
    justifyContent: "flex-end",
  },
  blurContainer: {
    borderTopLeftRadius: ResponsiveTheme.borderRadius.xxl,
    borderTopRightRadius: ResponsiveTheme.borderRadius.xxl,
    overflow: "hidden",
  },
  modalContent: {
    backgroundColor: "rgba(20, 20, 35, 0.95)",
    paddingHorizontal: rp(24),
    paddingTop: rp(20),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rp(20),
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(10),
  },
  title: {
    fontSize: rf(20),
    fontWeight: "700",
    color: "#fff",
  },
  closeButton: {
    padding: rp(4),
  },
  progressSection: {
    marginBottom: rp(24),
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rp(8),
  },
  progressLabel: {
    fontSize: rf(14),
    color: "rgba(255,255,255,0.7)",
  },
  progressValue: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#fff",
  },
  progressBar: {
    height: rp(8),
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: rp(4),
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: rp(4),
  },
  goalReachedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(6),
    marginTop: rp(8),
  },
  goalReachedText: {
    fontSize: rf(13),
    color: "#10b981",
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    marginBottom: rp(12),
  },
  quickOptionsContainer: {
    flexDirection: "row",
    gap: rp(12),
    marginBottom: rp(20),
  },
  quickOption: {
    flex: 1,
  },
  quickOptionGradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rp(20),
    borderRadius: ResponsiveTheme.borderRadius.xl,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
  },
  quickOptionLabel: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#fff",
    marginTop: rp(8),
  },
  customButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(8),
    paddingVertical: rp(14),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
    borderStyle: "dashed",
  },
  customButtonText: {
    fontSize: rf(14),
    fontWeight: "500",
    color: ResponsiveTheme.colors.primary,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: ResponsiveTheme.borderRadius.lg,
    paddingHorizontal: rp(16),
    marginBottom: rp(16),
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
  },
  inputIcon: {
    marginRight: rp(12),
  },
  input: {
    flex: 1,
    fontSize: rf(18),
    fontWeight: "600",
    color: "#fff",
    paddingVertical: rp(16),
  },
  unitLabel: {
    fontSize: rf(16),
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
    marginLeft: rp(8),
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(8),
    marginBottom: rp(16),
    paddingHorizontal: rp(4),
  },
  errorText: {
    fontSize: rf(13),
    color: "#FF6B6B",
  },
  actionButtons: {
    flexDirection: "row",
    gap: rp(12),
  },
  cancelButton: {
    flex: 0.4,
    paddingVertical: rp(14),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  cancelButtonText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#fff",
  },
  submitButton: {
    flex: 0.6,
    overflow: "hidden",
    borderRadius: ResponsiveTheme.borderRadius.lg,
  },
  submitButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(8),
    paddingVertical: rp(14),
  },
  submitButtonText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#fff",
  },
});

export default WaterIntakeModal;
