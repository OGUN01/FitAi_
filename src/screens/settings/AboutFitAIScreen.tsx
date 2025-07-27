import React from 'react';
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

interface AboutFitAIScreenProps {
  onBack?: () => void;
}

export const AboutFitAIScreen: React.FC<AboutFitAIScreenProps> = ({ onBack }) => {
  const appVersion = '1.0.0';
  const buildNumber = '2024.01.15';

  const handleRateApp = () => {
    Alert.alert(
      'Rate FitAI',
      'Thank you for using FitAI! Your feedback helps us improve.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Rate on App Store', 
          onPress: () => {
            // TODO: Replace with actual app store URL
            Alert.alert('App Store', 'App Store link will be available after app publication.');
          }
        },
      ]
    );
  };

  const handleShareApp = () => {
    Alert.alert(
      'Share FitAI',
      'Invite your friends to join you on your fitness journey!',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Share', 
          onPress: () => {
            // TODO: Implement native sharing
            Alert.alert('Share', 'Native sharing will be implemented here.');
          }
        },
      ]
    );
  };

  const handleWebsite = () => {
    Alert.alert(
      'Visit Website',
      'Learn more about FitAI and our mission.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Website', 
          onPress: () => {
            Linking.openURL('https://fitai.app');
          }
        },
      ]
    );
  };

  const handleSocialMedia = (platform: string) => {
    const urls = {
      twitter: 'https://twitter.com/fitai_app',
      instagram: 'https://instagram.com/fitai_app',
      facebook: 'https://facebook.com/fitai.app',
      linkedin: 'https://linkedin.com/company/fitai',
    };

    const url = urls[platform as keyof typeof urls];
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Could not open social media link.');
      });
    }
  };

  const features = [
    {
      icon: '🤖',
      title: '100% AI-Powered',
      description: 'Every workout and meal plan is uniquely generated for you',
    },
    {
      icon: '🎯',
      title: 'Personalized Goals',
      description: 'Tailored fitness plans based on your specific objectives',
    },
    {
      icon: '📊',
      title: 'Smart Tracking',
      description: 'Comprehensive progress monitoring and analytics',
    },
    {
      icon: '🍎',
      title: 'Nutrition Planning',
      description: 'AI-generated meal plans with macro tracking',
    },
    {
      icon: '💪',
      title: 'Adaptive Workouts',
      description: 'Exercises that evolve with your fitness level',
    },
    {
      icon: '🔄',
      title: 'Real-time Sync',
      description: 'Seamless data synchronization across all devices',
    },
  ];

  const teamMembers = [
    { name: 'Alex Johnson', role: 'Founder & CEO', emoji: '👨‍💼' },
    { name: 'Sarah Chen', role: 'AI/ML Engineer', emoji: '👩‍💻' },
    { name: 'Mike Rodriguez', role: 'Fitness Expert', emoji: '🏋️‍♂️' },
    { name: 'Emily Davis', role: 'Nutritionist', emoji: '🥗' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>About FitAI</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* App Logo & Info */}
        <View style={styles.appSection}>
          <View style={styles.appLogo}>
            <Text style={styles.appLogoText}>FitAI</Text>
          </View>
          <Text style={styles.appName}>FitAI</Text>
          <Text style={styles.appTagline}>Your AI-Powered Fitness Companion</Text>
          <Text style={styles.appVersion}>Version {appVersion} ({buildNumber})</Text>
        </View>

        {/* Mission Statement */}
        <View style={styles.section}>
          <Card style={styles.missionCard} variant="elevated">
            <View style={styles.missionContent}>
              <Text style={styles.missionTitle}>Our Mission</Text>
              <Text style={styles.missionText}>
                To revolutionize personal fitness by making AI-powered, personalized health and 
                wellness accessible to everyone. We believe that fitness should be tailored to 
                your unique needs, goals, and lifestyle.
              </Text>
            </View>
          </Card>
        </View>

        {/* Key Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Features</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <Card key={index} style={styles.featureCard} variant="outlined">
                <View style={styles.featureContent}>
                  <Text style={styles.featureIcon}>{feature.icon}</Text>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </Card>
            ))}
          </View>
        </View>

        {/* Team */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meet the Team</Text>
          <View style={styles.teamGrid}>
            {teamMembers.map((member, index) => (
              <Card key={index} style={styles.teamCard} variant="outlined">
                <View style={styles.teamContent}>
                  <Text style={styles.teamEmoji}>{member.emoji}</Text>
                  <Text style={styles.teamName}>{member.name}</Text>
                  <Text style={styles.teamRole}>{member.role}</Text>
                </View>
              </Card>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support FitAI</Text>
          
          <Card style={styles.actionCard} variant="outlined">
            <TouchableOpacity onPress={handleRateApp}>
              <View style={styles.actionContent}>
                <Text style={styles.actionIcon}>⭐</Text>
                <View style={styles.actionInfo}>
                  <Text style={styles.actionTitle}>Rate the App</Text>
                  <Text style={styles.actionDescription}>
                    Help others discover FitAI by rating us
                  </Text>
                </View>
                <Text style={styles.actionArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </Card>

          <Card style={styles.actionCard} variant="outlined">
            <TouchableOpacity onPress={handleShareApp}>
              <View style={styles.actionContent}>
                <Text style={styles.actionIcon}>📤</Text>
                <View style={styles.actionInfo}>
                  <Text style={styles.actionTitle}>Share with Friends</Text>
                  <Text style={styles.actionDescription}>
                    Invite friends to join your fitness journey
                  </Text>
                </View>
                <Text style={styles.actionArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </Card>

          <Card style={styles.actionCard} variant="outlined">
            <TouchableOpacity onPress={handleWebsite}>
              <View style={styles.actionContent}>
                <Text style={styles.actionIcon}>🌐</Text>
                <View style={styles.actionInfo}>
                  <Text style={styles.actionTitle}>Visit Our Website</Text>
                  <Text style={styles.actionDescription}>
                    Learn more about FitAI and our services
                  </Text>
                </View>
                <Text style={styles.actionArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Social Media */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Follow Us</Text>
          
          <View style={styles.socialGrid}>
            <TouchableOpacity 
              style={styles.socialButton} 
              onPress={() => handleSocialMedia('twitter')}
            >
              <Text style={styles.socialIcon}>🐦</Text>
              <Text style={styles.socialText}>Twitter</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.socialButton} 
              onPress={() => handleSocialMedia('instagram')}
            >
              <Text style={styles.socialIcon}>📷</Text>
              <Text style={styles.socialText}>Instagram</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.socialButton} 
              onPress={() => handleSocialMedia('facebook')}
            >
              <Text style={styles.socialIcon}>📘</Text>
              <Text style={styles.socialText}>Facebook</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.socialButton} 
              onPress={() => handleSocialMedia('linkedin')}
            >
              <Text style={styles.socialIcon}>💼</Text>
              <Text style={styles.socialText}>LinkedIn</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          
          <Card style={styles.legalCard} variant="outlined">
            <TouchableOpacity onPress={() => Alert.alert('Terms of Service', 'Terms of service will be displayed here.')}>
              <View style={styles.legalContent}>
                <Text style={styles.legalText}>Terms of Service</Text>
                <Text style={styles.actionArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </Card>

          <Card style={styles.legalCard} variant="outlined">
            <TouchableOpacity onPress={() => Alert.alert('Privacy Policy', 'Privacy policy will be displayed here.')}>
              <View style={styles.legalContent}>
                <Text style={styles.legalText}>Privacy Policy</Text>
                <Text style={styles.actionArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </Card>

          <Card style={styles.legalCard} variant="outlined">
            <TouchableOpacity onPress={() => Alert.alert('Open Source', 'Open source licenses will be displayed here.')}>
              <View style={styles.legalContent}>
                <Text style={styles.legalText}>Open Source Licenses</Text>
                <Text style={styles.actionArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Copyright */}
        <View style={styles.copyrightSection}>
          <Text style={styles.copyrightText}>
            © 2024 FitAI Inc. All rights reserved.
          </Text>
          <Text style={styles.copyrightText}>
            Made with ❤️ for fitness enthusiasts worldwide
          </Text>
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
  
  appSection: {
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.xl,
  },
  
  appLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  
  appLogoText: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.white,
  },
  
  appName: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },
  
  appTagline: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.sm,
  },
  
  appVersion: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textMuted,
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
  
  missionCard: {
    padding: THEME.spacing.lg,
  },
  
  missionContent: {
    alignItems: 'center',
  },
  
  missionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
    marginBottom: THEME.spacing.md,
  },
  
  missionText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    lineHeight: 24,
    textAlign: 'center',
  },
  
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.md,
  },
  
  featureCard: {
    width: '47%',
    padding: THEME.spacing.md,
  },
  
  featureContent: {
    alignItems: 'center',
  },
  
  featureIcon: {
    fontSize: 32,
    marginBottom: THEME.spacing.sm,
  },
  
  featureTitle: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
    textAlign: 'center',
  },
  
  featureDescription: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.md,
  },
  
  teamCard: {
    width: '47%',
    padding: THEME.spacing.md,
  },
  
  teamContent: {
    alignItems: 'center',
  },
  
  teamEmoji: {
    fontSize: 32,
    marginBottom: THEME.spacing.sm,
  },
  
  teamName: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
    textAlign: 'center',
  },
  
  teamRole: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  
  actionCard: {
    marginBottom: THEME.spacing.sm,
  },
  
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  
  actionIcon: {
    fontSize: 24,
    marginRight: THEME.spacing.md,
  },
  
  actionInfo: {
    flex: 1,
  },
  
  actionTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
  },
  
  actionDescription: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
  },
  
  actionArrow: {
    fontSize: 20,
    color: THEME.colors.textMuted,
    fontWeight: THEME.fontWeight.bold,
  },
  
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.md,
  },
  
  socialButton: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.backgroundSecondary,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  
  socialIcon: {
    fontSize: 20,
    marginRight: THEME.spacing.sm,
  },
  
  socialText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
  },
  
  legalCard: {
    marginBottom: THEME.spacing.xs,
  },
  
  legalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: THEME.spacing.md,
  },
  
  legalText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
  },
  
  copyrightSection: {
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.xl,
  },
  
  copyrightText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginBottom: THEME.spacing.xs,
  },
  
  bottomSpacing: {
    height: THEME.spacing.xl,
  },
});