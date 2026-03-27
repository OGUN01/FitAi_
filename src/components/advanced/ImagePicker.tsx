import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,

  ScrollView,
  Dimensions,
} from "react-native";
import * as ImagePickerExpo from "expo-image-picker";
import { Button, Card, Modal } from "../ui";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rs, rbr } from '../../utils/responsive';
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";

const { width: screenWidth } = Dimensions.get("window");

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
        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={takePhoto}
            disabled={isLoading || (!canAddMore && mode === "multiple")}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionEmoji}>📷</Text>
            </View>
            <Text style={styles.actionText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={pickFromLibrary}
            disabled={isLoading || (!canAddMore && mode === "multiple")}
            accessibilityRole="button"
            accessibilityLabel="Choose image from library"
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionEmoji}>🖼️</Text>
            </View>
            <Text style={styles.actionText}>Choose from Library</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Images (Multiple Mode) */}
        {mode === "multiple" && selectedImages.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={styles.selectedTitle}>
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
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>📝 Tips for better photos:</Text>
          <Text style={styles.tipText}>• Use good lighting</Text>
          <Text style={styles.tipText}>• Keep the camera steady</Text>
          <Text style={styles.tipText}>• Fill the frame with your subject</Text>
          <Text style={styles.tipText}>• Avoid shadows and reflections</Text>
        </Card>

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

  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  actionButton: {
    alignItems: "center",
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.surface,
    minWidth: 120,
    minHeight: 44,
    justifyContent: "center",
  },

  actionIcon: {
    width: rs(60),
    height: rs(60),
    borderRadius: rbr(30),
    backgroundColor: ResponsiveTheme.colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  actionEmoji: {
    fontSize: rf(24),
  },

  actionText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium as "500",
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
  },

  selectedSection: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  selectedTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold as "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  selectedImagesContainer: {
    flexDirection: "row",
  },

  selectedImageContainer: {
    position: "relative",
    marginRight: ResponsiveTheme.spacing.sm,
  },

  selectedImage: {
    width: rs(80),
    height: rs(80),
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
    width: Math.max(rs(24), 44),
    height: Math.max(rs(24), 44),
    borderRadius: Math.max(rbr(12), 22),
    backgroundColor: ResponsiveTheme.colors.error,
    alignItems: "center",
    justifyContent: "center",
  },

  removeButtonText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.bold as "700",
  },

  tipsCard: {
    marginBottom: ResponsiveTheme.spacing.lg,
    backgroundColor: ResponsiveTheme.colors.info + "10",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.info + "30",
  },

  tipsTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold as "600",
    color: ResponsiveTheme.colors.info,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  tipText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs / 2,
  },

  bottomActions: {
    gap: ResponsiveTheme.spacing.sm,
  },

  confirmButton: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },
});
