import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Card } from "../../ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from '../../../theme/aurora-tokens';

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
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  card: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardContent: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.backgroundSecondary,
  },
  presetButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: spacing.sm,
  },
  presetButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
  },
  presetButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "20",
  },
  presetButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  presetButtonTextActive: {
    color: colors.primary,
  },
});
