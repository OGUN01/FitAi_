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
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet, AnimatedPressable, EmptyState, SlidingSegmentedControl } from '../ui/aurora';
import { colors, spacing, borderRadius, typography } from '../../theme/aurora-tokens';
import { hexToRgba } from '../../utils/colors';
import { rf, rp, rh } from '../../utils/responsive';
import { exerciseFilterService, FilteredExercise } from '../../services/exerciseFilterService';
import { getCatalogEntry } from '../../data/exerciseCatalog.generated';
import { ExerciseTipsCard } from './instruction/ExerciseTipsCard';

interface ExerciseInstructionModalProps {
  isVisible: boolean;
  onClose: () => void;
  exerciseId: string;
  exerciseName?: string;
}

export const ExerciseInstructionModal: React.FC<ExerciseInstructionModalProps> = ({
  isVisible,
  onClose,
  exerciseId,
  exerciseName,
}) => {
  const [activeTab, setActiveTab] = useState<'instructions' | 'details'>('instructions');
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  // Direct lookup by exercise ID, exact-match only (no fuzzy name fallback —
  // see the identical fix + rationale in ExerciseGifPlayer.tsx). Falls back
  // to the canonical catalog (exerciseCatalog.generated.ts) for legacy
  // curated ids (e.g. "deadlift") that have no entry in the legacy
  // ExerciseDB-hash-keyed dataset, so the Details tab shows real
  // muscle/equipment data instead of an empty state for those exercises.
  const legacyExercise = exerciseFilterService.getExerciseById(exerciseId);
  const exercise: FilteredExercise | null =
    legacyExercise ??
    (() => {
      const catalogEntry = getCatalogEntry(exerciseId);
      if (!catalogEntry) return null;
      const gifAsset = catalogEntry.media.find((m) => m.type === 'exercisedb_gif');
      return {
        exerciseId: catalogEntry.canonicalId,
        name: catalogEntry.name,
        gifUrl: gifAsset?.url ?? '',
        targetMuscles: catalogEntry.primaryMuscles,
        bodyParts: catalogEntry.bodyPart ? [catalogEntry.bodyPart] : [],
        equipments: catalogEntry.equipment,
        secondaryMuscles: catalogEntry.secondaryMuscles,
        instructions: [],
        difficulty: catalogEntry.skillLevel,
      };
    })();
  // Title-case the display name so the sheet title isn't lowercase when the
  // workout plan stores the name in lowercase (e.g. "kettlebell two arm clean").
  const rawName = exerciseName || exercise?.name || 'Exercise';
  const displayName = rawName.replace(/\b\w/g, (l) => l.toUpperCase());

  const renderGifSection = () => {
    if (!exercise?.gifUrl) return null;

    return (
      <View style={styles.gifSection}>
        <Image source={{ uri: exercise.gifUrl }} style={styles.modalGif} contentFit="contain" />
      </View>
    );
  };

  const renderTabs = () => (
    <SlidingSegmentedControl
      options={[
        { id: 'instructions', label: 'Instructions' },
        { id: 'details', label: 'Details' },
      ]}
      selectedId={activeTab}
      onSelect={(id) => setActiveTab(id as 'instructions' | 'details')}
      variant="aurora"
      style={styles.tabContainer}
    />
  );

  const renderInstructions = () => {
    if (!exercise?.instructions?.length) {
      return (
        <EmptyState
          icon="information-circle-outline"
          iconColor={colors.text.tertiary}
          title="No detailed instructions available"
          subtitle="Follow the general form shown in the demonstration above"
        />
      );
    }

    return (
      <View style={styles.instructionsContainer}>
        <Text style={styles.sectionTitle}>Step-by-Step Instructions</Text>
        {exercise.instructions.map((instruction, index) => {
          const isExpanded = expandedSteps.has(index);
          return (
            <View
              key={`step-${index}-${instruction.substring(0, 20)}`}
              style={styles.instructionItem}
            >
              <View style={styles.stepNumber} accessibilityRole="text">
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.instructionTextWrapper}>
                <Text style={styles.instructionText} numberOfLines={isExpanded ? undefined : 5}>
                  {instruction.replace(/^Step:\d+\s*/, '')}
                </Text>
                <AnimatedPressable
                  onPress={() =>
                    setExpandedSteps((prev) => {
                      const next = new Set(prev);
                      if (next.has(index)) {
                        next.delete(index);
                      } else {
                        next.add(index);
                      }
                      return next;
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={isExpanded ? 'Show less' : 'Show more'}
                  style={styles.showMoreButton}
                >
                  <Text style={styles.showMoreText}>{isExpanded ? 'Show less' : 'Show more'}</Text>
                </AnimatedPressable>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderDetails = () => {
    if (!exercise) {
      return <EmptyState icon="help-circle-outline" iconColor={colors.text.tertiary} title="No exercise details available" />;
    }

    return (
      <View style={styles.detailsContainer}>
        {/* Target Muscles */}
        {exercise.targetMuscles.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Primary Muscles</Text>
            <View style={styles.chipContainer}>
              {exercise.targetMuscles.map((muscle) => (
                <View key={`primary-${muscle}`} style={[styles.chip, styles.primaryChip]}>
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
                <View key={`secondary-${muscle}`} style={[styles.chip, styles.secondaryChip]}>
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
                <View key={`equipment-${equipment}`} style={[styles.chip, styles.equipmentChip]}>
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
                <View key={`bodypart-${bodyPart}`} style={[styles.chip, styles.bodyPartChip]}>
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
        <View
          style={styles.qualityBadge}
          accessibilityRole="text"
          accessibilityLabel="Verified exercise"
        >
          <Ionicons name="checkmark-circle" size={rf(12)} color={colors.success.DEFAULT} />
          <Text style={styles.qualityBadgeText}>Verified</Text>
        </View>
      </View>

      {renderGifSection()}
      {renderTabs()}

      <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={styles.content}>
        <View style={styles.tabContent}>
          {activeTab === 'instructions' ? renderInstructions() : renderDetails()}
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  verifiedRow: {
    flexDirection: 'row',
    marginBottom: rp(spacing.sm),
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.xxs),
    backgroundColor: hexToRgba(colors.success.DEFAULT, 0.12),
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
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    marginBottom: rp(spacing.md),
  },
  modalGif: {
    width: '80%',
    aspectRatio: 1,
    maxWidth: rh(200),
    height: rh(200),
    borderRadius: borderRadius.lg,
  },
  tabContainer: {
    marginBottom: rp(spacing.md),
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
    flexDirection: 'row',
    marginBottom: rp(spacing.md),
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: rp(28),
    height: rp(28),
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
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
  instructionTextWrapper: {
    flex: 1,
  },
  showMoreButton: {
    marginTop: rp(spacing.xs),
    alignSelf: 'flex-start',
  },
  showMoreText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.primary.DEFAULT,
    fontWeight: String(typography.fontWeight.semibold) as any,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rp(spacing.sm),
  },
  chip: {
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    borderRadius: borderRadius.lg,
  },
  primaryChip: {
    backgroundColor: hexToRgba(colors.primary.DEFAULT, 0.12),
  },
  primaryChipText: {
    color: colors.primary.DEFAULT,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    textTransform: 'capitalize',
  },
  secondaryChip: {
    backgroundColor: hexToRgba(colors.warning.DEFAULT, 0.12),
  },
  secondaryChipText: {
    color: colors.warning.DEFAULT,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    textTransform: 'capitalize',
  },
  equipmentChip: {
    backgroundColor: hexToRgba(colors.info.DEFAULT, 0.12),
  },
  equipmentChipText: {
    color: colors.info.DEFAULT,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    textTransform: 'capitalize',
  },
  bodyPartChip: {
    backgroundColor: hexToRgba(colors.success.DEFAULT, 0.12),
  },
  bodyPartChipText: {
    color: colors.success.DEFAULT,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    textTransform: 'capitalize',
  },
});
