import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Dimensions,
} from "react-native";
import * as ImagePickerExpo from "expo-image-picker";
import { Button, Card, Modal, THEME } from "../ui";

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
      Alert.alert(
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
      Alert.alert("Error", "Failed to pick image from library");
    } finally {
      setIsLoading(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePickerExpo.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
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
      Alert.alert("Error", "Failed to take photo");
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
    marginBottom: THEME.spacing.lg,
  },

  actionButton: {
    alignItems: "center",
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.surface,
    minWidth: 120,
  },

  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: THEME.spacing.sm,
  },

  actionEmoji: {
    fontSize: 24,
  },

  actionText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium as "500",
    color: THEME.colors.text,
    textAlign: "center",
  },

  selectedSection: {
    marginBottom: THEME.spacing.lg,
  },

  selectedTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold as "600",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  selectedImagesContainer: {
    flexDirection: "row",
  },

  selectedImageContainer: {
    position: "relative",
    marginRight: THEME.spacing.sm,
  },

  selectedImage: {
    width: 80,
    height: 80,
    borderRadius: THEME.borderRadius.md,
  },

  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.colors.error,
    alignItems: "center",
    justifyContent: "center",
  },

  removeButtonText: {
    fontSize: 12,
    color: THEME.colors.white,
    fontWeight: THEME.fontWeight.bold as "700",
  },

  tipsCard: {
    marginBottom: THEME.spacing.lg,
    backgroundColor: THEME.colors.info + "10",
    borderWidth: 1,
    borderColor: THEME.colors.info + "30",
  },

  tipsTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold as "600",
    color: THEME.colors.info,
    marginBottom: THEME.spacing.sm,
  },

  tipText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.xs / 2,
  },

  bottomActions: {
    gap: THEME.spacing.sm,
  },

  confirmButton: {
    marginBottom: THEME.spacing.sm,
  },
});
