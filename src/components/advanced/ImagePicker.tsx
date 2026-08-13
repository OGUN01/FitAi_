import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePickerExpo from "expo-image-picker";
import { BottomSheet } from "../ui/aurora/BottomSheet";
import { GlassCard } from "../ui/aurora/GlassCard";
import { GlassButton } from "../ui/aurora/GlassButton";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rf, rs, rbr } from '../../utils/responsive';
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { hexToRgba, TINT_ALPHA_LOW, TINT_ALPHA_SOFT, TINT_ALPHA_MEDIUM } from "../../utils/colors";

interface ImagePickerProps {
  mode: "single" | "multiple";
  maxImages?: number;
  onImagesSelected: (uris: string[]) => void;
  onClose: () => void;
  visible: boolean;
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({
  mode = "single",
  maxImages = 5,
  onImagesSelected,
  onClose,
  visible,
  allowsEditing = true,
  aspect = [1, 1],
  quality = 0.8,
}) => {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const actionInFlightRef = React.useRef(false);

  React.useEffect(() => {
    if (!visible) {
      setSelectedImages([]);
      actionInFlightRef.current = false;
      setIsLoading(false);
    }
  }, [visible]);

  const showPermissionRecovery = (
    source: "camera" | "photo library",
    canAskAgain: boolean,
  ) => {
    const message = `FitAI needs ${source} access to add photos.`;
    if (canAskAgain) {
      crossPlatformAlert("Permission Required", message, [{ text: "OK" }]);
      return;
    }

    crossPlatformAlert(
      "Permission Blocked",
      `${message} You can enable it in your device settings.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => {
            Linking.openSettings().catch(() =>
              crossPlatformAlert(
                "Unable to Open Settings",
                "Open your device settings and allow FitAI to access your photos and camera.",
              ),
            );
          },
        },
      ],
    );
  };

  const pickFromLibrary = async () => {
    if (actionInFlightRef.current) return;
    actionInFlightRef.current = true;

    setIsLoading(true);
    try {
      const permission =
        await ImagePickerExpo.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        showPermissionRecovery("photo library", permission.canAskAgain);
        return;
      }

      const result = await ImagePickerExpo.launchImageLibraryAsync({
        mediaTypes: ImagePickerExpo.MediaTypeOptions.Images,
        allowsEditing,
        aspect,
        quality,
        allowsMultipleSelection: mode === "multiple",
        selectionLimit: mode === "multiple" ? maxImages : 1,
      });

      if (!result.canceled) {
        const uris = result.assets.map((asset) => asset.uri);
        if (mode === "single") {
          onImagesSelected(uris);
          onClose();
        } else {
          setSelectedImages((prev) => {
            const newImages = [...prev, ...uris];
            return newImages.slice(0, maxImages);
          });
        }
      }
    } catch (error) {
      crossPlatformAlert("Error", "Failed to pick image from library");
    } finally {
      actionInFlightRef.current = false;
      setIsLoading(false);
    }
  };

  const takePhoto = async () => {
    if (actionInFlightRef.current) return;
    actionInFlightRef.current = true;

    setIsLoading(true);
    try {
      const permission = await ImagePickerExpo.requestCameraPermissionsAsync();
      if (permission.status !== "granted") {
        showPermissionRecovery("camera", permission.canAskAgain);
        return;
      }

      const result = await ImagePickerExpo.launchCameraAsync({
        allowsEditing,
        aspect,
        quality,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        if (mode === "single") {
          onImagesSelected([uri]);
          onClose();
        } else {
          setSelectedImages((prev) => {
            const newImages = [...prev, uri];
            return newImages.slice(0, maxImages);
          });
        }
      }
    } catch (error) {
      crossPlatformAlert("Error", "Failed to take photo");
    } finally {
      actionInFlightRef.current = false;
      setIsLoading(false);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const confirmSelection = () => {
    onImagesSelected(selectedImages);
    onClose();
  };

  const canAddMore = selectedImages.length < maxImages;
  const actionsDisabled = isLoading || (!canAddMore && mode === "multiple");

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Add Photo"
      testID="image-picker-sheet"
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Action Tiles */}
        <View style={styles.actionsContainer}>
          <AnimatedPressable
            onPress={takePhoto}
            disabled={actionsDisabled}
            scaleValue={0.97}
            springConfig="smooth"
            hapticType="light"
            accessibilityLabel="Take photo"
            accessibilityHint="Opens the camera to take a new photo"
            containerStyle={styles.actionTile}
            style={styles.actionPressable}
          >
            <GlassCard padding="md" borderRadius="lg" style={actionsDisabled ? styles.actionTileDisabled : undefined}>
              <View style={styles.actionTileContent}>
                <View style={styles.actionIcon}>
                  <Ionicons name="camera" size={rf(24)} color={colors.primary} />
                </View>
                <Text style={styles.actionText} numberOfLines={1} adjustsFontSizeToFit>Take Photo</Text>
              </View>
            </GlassCard>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={pickFromLibrary}
            disabled={actionsDisabled}
            scaleValue={0.97}
            springConfig="smooth"
            hapticType="light"
            accessibilityLabel="Choose image from library"
            accessibilityHint="Opens the photo library to choose an image"
            containerStyle={styles.actionTile}
            style={styles.actionPressable}
          >
            <GlassCard padding="md" borderRadius="lg" style={actionsDisabled ? styles.actionTileDisabled : undefined}>
              <View style={styles.actionTileContent}>
                <View style={styles.actionIcon}>
                  <Ionicons name="images" size={rf(24)} color={colors.primary} />
                </View>
                <Text style={styles.actionText} numberOfLines={1} adjustsFontSizeToFit>Choose from Library</Text>
              </View>
            </GlassCard>
          </AnimatedPressable>
        </View>

        {/* Selected Images (Multiple Mode) */}
        {mode === "multiple" && selectedImages.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={styles.selectedTitle} numberOfLines={1} adjustsFontSizeToFit>
              Selected Images ({selectedImages.length}/{maxImages})
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.selectedImagesContainer}
            >
              {selectedImages.map((uri, index) => (
                <View key={index} style={styles.selectedImageContainer}>
                  <Image
                    source={{ uri }}
                    style={styles.selectedImage}
                    resizeMode="cover"
                  />
                  <AnimatedPressable
                    onPress={() => removeImage(index)}
                    scaleValue={0.9}
                    springConfig="snappy"
                    hapticType="light"
                    accessibilityLabel={`Remove image ${index + 1}`}
                    containerStyle={styles.removeButtonWrapper}
                    style={styles.removeButtonPressable}
                  >
                    <View style={styles.removeButtonCard}>
                      <Ionicons name="close" size={rf(16)} color={colors.white} />
                    </View>
                  </AnimatedPressable>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Tips */}
        <GlassCard style={styles.tipsCard} padding="md" borderRadius="lg">
          <View style={styles.tipsTitleRow}>
            <Ionicons name="create-outline" size={rf(16)} color={colors.info} />
            <Text style={styles.tipsTitle} numberOfLines={1}>Tips for better photos:</Text>
          </View>
          <Text style={styles.tipText} numberOfLines={1}>• Use good lighting</Text>
          <Text style={styles.tipText} numberOfLines={1}>• Keep the camera steady</Text>
          <Text style={styles.tipText} numberOfLines={1}>• Fill the frame with your subject</Text>
          <Text style={styles.tipText} numberOfLines={1}>• Avoid shadows and reflections</Text>
        </GlassCard>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {mode === "multiple" && selectedImages.length > 0 && (
          <GlassButton
            label={`Use ${selectedImages.length} Image${selectedImages.length > 1 ? "s" : ""}`}
            onPress={confirmSelection}
            variant="primary"
            fullWidth
            disabled={isLoading}
            style={styles.confirmButton}
          />
        )}

        <GlassButton
          label="Cancel"
          onPress={onClose}
          variant="secondary"
          fullWidth
        />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
  },

  actionsContainer: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  actionTile: {
    flex: 1,
  },

  // Applied directly to the accessible Pressable (not the GlassCard visual
  // layer) so the 44pt touch-target floor lives on the actual a11y element.
  actionPressable: {
    minHeight: 44,
  },

  actionTileContent: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },

  actionTileDisabled: {
    opacity: 0.5,
  },

  actionIcon: {
    width: rs(60),
    height: rs(60),
    borderRadius: rbr(30),
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_SOFT),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },

  actionText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium as "500",
    color: colors.text,
    textAlign: "center",
  },

  selectedSection: {
    marginBottom: spacing.lg,
  },

  selectedTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold as "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },

  selectedImagesContainer: {
    flexDirection: "row",
  },

  selectedImageContainer: {
    position: "relative",
    marginRight: spacing.sm,
  },

  selectedImage: {
    width: rs(80),
    height: rs(80),
    borderRadius: borderRadius.md,
  },

  removeButtonWrapper: {
    position: "absolute",
    top: -8,
    right: -8,
  },

  // 44pt floor on the actual Pressable; the visible GlassCard chip stays a
  // compact 28x28 so it doesn't visually dominate the thumbnail.
  removeButtonPressable: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  removeButtonCard: {
    width: rs(28),
    height: rs(28),
    borderRadius: rbr(14),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: hexToRgba(colors.error, 0.85),
  },

  tipsCard: {
    marginBottom: spacing.lg,
    backgroundColor: hexToRgba(colors.info, TINT_ALPHA_LOW + 0.05),
    borderWidth: 1,
    borderColor: hexToRgba(colors.info, TINT_ALPHA_MEDIUM + 0.1),
  },

  tipsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },

  tipsTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold as "600",
    color: colors.info,
  },

  tipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },

  bottomActions: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },

  confirmButton: {
    marginBottom: spacing.sm,
  },
});
