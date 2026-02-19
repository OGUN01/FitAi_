import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Card, THEME } from "../../ui";

interface DailyGoalSectionProps {
  dailyGoal: string;
  onChangeGoal: (value: string) => void;
}

export const DailyGoalSection: React.FC<DailyGoalSectionProps> = ({
  dailyGoal,
  onChangeGoal,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Daily Water Goal</Text>
      <Card style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.inputLabel}>Goal (Liters)</Text>
          <TextInput
            style={styles.textInput}
            value={dailyGoal}
            onChangeText={onChangeGoal}
            placeholder="4.0"
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </View>
        <View style={styles.presetButtons}>
          {[2, 3, 4, 5].map((liters) => (
            <TouchableOpacity
              key={liters}
              style={[
                styles.presetButton,
                dailyGoal === liters.toString() && styles.presetButtonActive,
              ]}
              onPress={() => onChangeGoal(liters.toString())}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  dailyGoal === liters.toString() &&
                    styles.presetButtonTextActive,
                ]}
              >
                {liters}L
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
  },
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  card: {
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
  },
  cardContent: {
    marginBottom: THEME.spacing.md,
  },
  inputLabel: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    backgroundColor: THEME.colors.backgroundSecondary,
  },
  presetButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: THEME.spacing.sm,
  },
  presetButton: {
    flex: 1,
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.backgroundSecondary,
    alignItems: "center",
  },
  presetButtonActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primary + "20",
  },
  presetButtonText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },
  presetButtonTextActive: {
    color: THEME.colors.primary,
  },
});
