import React, { type ComponentProps } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../../../utils/responsive";
import { ResponsiveTheme } from "../../../../utils/constants";
import { GlassCard } from "../../../../components/ui/aurora";
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
                color={ResponsiveTheme.colors.primary}
                style={{ marginBottom: ResponsiveTheme.spacing.sm }}
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
                        color={ResponsiveTheme.colors.text}
                        style={{ marginRight: ResponsiveTheme.spacing.xs }}
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
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  fieldLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    flexShrink: 1,
  },
  preferenceField: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  gymEquipmentCard: {
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.success}08`,
    borderColor: `${ResponsiveTheme.colors.success}30`,
    borderWidth: 1,
  },
  gymEquipmentContent: {
    alignItems: "center",
  },
  gymEquipmentTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.success,
    marginBottom: ResponsiveTheme.spacing.xs,
    textAlign: "center",
  },
  gymEquipmentDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: rf(18),
  },
  gymEquipmentList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.sm,
  },
  gymEquipmentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  gymEquipmentItemLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
});
