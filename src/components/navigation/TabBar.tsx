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
import { useResponsiveTheme } from '../../hooks/useResponsiveTheme';

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
  
  return (
    <View style={[
      styles.container,
      {
        backgroundColor: responsiveTheme.colors.backgroundSecondary,
        paddingBottom: rp(20),
        borderTopWidth: 1,
        borderTopColor: responsiveTheme.colors.border,
      }
    ]}>
      <View style={[
        styles.tabBar,
        {
          height: rh(60),
          paddingHorizontal: responsiveTheme.spacing.sm,
        }
      ]}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                {
                  paddingVertical: responsiveTheme.spacing.sm,
                }
              ]}
              onPress={() => onTabPress(tab.key)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer,
                {
                  marginBottom: rp(2),
                }
              ]}>
                {isActive && tab.activeIcon ? tab.activeIcon : tab.icon}
              </View>
              
              <Text style={[
                styles.tabText,
                {
                  fontSize: responsiveTheme.fontSize.xs,
<<<<<<< HEAD
                  fontWeight: responsiveTheme.fontWeight.medium as any,
=======
                  fontWeight: THEME.fontWeight.medium,
>>>>>>> bd00862 (🚀 MAJOR UPDATE: Complete FitAI Enhancement Package)
                  color: isActive ? responsiveTheme.colors.primary : responsiveTheme.colors.textMuted,
                }
              ]}>
                {tab.title}
              </Text>
              
              {isActive && (
                <View style={[
                  styles.activeIndicator,
                  {
                    width: rw(24),
                    height: rh(3),
                    backgroundColor: responsiveTheme.colors.primary,
                    borderRadius: responsiveTheme.borderRadius.full,
                  }
                ]} />
              )}
            </TouchableOpacity>
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
    // All responsive styles moved to inline
  },
  
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    // All responsive styles moved to inline
  },
  
  iconContainer: {
    // All responsive styles moved to inline
  },
  
  tabText: {
    textAlign: 'center',
    // All responsive styles moved to inline
  },
  
  activeIndicator: {
    position: 'absolute',
    top: 0,
    // All responsive styles moved to inline
  },
});
