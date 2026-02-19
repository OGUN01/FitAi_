import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../ui";

interface CameraOverlayProps {
  mode: "food" | "progress" | "barcode";
  isScanning?: boolean;
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({
  mode,
  isScanning = false,
}) => {
  return (
    <View style={styles.overlay}>
      {mode === "food" && (
        <View style={styles.foodFrame}>
          <View style={styles.frameCorner} />
          <View style={[styles.frameCorner, styles.frameCornerTopRight]} />
          <View style={[styles.frameCorner, styles.frameCornerBottomLeft]} />
          <View style={[styles.frameCorner, styles.frameCornerBottomRight]} />
        </View>
      )}

      {mode === "progress" && (
        <View style={styles.progressFrame}>
          <View style={styles.bodyOutline} />
        </View>
      )}

      {mode === "barcode" && (
        <View style={styles.barcodeFrame}>
          <View style={styles.scanningArea}>
            <View style={styles.scanningLine} />
            {isScanning && (
              <View style={styles.scanningIndicator}>
                <Text style={styles.scanningText}>✓ Scanning...</Text>
              </View>
            )}
          </View>
          <View style={styles.barcodeCorner} />
          <View style={[styles.barcodeCorner, styles.barcodeCornerTopRight]} />
          <View
            style={[styles.barcodeCorner, styles.barcodeCornerBottomLeft]}
          />
          <View
            style={[styles.barcodeCorner, styles.barcodeCornerBottomRight]}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  foodFrame: {
    width: 250,
    height: 250,
    position: "relative",
  },

  frameCorner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: THEME.colors.primary,
    top: 0,
    left: 0,
  },

  frameCornerTopRight: {
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 0,
    top: 0,
    right: 0,
    left: "auto",
  },

  frameCornerBottomLeft: {
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 0,
    bottom: 0,
    top: "auto",
    left: 0,
  },

  frameCornerBottomRight: {
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    bottom: 0,
    right: 0,
    top: "auto",
    left: "auto",
  },

  progressFrame: {
    width: 200,
    height: 400,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  bodyOutline: {
    width: 150,
    height: 350,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    borderRadius: 75,
    borderStyle: "dashed",
  },

  barcodeFrame: {
    width: 280,
    height: 160,
    position: "relative",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  scanningArea: {
    width: "100%",
    height: "100%",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: "rgba(0,0,0,0.1)",
  },

  scanningLine: {
    width: "90%",
    height: 2,
    backgroundColor: THEME.colors.primary,
    opacity: 0.7,
  },

  scanningIndicator: {
    position: "absolute",
    top: -30,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.sm,
  },

  scanningText: {
    color: THEME.colors.white,
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium as "500",
  },

  barcodeCorner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: THEME.colors.primary,
    top: -2,
    left: -2,
  },

  barcodeCornerTopRight: {
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 0,
    top: -2,
    right: -2,
    left: "auto",
  },

  barcodeCornerBottomLeft: {
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 0,
    bottom: -2,
    top: "auto",
    left: -2,
  },

  barcodeCornerBottomRight: {
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    bottom: -2,
    right: -2,
    top: "auto",
    left: "auto",
  },
});
