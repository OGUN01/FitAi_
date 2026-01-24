import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";

export interface FeatureItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  selected?: boolean;
}

interface FeatureGridProps {
  items: FeatureItem[];
  onItemPress?: (id: string) => void;
  columns?: number;
  animated?: boolean;
  selectable?: boolean;
  style?: ViewStyle;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const FeatureGridItem: React.FC<{
  item: FeatureItem;
  onPress?: (id: string) => void;
  index: number;
  animated: boolean;
  selectable: boolean;
}> = ({ item, onPress, index, animated, selectable }) => {
  const scale = useSharedValue(0);
  const bounce = useSharedValue(1);

  React.useEffect(() => {
    if (animated) {
      scale.value = withDelay(
        index * 50,
        withSpring(1, {
          damping: 15,
          stiffness: 150,
        }),
      );
    } else {
      scale.value = 1;
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { scale: bounce.value }],
  }));

  const handlePress = () => {
    if (onPress) {
      // Bounce animation on press
      bounce.value = withSequence(
        withSpring(0.9, { damping: 10, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 300 }),
      );
      onPress(item.id);
    }
  };

  return (
    <AnimatedTouchable
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={!onPress}
      style={[styles.itemContainer, animatedStyle]}
    >
      <LinearGradient
        colors={
          selectable && item.selected
            ? [
                ResponsiveTheme.colors.primary,
                ResponsiveTheme.colors.primaryDark,
              ]
            : [
                ResponsiveTheme.colors.backgroundSecondary,
                ResponsiveTheme.colors.backgroundTertiary,
              ]
        }
        style={styles.itemGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {item.icon && <View style={styles.iconContainer}>{item.icon}</View>}
        <Text
          style={[
            styles.label,
            selectable && item.selected && styles.labelSelected,
          ]}
          numberOfLines={2}
        >
          {item.label}
        </Text>
      </LinearGradient>

      {/* Selection Indicator */}
      {selectable && item.selected && (
        <View style={styles.selectionIndicator}>
          <LinearGradient
            colors={["#4CAF50", "#45A049"]}
            style={styles.selectionIndicatorGradient}
          >
            <Ionicons name="checkmark" size={rf(14)} color="#FFFFFF" />
          </LinearGradient>
        </View>
      )}
    </AnimatedTouchable>
  );
};

export const FeatureGrid: React.FC<FeatureGridProps> = ({
  items,
  onItemPress,
  columns = 3,
  animated = true,
  selectable = false,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.grid, { gap: ResponsiveTheme.spacing.md }]}>
        {items.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.gridItem,
              {
                flex: columns === 2 ? 1 : undefined,
                minWidth:
                  columns === 2 ? "45%" : `${Math.floor(100 / columns) - 2}%`,
                maxWidth:
                  columns === 2 ? "48%" : `${Math.floor(100 / columns)}%`,
              },
            ]}
          >
            <FeatureGridItem
              item={item}
              onPress={onItemPress}
              index={index}
              animated={animated}
              selectable={selectable}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  gridItem: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  itemContainer: {
    position: "relative",
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  itemGradient: {
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: ResponsiveTheme.borderRadius.lg,
  },

  iconContainer: {
    marginBottom: ResponsiveTheme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    lineHeight: ResponsiveTheme.fontSize.sm * 1.15,
    flexShrink: 1,
  },

  labelSelected: {
    color: ResponsiveTheme.colors.white,
  },

  selectionIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  selectionIndicatorGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  checkmark: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
    lineHeight: ResponsiveTheme.fontSize.sm * 1.15,
  },
});
