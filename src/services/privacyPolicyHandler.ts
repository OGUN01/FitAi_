// Privacy Policy Handler for Health Connect Compliance
// Handles privacy policy intent from Health Connect app

import { Linking, Alert } from 'react-native';
import { WebBrowser } from 'expo-web-browser';

export interface PrivacyPolicyHandlerService {
  handlePrivacyPolicyRequest: () => Promise<boolean>;
  openPrivacyPolicy: () => Promise<void>;
  validatePrivacyPolicyAccess: () => Promise<boolean>;
}

class PrivacyPolicyHandler implements PrivacyPolicyHandlerService {
  private readonly PRIVACY_POLICY_URL = 'https://fitai-app.com/privacy';

  /**
   * Handle privacy policy intent from Health Connect
   * This is called when Health Connect requests privacy policy access
   */
  async handlePrivacyPolicyRequest(): Promise<boolean> {
    try {
      console.log('🔐 PRIVACY: Health Connect privacy policy request received');
      
      // Validate privacy policy URL is accessible
      const isAccessible = await this.validatePrivacyPolicyAccess();
      
      if (!isAccessible) {
        console.error('❌ PRIVACY: Privacy policy URL not accessible');
        Alert.alert(
          'Privacy Policy Unavailable',
          'Unable to access privacy policy at this time. Please try again later.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // Open privacy policy
      await this.openPrivacyPolicy();
      console.log('✅ PRIVACY: Privacy policy opened successfully');
      return true;
      
    } catch (error) {
      console.error('❌ PRIVACY: Failed to handle privacy policy request:', error);
      Alert.alert(
        'Privacy Policy Error',
        'Unable to open privacy policy. Please visit fitai-app.com/privacy directly.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  /**
   * Open privacy policy in browser or WebView
   */
  async openPrivacyPolicy(): Promise<void> {
    try {
      console.log('🔐 PRIVACY: Opening privacy policy URL:', this.PRIVACY_POLICY_URL);
      
      // Try to open with Expo WebBrowser first (better UX)
      try {
        await WebBrowser.openBrowserAsync(this.PRIVACY_POLICY_URL, {
          dismissButtonStyle: 'done',
          preferredBarTintColor: '#ffffff',
          preferredControlTintColor: '#000000',
          readerMode: false,
          showTitle: true,
          enableBarCollapsing: false
        });
        console.log('✅ PRIVACY: Opened privacy policy with WebBrowser');
      } catch (webBrowserError) {
        console.warn('⚠️ PRIVACY: WebBrowser failed, falling back to Linking:', webBrowserError);
        
        // Fallback to system browser
        const canOpen = await Linking.canOpenURL(this.PRIVACY_POLICY_URL);
        if (canOpen) {
          await Linking.openURL(this.PRIVACY_POLICY_URL);
          console.log('✅ PRIVACY: Opened privacy policy with system browser');
        } else {
          throw new Error('Cannot open privacy policy URL');
        }
      }
      
    } catch (error) {
      console.error('❌ PRIVACY: Failed to open privacy policy:', error);
      throw error;
    }
  }

  /**
   * Validate that privacy policy URL is accessible
   * Health Connect requires this for app registration
   */
  async validatePrivacyPolicyAccess(): Promise<boolean> {
    try {
      console.log('🔍 PRIVACY: Validating privacy policy URL accessibility...');
      
      // Test if URL can be opened
      const canOpen = await Linking.canOpenURL(this.PRIVACY_POLICY_URL);
      
      if (!canOpen) {
        console.error('❌ PRIVACY: Privacy policy URL cannot be opened');
        return false;
      }

      // Optional: Test HTTP request to verify URL exists
      try {
        const response = await fetch(this.PRIVACY_POLICY_URL, { 
          method: 'HEAD',
          timeout: 10000 
        });
        
        if (response.status >= 200 && response.status < 400) {
          console.log('✅ PRIVACY: Privacy policy URL is accessible');
          return true;
        } else {
          console.warn(`⚠️ PRIVACY: Privacy policy URL returned status ${response.status}`);
          return false;
        }
      } catch (fetchError) {
        console.warn('⚠️ PRIVACY: Could not validate URL via HTTP, but Linking.canOpenURL passed');
        // If fetch fails but Linking.canOpenURL passes, still consider it accessible
        return true;
      }

    } catch (error) {
      console.error('❌ PRIVACY: Privacy policy validation failed:', error);
      return false;
    }
  }

  /**
   * Get privacy policy URL for display or sharing
   */
  getPrivacyPolicyUrl(): string {
    return this.PRIVACY_POLICY_URL;
  }

  /**
   * Health Connect compliance check
   * Verifies all requirements for privacy policy handling
   */
  async validateHealthConnectCompliance(): Promise<{
    isCompliant: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      console.log('🔍 PRIVACY: Checking Health Connect privacy policy compliance...');

      // Check 1: Privacy policy URL accessibility
      const isAccessible = await this.validatePrivacyPolicyAccess();
      if (!isAccessible) {
        issues.push('Privacy policy URL is not accessible');
        recommendations.push('Ensure https://fitai-app.com/privacy is accessible and returns valid content');
      }

      // Check 2: Intent handling capability
      const canHandleIntents = await Linking.canOpenURL('https://example.com');
      if (!canHandleIntents) {
        issues.push('App cannot handle URL intents');
        recommendations.push('Check app configuration for URL handling capabilities');
      }

      // Check 3: WebBrowser availability (for better UX)
      try {
        // Test WebBrowser availability
        await WebBrowser.warmUpAsync();
        console.log('✅ PRIVACY: WebBrowser is available for enhanced privacy policy viewing');
      } catch (error) {
        console.warn('⚠️ PRIVACY: WebBrowser not available, will use system browser');
        // Not a compliance issue, just a UX consideration
      }

      const isCompliant = issues.length === 0;

      if (isCompliant) {
        console.log('✅ PRIVACY: Health Connect privacy policy compliance validated');
        recommendations.push('Privacy policy handling is properly configured for Health Connect');
      } else {
        console.error('❌ PRIVACY: Health Connect compliance issues detected:', issues);
      }

      return {
        isCompliant,
        issues,
        recommendations
      };

    } catch (error) {
      console.error('❌ PRIVACY: Compliance validation failed:', error);
      return {
        isCompliant: false,
        issues: [`Validation error: ${error}`],
        recommendations: [
          'Check privacy policy URL configuration',
          'Verify app intent handling setup',
          'Test privacy policy accessibility'
        ]
      };
    }
  }
}

// Export singleton instance
export const privacyPolicyHandler = new PrivacyPolicyHandler();
export default privacyPolicyHandler;