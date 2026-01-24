/**
 * WeightEntryModal - Modal for logging weight entries
 *
 * SINGLE SOURCE OF TRUTH: Uses progress_entries table via progressData service
 *
 * Features:
 * - Number input with validation
 * - Optional body fat and notes
 * - Syncs to Supabase immediately
 * - Updates local stores for instant UI feedback
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptics } from "../../utils/haptics";
import { ResponsiveTheme } from "../../utils/constants";
import { progressDataService } from "../../services/progressData";
import { useProfileStore } from "../../stores/profileStore";
import { useHealthDataStore } from "../../stores/healthDataStore";
import { useAuth } from "../../hooks/useAuth";

interface WeightEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentWeight?: number; // Pre-fill with current weight
  unit?: "kg" | "lbs";
}

export const WeightEntryModal: React.FC<WeightEntryModalProps> = ({
  visible,
  onClose,
  onSuccess,
  currentWeight,
  unit = "kg",
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Form state
  const [weight, setWeight] = useState<string>("");
  const [bodyFat, setBodyFat] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill with current weight when modal opens
  useEffect(() => {
    if (visible && currentWeight) {
      setWeight(currentWeight.toFixed(1));
    }
  }, [visible, currentWeight]);

  // Reset form when closing
  const handleClose = useCallback(() => {
    setWeight("");
    setBodyFat("");
    setNotes("");
    setError(null);
    onClose();
  }, [onClose]);

  // Validate inputs
  const validateInputs = useCallback((): boolean => {
    const weightNum = parseFloat(weight);

    if (!weight || isNaN(weightNum)) {
      setError("Please enter a valid weight");
      return false;
    }

    if (weightNum < 20 || weightNum > 300) {
      setError("Weight must be between 20 and 300 kg");
      return false;
    }

    if (bodyFat) {
      const bodyFatNum = parseFloat(bodyFat);
      if (isNaN(bodyFatNum) || bodyFatNum < 3 || bodyFatNum > 60) {
        setError("Body fat must be between 3% and 60%");
        return false;
      }
    }

    setError(null);
    return true;
  }, [weight, bodyFat]);

  // Submit weight entry
  const handleSubmit = useCallback(async () => {
    if (!validateInputs()) {
      haptics.error();
      return;
    }

    if (!user?.id) {
      setError("You must be logged in to log weight");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const weightKg = parseFloat(weight);
      const bodyFatPercent = bodyFat ? parseFloat(bodyFat) : undefined;

      // Create progress entry via progressDataService (syncs to Supabase)
      const result = await progressDataService.createProgressEntry(user.id, {
        weight_kg: weightKg,
        body_fat_percentage: bodyFatPercent,
        notes: notes || undefined,
      });

      if (result.success) {
        haptics.success();

        // Update local stores for immediate UI feedback
        // Update profileStore bodyAnalysis
        useProfileStore.getState().updateBodyAnalysis({
          current_weight_kg: weightKg,
        });

        // Update healthDataStore metrics
        useHealthDataStore.getState().updateHealthMetrics({
          weight: weightKg,
        });

        console.log("Weight entry saved successfully:", weightKg, "kg");

        onSuccess?.();
        handleClose();
      } else {
        setError(result.error || "Failed to save weight entry");
        haptics.error();
      }
    } catch (err) {
      console.error("❌ Failed to save weight entry:", err);
      setError("An unexpected error occurred");
      haptics.error();
    } finally {
      setIsSubmitting(false);
    }
  }, [weight, bodyFat, notes, user, validateInputs, onSuccess, handleClose]);

  // Convert display if needed
  const displayUnit = unit === "lbs" ? "lbs" : "kg";
  const placeholder = unit === "lbs" ? "e.g., 165" : "e.g., 75.0";

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
                  <Text style={styles.title}>Log Weight</Text>
                  <TouchableOpacity
                    onPress={handleClose}
                    style={styles.closeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Weight Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Weight ({displayUnit}){" "}
                      <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="scale-outline"
                        size={20}
                        color="#9C27B0"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        value={weight}
                        onChangeText={setWeight}
                        placeholder={placeholder}
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        keyboardType="decimal-pad"
                        returnKeyType="next"
                        editable={!isSubmitting}
                      />
                      <Text style={styles.unitLabel}>{displayUnit}</Text>
                    </View>
                  </View>

                  {/* Body Fat Input (Optional) */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Body Fat % (optional)</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="fitness-outline"
                        size={20}
                        color="#FF6B6B"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        value={bodyFat}
                        onChangeText={setBodyFat}
                        placeholder="e.g., 18.5"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        keyboardType="decimal-pad"
                        returnKeyType="next"
                        editable={!isSubmitting}
                      />
                      <Text style={styles.unitLabel}>%</Text>
                    </View>
                  </View>

                  {/* Notes Input (Optional) */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Notes (optional)</Text>
                    <View
                      style={[styles.inputContainer, styles.notesContainer]}
                    >
                      <TextInput
                        style={[styles.input, styles.notesInput]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="How are you feeling?"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        editable={!isSubmitting}
                      />
                    </View>
                  </View>

                  {/* Error Message */}
                  {error && (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}
                </ScrollView>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    isSubmitting && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#fff"
                      />
                      <Text style={styles.submitButtonText}>Save Entry</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Info Text */}
                <Text style={styles.infoText}>
                  Your weight is tracked in Progress → Analytics
                </Text>
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  keyboardView: {
    width: "100%",
  },
  blurContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  modalContent: {
    padding: 20,
    backgroundColor: "rgba(20, 20, 35, 0.95)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    maxHeight: 350,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 8,
  },
  required: {
    color: "#FF6B6B",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#fff",
    height: "100%",
  },
  unitLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    marginLeft: 8,
  },
  notesContainer: {
    height: 80,
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  notesInput: {
    height: "100%",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,107,107,0.15)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#9C27B0",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  infoText: {
    textAlign: "center",
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginTop: 12,
  },
});

export default WeightEntryModal;
