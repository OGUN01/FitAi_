/**
 * HelpSupportScreen - Help & Support Center
 *
 * Redesigned following UI/UX Methodology:
 * - GlassCard for all cards
 * - Ionicons instead of emojis
 * - AnimatedPressable with haptics
 * - ResponsiveTheme for spacing/colors
 * - FadeInDown entry animations
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { QuickAction } from "../../components/help/QuickAction";
import { ResourceItem } from "../../components/help/ResourceItem";
import { FAQList } from "../../components/help/FAQList";
import { ContactCard } from "../../components/help/ContactCard";

import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rp, rbr, rh } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
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
    handleTutorials,
    handleUserGuide,
    handleVideoTutorials,
    handleCommunityForum,
    handleSystemStatus,
    handleContactEmail,
  } = useHelpSupport();

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <AnimatedPressable
            onPress={() => {
              haptics.light();
              onBack?.();
            }}
            scaleValue={0.9}
            hapticFeedback={false}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.backButton}>
              <Ionicons name="chevron-back" size={rf(20)} color={ResponsiveTheme.colors.text} />
            </View>
          </AnimatedPressable>
          <View style={styles.headerCenter}>
            <Ionicons
              name="help-circle-outline"
              size={rf(18)}
              color={ResponsiveTheme.colors.primary}
            />
            <Text style={styles.headerTitle}>Help & Support</Text>
          </View>
          <View style={styles.headerSpacer} />
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="flash-outline"
                size={rf(14)}
                color={ResponsiveTheme.colors.textSecondary}
              />
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>

            <View style={styles.quickActionsGrid}>
              <QuickAction
                icon="chatbubbles-outline"
                iconColor={ResponsiveTheme.colors.text}
                gradientColors={[ResponsiveTheme.colors.primary, ResponsiveTheme.colors.primaryDark]}
                title="Contact Support"
                onPress={handleContactSupport}
                animationDelay={100}
              />
              <QuickAction
                icon="bug-outline"
                iconColor={ResponsiveTheme.colors.text}
                gradientColors={[ResponsiveTheme.colors.errorLight, ResponsiveTheme.colors.primaryLight]}
                title="Report Bug"
                onPress={handleReportBug}
                animationDelay={150}
              />
              <QuickAction
                icon="bulb-outline"
                iconColor={ResponsiveTheme.colors.text}
                gradientColors={[ResponsiveTheme.colors.success, ResponsiveTheme.colors.successLight]}
                title="Feature Request"
                onPress={handleFeatureRequest}
                animationDelay={200}
              />
              <QuickAction
                icon="school-outline"
                iconColor={ResponsiveTheme.colors.text}
                gradientColors={[ResponsiveTheme.colors.info, ResponsiveTheme.colors.cyan]}
                title="Tutorials"
                onPress={handleTutorials}
                animationDelay={250}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="help-outline"
                size={rf(14)}
                color={ResponsiveTheme.colors.textSecondary}
              />
              <Text style={styles.sectionTitle}>
                Frequently Asked Questions
              </Text>
            </View>

            <FAQList
              faqs={faqs}
              expandedFaq={expandedFaq}
              onToggleFaq={toggleFaq}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="book-outline"
                size={rf(14)}
                color={ResponsiveTheme.colors.textSecondary}
              />
              <Text style={styles.sectionTitle}>Resources</Text>
            </View>

            <ResourceItem
              icon="document-text-outline"
              iconColor={ResponsiveTheme.colors.success}
              title="User Guide"
              description="Complete guide to using all FitAI features"
              onPress={handleUserGuide}
              animationDelay={600}
            />

            <ResourceItem
              icon="videocam-outline"
              iconColor={ResponsiveTheme.colors.errorLight}
              title="Video Tutorials"
              description="Step-by-step video guides for beginners"
              onPress={handleVideoTutorials}
              animationDelay={650}
            />

            <ResourceItem
              icon="people-outline"
              iconColor={ResponsiveTheme.colors.primary}
              title="Community Forum"
              description="Connect with other FitAI users"
              onPress={handleCommunityForum}
              animationDelay={700}
            />

            <ResourceItem
              icon="pulse-outline"
              iconColor={ResponsiveTheme.colors.warning}
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
  header: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.md,
  },
  backButton: {
    width: rw(40),
    height: rw(40),
    borderRadius: rbr(20),
    backgroundColor: ResponsiveTheme.colors.glassBorder,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.sm,
  },
  headerTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  headerSpacer: {
    width: rw(40),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.sm,
    paddingBottom: rp(100),
  },
  section: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.sm,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
  sectionTitle: {
    fontSize: rf(12),
    fontWeight: "700",
    color: ResponsiveTheme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
  },
  bottomSpacing: {
    height: rh(80),
  },
});

export default HelpSupportScreen;
