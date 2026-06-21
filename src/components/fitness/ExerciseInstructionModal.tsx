/**
 * FitAI — Exercise Instruction Modal (Aurora)
 *
 * Bottom sheet showing step-by-step instructions + exercise details (muscles,
 * equipment, body parts, tips) for the current exercise.
 *
 * Aurora modernization:
 *  - Flat RN `Modal animationType="slide"` → shared `BottomSheet` (slide-up +
 *    drag-to-dismiss + glass surface + close button handled by the sheet).
 *  - Text "X" close → BottomSheet's built-in close (Ionicons chevron handled
 *    internally; the sheet title shows the exercise name).
 *  - De-duplicated the 4-tip block — now renders the shared `ExerciseTipsCard`
 *    (also used by ExerciseDetails), so the tips live in one place.
 *  - Hardcoded colors → aurora tokens.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheet,
  AnimatedPressable,
} from "../ui/aurora";
import { colors, spacing, borderRadius, typography } from "../../theme/aurora-tokens";
import { rf, rp, rh } from "../../utils/responsive";
import { exerciseFilterService } from "../../services/exerciseFilterService";
import { ExerciseTipsCard } from "./instruction/ExerciseTipsCard";

interface ExerciseInstructionModalProps {
  isVisible: boolean;
  onClose: () => void;
  exerciseId: string;
  exerciseName?: string;
}

export const ExerciseInstructionModal: React.FC<
  ExerciseInstructionModalProps
> = ({ isVisible, onClose, exerciseId, exerciseName }) => {
  const [activeTab, setActiveTab] = useState<"instructions" | "details">(
    "instructions",
  );

  // Direct lookup by exercise ID
  const exercise = exerciseFilterService.getExerciseById(exerciseId);
  const displayName = exerciseName || exercise?.name || "Exercise";

  const renderGifSection = () => {
    if (!exercise?.gifUrl) return null;

    return (
      <View style={styles.gifSection}>
        <Image
          source={{ uri: exercise.gifUrl }}
          style={styles.modalGif}
          contentFit="contain"
        />
      </View>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <AnimatedPressable
        onPress={() => setActiveTab("instructions")}
        scaleValue={0.96}
        springConfig="snappy"
        hapticType="selection"
        style={[styles.tab, activeTab === "instructions" && styles.activeTab]}
        accessibilityRole="button"
        accessibilityLabel="Show instructions tab"
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "instructions" && styles.activeTabText,
          ]}
        >
          Instructions
        </Text>
      </AnimatedPressable>
      <AnimatedPressable
        onPress={() => setActiveTab("details")}
        scaleValue={0.96}
        springConfig="snappy"
        hapticType="selection"
        style={[styles.tab, activeTab === "details" && styles.activeTab]}
        accessibilityRole="button"
        accessibilityLabel="Show details tab"
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "details" && styles.activeTabText,
          ]}
        >
          Details
        </Text>
      </AnimatedPressable>
    </View>
  );

  const renderInstructions = () => {
    if (!exercise?.instructions?.length) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="information-circle-outline" size={rf(48)} color={colors.text.tertiary} />
          <Text style={styles.noDataText}>
            No detailed instructions available
          </Text>
          <Text style={styles.noDataSubtext}>
            Follow the general form shown in the demonstration above
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.instructionsContainer}>
        <Text style={styles.sectionTitle}>Step-by-Step Instructions</Text>
        {exercise.instructions.map((instruction, index) => (
          <View
            key={`step-${index}-${instruction.substring(0, 20)}`}
            style={styles.instructionItem}
          >
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.instructionText}>
              {instruction.replace(/^Step:\d+\s*/, "")}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderDetails = () => {
    if (!exercise) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="help-circle-outline" size={rf(48)} color={colors.text.tertiary} />
          <Text style={styles.noDataText}>No exercise details available</Text>
        </View>
      );
    }

    return (
      <View style={styles.detailsContainer}>
        {/* Target Muscles */}
        {exercise.targetMuscles.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Primary Muscles</Text>
            <View style={styles.chipContainer}>
              {exercise.targetMuscles.map((muscle) => (
                <View
                  key={`primary-${muscle}`}
                  style={[styles.chip, styles.primaryChip]}
                >
                  <Text style={styles.primaryChipText}>{muscle}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Secondary Muscles */}
        {exercise.secondaryMuscles?.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Secondary Muscles</Text>
            <View style={styles.chipContainer}>
              {exercise.secondaryMuscles.map((muscle) => (
                <View
                  key={`secondary-${muscle}`}
                  style={[styles.chip, styles.secondaryChip]}
                >
                  <Text style={styles.secondaryChipText}>{muscle}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Equipment */}
        {exercise.equipments.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Equipment Needed</Text>
            <View style={styles.chipContainer}>
              {exercise.equipments.map((equipment) => (
                <View
                  key={`equipment-${equipment}`}
                  style={[styles.chip, styles.equipmentChip]}
                >
                  <Text style={styles.equipmentChipText}>{equipment}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Body Parts */}
        {exercise.bodyParts.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Body Parts</Text>
            <View style={styles.chipContainer}>
              {exercise.bodyParts.map((bodyPart) => (
                <View
                  key={`bodypart-${bodyPart}`}
                  style={[styles.chip, styles.bodyPartChip]}
                >
                  <Text style={styles.bodyPartChipText}>{bodyPart}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tips — shared ExerciseTipsCard (de-duplicated) */}
        <ExerciseTipsCard />
      </View>
    );
  };

  return (
    <BottomSheet
      visible={isVisible}
      onClose={onClose}
      title={displayName}
      showCloseButton
      dismissOnDrag
      closeOnOverlayPress
    >
      <View style={styles.verifiedRow}>
        <View style={styles.qualityBadge}>
          <Ionicons name="checkmark-circle" size={rf(12)} color={colors.success.DEFAULT} />
          <Text style={styles.qualityBadgeText}>Verified</Text>
        </View>
      </View>

      {renderGifSection()}
      {renderTabs()}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.tabContent}>
          {activeTab === "instructions"
            ? renderInstructions()
            : renderDetails()}
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  verifiedRow: {
    flexDirection: "row",
    marginBottom: rp(spacing.sm),
  },
  qualityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xxs),
    backgroundColor: `${colors.success.DEFAULT}20`,
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xxs),
    borderRadius: borderRadius.sm,
  },
  qualityBadgeText: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.success.DEFAULT,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  content: {
    flex: 1,
  },
  gifSection: {
    backgroundColor: colors.glass.backgroundDark,
    paddingVertical: rp(spacing.lg),
    alignItems: "center",
    borderRadius: borderRadius.lg,
    marginBottom: rp(spacing.md),
  },
  modalGif: {
    width: "80%",
    height: rh(200),
    borderRadius: borderRadius.lg,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: borderRadius.lg,
    padding: rp(spacing.xxs),
    marginBottom: rp(spacing.md),
  },
  tab: {
    flex: 1,
    paddingVertical: rp(spacing.sm),
    minHeight: rp(44),
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    backgroundColor: colors.primary.DEFAULT,
  },
  tabText: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.text.primary,
  },
  tabContent: {
    paddingBottom: rp(spacing.xl),
  },
  instructionsContainer: {
    paddingBottom: rp(spacing.xl),
  },
  sectionTitle: {
    fontSize: rf(typography.fontSize.h3),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text.primary,
    marginBottom: rp(spacing.lg),
  },
  instructionItem: {
    flexDirection: "row",
    marginBottom: rp(spacing.md),
    alignItems: "flex-start",
  },
  stepNumber: {
    width: rp(28),
    height: rp(28),
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
    marginRight: rp(spacing.md),
    marginTop: rp(2),
  },
  stepNumberText: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text.primary,
  },
  instructionText: {
    flex: 1,
    fontSize: rf(typography.fontSize.body),
    color: colors.text.primary,
    lineHeight: rf(22),
  },
  detailsContainer: {
    paddingBottom: rp(spacing.xl),
  },
  detailSection: {
    marginBottom: rp(spacing.xl),
  },
  detailSectionTitle: {
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text.primary,
    marginBottom: rp(spacing.md),
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rp(spacing.sm),
  },
  chip: {
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    borderRadius: borderRadius.lg,
  },
  primaryChip: {
    backgroundColor: `${colors.primary.DEFAULT}20`,
  },
  primaryChipText: {
    color: colors.primary.DEFAULT,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    textTransform: "capitalize",
  },
  secondaryChip: {
    backgroundColor: `${colors.warning.DEFAULT}20`,
  },
  secondaryChipText: {
    color: colors.warning.DEFAULT,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    textTransform: "capitalize",
  },
  equipmentChip: {
    backgroundColor: `${colors.info.DEFAULT}20`,
  },
  equipmentChipText: {
    color: colors.info.DEFAULT,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    textTransform: "capitalize",
  },
  bodyPartChip: {
    backgroundColor: `${colors.success.DEFAULT}20`,
  },
  bodyPartChipText: {
    color: colors.success.DEFAULT,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    textTransform: "capitalize",
  },
  noDataContainer: {
    alignItems: "center",
    paddingVertical: rp(spacing.xl),
  },
  noDataText: {
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text.secondary,
    marginBottom: rp(spacing.sm),
  },
  noDataSubtext: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
    textAlign: "center",
  },
});
