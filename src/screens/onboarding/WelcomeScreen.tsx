import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ImageBackground,
} from 'react-native'
import { SafeAreaView } from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Button, THEME } from '../../components/ui';

// REMOVED: Module-level Dimensions.get() causes crash - use rw/rh functions instead
// const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onLogin?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onGetStarted,
  onLogin,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundGradient}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>FitAI</Text>
            </View>
          </View>
          
          <Text style={styles.title}>
            Your AI-Powered{'\n'}Fitness Journey
          </Text>
          
          <Text style={styles.subtitle}>
            Transform your body with personalized workouts,{'\n'}
            smart nutrition plans, and AI-driven insights
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <FeatureItem
            icon="🤖"
            title="AI Personal Trainer"
            description="Get customized workouts based on your goals"
          />
          
          <FeatureItem
            icon="🍎"
            title="Smart Nutrition"
            description="Personalized meal plans and calorie tracking"
          />
          
          <FeatureItem
            icon="📊"
            title="Progress Tracking"
            description="Monitor your transformation with detailed analytics"
          />
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Button
            title="Get Started"
            onPress={onGetStarted}
            variant="primary"
            size="lg"
            fullWidth
            style={styles.getStartedButton}
          />

          {onLogin && (
            <Button
              title="Already have an account? Sign In"
              onPress={onLogin}
              variant="outline"
              size="lg"
              fullWidth
              style={styles.loginButton}
            />
          )}

          <Text style={styles.termsText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description }) => (
  <View style={styles.featureItem}>
    <View style={styles.featureIcon}>
      <Text style={styles.featureIconText}>{icon}</Text>
    </View>
    
    <View style={styles.featureContent}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },
  
  backgroundGradient: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },
  
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.xxl,
  },
  
  logoContainer: {
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  
  logo: {
    width: rw(80),
    height: rh(80),
    borderRadius: ResponsiveTheme.borderRadius.xxl,
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME.shadows.lg,
  },
  
  logoText: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
  },
  
  title: {
    fontSize: ResponsiveTheme.fontSize.xxxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: rf(40),
  },
  
  subtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(24),
    paddingHorizontal: ResponsiveTheme.spacing.md,
  },
  
  featuresSection: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.xl,
  },
  
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.lg,
    paddingHorizontal: ResponsiveTheme.spacing.md,
  },
  
  featureIcon: {
    width: rw(48),
    height: rh(48),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ResponsiveTheme.spacing.md,
  },
  
  featureIconText: {
    fontSize: rf(24),
  },
  
  featureContent: {
    flex: 1,
  },
  
  featureTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  
  featureDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
  },
  
  ctaSection: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.xl,
  },
  
  getStartedButton: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  loginButton: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  termsText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: rf(16),
  },
});
