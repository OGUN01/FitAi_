import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rf, rp, rbr, rs, dimensions } from "../../../utils/responsive";

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
  // Clamp to the phone-sized viewport caps (480x900) so on web/desktop the GIF
  // doesn't balloon to the full browser window. The comment in the previous
  // version claimed this was already happening via `dimensions`, but
  // `dimensions.screenWidth/screenHeight` returned the raw screen size —
  // Math.min enforces the cap explicitly here.
  const modalWidth = Math.min(dimensions.screenWidth, 480) * 0.9;
  const modalHeight = Math.min(dimensions.screenHeight, 900) * 0.7;

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
            <Ionicons name="close" size={rf(20)} color="white" />
          </TouchableOpacity>

          <Text
            style={styles.fullscreenTitle}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {displayName}
          </Text>

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
    padding: spacing.lg,
  },

  closeButton: {
    position: "absolute",
    top: rp(20),
    right: rp(20),
    zIndex: 10,
    elevation: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: Math.max(rbr(20), 22),
    width: Math.max(rs(40), 44),
    height: Math.max(rs(40), 44),
    justifyContent: "center",
    alignItems: "center",
  },

  fullscreenTitle: {
    color: "white",
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    textAlign: "center",
    marginBottom: spacing.lg,
    textTransform: "capitalize",
  },

  fullscreenGif: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
});
