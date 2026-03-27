import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, Modal } from "react-native";
import { AuroraSpinner } from "../ui/aurora/AuroraSpinner";
import { ResponsiveTheme } from "../../utils/constants";
import { rf } from "../../utils/responsive";

const CYCLING_TEXTS = [
  "Analyzing your meal...",
  "Identifying foods...",
  "Calculating nutrition...",
  "Estimating portions...",
];

interface FoodScanLoadingOverlayProps {
  visible: boolean;
}

export const FoodScanLoadingOverlay: React.FC<FoodScanLoadingOverlayProps> = ({
  visible,
}) => {
  const [textIndex, setTextIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setTextIndex(0);
      intervalRef.current = setInterval(() => {
        setTextIndex((prev) => (prev + 1) % CYCLING_TEXTS.length);
      }, 2000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <AuroraSpinner size="lg" theme="primary" />
          <Text style={styles.text}>{CYCLING_TEXTS[textIndex]}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.xl,
    paddingVertical: ResponsiveTheme.spacing.xl,
    paddingHorizontal: ResponsiveTheme.spacing.xl * 1.5,
    alignItems: "center",
    gap: ResponsiveTheme.spacing.lg,
    minWidth: 220,
  },
  text: {
    fontSize: rf(15),
    fontWeight: "500",
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
  },
});
