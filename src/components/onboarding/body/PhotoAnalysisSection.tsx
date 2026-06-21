import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import React, { type ComponentProps } from "react";
import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw, rp, rbr } from "../../../utils/responsive";import { GlassCard, AnimatedPressable } from "../../../components/ui/aurora";
import { PHOTO_TYPES } from "../../../screens/onboarding/tabs/BodyAnalysisConstants";
import { BodyAnalysisData } from "../../../types/onboarding";

interface PhotoAnalysisSectionProps {
  formData: BodyAnalysisData;
  openPhotoOptions: (photoType: "front" | "side" | "back") => void;
  removePhoto: (photoType: "front" | "side" | "back") => void;
  analyzePhotos: () => void;
  isAnalyzingPhotos: boolean;
}

export const PhotoAnalysisSection: React.FC<PhotoAnalysisSectionProps> = ({
  formData,
  openPhotoOptions,
  removePhoto,
  analyzePhotos,
  isAnalyzingPhotos,
}) => {
  const photoCount = [
    formData.front_photo_url,
    formData.side_photo_url,
    formData.back_photo_url,
  ].filter(Boolean).length;

  return (
    <GlassCard
      style={styles.sectionEdgeToEdge}
      elevation={2}
      blurIntensity="default"
      padding="none"
      borderRadius="none"
    >
      <View style={styles.sectionTitlePadded}>
        <View style={styles.photoTitleRow}>
          <View>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              📸 Photo Analysis
            </Text>
            <Text style={styles.sectionSubtitle} numberOfLines={1}>
              AI-powered • {photoCount}/3 photos added
            </Text>
          </View>
          {photoCount > 0 && !formData.ai_estimated_body_fat && (
            <AnimatedPressable
              style={styles.analyzeButtonCompact}
              onPress={analyzePhotos}
              scaleValue={0.95}
            >
              <Ionicons name="sparkles" size={rf(14)} color={colors.white} />
              <Text style={styles.analyzeButtonText}>
                {isAnalyzingPhotos ? "Analyzing..." : "Analyze"}
              </Text>
            </AnimatedPressable>
          )}
        </View>
      </View>

      {/* Horizontal scrollable photo cards */}
      <View style={styles.scrollClipContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoScrollContent}
          decelerationRate="fast"
        >
          {PHOTO_TYPES.map((photoType) => {
            const photoUrl = formData[
              `${photoType.type}_photo_url` as keyof BodyAnalysisData
            ] as string;
            const hasPhoto = !!photoUrl;

            return (
              <AnimatedPressable
                key={photoType.type}
                style={styles.photoCardCompact}
                onPress={() => openPhotoOptions(photoType.type)}
                scaleValue={0.96}
              >
                <View
                  style={[
                    styles.photoCardCompactInner,
                    hasPhoto && styles.photoCardCompactHasPhoto,
                  ]}
                >
                  {hasPhoto ? (
                    <>
                      <Image
                        source={{ uri: photoUrl }}
                        style={styles.photoThumbnail}
                      />
                      <View style={styles.photoOverlay}>
                        <Ionicons
                          name="checkmark"
                          size={rf(14)}
                          color={colors.white}
                        />
                      </View>
                      <AnimatedPressable
                        style={styles.removePhotoSmall}
                        onPress={() => removePhoto(photoType.type)}
                        scaleValue={0.9}
                      >
                        <Ionicons name="close" size={rf(14)} color={colors.white} />
                      </AnimatedPressable>
                    </>
                  ) : (
                    <View style={styles.photoPlaceholderCompact}>
                      <Ionicons
                        name={photoType.iconName as ComponentProps<typeof Ionicons>['name']}
                        size={rf(36)}
                        color={colors.primary}
                      />
                      <View style={styles.addPhotoIcon}>
                        <Ionicons
                          name="add-circle"
                          size={rf(20)}
                          color={colors.primary}
                        />
                      </View>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.photoLabelCompact,
                    hasPhoto && styles.photoLabelCompactActive,
                  ]}
                  numberOfLines={1}
                >
                  {photoType.title}
                </Text>
                <Text style={styles.photoHintCompact} numberOfLines={1}>
                  {photoType.shortDesc}
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>

      {/* AI Analysis Results - Compact inline display */}
      {formData.ai_estimated_body_fat != null &&
      formData.ai_estimated_body_fat > 0 ? (
        <View style={styles.edgeToEdgeContentPadded}>
          <View style={styles.aiResultsCompact}>
            <View style={styles.aiResultItem}>
              <Text style={styles.aiResultLabel}>Body Fat</Text>
              <Text style={styles.aiResultValue}>
                {formData.ai_estimated_body_fat}%
              </Text>
            </View>
            <View style={styles.aiResultDivider} />
            <View style={styles.aiResultItem}>
              <Text style={styles.aiResultLabel}>Body Type</Text>
              <Text style={styles.aiResultValue}>
                {formData.ai_body_type
                  ? formData.ai_body_type.charAt(0).toUpperCase() +
                    formData.ai_body_type.slice(1)
                  : "-"}
              </Text>
            </View>
            <View style={styles.aiResultDivider} />
            <View style={styles.aiResultItem}>
              <Text style={styles.aiResultLabel}>Confidence</Text>
              <Text style={styles.aiResultValue}>
                {formData.ai_confidence_score}%
              </Text>
            </View>
            <AnimatedPressable
              style={styles.reanalyzeSmall}
              onPress={analyzePhotos}
              scaleValue={0.9}
            >
              <Ionicons
                name="refresh"
                size={rf(16)}
                color={colors.primary}
              />
            </AnimatedPressable>
          </View>
        </View>
      ) : null}

      <View style={styles.sectionBottomPad} />
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  sectionEdgeToEdge: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    marginHorizontal: -spacing.lg,
  },
  sectionTitlePadded: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: fontSize.sm * 1.4,
    flexShrink: 1,
  },
  edgeToEdgeContentPadded: {
    paddingHorizontal: spacing.lg,
  },
  photoTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  analyzeButtonCompact: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    gap: rp(4),
  },
  analyzeButtonText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  scrollClipContainer: {
    width: "100%",
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  photoScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: rw(10),
  },
  photoCardCompact: {
    width: rw(100),
    alignItems: "center",
  },
  photoCardCompactInner: {
    width: rw(100),
    height: rw(100),
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
  },
  photoCardCompactHasPhoto: {
    borderColor: colors.primary,
  },
  photoThumbnail: {
    width: "100%",
    height: "100%",
  },
  photoOverlay: {
    position: "absolute",
    top: rp(4),
    right: rp(4),
    backgroundColor: colors.success,
    width: rp(20),
    height: rp(20),
    borderRadius: rbr(10),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.white,
  },
  removePhotoSmall: {
    position: "absolute",
    top: rp(4),
    left: rp(4),
    backgroundColor: colors.overlay,
    width: rp(20),
    height: rp(20),
    borderRadius: rbr(10),
    justifyContent: "center",
    alignItems: "center",
  },
  photoPlaceholderCompact: {
    flex: 1,
    width: '100%',
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoIcon: {
    position: "absolute",
    bottom: rp(-4),
    right: rp(-4),
    backgroundColor: colors.background,
    borderRadius: rbr(10),
  },
  photoLabelCompact: {
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: rp(2),
  },
  photoLabelCompactActive: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  photoHintCompact: {
    fontSize: rf(9),
    color: colors.textMuted,
  },
  aiResultsCompact: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.primary}10`,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    justifyContent: "space-between",
  },
  aiResultItem: {
    alignItems: "center",
  },
  aiResultLabel: {
    fontSize: rf(9),
    color: colors.textSecondary,
    marginBottom: rp(2),
  },
  aiResultValue: {
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  aiResultDivider: {
    width: rp(1),
    height: "80%",
    backgroundColor: `${colors.primary}30`,
  },
  reanalyzeSmall: {
    padding: rp(4),
  },
  sectionBottomPad: {
    height: spacing.lg,
  },
});
