import React from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";

export interface DeloadModalProps {
  visible: boolean;
  variant: "proactive" | "reactive";
  message: string;
  exerciseName?: string;
  onAccept: () => void;
  onDismiss: () => void;
}

export function DeloadModal({
  visible,
  variant,
  message,
  onAccept,
  onDismiss,
}: DeloadModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View testID="deload-modal" style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {variant === "proactive" ? "Recovery Week" : "Deload Suggestion"}
          </Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              testID="deload-dismiss-btn"
              style={styles.dismissBtn}
              onPress={onDismiss}
            >
              <Text style={styles.dismissText}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="deload-accept-btn"
              style={styles.acceptBtn}
              onPress={onAccept}
            >
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 24,
    width: "90%",
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  dismissBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
  },
  dismissText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#4CAF50",
    alignItems: "center",
  },
  acceptText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
