import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePickerExpo from "expo-image-picker";
import { Button, Card, Modal } from "../ui";
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

  React.useEffect(() => {
    if (!visible) {
      setSelectedImages([]);
    }
  }, [visible]);

  const requestPermissions = async () => {
    const { status } =
      await ImagePickerExpo.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      crossPlatformAlert(
        "Permission Required",
        "Sorry, we need camera roll permissions to select images.",
        [{ text: "OK" }],
      );
      return false;
    }
    return true;
  };

  const pickFromLibrary = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsLoading(true);
    try {
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
      setIsLoading(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePickerExpo.requestCameraPermissionsAsync();
    if (status !== "granted") {
      crossPlatformAlert(
        "Permission Required",
        "Sorry, we need camera permissions to take photos.",
        [{ text: "OK" }],
      );
      return;
    }

    setIsLoading(true);
    try {
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

  return (
    <Modal visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={takePhoto}
              disabled={isLoading || (!canAddMore && mode === "multiple")}
              accessibilityRole="button"
              accessibilityLabel="Take photo"
              accessibilityState={{ disabled: isLoading || (!canAddMore && mode === "multiple") }}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="camera" size={rf(24)} color={colors.primary} />
              </View>
              <Text style={styles.actionText} numberOfLines={1} adjustsFontSizeToFit>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={pickFromLibrary}
              disabled={isLoading || (!canAddMore && mode === "multiple")}
              accessibilityRole="button"
              accessibilityLabel="Choose image from library"
              accessibilityState={{ disabled: isLoading || (!canAddMore && mode === "multiple") }}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="images" size={rf(24)} color={colors.primary} />
              </View>
              <Text style={styles.actionText} numberOfLines={1} adjustsFontSizeToFit>Choose from Library</Text>
            </TouchableOpacity>
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
                    <Image source={{ uri }} style={styles.selectedImage} />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeImage(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove image ${index + 1}`}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close" size={rf(16)} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Tips */}
          <Card style={styles.tipsCard}>
            <View style={styles.tipsTitleRow}>
              <Ionicons name="create-outline" size={rf(16)} color={colors.info} />
              <Text style={styles.tipsTitle} numberOfLines={1}>Tips for better photos:</Text>
            </View>
            <Text style={styles.tipText} numberOfLines={1}>• Use good lighting</Text>
            <Text style={styles.tipText} numberOfLines={1}>• Keep the camera steady</Text>
            <Text style={styles.tipText} numberOfLines={1}>• Fill the frame with your subject</Text>
            <Text style={styles.tipText} numberOfLines={1}>• Avoid shadows and reflections</Text>
          </Card>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          {mode === "multiple" && selectedImages.length > 0 && (
            <Button
              title={`Use ${selectedImages.length} Image${selectedImages.length > 1 ? "s" : ""}`}
              onPress={confirmSelection}
              variant="primary"
              fullWidth
              style={styles.confirmButton}
            />
          )}

          <Button
            title="Cancel"
            onPress={onClose}
            variant="outline"
            fullWidth
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.lg,
  },

  actionButton: {
    alignItems: "center",
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    minWidth: 120,
    minHeight: 44,
    justifyContent: "center",
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

  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
    width: rs(28),
    height: rs(28),
    minHeight: 44,
    minWidth: 44,
    borderRadius: rbr(14),
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
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
  },

  confirmButton: {
    marginBottom: spacing.sm,
  },
});
