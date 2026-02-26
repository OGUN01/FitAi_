import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp, rbr } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";

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
          <Ionicons
            name="flash"
            size={rf(16)}
            color={ResponsiveTheme.colors.white}
          />
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
    padding: rp(20),
    paddingTop: rp(60),
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.glassBorder,
  },
  title: {
    fontSize: rf(28),
    fontWeight: "bold",
    color: ResponsiveTheme.colors.white,
    marginBottom: rp(8),
  },
  subtitle: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rp(20),
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: rp(20),
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: rf(24),
    fontWeight: "bold",
    color: ResponsiveTheme.colors.primaryDark,
  },
  statLabel: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(4),
  },
  autoResolveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ResponsiveTheme.colors.primaryDark,
    paddingVertical: rp(12),
    paddingHorizontal: rp(20),
    borderRadius: rbr(10),
    gap: rp(8),
  },
  autoResolveText: {
    color: ResponsiveTheme.colors.white,
    fontSize: rf(14),
    fontWeight: "600",
  },
});
