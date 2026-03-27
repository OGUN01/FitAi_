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
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rp, rbr, rs } from "../../../utils/responsive";

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
      <StatusBar barStyle="light-content" />
      <View style={styles.fullscreenOverlay}>
        <View style={styles.fullscreenContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Close ${displayName} fullscreen view`}
          >
            <Text style={styles.closeButtonText}>X</Text>
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
            Maximum quality view - tap X to close
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
    padding: ResponsiveTheme.spacing.lg,
  },

  closeButton: {
    position: "absolute",
    top: rp(20),
    right: rp(20),
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: Math.max(rbr(20), 22),
    width: Math.max(rs(40), 44),
    height: Math.max(rs(40), 44),
    justifyContent: "center",
    alignItems: "center",
  },

  closeButtonText: {
    color: "white",
    fontSize: rf(20),
    fontWeight: "bold",
  },

  fullscreenTitle: {
    color: "white",
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
    textTransform: "capitalize",
  },

  fullscreenGif: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: ResponsiveTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },

  fullscreenHint: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: ResponsiveTheme.fontSize.sm,
    textAlign: "center",
    marginTop: ResponsiveTheme.spacing.md,
  },
});
