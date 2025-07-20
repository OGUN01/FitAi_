import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { THEME } from '../../utils/constants';

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
    backgroundColor: THEME.colors.backgroundSecondary,
    paddingBottom: 20, // Safe area padding
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  
  tabBar: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: THEME.spacing.sm,
  },
  
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: THEME.spacing.sm,
    position: 'relative',
  },
  
  activeTab: {
    // Active tab styling handled by individual elements
  },
  
  iconContainer: {
    marginBottom: 2,
  },
  
  activeIconContainer: {
    // Active icon styling
  },
  
  tabText: {
    fontSize: THEME.fontSize.xs,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  
  activeTabText: {
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.semibold,
  },
  
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 3,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.full,
  },
});
