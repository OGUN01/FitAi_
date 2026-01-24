// Achievement Celebration Modal
// Animated celebration when user unlocks achievements

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
} from "react-native";
import { Achievement } from "../../services/achievementEngine";
import useAchievementStore from "../../stores/achievementStore";

interface AchievementCelebrationProps {
  visible: boolean;
  achievement: Achievement | null;
  onClose: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const AchievementCelebration: React.FC<AchievementCelebrationProps> = ({
  visible,
  achievement,
  onClose,
}) => {
  const { markCelebrationShown } = useAchievementStore();

  // Animation values
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Confetti animations
  const confetti = useRef(
    Array.from({ length: 20 }, () => ({
      x: new Animated.Value(Math.random() * screenWidth),
      y: new Animated.Value(-50),
      rotation: new Animated.Value(0),
      scale: new Animated.Value(0.5 + Math.random() * 0.5),
    })),
  ).current;

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dy) > 20;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 0) {
        slideAnim.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dy > 100 || gestureState.vy > 0.8) {
        handleClose();
      } else {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  useEffect(() => {
    if (visible && achievement) {
      // Reset animations
      slideAnim.setValue(screenHeight);
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);

      // Start entrance animations
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseAnimation.start();

      // Start confetti animation
      startConfettiAnimation();

      // Auto close after 5 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);

      return () => {
        clearTimeout(timer);
        pulseAnimation.stop();
      };
    }
  }, [visible, achievement]);

  const startConfettiAnimation = () => {
    confetti.forEach((item, index) => {
      // Reset positions
      item.x.setValue(Math.random() * screenWidth);
      item.y.setValue(-50);
      item.rotation.setValue(0);

      // Animate falling
      Animated.parallel([
        Animated.timing(item.y, {
          toValue: screenHeight + 100,
          duration: 3000 + Math.random() * 2000,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.timing(item.rotation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ),
      ]).start();
    });
  };

  const handleClose = () => {
    if (achievement) {
      markCelebrationShown(achievement.id);
    }

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const getTierColor = (tier: string) => {
    const colors = {
      bronze: "#CD7F32",
      silver: "#C0C0C0",
      gold: "#FFD700",
      platinum: "#E5E4E2",
      diamond: "#B9F2FF",
      legendary: "#FF6B6B",
    };
    return colors[tier as keyof typeof colors] || "#CD7F32";
  };

  const getTierGradient = (tier: string) => {
    const gradients = {
      bronze: "from-orange-300 to-orange-600",
      silver: "from-gray-300 to-gray-600",
      gold: "from-yellow-300 to-yellow-600",
      platinum: "from-gray-200 to-gray-500",
      diamond: "from-cyan-200 to-cyan-500",
      legendary: "from-red-300 to-red-600",
    };
    return (
      gradients[tier as keyof typeof gradients] ||
      "from-orange-300 to-orange-600"
    );
  };

  if (!visible || !achievement) {
    return null;
  }

  const tierColor = getTierColor(achievement.tier);
  const tierGradient = getTierGradient(achievement.tier);
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Confetti */}
        {confetti.map((item, index) => (
          <Animated.View
            key={index}
            style={[
              styles.confetti,
              {
                backgroundColor:
                  index % 3 === 0
                    ? "#FFD700"
                    : index % 3 === 1
                      ? "#FF6B6B"
                      : "#4FC3F7",
                transform: [
                  { translateX: item.x },
                  { translateY: item.y },
                  { scale: item.scale },
                  {
                    rotate: item.rotation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}

        {/* Achievement Modal */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.achievementCard,
              {
                backgroundColor: tierColor,
                transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
              },
            ]}
          >
            {/* Achievement Icon */}
            <View style={styles.iconContainer}>
              <Animated.Text
                style={[
                  styles.achievementIcon,
                  {
                    transform: [{ rotate: spin }],
                  },
                ]}
              >
                {achievement.icon}
              </Animated.Text>

              {/* Tier Badge */}
              <View
                style={[
                  styles.tierBadge,
                  { backgroundColor: tierColor + "40" },
                ]}
              >
                <Text style={[styles.tierText, { color: tierColor }]}>
                  {achievement.tier} Achievement
                </Text>
              </View>
            </View>

            {/* Achievement Details */}
            <View style={styles.detailsContainer}>
              <Text style={styles.celebrationText}>
                🎉 Achievement Unlocked! 🎉
              </Text>

              <Text style={styles.titleText}>{achievement.title}</Text>

              <Text style={styles.descriptionText}>
                {achievement.description}
              </Text>

              {/* Reward */}
              <View style={styles.rewardContainer}>
                <Text style={styles.rewardText}>
                  {achievement.reward.description}
                </Text>
              </View>
            </View>

            {/* Close Button */}
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Awesome! ✨</Text>
            </Pressable>

            {/* Swipe Indicator */}
            <View style={styles.swipeIndicatorContainer}>
              <View style={styles.swipeIndicator} />
              <Text style={styles.swipeText}>Swipe down to close</Text>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  confetti: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  achievementCard: {
    borderRadius: 24,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    maxWidth: 320,
    width: "100%",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  achievementIcon: {
    fontSize: 96,
    marginBottom: 8,
  },
  tierBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  tierText: {
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  detailsContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  celebrationText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 8,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 16,
  },
  rewardContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: 16,
    width: "100%",
  },
  rewardText: {
    color: "white",
    fontWeight: "600",
    textAlign: "center",
  },
  closeButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: "center",
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
  swipeIndicatorContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  swipeIndicator: {
    width: 32,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 2,
  },
  swipeText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    marginTop: 8,
  },
});

export default AchievementCelebration;
