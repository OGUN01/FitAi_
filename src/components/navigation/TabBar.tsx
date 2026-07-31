import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rp, rh, rw, rf } from '../../utils/responsive';
import {
  flatColors as colors,
  flatFontSize,
  spacing,
  typography,
  borderRadius,
} from '../../theme/aurora-tokens';

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

export const TabBar: React.FC<TabBarProps> = ({ tabs, activeTab, onTabPress }) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.backgroundSecondary,
          paddingBottom: Math.max(insets.bottom, rp(spacing.sm)),
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.tabBar,
          {
            height: rh(60),
            paddingHorizontal: rp(spacing.sm),
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
                  paddingVertical: rp(spacing.sm),
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
                    marginBottom: rp(4),
                  },
                ]}
              >
                {isActive && tab.activeIcon ? tab.activeIcon : tab.icon}
              </View>

              <Text
                style={[
                  styles.tabText,
                  {
                    fontSize: rf(flatFontSize.xs),
                    fontWeight: isActive
                      ? typography.fontWeight.semibold
                      : typography.fontWeight.medium,
                    color: isActive
                      ? colors.primary
                      : colors.textMuted,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {tab.title}
              </Text>

              {/* Active indicator — always rendered (opacity-toggled) so toggling
                  tabs doesn't reflow the icon/text block vertically. The prior
                  conditional mount added marginTop+height only when active,
                  causing the icon+text to jump up/down on tab switch. */}
              <View
                style={{
                  width: rw(24),
                  height: rh(3),
                  backgroundColor: colors.primary,
                  borderRadius: borderRadius.full,
                  marginTop: rp(2),
                  opacity: isActive ? 1 : 0,
                }}
              />

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 44,
    // overflow:hidden would clip the active indicator (which sits at the
    // bottom edge). Let it render outside the tab bounds.
  },

  iconContainer: {
    // All responsive styles moved to inline
  },

  tabText: {
    textAlign: 'center',
  },
});
