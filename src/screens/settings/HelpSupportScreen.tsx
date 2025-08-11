import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Card, THEME } from '../../components/ui';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  expanded: boolean;
}

interface HelpSupportScreenProps {
  onBack?: () => void;
}

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({ onBack }) => {
  const [faqs, setFaqs] = useState<FAQItem[]>([
    {
      id: '1',
      question: 'How do I track my workouts?',
      answer:
        'Go to the Fitness tab and tap "Start Workout". Choose your workout type and follow the guided exercises. The app will automatically track your progress, reps, and time.',
      expanded: false,
    },
    {
      id: '2',
      question: 'Can I customize my meal plans?',
      answer:
        'Yes! Go to the Diet tab and tap "Customize Meals". You can adjust portion sizes, swap ingredients, and set dietary preferences. The AI will generate personalized meal suggestions based on your goals.',
      expanded: false,
    },
    {
      id: '3',
      question: 'How does the AI personalization work?',
      answer:
        'FitAI uses your personal information, fitness goals, and activity history to create 100% personalized content. The more you use the app, the better it gets at understanding your preferences and needs.',
      expanded: false,
    },
    {
      id: '4',
      question: 'Can I sync with other fitness apps?',
      answer:
        "Currently, FitAI works as a standalone app with its own comprehensive tracking. We're working on integrations with popular fitness devices and apps for future updates.",
      expanded: false,
    },
    {
      id: '5',
      question: 'How do I reset my progress?',
      answer:
        'Go to Profile > Edit Profile > Personal Information and update your goals. Or contact support if you need to completely reset your account data.',
      expanded: false,
    },
    {
      id: '6',
      question: 'Is my data secure?',
      answer:
        'Yes, we use industry-standard encryption and security measures. Your personal data is never shared without your consent. Check our Privacy Policy for detailed information.',
      expanded: false,
    },
  ]);

  const toggleFAQ = (id: string) => {
    setFaqs((prev) =>
      prev.map(
        (faq) => (faq.id === id ? { ...faq, expanded: !faq.expanded } : { ...faq, expanded: false }) // Close others
      )
    );
  };

  const handleContactSupport = () => {
    Alert.alert('Contact Support', "Choose how you'd like to contact our support team:", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Email',
        onPress: () => {
          Linking.openURL('mailto:support@fitai.app?subject=FitAI Support Request');
        },
      },
      {
        text: 'Live Chat',
        onPress: () => {
          Alert.alert('Live Chat', 'Live chat support will be available in the next update!');
        },
      },
    ]);
  };

  const handleReportBug = () => {
    Alert.alert('Report a Bug', 'Help us improve FitAI by reporting any issues you encounter.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report Bug',
        onPress: () => {
          Linking.openURL('mailto:bugs@fitai.app?subject=Bug Report - FitAI');
        },
      },
    ]);
  };

  const handleFeatureRequest = () => {
    Alert.alert('Feature Request', "We'd love to hear your ideas for improving FitAI!", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send Request',
        onPress: () => {
          Linking.openURL('mailto:features@fitai.app?subject=Feature Request - FitAI');
        },
      },
    ]);
  };

  const handleTutorials = () => {
    Alert.alert('Getting Started', 'Interactive tutorials will be available in the next update!');
  };

  const handleCommunity = () => {
    Alert.alert(
      'Join Our Community',
      'Connect with other FitAI users and share your fitness journey!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discord',
          onPress: () => {
            Alert.alert('Discord', 'Discord community link will be available soon!');
          },
        },
        {
          text: 'Facebook',
          onPress: () => {
            Alert.alert('Facebook', 'Facebook group link will be available soon!');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Help & Support</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickAction} onPress={handleContactSupport}>
              <Text style={styles.quickActionIcon}>💬</Text>
              <Text style={styles.quickActionText}>Contact Support</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} onPress={handleReportBug}>
              <Text style={styles.quickActionIcon}>🐛</Text>
              <Text style={styles.quickActionText}>Report Bug</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} onPress={handleFeatureRequest}>
              <Text style={styles.quickActionIcon}>💡</Text>
              <Text style={styles.quickActionText}>Feature Request</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} onPress={handleTutorials}>
              <Text style={styles.quickActionIcon}>🎓</Text>
              <Text style={styles.quickActionText}>Tutorials</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Frequently Asked Questions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          {faqs.map((faq) => (
            <Card key={faq.id} style={styles.faqCard} variant="outlined">
              <TouchableOpacity onPress={() => toggleFAQ(faq.id)}>
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Text style={[styles.faqToggle, faq.expanded && styles.faqToggleExpanded]}>
                    {faq.expanded ? '−' : '+'}
                  </Text>
                </View>
              </TouchableOpacity>

              {faq.expanded && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                </View>
              )}
            </Card>
          ))}
        </View>

        {/* Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resources</Text>

          <Card style={styles.resourceCard} variant="outlined">
            <TouchableOpacity
              onPress={() =>
                Alert.alert('User Guide', 'Comprehensive user guide will be available soon!')
              }
            >
              <View style={styles.resourceContent}>
                <Text style={styles.resourceIcon}>📖</Text>
                <View style={styles.resourceInfo}>
                  <Text style={styles.resourceTitle}>User Guide</Text>
                  <Text style={styles.resourceDescription}>
                    Complete guide to using all FitAI features
                  </Text>
                </View>
                <Text style={styles.resourceArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </Card>

          <Card style={styles.resourceCard} variant="outlined">
            <TouchableOpacity
              onPress={() =>
                Alert.alert('Video Tutorials', 'Video tutorials will be available soon!')
              }
            >
              <View style={styles.resourceContent}>
                <Text style={styles.resourceIcon}>🎥</Text>
                <View style={styles.resourceInfo}>
                  <Text style={styles.resourceTitle}>Video Tutorials</Text>
                  <Text style={styles.resourceDescription}>
                    Step-by-step video guides for beginners
                  </Text>
                </View>
                <Text style={styles.resourceArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </Card>

          <Card style={styles.resourceCard} variant="outlined">
            <TouchableOpacity onPress={handleCommunity}>
              <View style={styles.resourceContent}>
                <Text style={styles.resourceIcon}>👥</Text>
                <View style={styles.resourceInfo}>
                  <Text style={styles.resourceTitle}>Community Forum</Text>
                  <Text style={styles.resourceDescription}>Connect with other FitAI users</Text>
                </View>
                <Text style={styles.resourceArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </Card>

          <Card style={styles.resourceCard} variant="outlined">
            <TouchableOpacity
              onPress={() =>
                Alert.alert('System Status', 'System status page will be available soon!')
              }
            >
              <View style={styles.resourceContent}>
                <Text style={styles.resourceIcon}>⚡</Text>
                <View style={styles.resourceInfo}>
                  <Text style={styles.resourceTitle}>System Status</Text>
                  <Text style={styles.resourceDescription}>
                    Check if all FitAI services are running smoothly
                  </Text>
                </View>
                <Text style={styles.resourceArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <Card style={styles.contactCard} variant="outlined">
            <View style={styles.contactContent}>
              <Text style={styles.contactTitle}>Need immediate help?</Text>
              <Text style={styles.contactDescription}>
                Our support team typically responds within 24 hours.
              </Text>

              <View style={styles.contactMethods}>
                <TouchableOpacity
                  style={styles.contactMethod}
                  onPress={() => Linking.openURL('mailto:support@fitai.app')}
                >
                  <Text style={styles.contactMethodIcon}>✉️</Text>
                  <Text style={styles.contactMethodText}>support@fitai.app</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.contactMethod}
                  onPress={() =>
                    Alert.alert('Phone Support', 'Phone support will be available soon!')
                  }
                >
                  <Text style={styles.contactMethodIcon}>📞</Text>
                  <Text style={styles.contactMethodText}>+1 (555) 123-4567</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },

  scrollView: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.lg,
    paddingBottom: THEME.spacing.md,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  backIcon: {
    fontSize: 24,
    color: THEME.colors.text,
    fontWeight: 'bold',
  },

  title: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },

  headerSpacer: {
    width: 40,
  },

  section: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.xl,
  },

  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.md,
  },

  quickAction: {
    width: '47%',
    backgroundColor: THEME.colors.backgroundSecondary,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },

  quickActionIcon: {
    fontSize: 32,
    marginBottom: THEME.spacing.sm,
  },

  quickActionText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
    textAlign: 'center',
  },

  faqCard: {
    marginBottom: THEME.spacing.sm,
  },

  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: THEME.spacing.lg,
  },

  faqQuestion: {
    flex: 1,
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
    marginRight: THEME.spacing.md,
  },

  faqToggle: {
    fontSize: 20,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
    width: 24,
    textAlign: 'center',
  },

  faqToggleExpanded: {
    color: THEME.colors.primary,
  },

  faqAnswer: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  faqAnswerText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    marginTop: THEME.spacing.sm,
  },

  resourceCard: {
    marginBottom: THEME.spacing.sm,
  },

  resourceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },

  resourceIcon: {
    fontSize: 24,
    marginRight: THEME.spacing.md,
  },

  resourceInfo: {
    flex: 1,
  },

  resourceTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
  },

  resourceDescription: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
  },

  resourceArrow: {
    fontSize: 20,
    color: THEME.colors.textMuted,
    fontWeight: THEME.fontWeight.bold,
  },

  contactCard: {
    padding: THEME.spacing.lg,
  },

  contactContent: {
    alignItems: 'center',
  },

  contactTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
    textAlign: 'center',
  },

  contactDescription: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.lg,
    lineHeight: 20,
  },

  contactMethods: {
    width: '100%',
  },

  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: THEME.spacing.md,
    backgroundColor: THEME.colors.backgroundSecondary,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.sm,
  },

  contactMethodIcon: {
    fontSize: 16,
    marginRight: THEME.spacing.sm,
  },

  contactMethodText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.primary,
  },

  bottomSpacing: {
    height: THEME.spacing.xl,
  },
});
