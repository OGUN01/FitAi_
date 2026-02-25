import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rp } from "../../../utils/responsive";

interface CustomInputSectionProps {
  customAmount: string;
  error: string | null;
  onCustomAmountChange: (value: string) => void;
  onErrorChange: (value: string | null) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export const CustomInputSection: React.FC<CustomInputSectionProps> = ({
  customAmount,
  error,
  onCustomAmountChange,
  onErrorChange,
  onCancel,
  onSubmit,
}) => {
  return (
    <>
      <Text style={styles.sectionTitle}>Enter Amount (Liters)</Text>
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
            onCustomAmountChange(text);
            onErrorChange(null);
          }}
          placeholder="e.g., 0.5"
          placeholderTextColor="rgba(255,255,255,0.4)"
          keyboardType="decimal-pad"
          returnKeyType="done"
          autoFocus
          onSubmitEditing={onSubmit}
        />
        <Text style={styles.unitLabel}>L</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={onSubmit}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[ResponsiveTheme.colors.primary, "#FF8A5C"]}
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
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    marginBottom: rp(12),
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: ResponsiveTheme.borderRadius.lg,
    paddingHorizontal: rp(16),
    marginBottom: rp(16),
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.3)",
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
