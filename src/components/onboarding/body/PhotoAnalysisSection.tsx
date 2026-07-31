/**
 * PhotoAnalysisSection — Body tab collapsed "Progress photos" group
 * (Editorial Dark).
 *
 * Existing capture flow (openPhotoOptions / removePhoto / analyzePhotos) is
 * kept intact — only the presentation is restyled: hairline-outlined capture
 * tiles, an accent text action, and AI results as plain stats over a hairline.
 * Renders flat inside the parent CollapsibleSection.
 */

import React, { type ComponentProps } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../../utils/responsive";
import { Rule } from "../../onboarding/fresh";
import {
  tokens,
  type as freshType,
  font,
  spacing as freshSpacing,
} from "../../onboarding/fresh/tokens";
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

  const hasAi =
    formData.ai_estimated_body_fat != null &&
    formData.ai_estimated_body_fat > 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.count} numberOfLines={1}>
          {photoCount}/3 photos
        </Text>
        {photoCount > 0 && !hasAi && (
          <Pressable
            style={styles.analyzeButton}
            onPress={analyzePhotos}
            accessibilityRole="button"
            accessibilityLabel="Analyze photos"
          >
            <Ionicons name="sparkles" size={rf(14)} color={tokens.accent} />
            <Text style={styles.analyzeText}>
              {isAnalyzingPhotos ? "Analyzing…" : "Analyze"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Trust line — body photos are sensitive; explicit framing lowers
          hesitation without adding a field. Presentation only. */}
      <View style={styles.privacyRow}>
        <Ionicons
          name="shield-checkmark-outline"
          size={13}
          color={tokens.ink3}
        />
        <Text style={styles.privacyText} numberOfLines={2}>
          Optional. Photos stay on this device — we never upload or share them.
        </Text>
      </View>

      {/* Photo capture tiles — hairline outline, transparent, no fill. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photoScroll}
        decelerationRate="fast"
      >
        {PHOTO_TYPES.map((photoType) => {
          const photoUrl = formData[
            `${photoType.type}_photo_url` as keyof BodyAnalysisData
          ] as string;
          const hasPhoto = !!photoUrl;

          return (
            // Plain View wrapper — the remove badge is a SIBLING overlay, not a
            // child of the card Pressable (no nested interactives on web).
            <View key={photoType.type} style={styles.photoCard}>
              <Pressable
                onPress={() => openPhotoOptions(photoType.type)}
                accessibilityRole="button"
                accessibilityLabel={`${photoType.title} photo`}
              >
                <View
                  style={[
                    styles.photoInner,
                    hasPhoto && { borderColor: tokens.accent },
                  ]}
                >
                  {hasPhoto ? (
                    <>
                      <Image
                        source={{ uri: photoUrl }}
                        style={styles.photoThumb}
                      />
                      <View style={styles.photoBadge}>
                        <Ionicons
                          name="checkmark"
                          size={rf(11)}
                          color={tokens.bg}
                        />
                      </View>
                    </>
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Ionicons
                        name={
                          photoType.iconName as ComponentProps<
                            typeof Ionicons
                          >["name"]
                        }
                        size={rf(28)}
                        color={tokens.ink3}
                      />
                      <View style={styles.addBadge}>
                        <Ionicons
                          name="add"
                          size={rf(14)}
                          color={tokens.accent}
                        />
                      </View>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.photoLabel,
                    hasPhoto && { color: tokens.ink },
                  ]}
                  numberOfLines={1}
                >
                  {photoType.title}
                </Text>
                <Text style={styles.photoHint} numberOfLines={1}>
                  {photoType.shortDesc}
                </Text>
              </Pressable>
              {hasPhoto && (
                <Pressable
                  style={styles.removeBtn}
                  onPress={() => removePhoto(photoType.type)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${photoType.title} photo`}
                >
                  <Ionicons name="close" size={rf(12)} color={tokens.ink} />
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* AI results — plain stats over a hairline, no tinted box. */}
      {hasAi ? (
        <View>
          <Rule />
          <View style={styles.aiRow}>
            <View style={styles.aiItem}>
              <Text style={styles.aiLabel}>Body fat</Text>
              <Text style={styles.aiValue}>
                {formData.ai_estimated_body_fat}%
              </Text>
            </View>
            <View style={styles.aiDivider} />
            <View style={styles.aiItem}>
              <Text style={styles.aiLabel}>Body type</Text>
              <Text style={styles.aiValue}>
                {formData.ai_body_type
                  ? formData.ai_body_type.charAt(0).toUpperCase() +
                    formData.ai_body_type.slice(1)
                  : "—"}
              </Text>
            </View>
            <View style={styles.aiDivider} />
            <View style={styles.aiItem}>
              <Text style={styles.aiLabel}>Confidence</Text>
              <Text style={styles.aiValue}>
                {formData.ai_confidence_score}%
              </Text>
            </View>
            <Pressable
              style={styles.reanalyze}
              onPress={analyzePhotos}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Re-analyze photos"
            >
              <Ionicons name="refresh" size={rf(16)} color={tokens.ink2} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: freshSpacing.l,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  count: {
    ...freshType.caption,
    color: tokens.ink2,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: freshSpacing.s,
  },
  privacyText: {
    ...freshType.caption,
    color: tokens.ink3,
    flex: 1,
    lineHeight: 17,
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: freshSpacing.xs,
    paddingVertical: freshSpacing.xs,
  },
  analyzeText: {
    fontFamily: font.semibold,
    fontSize: 14,
    color: tokens.accent,
  },
  photoScroll: {
    gap: freshSpacing.l,
    paddingVertical: freshSpacing.xs,
  },
  photoCard: {
    width: 112,
    alignItems: "center",
  },
  photoInner: {
    width: 112,
    height: 140,
    borderRadius: 16,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: tokens.hairline,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: freshSpacing.s,
    overflow: "hidden",
  },
  photoThumb: {
    width: "100%",
    height: "100%",
  },
  photoBadge: {
    position: "absolute",
    top: freshSpacing.s,
    right: freshSpacing.s,
    width: 20,
    height: 20,
    borderRadius: 9999,
    backgroundColor: tokens.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    position: "absolute",
    top: freshSpacing.s,
    left: freshSpacing.s,
    // 20pt visual + hitSlop 12 on the Pressable = 44pt effective target.
    width: 20,
    height: 20,
    borderRadius: 9999,
    backgroundColor: "rgba(5,5,5,0.6)",
    borderWidth: 1,
    borderColor: tokens.hairline,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    width: "100%",
  },
  addBadge: {
    position: "absolute",
    bottom: freshSpacing.s,
    right: freshSpacing.s,
    width: 22,
    height: 22,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: tokens.hairline,
    backgroundColor: tokens.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  photoLabel: {
    ...freshType.body,
    color: tokens.ink2,
  },
  photoHint: {
    ...freshType.caption,
  },
  aiRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: freshSpacing.l,
  },
  aiItem: {
    alignItems: "center",
    flex: 1,
  },
  aiLabel: {
    ...freshType.caption,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  aiValue: {
    ...freshType.value,
    marginTop: freshSpacing.xs,
  },
  aiDivider: {
    width: 1,
    height: 28,
    backgroundColor: tokens.hairline,
  },
  reanalyze: {
    padding: freshSpacing.xs,
  },
});
