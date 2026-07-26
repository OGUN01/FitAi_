import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors } from "../../../theme/aurora-tokens";
import { rf, rw, rh, rbr } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";

interface ProgressTrendsHeaderProps {
  onBack: () => void;
}

export const ProgressTrendsHeader: React.FC<ProgressTrendsHeaderProps> = ({
  onBack,
}) => {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
      <View style={styles.headerRow}>
        <AnimatedPressable
          style={styles.backButton}
          onPress={() => {
            haptics.light();
            onBack();
          }}
          scaleValue={0.9}
          hapticFeedback={false}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="chevron-back"
            size={rf(20)}
            color={colors.text}
          />
        </AnimatedPressable>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>Progress Trends</Text>
          <Text style={styles.headerSubtitle} numberOfLines={2}>
            Track your fitness journey over time
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: rw(20),
    paddingTop: rh(10),
    paddingBottom: rh(15),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: Math.max(rw(40), 44),
    height: Math.max(rw(40), 44),
    borderRadius: rbr(20),
    backgroundColor: colors.glassBorder,
    justifyContent: "center",
    alignItems: "center",
    marginRight: rw(12),
  },
  headerTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: rf(28),
    fontWeight: "bold",
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: rf(14),
    color: colors.textSecondary,
    marginTop: rh(4),
  },
});
