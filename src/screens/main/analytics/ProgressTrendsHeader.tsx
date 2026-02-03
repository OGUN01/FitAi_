import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";

interface ProgressTrendsHeaderProps {
  onBack: () => void;
}

export const ProgressTrendsHeader: React.FC<ProgressTrendsHeaderProps> = ({
  onBack,
}) => {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            haptics.light();
            onBack();
          }}
        >
          <Ionicons
            name="arrow-back"
            size={rf(22)}
            color={ResponsiveTheme.colors.text}
          />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Progress Trends</Text>
          <Text style={styles.headerSubtitle}>
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
    width: rw(40),
    height: rw(40),
    borderRadius: rw(12),
    backgroundColor: ResponsiveTheme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: rw(12),
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: rf(28),
    fontWeight: "bold",
    color: ResponsiveTheme.colors.text,
  },
  headerSubtitle: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rh(4),
  },
});
