import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ConflictStats {
  total: number;
  resolved: number;
  autoResolvable: number;
}

interface ConflictHeaderProps {
  conflictsCount: number;
  stats: ConflictStats;
  autoResolveEnabled: boolean;
  onAutoResolve: () => void;
}

export const ConflictHeader: React.FC<ConflictHeaderProps> = ({
  conflictsCount,
  stats,
  autoResolveEnabled,
  onAutoResolve,
}) => {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Resolve Data Conflicts</Text>
      <Text style={styles.subtitle}>
        We found {conflictsCount} conflicts that need your attention
      </Text>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.resolved}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.autoResolvable}</Text>
          <Text style={styles.statLabel}>Auto-Resolvable</Text>
        </View>
      </View>

      {autoResolveEnabled && stats.autoResolvable > 0 && (
        <TouchableOpacity
          style={styles.autoResolveButton}
          onPress={onAutoResolve}
        >
          <Ionicons name="flash" size={16} color="#FFFFFF" />
          <Text style={styles.autoResolveText}>
            Auto-Resolve {stats.autoResolvable} Conflicts
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(75, 85, 99, 0.3)",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4F46E5",
  },
  statLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  autoResolveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  autoResolveText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
