import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TabBar } from './TabBar';
import {
  HomeIcon,
  FitnessIcon,
  DietIcon,
  ProgressIcon,
  ProfileIcon
} from '../icons/TabIcons';
import { HomeScreen } from '../../screens/main/HomeScreen';
import { FitnessScreen } from '../../screens/main/FitnessScreen';
import { DietScreen } from '../../screens/main/DietScreen';
import { ProgressScreen } from '../../screens/main/ProgressScreen';
import { ProfileScreen } from '../../screens/main/ProfileScreen';
import { THEME } from '../../utils/constants';

interface MainNavigationProps {
  initialTab?: string;
}

export const MainNavigation: React.FC<MainNavigationProps> = ({
  initialTab = 'home'
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  const tabs = [
    {
      key: 'home',
      title: 'Home',
      icon: <HomeIcon />,
      activeIcon: <HomeIcon active />,
    },
    {
      key: 'fitness',
      title: 'Fitness',
      icon: <FitnessIcon />,
      activeIcon: <FitnessIcon active />,
    },
    {
      key: 'diet',
      title: 'Diet',
      icon: <DietIcon />,
      activeIcon: <DietIcon active />,
    },
    {
      key: 'progress',
      title: 'Progress',
      icon: <ProgressIcon />,
      activeIcon: <ProgressIcon active />,
    },
    {
      key: 'profile',
      title: 'Profile',
      icon: <ProfileIcon />,
      activeIcon: <ProfileIcon active />,
    },
  ];

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'fitness':
        return <FitnessScreen />;
      case 'diet':
        return <DietScreen />;
      case 'progress':
        return <ProgressScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>
      
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabPress={setActiveTab}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  
  screenContainer: {
    flex: 1,
  },
});
