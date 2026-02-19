import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf } from "../../../utils/responsive";

export const AnimatedCheckmark: React.FC = () => {
  const scale = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          tension: 50,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View
      style={[
        styles.checkmarkContainer,
        {
          transform: [
            { scale },
            {
              rotate: rotation.interpolate({
                inputRange: [0, 1],
                outputRange: ["-180deg", "0deg"],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={["#10b981", "#059669"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.checkmarkGradient}
      >
        <Ionicons name="checkmark" size={rf(48)} color="#fff" />
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  checkmarkContainer: {
    alignSelf: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  checkmarkGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
});
