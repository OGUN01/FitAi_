import React, { useState, useRef } from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Vibration,
  Dimensions,
  StyleProp,
  ViewStyle,
} from "react-native";
import { ResponsiveTheme } from "../../utils/constants";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface LongPressMenuProps {
  children: React.ReactNode;
  menuItems: MenuItem[];
  hapticFeedback?: boolean;
  longPressDuration?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const LongPressMenu: React.FC<LongPressMenuProps> = ({
  children,
  menuItems,
  hapticFeedback = true,
  longPressDuration = 500,
  disabled = false,
  style,
}) => {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const scaleValue = useRef(new Animated.Value(1)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const menuScale = useRef(new Animated.Value(0.8)).current;
  const touchPosition = useRef({ x: 0, y: 0 });

  const handlePressIn = (event: any) => {
    if (disabled) return;

    const { pageX, pageY } = event.nativeEvent;
    touchPosition.current = { x: pageX, y: pageY };

    // Start scale animation
    Animated.timing(scaleValue, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();

    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      if (hapticFeedback) {
        Vibration.vibrate(50);
      }
      showMenu();
    }, longPressDuration);
  };

  const handlePressOut = () => {
    if (disabled) return;

    // Clear timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Reset scale
    Animated.timing(scaleValue, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const showMenu = () => {
    const { x, y } = touchPosition.current;

    // Calculate menu position to keep it on screen
    const menuWidth = 200;
    const menuHeight = menuItems.length * 50 + 20;

    let adjustedX = x - menuWidth / 2;
    let adjustedY = y - menuHeight - 10;

    // Keep menu within screen bounds
    if (adjustedX < 10) adjustedX = 10;
    if (adjustedX + menuWidth > screenWidth - 10)
      adjustedX = screenWidth - menuWidth - 10;
    if (adjustedY < 50) adjustedY = y + 10;

    setMenuPosition({ x: adjustedX, y: adjustedY });
    setIsMenuVisible(true);

    // Animate menu appearance
    Animated.parallel([
      Animated.timing(menuOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(menuScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideMenu = () => {
    Animated.parallel([
      Animated.timing(menuOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(menuScale, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsMenuVisible(false);
    });
  };

  const handleMenuItemPress = (item: MenuItem) => {
    if (item.disabled) return;

    if (hapticFeedback) {
      Vibration.vibrate(20);
    }

    hideMenu();

    // Delay the action slightly to allow menu to close
    setTimeout(() => {
      item.onPress();
    }, 100);
  };

  return (
    <>
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleValue }],
          },
        ]}
        onTouchStart={handlePressIn}
        onTouchEnd={handlePressOut}
        onTouchCancel={handlePressOut}
      >
        {children}
      </Animated.View>

      <Modal
        visible={isMenuVisible}
        transparent
        animationType="none"
        onRequestClose={hideMenu}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={hideMenu}
        >
          <Animated.View
            style={[
              styles.menu,
              {
                left: menuPosition.x,
                top: menuPosition.y,
                opacity: menuOpacity,
                transform: [{ scale: menuScale }],
              },
            ]}
          >
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  item.disabled && styles.menuItemDisabled,
                  index === 0 && styles.menuItemFirst,
                  index === menuItems.length - 1 && styles.menuItemLast,
                ]}
                onPress={() => handleMenuItemPress(item)}
                disabled={item.disabled}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text
                  style={[
                    styles.menuLabel,
                    item.destructive && styles.menuLabelDestructive,
                    item.disabled && styles.menuLabelDisabled,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },

  menu: {
    position: "absolute",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    paddingVertical: ResponsiveTheme.spacing.xs,
    minWidth: 200,
    ...ResponsiveTheme.shadows.lg,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    minHeight: 50,
  },

  menuItemFirst: {
    borderTopLeftRadius: ResponsiveTheme.borderRadius.lg,
    borderTopRightRadius: ResponsiveTheme.borderRadius.lg,
  },

  menuItemLast: {
    borderBottomLeftRadius: ResponsiveTheme.borderRadius.lg,
    borderBottomRightRadius: ResponsiveTheme.borderRadius.lg,
  },

  menuItemDisabled: {
    opacity: 0.5,
  },

  menuIcon: {
    fontSize: ResponsiveTheme.fontSize.lg,
    marginRight: ResponsiveTheme.spacing.sm,
    width: 24,
    textAlign: "center",
  },

  menuLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium as "500",
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },

  menuLabelDestructive: {
    color: ResponsiveTheme.colors.error,
  },

  menuLabelDisabled: {
    color: ResponsiveTheme.colors.textMuted,
  },
});
