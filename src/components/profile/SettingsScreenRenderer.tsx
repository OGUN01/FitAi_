import React from "react";
import {
  NotificationsScreen,
  PrivacySecurityScreen,
  HelpSupportScreen,
  AboutFitAIScreen,
  WearableConnectionScreen,
} from "../../screens/settings";

interface SettingsScreenRendererProps {
  currentScreen: string | null;
  onBack: () => void;
}

export const SettingsScreenRenderer: React.FC<SettingsScreenRendererProps> = ({
  currentScreen,
  onBack,
}) => {
  if (!currentScreen) return null;

  switch (currentScreen) {
    case "notifications":
      return <NotificationsScreen onBack={onBack} />;
    case "privacy":
      return <PrivacySecurityScreen onBack={onBack} />;
    case "help":
      return <HelpSupportScreen onBack={onBack} />;
    case "about":
      return <AboutFitAIScreen onBack={onBack} />;
    case "wearables":
      return <WearableConnectionScreen onBack={onBack} />;
    default:
      return null;
  }
};
