import React from "react";
import {
  NotificationsScreen,
  PrivacySecurityScreen,
  HelpSupportScreen,
  AboutFitAIScreen,
  WearableConnectionScreen,
  ManualHealthEntryScreen,
} from "../../screens/settings";
import { SubscriptionManagement } from "../../screens/profile";

interface SettingsScreenRendererProps {
  currentScreen: string | null;
  onBack: () => void;
  /**
   * Switch to another settings sub-screen by its string key (e.g. "manualHealth").
   * Used by sub-screens that need to navigate sideways without returning to the
   * root settings list. Optional — only wired where needed.
   */
  onNavigateSettings?: (screen: string) => void;
}

export const SettingsScreenRenderer: React.FC<SettingsScreenRendererProps> = ({
  currentScreen,
  onBack,
  onNavigateSettings,
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
      return (
        <WearableConnectionScreen
          onBack={onBack}
          onEnterManually={
            onNavigateSettings
              ? () => onNavigateSettings("manualHealth")
              : undefined
          }
        />
      );
    case "manualHealth":
      return <ManualHealthEntryScreen onBack={onBack} />;
    case "subscription":
      return <SubscriptionManagement onBack={onBack} />;
    default:
      return null;
  }
};
