import React from "react";
import {
  View,
  Pressable,
  Text,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { rp, rh, rw } from "../../utils/responsive";
import { useResponsiveTheme } from "../../hooks/useResponsiveTheme";

// REMOVED: Module-level Dimensions.get() causes crash
// const { width: screenWidth } = Dimensions.get('window');

interface TabItem {
  key: string;
  title: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
}

interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (tabKey: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
}) => {
  const responsiveTheme = useResponsiveTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: responsiveTheme.colors.backgroundSecondary,
          paddingBottom: Math.max(insets.bottom, rp(10)),
          borderTopWidth: 1,
          borderTopColor: responsiveTheme.colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.tabBar,
          {
            height: rh(60),
            paddingHorizontal: responsiveTheme.spacing.sm,
          },
        ]}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <Pressable
              key={tab.key}
              style={({ pressed }) => [
                styles.tab,
                {
                  paddingVertical: responsiveTheme.spacing.sm,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={() => onTabPress(tab.key)}
              accessibilityRole="tab"
              accessibilityLabel={tab.title}
              accessibilityState={{ selected: isActive }}
              testID={`tab-${tab.key}`}
            >

              <View
                style={[
                  styles.iconContainer,
                  {
                    marginBottom: rp(2),
                  },
                ]}
              >
                {isActive && tab.activeIcon ? tab.activeIcon : tab.icon}
              </View>

              <Text
                style={[
                  styles.tabText,
                  {
                    fontSize: responsiveTheme.fontSize.xs,
                    fontWeight: responsiveTheme.fontWeight.medium,
                    color: isActive
                      ? responsiveTheme.colors.primary
                      : responsiveTheme.colors.textMuted,
                  },
                ]}
              >
                {tab.title}
              </Text>

              {isActive && (
                <View
                  style={{
                    width: rw(24),
                    height: rh(3),
                    backgroundColor: responsiveTheme.colors.primary,
                    borderRadius: responsiveTheme.borderRadius.full,
                    marginTop: rp(2),
                  }}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // All responsive styles moved to inline to prevent module-level crash
  },

  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    // All responsive styles moved to inline
  },

  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    minHeight: 44,
    overflow: "hidden",
  },

  iconContainer: {
    // All responsive styles moved to inline
  },

  tabText: {
    textAlign: "center",
    // All responsive styles moved to inline
  },

  // activeIndicator removed - now inline with flow layout
});
