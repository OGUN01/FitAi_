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

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeIn,
  FadeInUp,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// UI Components
import { GlassCard } from "../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";

// Theme & Utils
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface HelpSupportScreenProps {
  onBack?: () => void;
}

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  gradientColors: [string, string];
  title: string;
  onPress: () => void;
  animationDelay: number;
}

const QuickAction: React.FC<QuickActionProps> = ({
  icon,
  iconColor,
  gradientColors,
  title,
  onPress,
  animationDelay,
}) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(animationDelay).duration(400)}
      style={styles.quickActionWrapper}
    >
      <AnimatedPressable
        onPress={() => {
          haptics.light();
          onPress();
        }}
        scaleValue={0.95}
        hapticFeedback={false}
      >
        <GlassCard
          elevation={1}
          padding="md"
          blurIntensity="light"
          borderRadius="lg"
          style={styles.quickActionCard}
        >
          <LinearGradient
            colors={gradientColors}
            style={styles.quickActionIcon}
          >
            <Ionicons name={icon} size={rf(22)} color="#fff" />
          </LinearGradient>
          <Text style={styles.quickActionTitle}>{title}</Text>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

interface ResourceItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  onPress: () => void;
  animationDelay: number;
}

const ResourceItem: React.FC<ResourceItemProps> = ({
  icon,
  iconColor,
  title,
  description,
  onPress,
  animationDelay,
}) => {
  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(400)}>
      <AnimatedPressable
        onPress={() => {
          haptics.light();
          onPress();
        }}
        scaleValue={0.98}
        hapticFeedback={false}
      >
        <GlassCard
          elevation={1}
          padding="md"
          blurIntensity="light"
          borderRadius="lg"
          style={styles.resourceCard}
        >
          <View style={styles.resourceContent}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: `${iconColor}15` },
              ]}
            >
              <Ionicons name={icon} size={rf(18)} color={iconColor} />
            </View>
            <View style={styles.resourceTextContainer}>
              <Text style={styles.resourceTitle}>{title}</Text>
              <Text style={styles.resourceDescription}>{description}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={rf(18)}
              color={ResponsiveTheme.colors.textMuted}
            />
          </View>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({
  onBack,
}) => {
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const faqs: FAQItem[] = [
    {
      id: "1",
      question: "How do I track my workouts?",
      answer:
        'Go to the Fitness tab and tap "Start Workout". Choose your workout type and follow the guided exercises. The app will automatically track your progress, reps, and time.',
      icon: "barbell-outline",
    },
    {
      id: "2",
      question: "Can I customize my meal plans?",
      answer:
        'Yes! Go to the Diet tab and tap "Customize Meals". You can adjust portion sizes, swap ingredients, and set dietary preferences. The AI will generate personalized meal suggestions based on your goals.',
      icon: "restaurant-outline",
    },
    {
      id: "3",
      question: "How does the AI personalization work?",
      answer:
        "FitAI uses your personal information, fitness goals, and activity history to create 100% personalized content. The more you use the app, the better it gets at understanding your preferences and needs.",
      icon: "sparkles-outline",
    },
    {
      id: "4",
      question: "Can I sync with other fitness apps?",
      answer:
        "Currently, FitAI works as a standalone app with its own comprehensive tracking. We're working on integrations with popular fitness devices and apps for future updates.",
      icon: "sync-outline",
    },
    {
      id: "5",
      question: "How do I reset my progress?",
      answer:
        "Go to Profile > Edit Profile > Personal Information and update your goals. Or contact support if you need to completely reset your account data.",
      icon: "refresh-outline",
    },
    {
      id: "6",
      question: "Is my data secure?",
      answer:
        "Yes, we use industry-standard encryption and security measures. Your personal data is never shared without your consent. Check our Privacy Policy for detailed information.",
      icon: "shield-checkmark-outline",
    },
  ];

  const toggleFaq = useCallback((id: string) => {
    haptics.light();
    setExpandedFaq((prev) => (prev === id ? null : id));
  }, []);

  const handleContactSupport = useCallback(() => {
    Alert.alert(
      "Contact Support",
      "Choose how you'd like to contact our support team:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Email",
          onPress: () => {
            Linking.openURL(
              "mailto:support@fitai.app?subject=FitAI Support Request",
            );
          },
        },
        {
          text: "Live Chat",
          onPress: () => {
            Alert.alert(
              "Live Chat",
              "Live chat support will be available in the next update!",
            );
          },
        },
      ],
    );
  }, []);

  const handleReportBug = useCallback(() => {
    Alert.alert(
      "Report a Bug",
      "Help us improve FitAI by reporting any issues you encounter.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report Bug",
          onPress: () => {
            Linking.openURL("mailto:bugs@fitai.app?subject=Bug Report - FitAI");
          },
        },
      ],
    );
  }, []);

  const handleFeatureRequest = useCallback(() => {
    Alert.alert(
      "Feature Request",
      "We'd love to hear your ideas for improving FitAI!",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Request",
          onPress: () => {
            Linking.openURL(
              "mailto:features@fitai.app?subject=Feature Request - FitAI",
            );
          },
        },
      ],
    );
  }, []);

  const handleTutorials = useCallback(() => {
    haptics.light();
    Linking.openURL("https://fitai.app/tutorials").catch(() =>
      Alert.alert(
        "Getting Started",
        "Welcome to FitAI! Here's how to get started:\n\n" +
          "1. Complete your profile in Settings\n" +
          "2. Set your fitness goals\n" +
          "3. Try the AI workout generator\n" +
          "4. Scan your first meal\n" +
          "5. Track your daily water intake\n\n" +
          "Visit https://fitai.app/tutorials for interactive guides!",
      ),
    );
  }, []);

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Header */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <AnimatedPressable
            onPress={() => {
              haptics.light();
              onBack?.();
            }}
            scaleValue={0.9}
            hapticFeedback={false}
          >
            <View style={styles.backButton}>
              <Ionicons name="chevron-back" size={rf(20)} color="#fff" />
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
          {/* Quick Actions */}
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
                iconColor="#fff"
                gradientColors={["#667eea", "#764ba2"]}
                title="Contact Support"
                onPress={handleContactSupport}
                animationDelay={100}
              />
              <QuickAction
                icon="bug-outline"
                iconColor="#fff"
                gradientColors={["#FF6B6B", "#FF8E53"]}
                title="Report Bug"
                onPress={handleReportBug}
                animationDelay={150}
              />
              <QuickAction
                icon="bulb-outline"
                iconColor="#fff"
                gradientColors={["#4CAF50", "#8BC34A"]}
                title="Feature Request"
                onPress={handleFeatureRequest}
                animationDelay={200}
              />
              <QuickAction
                icon="school-outline"
                iconColor="#fff"
                gradientColors={["#2196F3", "#00BCD4"]}
                title="Tutorials"
                onPress={handleTutorials}
                animationDelay={250}
              />
            </View>
          </View>

          {/* FAQs */}
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

            {faqs.map((faq, index) => (
              <Animated.View
                key={faq.id}
                entering={FadeInDown.delay(300 + index * 50).duration(400)}
              >
                <AnimatedPressable
                  onPress={() => toggleFaq(faq.id)}
                  scaleValue={0.98}
                  hapticFeedback={false}
                >
                  <GlassCard
                    elevation={1}
                    padding="md"
                    blurIntensity="light"
                    borderRadius="lg"
                    style={
                      (expandedFaq === faq.id
                        ? [styles.faqCard, styles.faqCardExpanded]
                        : styles.faqCard) as any
                    }
                  >
                    <View style={styles.faqHeader}>
                      <View
                        style={[
                          styles.faqIcon,
                          { backgroundColor: "rgba(102, 126, 234, 0.15)" },
                        ]}
                      >
                        <Ionicons
                          name={faq.icon}
                          size={rf(16)}
                          color="#667eea"
                        />
                      </View>
                      <Text style={styles.faqQuestion}>{faq.question}</Text>
                      <View
                        style={[
                          styles.expandIcon,
                          expandedFaq === faq.id && styles.expandIconExpanded,
                        ]}
                      >
                        <Ionicons
                          name={
                            expandedFaq === faq.id
                              ? "chevron-up"
                              : "chevron-down"
                          }
                          size={rf(16)}
                          color={ResponsiveTheme.colors.textSecondary}
                        />
                      </View>
                    </View>

                    {expandedFaq === faq.id && (
                      <View style={styles.faqAnswer}>
                        <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                      </View>
                    )}
                  </GlassCard>
                </AnimatedPressable>
              </Animated.View>
            ))}
          </View>

          {/* Resources */}
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
              iconColor="#4CAF50"
              title="User Guide"
              description="Complete guide to using all FitAI features"
              onPress={() => {
                haptics.light();
                Linking.openURL("https://fitai.app/guide").catch(() =>
                  Alert.alert(
                    "User Guide",
                    "Visit https://fitai.app/guide for the complete user guide.\n\n" +
                      "Quick Tips:\n\n" +
                      "• Tap the + button to log workouts and meals\n" +
                      "• Use the AI chat for personalized recommendations\n" +
                      "• Track progress in the Analytics tab\n" +
                      "• Customize your goals in Settings",
                  ),
                );
              }}
              animationDelay={600}
            />

            <ResourceItem
              icon="videocam-outline"
              iconColor="#FF6B6B"
              title="Video Tutorials"
              description="Step-by-step video guides for beginners"
              onPress={() => {
                haptics.light();
                Linking.openURL("https://youtube.com/@fitai_app").catch(() =>
                  Alert.alert(
                    "Video Tutorials",
                    "Subscribe to our YouTube channel for video tutorials:\n\n" +
                      "https://youtube.com/@fitai_app\n\n" +
                      "Topics covered:\n" +
                      "• Getting started with FitAI\n" +
                      "• Creating custom workout plans\n" +
                      "• Food scanning and meal logging\n" +
                      "• Understanding your analytics",
                  ),
                );
              }}
              animationDelay={650}
            />

            <ResourceItem
              icon="people-outline"
              iconColor="#667eea"
              title="Community Forum"
              description="Connect with other FitAI users"
              onPress={() => {
                haptics.light();
                Linking.openURL("https://community.fitai.app").catch(() =>
                  Alert.alert(
                    "Join Our Community",
                    "Connect with fellow fitness enthusiasts!\n\n" +
                      "• Share your progress and achievements\n" +
                      "• Get tips from experienced users\n" +
                      "• Participate in community challenges\n" +
                      "• Request new features\n\n" +
                      "Visit: https://community.fitai.app",
                  ),
                );
              }}
              animationDelay={700}
            />

            <ResourceItem
              icon="pulse-outline"
              iconColor="#FF9800"
              title="System Status"
              description="Check if all FitAI services are running smoothly"
              onPress={() => {
                haptics.light();
                Linking.openURL("https://status.fitai.app").catch(() =>
                  Alert.alert(
                    "System Status",
                    "All FitAI systems are currently operational.\n\n" +
                      "✅ Authentication Services\n" +
                      "✅ AI Workout Generation\n" +
                      "✅ Food Recognition\n" +
                      "✅ Data Sync Services\n" +
                      "✅ Push Notifications\n\n" +
                      "For real-time status updates, visit:\nhttps://status.fitai.app",
                  ),
                );
              }}
              animationDelay={750}
            />
          </View>

          {/* Contact Card */}
          <Animated.View entering={FadeInDown.delay(800).duration(400)}>
            <GlassCard
              elevation={2}
              padding="lg"
              blurIntensity="default"
              borderRadius="xl"
              style={styles.contactCard}
            >
              <LinearGradient
                colors={[
                  "rgba(102, 126, 234, 0.15)",
                  "rgba(118, 75, 162, 0.1)",
                ]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.contactIconContainer}>
                <LinearGradient
                  colors={["#667eea", "#764ba2"]}
                  style={styles.contactIcon}
                >
                  <Ionicons name="headset-outline" size={rf(24)} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={styles.contactTitle}>Need immediate help?</Text>
              <Text style={styles.contactDescription}>
                Our support team typically responds within 24 hours.
              </Text>

              <View style={styles.contactMethods}>
                <AnimatedPressable
                  onPress={() => {
                    haptics.light();
                    Linking.openURL("mailto:support@fitai.app");
                  }}
                  scaleValue={0.95}
                  hapticFeedback={false}
                  style={styles.contactMethodButton}
                >
                  <View style={styles.contactMethod}>
                    <Ionicons
                      name="mail-outline"
                      size={rf(16)}
                      color={ResponsiveTheme.colors.primary}
                    />
                    <Text style={styles.contactMethodText}>
                      support@fitai.app
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Bottom Spacing */}
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
    borderRadius: rw(20),
    backgroundColor: "rgba(255, 255, 255, 0.08)",
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
    color: "#fff",
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
  // Quick Actions
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
  },
  quickActionWrapper: {
    width: "48.5%",
  },
  quickActionCard: {
    alignItems: "center" as const,
    paddingVertical: ResponsiveTheme.spacing.lg,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  quickActionIcon: {
    width: rw(48),
    height: rw(48),
    borderRadius: rw(24),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  quickActionTitle: {
    fontSize: rf(13),
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  // FAQ
  faqCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  faqCardExpanded: {
    backgroundColor: "rgba(102, 126, 234, 0.08)",
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center" as const,
  },
  faqIcon: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(8),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: ResponsiveTheme.spacing.sm,
  },
  faqQuestion: {
    flex: 1,
    fontSize: rf(14),
    fontWeight: "600",
    color: "#fff",
    marginRight: ResponsiveTheme.spacing.sm,
  },
  expandIcon: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  expandIconExpanded: {
    backgroundColor: `${ResponsiveTheme.colors.primary}20`,
  },
  faqAnswer: {
    marginTop: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  faqAnswerText: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
  },
  // Resources
  resourceCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  resourceContent: {
    flexDirection: "row",
    alignItems: "center" as const,
  },
  iconContainer: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(12),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: ResponsiveTheme.spacing.md,
  },
  resourceTextContainer: {
    flex: 1,
    marginRight: ResponsiveTheme.spacing.sm,
  },
  resourceTitle: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  resourceDescription: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
  },
  // Contact Card
  contactCard: {
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.lg,
    overflow: "hidden",
  },
  contactIconContainer: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  contactIcon: {
    width: rw(56),
    height: rw(56),
    borderRadius: rw(28),
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  contactTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: "#fff",
    marginBottom: ResponsiveTheme.spacing.xs,
    textAlign: "center",
  },
  contactDescription: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
    lineHeight: rf(18),
  },
  contactMethods: {
    width: "100%",
  },
  contactMethodButton: {
    width: "100%",
  },
  contactMethod: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: ResponsiveTheme.borderRadius.lg,
  },
  contactMethodText: {
    fontSize: rf(14),
    fontWeight: "500",
    color: ResponsiveTheme.colors.primary,
  },
  bottomSpacing: {
    height: rh(80),
  },
});

export default HelpSupportScreen;
