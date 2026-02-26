import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Card } from "../../ui";
import { ResponsiveTheme } from '../../../utils/constants';

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
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  card: {
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  cardContent: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  inputLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: ResponsiveTheme.spacing.md,
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
  },
  presetButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: ResponsiveTheme.spacing.sm,
  },
  presetButton: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    alignItems: "center",
  },
  presetButtonActive: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: ResponsiveTheme.colors.primary + "20",
  },
  presetButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  presetButtonTextActive: {
    color: ResponsiveTheme.colors.primary,
  },
});
