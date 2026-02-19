import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { THEME } from "../../ui";

interface FullscreenModalProps {
  visible: boolean;
  onClose: () => void;
  gifUrl: string;
  displayName: string;
}

export const FullscreenModal: React.FC<FullscreenModalProps> = ({
  visible,
  onClose,
  gifUrl,
  displayName,
}) => {
  const screenDimensions = Dimensions.get("window");
  const modalWidth = screenDimensions.width * 0.9;
  const modalHeight = screenDimensions.height * 0.7;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />
      <View style={styles.fullscreenOverlay}>
        <View style={styles.fullscreenContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.fullscreenTitle}>{displayName}</Text>

          <Image
            source={{ uri: gifUrl }}
            style={[
              styles.fullscreenGif,
              { width: modalWidth, height: modalHeight * 0.8 },
            ]}
            contentFit="contain"
            transition={300}
            cachePolicy="memory-disk"
          />

          <Text style={styles.fullscreenHint}>
            🔍 Maximum quality view • Tap × to close
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },

  fullscreenContainer: {
    alignItems: "center",
    padding: THEME.spacing.lg,
  },

  closeButton: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  closeButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },

  fullscreenTitle: {
    color: "white",
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    textAlign: "center",
    marginBottom: THEME.spacing.lg,
    textTransform: "capitalize",
  },

  fullscreenGif: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },

  fullscreenHint: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: THEME.fontSize.sm,
    textAlign: "center",
    marginTop: THEME.spacing.md,
  },
});
