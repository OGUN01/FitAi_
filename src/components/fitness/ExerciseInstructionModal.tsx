import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Card, Button, THEME } from '../ui';
import { exerciseFilterService } from '../../services/exerciseFilterService';

interface ExerciseInstructionModalProps {
  isVisible: boolean;
  onClose: () => void;
  exerciseId: string;
  exerciseName?: string;
}

// REMOVED: Module-level Dimensions.get() causes crash
// const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const ExerciseInstructionModal: React.FC<ExerciseInstructionModalProps> = ({
  isVisible,
  onClose,
  exerciseId,
  exerciseName,
}) => {
  const [activeTab, setActiveTab] = useState<'instructions' | 'details'>('instructions');

  // Direct lookup by exercise ID
  const exercise = exerciseFilterService.getExerciseById(exerciseId);
  const displayName = exerciseName || exercise?.name || 'Exercise';

  if (!isVisible) return null;

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.modalTitle} numberOfLines={2}>
          {displayName}
        </Text>
        <View style={styles.qualityBadge}>
          <Text style={styles.qualityBadgeText}>✅ Verified</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>✕</Text>
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
          resizeMode="contain"
        />
      </View>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'instructions' && styles.activeTab]}
        onPress={() => setActiveTab('instructions')}
      >
        <Text style={[styles.tabText, activeTab === 'instructions' && styles.activeTabText]}>
          📋 Instructions
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'details' && styles.activeTab]}
        onPress={() => setActiveTab('details')}
      >
        <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
          ℹ️ Details
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderInstructions = () => {
    if (!exercise?.instructions?.length) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataEmoji}>📝</Text>
          <Text style={styles.noDataText}>No detailed instructions available</Text>
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
          <View key={index} style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.instructionText}>
              {instruction.replace(/^Step:\d+\s*/, '')}
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
          <Text style={styles.noDataEmoji}>❓</Text>
          <Text style={styles.noDataText}>No exercise details available</Text>
        </View>
      );
    }

    return (
      <View style={styles.detailsContainer}>
        {/* Target Muscles */}
        {exercise.targetMuscles.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>🎯 Primary Muscles</Text>
            <View style={styles.chipContainer}>
              {exercise.targetMuscles.map((muscle, index) => (
                <View key={index} style={[styles.chip, styles.primaryChip]}>
                  <Text style={styles.primaryChipText}>{muscle}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Secondary Muscles */}
        {exercise.secondaryMuscles?.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>💪 Secondary Muscles</Text>
            <View style={styles.chipContainer}>
              {exercise.secondaryMuscles.map((muscle, index) => (
                <View key={index} style={[styles.chip, styles.secondaryChip]}>
                  <Text style={styles.secondaryChipText}>{muscle}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Equipment */}
        {exercise.equipments.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>🏋️ Equipment Needed</Text>
            <View style={styles.chipContainer}>
              {exercise.equipments.map((equipment, index) => (
                <View key={index} style={[styles.chip, styles.equipmentChip]}>
                  <Text style={styles.equipmentChipText}>{equipment}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Body Parts */}
        {exercise.bodyParts.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>🦴 Body Parts</Text>
            <View style={styles.chipContainer}>
              {exercise.bodyParts.map((bodyPart, index) => (
                <View key={index} style={[styles.chip, styles.bodyPartChip]}>
                  <Text style={styles.bodyPartChipText}>{bodyPart}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Exercise Tips */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>💡 Tips</Text>
          <View style={styles.tipContainer}>
            <Text style={styles.tipText}>
              • Focus on proper form over speed or weight
            </Text>
            <Text style={styles.tipText}>
              • Control the movement throughout the full range of motion
            </Text>
            <Text style={styles.tipText}>
              • Breathe properly - exhale on exertion, inhale on release
            </Text>
            <Text style={styles.tipText}>
              • Stop if you feel pain or discomfort
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
            {activeTab === 'instructions' ? renderInstructions() : renderDetails()}
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
    backgroundColor: THEME.colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
  },

  headerContent: {
    flex: 1,
    marginRight: THEME.spacing.md,
  },

  modalTitle: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  qualityBadge: {
    backgroundColor: THEME.colors.success + '20',
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.sm,
    alignSelf: 'flex-start',
  },

  qualityBadgeText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.success,
    fontWeight: '600',
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeButtonText: {
    fontSize: 18,
    color: THEME.colors.textSecondary,
    fontWeight: 'bold',
  },

  content: {
    flex: 1,
  },

  gifSection: {
    backgroundColor: THEME.colors.backgroundSecondary,
    paddingVertical: THEME.spacing.lg,
    alignItems: 'center',
  },

  modalGif: {
    width: '80%',  // Use percentage instead of screenWidth
    height: 200,
    borderRadius: THEME.borderRadius.lg,
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.xs,
  },

  tab: {
    flex: 1,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
  },

  activeTab: {
    backgroundColor: THEME.colors.primary,
  },

  tabText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },

  activeTabText: {
    color: THEME.colors.surface,
  },

  tabContent: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.lg,
  },

  instructionsContainer: {
    paddingBottom: THEME.spacing.xl,
  },

  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.lg,
  },

  instructionItem: {
    flexDirection: 'row',
    marginBottom: THEME.spacing.md,
    alignItems: 'flex-start',
  },

  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.md,
    marginTop: 2,
  },

  stepNumberText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: 'bold',
    color: THEME.colors.surface,
  },

  instructionText: {
    flex: 1,
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    lineHeight: 22,
  },

  detailsContainer: {
    paddingBottom: THEME.spacing.xl,
  },

  detailSection: {
    marginBottom: THEME.spacing.xl,
  },

  detailSectionTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.sm,
  },

  chip: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.lg,
  },

  primaryChip: {
    backgroundColor: THEME.colors.primary + '20',
  },

  primaryChipText: {
    color: THEME.colors.primary,
    fontSize: THEME.fontSize.sm,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  secondaryChip: {
    backgroundColor: THEME.colors.warning + '20',
  },

  secondaryChipText: {
    color: THEME.colors.warning,
    fontSize: THEME.fontSize.sm,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  equipmentChip: {
    backgroundColor: THEME.colors.info + '20',
  },

  equipmentChipText: {
    color: THEME.colors.info,
    fontSize: THEME.fontSize.sm,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  bodyPartChip: {
    backgroundColor: THEME.colors.success + '20',
  },

  bodyPartChipText: {
    color: THEME.colors.success,
    fontSize: THEME.fontSize.sm,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  tipContainer: {
    backgroundColor: THEME.colors.backgroundSecondary,
    padding: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.lg,
  },

  tipText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
    lineHeight: 20,
    marginBottom: THEME.spacing.sm,
  },

  noDataContainer: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.xl,
  },

  noDataEmoji: {
    fontSize: 48,
    marginBottom: THEME.spacing.md,
  },

  noDataText: {
    fontSize: THEME.fontSize.md,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.sm,
  },

  noDataSubtext: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },

  footer: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
  },

  footerButton: {
    width: '100%',
  },
});