import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { Button, THEME } from '../../components/ui';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
    backgroundColor: THEME.colors.background,
  },
  
  backgroundGradient: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.xxl,
  },
  
  logoContainer: {
    marginBottom: THEME.spacing.xl,
  },
  
  logo: {
    width: 80,
    height: 80,
    borderRadius: THEME.borderRadius.xxl,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME.shadows.lg,
  },
  
  logoText: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.white,
  },
  
  title: {
    fontSize: THEME.fontSize.xxxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: THEME.spacing.md,
    lineHeight: 40,
  },
  
  subtitle: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: THEME.spacing.md,
  },
  
  featuresSection: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.xl,
  },
  
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
    paddingHorizontal: THEME.spacing.md,
  },
  
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.md,
  },
  
  featureIconText: {
    fontSize: 24,
  },
  
  featureContent: {
    flex: 1,
  },
  
  featureTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },
  
  featureDescription: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },
  
  ctaSection: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xl,
  },
  
  getStartedButton: {
    marginBottom: THEME.spacing.md,
  },

  loginButton: {
    marginBottom: THEME.spacing.lg,
  },

  termsText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
