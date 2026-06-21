import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../../theme/aurora-tokens";
import React, { type ComponentProps } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../../../utils/responsive";import { GlassCard } from "../../../../components/ui/aurora";
import { MultiSelect } from "../../../../components/advanced/MultiSelect";
import {
  EQUIPMENT_OPTIONS,
  STANDARD_GYM_EQUIPMENT,
} from "../../../../screens/onboarding/tabs/WorkoutPreferencesConstants";

interface EquipmentSelectorProps {
  location: "gym" | "home" | "both";
  selectedEquipment: string[];
  onEquipmentChange: (equipment: string[]) => void;
}

export const EquipmentSelector: React.FC<EquipmentSelectorProps> = ({
  location,
  selectedEquipment,
  onEquipmentChange,
}) => {
  return (
    <View style={styles.edgeToEdgeContentPadded}>
      {location !== "gym" ? (
        <View style={styles.preferenceField}>
          <MultiSelect
            options={EQUIPMENT_OPTIONS}
            selectedValues={selectedEquipment}
            onSelectionChange={onEquipmentChange}
            label="Available Equipment"
            placeholder="Select equipment you have access to"
            searchable={true}
          />
        </View>
      ) : (
        <View style={styles.preferenceField}>
          <Text style={styles.fieldLabel} numberOfLines={1}>
            Available Equipment
          </Text>
          <GlassCard
            elevation={2}
            blurIntensity="default"
            padding="md"
            borderRadius="lg"
            style={styles.gymEquipmentCard}
          >
            <View style={styles.gymEquipmentContent}>
              <Ionicons
                name="fitness-outline"
                size={rf(24)}
                color={colors.primary}
                style={{ marginBottom: spacing.sm }}
              />
              <Text style={styles.gymEquipmentTitle} numberOfLines={1}>
                Full Gym Access
              </Text>
              <Text
                style={styles.gymEquipmentDescription}
                numberOfLines={3}
                ellipsizeMode="tail"
              >
                All standard gym equipment is available. Equipment selection is
                automatically configured.
              </Text>
              <View style={styles.gymEquipmentList}>
                {STANDARD_GYM_EQUIPMENT.map((equipmentId) => {
                  const equipment = EQUIPMENT_OPTIONS.find(
                    (opt) => opt.value === equipmentId,
                  );
                  return equipment ? (
                    <View key={equipmentId} style={styles.gymEquipmentItem}>
                      <Ionicons
                        name={equipment.iconName as ComponentProps<typeof Ionicons>['name']}
                        size={rf(16)}
                        color={colors.text}
                        style={{ marginRight: spacing.xs }}
                      />
                      <Text style={styles.gymEquipmentItemLabel}>
                        {equipment.label}
                      </Text>
                    </View>
                  ) : null;
                })}
              </View>
            </View>
          </GlassCard>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  edgeToEdgeContentPadded: {
    paddingHorizontal: spacing.lg,
  },
  fieldLabel: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
    flexShrink: 1,
  },
  preferenceField: {
    marginBottom: spacing.lg,
  },
  gymEquipmentCard: {
    padding: spacing.md,
    backgroundColor: `${colors.success}08`,
    borderColor: `${colors.success}30`,
    borderWidth: 1,
  },
  gymEquipmentContent: {
    alignItems: "center",
  },
  gymEquipmentTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.success,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  gymEquipmentDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: rf(18),
  },
  gymEquipmentList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  gymEquipmentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  gymEquipmentItemLabel: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
  },
});
