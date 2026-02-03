import React from "react";
import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import { GlassCard, AnimatedPressable } from "../../../components/ui/aurora";
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
              <Ionicons name="sparkles" size={rf(14)} color="#FFFFFF" />
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
                          color="#FFFFFF"
                        />
                      </View>
                      <AnimatedPressable
                        style={styles.removePhotoSmall}
                        onPress={() => removePhoto(photoType.type)}
                        scaleValue={0.9}
                      >
                        <Ionicons name="close" size={rf(14)} color="#FFFFFF" />
                      </AnimatedPressable>
                    </>
                  ) : (
                    <View style={styles.photoPlaceholderCompact}>
                      <Ionicons
                        name={photoType.iconName as any}
                        size={rf(36)}
                        color={ResponsiveTheme.colors.primary}
                      />
                      <View style={styles.addPhotoIcon}>
                        <Ionicons
                          name="add-circle"
                          size={rf(20)}
                          color={ResponsiveTheme.colors.primary}
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
                color={ResponsiveTheme.colors.primary}
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
    marginTop: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.xl,
    marginHorizontal: -ResponsiveTheme.spacing.lg,
  },
  sectionTitlePadded: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  sectionSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: ResponsiveTheme.fontSize.sm * 1.4,
    flexShrink: 1,
  },
  edgeToEdgeContentPadded: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  photoTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  analyzeButtonCompact: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingVertical: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.full,
    gap: 4,
  },
  analyzeButtonText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: "#FFFFFF",
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
  scrollClipContainer: {
    width: "100%",
    overflow: "hidden",
    marginTop: ResponsiveTheme.spacing.sm,
  },
  photoScrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.sm,
    gap: rw(10),
  },
  photoCardCompact: {
    width: rw(100),
    alignItems: "center",
  },
  photoCardCompactInner: {
    width: rw(100),
    height: rw(100),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
  },
  photoCardCompactHasPhoto: {
    borderColor: ResponsiveTheme.colors.primary,
  },
  photoThumbnail: {
    width: "100%",
    height: "100%",
  },
  photoOverlay: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: ResponsiveTheme.colors.success,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  removePhotoSmall: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  photoPlaceholderCompact: {
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoIcon: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: ResponsiveTheme.colors.background,
    borderRadius: 10,
  },
  photoLabelCompact: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: 2,
  },
  photoLabelCompactActive: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
  photoHintCompact: {
    fontSize: rf(9),
    color: ResponsiveTheme.colors.textMuted,
  },
  aiResultsCompact: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: ResponsiveTheme.spacing.sm,
    justifyContent: "space-between",
  },
  aiResultItem: {
    alignItems: "center",
  },
  aiResultLabel: {
    fontSize: rf(9),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: 2,
  },
  aiResultValue: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },
  aiResultDivider: {
    width: 1,
    height: "80%",
    backgroundColor: `${ResponsiveTheme.colors.primary}30`,
  },
  reanalyzeSmall: {
    padding: 4,
  },
  sectionBottomPad: {
    height: ResponsiveTheme.spacing.lg,
  },
});
