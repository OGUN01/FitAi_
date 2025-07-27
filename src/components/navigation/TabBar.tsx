import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { THEME } from '../../utils/constants';
import { ResponsiveTheme } from '../../utils/responsiveTheme';

const { width: screenWidth } = Dimensions.get('window');

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
  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                isActive && styles.activeTab,
              ]}
              onPress={() => onTabPress(tab.key)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer,
                isActive && styles.activeIconContainer,
              ]}>
                {isActive && tab.activeIcon ? tab.activeIcon : tab.icon}
              </View>
              
              <Text style={[
                styles.tabText,
                isActive && styles.activeTabText,
              ]}>
                {tab.title}
              </Text>
              
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    paddingBottom: rp(20), // Safe area padding
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },
  
  tabBar: {
    flexDirection: 'row',
    height: rh(60),
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: ResponsiveTheme.spacing.sm,
  },
  
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ResponsiveTheme.spacing.sm,
    position: 'relative',
  },
  
  activeTab: {
    // Active tab styling handled by individual elements
  },
  
  iconContainer: {
    marginBottom: rp(2),
  },
  
  activeIconContainer: {
    // Active icon styling
  },
  
  tabText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.textMuted,
    textAlign: 'center',
  },
  
  activeTabText: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
  
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: rw(24),
    height: rh(3),
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },
});
