import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  // Image imported from expo-image below
  SafeAreaView,
} from "react-native";
import { Image } from "expo-image";
import { Button } from "../ui";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr, rh, rs } from "../../utils/responsive";
import { exerciseFilterService } from "../../services/exerciseFilterService";

interface ExerciseInstructionModalProps {
  isVisible: boolean;
  onClose: () => void;
  exerciseId: string;
  exerciseName?: string;
}

// REMOVED: Module-level Dimensions.get() causes crash
// const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const ExerciseInstructionModal: React.FC<
  ExerciseInstructionModalProps
> = ({ isVisible, onClose, exerciseId, exerciseName }) => {
  const [activeTab, setActiveTab] = useState<"instructions" | "details">(
    "instructions",
  );

  // Direct lookup by exercise ID
  const exercise = exerciseFilterService.getExerciseById(exerciseId);
  const displayName = exerciseName || exercise?.name || "Exercise";

  if (!isVisible) return null;

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.modalTitle} numberOfLines={2}>
          {displayName}
        </Text>
        <View style={styles.qualityBadge}>
          <Text style={styles.qualityBadgeText}>Verified</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={`Close ${displayName}`}
      >
        <Text style={styles.closeButtonText}>X</Text>
      </TouchableOpacity>
    </View>
  );

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
      <TouchableOpacity
        style={[styles.tab, activeTab === "instructions" && styles.activeTab]}
        onPress={() => setActiveTab("instructions")}
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
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === "details" && styles.activeTab]}
        onPress={() => setActiveTab("details")}
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
      </TouchableOpacity>
    </View>
  );

  const renderInstructions = () => {
    if (!exercise?.instructions?.length) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataEmoji}>i</Text>
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
          <Text style={styles.noDataEmoji}>?</Text>
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

        {/* Exercise Tips */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Tips</Text>
          <View style={styles.tipContainer}>
            <Text style={styles.tipText}>
              - Focus on proper form over speed or weight
            </Text>
            <Text style={styles.tipText}>
              - Control the movement throughout the full range of motion
            </Text>
            <Text style={styles.tipText}>
              - Breathe properly - exhale on exertion, inhale on release
            </Text>
            <Text style={styles.tipText}>
              - Stop if you feel pain or discomfort
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        {renderHeader()}

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {renderGifSection()}
          {renderTabs()}

          <View style={styles.tabContent}>
            {activeTab === "instructions"
              ? renderInstructions()
              : renderDetails()}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Got It!"
            onPress={onClose}
            variant="primary"
            style={styles.footerButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.surface,
  },

  headerContent: {
    flex: 1,
    marginRight: ResponsiveTheme.spacing.md,
  },

  modalTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  qualityBadge: {
    backgroundColor: ResponsiveTheme.colors.success + "20",
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    alignSelf: "flex-start",
  },

  qualityBadgeText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.success,
    fontWeight: "600",
  },

  closeButton: {
    width: Math.max(rs(40), 44),
    height: Math.max(rs(40), 44),
    borderRadius: Math.max(rbr(20), 22),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },

  closeButtonText: {
    fontSize: rf(18),
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: "bold",
  },

  content: {
    flex: 1,
  },

  gifSection: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    paddingVertical: ResponsiveTheme.spacing.lg,
    alignItems: "center",
  },

  modalGif: {
    width: "80%", // Use percentage instead of screenWidth
    height: rh(200),
    borderRadius: ResponsiveTheme.borderRadius.lg,
  },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: ResponsiveTheme.colors.surface,
    marginHorizontal: ResponsiveTheme.spacing.lg,
    marginTop: ResponsiveTheme.spacing.lg,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: ResponsiveTheme.spacing.xs,
  },

  tab: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.sm,
    minHeight: 44,
    borderRadius: ResponsiveTheme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },

  activeTab: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },

  tabText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
  },

  activeTabText: {
    color: ResponsiveTheme.colors.surface,
  },

  tabContent: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
  },

  instructionsContainer: {
    paddingBottom: ResponsiveTheme.spacing.xl,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  instructionItem: {
    flexDirection: "row",
    marginBottom: ResponsiveTheme.spacing.md,
    alignItems: "flex-start",
  },

  stepNumber: {
    width: rs(28),
    height: rs(28),
    borderRadius: rbr(14),
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.md,
    marginTop: rp(2),
  },

  stepNumberText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "bold",
    color: ResponsiveTheme.colors.surface,
  },

  instructionText: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(22),
  },

  detailsContainer: {
    paddingBottom: ResponsiveTheme.spacing.xl,
  },

  detailSection: {
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  detailSectionTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
  },

  chip: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.lg,
  },

  primaryChip: {
    backgroundColor: ResponsiveTheme.colors.primary + "20",
  },

  primaryChipText: {
    color: ResponsiveTheme.colors.primary,
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  secondaryChip: {
    backgroundColor: ResponsiveTheme.colors.warning + "20",
  },

  secondaryChipText: {
    color: ResponsiveTheme.colors.warning,
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  equipmentChip: {
    backgroundColor: ResponsiveTheme.colors.info + "20",
  },

  equipmentChipText: {
    color: ResponsiveTheme.colors.info,
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  bodyPartChip: {
    backgroundColor: ResponsiveTheme.colors.success + "20",
  },

  bodyPartChipText: {
    color: ResponsiveTheme.colors.success,
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  tipContainer: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.lg,
    borderRadius: ResponsiveTheme.borderRadius.lg,
  },

  tipText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(20),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  noDataContainer: {
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.xl,
  },

  noDataEmoji: {
    fontSize: rf(48),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  noDataText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  noDataSubtext: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },

  footer: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.surface,
  },

  footerButton: {
    width: "100%",
  },
});
