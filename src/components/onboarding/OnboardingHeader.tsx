import React from "react";
import { View } from "react-native";
import OnboardingTabBar, {
  TabConfig,
} from "../../components/onboarding/OnboardingTabBar";

interface OnboardingHeaderProps {
  activeTab: number;
  tabs: TabConfig[];
  onTabPress: (tabNumber: number) => void;
  completionPercentage: number;
  editMode?: boolean;
}

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({
  activeTab,
  tabs,
  onTabPress,
  completionPercentage,
  editMode = false,
}) => {
  if (editMode) {
    return null;
  }

  return (
    <OnboardingTabBar
      activeTab={activeTab}
      tabs={tabs}
      onTabPress={onTabPress}
      completionPercentage={completionPercentage}
    />
  );
};
