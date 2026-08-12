/**
 * HelpSupportScreen - Help & Support Center
 *
 * Editorial Dark: shared GlassHeader + SectionHeader (no GlassCard/gradient
 * on this screen's own header/section chrome — satellite cards below still
 * own their individual styling), Ionicons instead of emojis, aurora-tokens
 * for spacing/colors.
 */

import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { GlassHeader } from "../../components/ui/aurora/GlassHeader";
import { QuickAction } from "../../components/help/QuickAction";
import { ResourceItem } from "../../components/help/ResourceItem";
import { FAQList } from "../../components/help/FAQList";
import { ContactCard } from "../../components/help/ContactCard";
import { SectionHeader } from "../../components/settings/SectionHeader";

import { flatColors as colors, spacing } from "../../theme/aurora-tokens";
import { rp, rh } from "../../utils/responsive";
import { useHelpSupport } from "../../hooks/useHelpSupport";

interface HelpSupportScreenProps {
  onBack?: () => void;
}

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({
  onBack,
}) => {
  const {
    faqs,
    expandedFaq,
    toggleFaq,
    handleContactSupport,
    handleReportBug,
    handleFeatureRequest,
    handleSystemStatus,
    handleContactEmail,
  } = useHelpSupport();

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <GlassHeader
          title="Help & Support"
          titleIcon="help-circle-outline"
          onBack={onBack}
        />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.section}>
            <SectionHeader icon="flash-outline" title="Quick Actions" />

            <View style={styles.quickActionsGrid}>
              <QuickAction
                icon="chatbubbles-outline"
                iconColor={colors.text}
                gradientColors={[colors.primary, colors.primaryDark]}
                title="Contact Support"
                onPress={handleContactSupport}
                animationDelay={100}
              />
              <QuickAction
                icon="bug-outline"
                iconColor={colors.text}
                gradientColors={[colors.errorLight, colors.primaryLight]}
                title="Report Bug"
                onPress={handleReportBug}
                animationDelay={150}
              />
              <QuickAction
                icon="bulb-outline"
                iconColor={colors.text}
                gradientColors={[colors.success, colors.successLight]}
                title="Feature Request"
                onPress={handleFeatureRequest}
                animationDelay={200}
              />
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader
              icon="help-outline"
              title="Frequently Asked Questions"
            />

            <FAQList
              faqs={faqs}
              expandedFaq={expandedFaq}
              onToggleFaq={toggleFaq}
            />
          </View>

          <View style={styles.section}>
            <SectionHeader icon="book-outline" title="Resources" />

            <ResourceItem
              icon="pulse-outline"
              iconColor={colors.warning}
              title="System Status"
              description="Check if all FitAI services are running smoothly"
              onPress={handleSystemStatus}
              animationDelay={750}
            />
          </View>

          <ContactCard onContactEmail={handleContactEmail} />

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: rp(100),
  },
  section: {
    marginBottom: spacing.lg,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  bottomSpacing: {
    height: rh(80),
  },
});

export default HelpSupportScreen;
