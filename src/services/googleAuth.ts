import { supabase } from './supabase';
import { AuthResponse } from './auth';
import { AuthUser } from '../types/user';

/**
 * Google Authentication Service
 * Handles Google Sign-In integration with Supabase
 */

export interface GoogleSignInResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  isNewUser?: boolean;
}

class GoogleAuthService {
  private static instance: GoogleAuthService;

  private constructor() {}

  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  /**
   * Sign in with Google using Supabase Auth
   * This method will work with Expo's AuthSession for web/mobile
   */
  async signInWithGoogle(): Promise<GoogleSignInResult> {
    try {
      console.log('🔐 Starting Google Sign-In process...');

      // For Expo/React Native, we'll use Supabase's OAuth flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback` // Web redirect
            : 'fitai://auth/callback', // Deep link for mobile
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('❌ Google Sign-In error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // The OAuth flow will redirect to the callback URL
      // The actual user session will be handled by Supabase's auth state change
      console.log('✅ Google OAuth flow initiated');
      
      return {
        success: true,
      };
    } catch (error) {
      console.error('❌ Google Sign-In failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google Sign-In failed',
      };
    }
  }

  /**
   * Handle Google OAuth callback
   * This will be called when the OAuth flow completes
   */
  async handleGoogleCallback(url: string): Promise<GoogleSignInResult> {
    try {
      console.log('🔄 Handling Google OAuth callback...');

      // Extract the session from the callback URL
      const { data, error } = await supabase.auth.getSessionFromUrl(url);

      if (error) {
        console.error('❌ OAuth callback error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      if (!data.session?.user) {
        return {
          success: false,
          error: 'No user data received from Google',
        };
      }

      const user = data.session.user;
      const authUser: AuthUser = {
        id: user.id,
        email: user.email!,
        isEmailVerified: user.email_confirmed_at !== null,
        lastLoginAt: new Date().toISOString(),
      };

      // Check if this is a new user by looking for existing profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      const isNewUser = !profile;

      if (isNewUser) {
        // Create profile for new Google user
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            profile_picture: user.user_metadata?.avatar_url || null,
            units: 'metric',
            notifications_enabled: true,
            dark_mode: false,
          });

        if (profileError) {
          console.warn('⚠️ Failed to create profile for Google user:', profileError);
        }
      }

      console.log('✅ Google Sign-In successful');
      return {
        success: true,
        user: authUser,
        isNewUser,
      };
    } catch (error) {
      console.error('❌ Google callback handling failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth callback failed',
      };
    }
  }

  /**
   * Link Google account to existing user
   */
  async linkGoogleAccount(): Promise<GoogleSignInResult> {
    try {
      console.log('🔗 Linking Google account to existing user...');

      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
      });

      if (error) {
        console.error('❌ Google account linking error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      console.log('✅ Google account linked successfully');
      return {
        success: true,
      };
    } catch (error) {
      console.error('❌ Google account linking failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Account linking failed',
      };
    }
  }

  /**
   * Unlink Google account from user
   */
  async unlinkGoogleAccount(): Promise<GoogleSignInResult> {
    try {
      console.log('🔓 Unlinking Google account...');

      const { data, error } = await supabase.auth.unlinkIdentity({
        provider: 'google',
      });

      if (error) {
        console.error('❌ Google account unlinking error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      console.log('✅ Google account unlinked successfully');
      return {
        success: true,
      };
    } catch (error) {
      console.error('❌ Google account unlinking failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Account unlinking failed',
      };
    }
  }

  /**
   * Check if user has Google account linked
   */
  async isGoogleLinked(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return false;

      // Check if user has Google identity linked
      const googleIdentity = user.identities?.find(
        identity => identity.provider === 'google'
      );

      return !!googleIdentity;
    } catch (error) {
      console.error('❌ Failed to check Google link status:', error);
      return false;
    }
  }

  /**
   * Get Google user info if linked
   */
  async getGoogleUserInfo(): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      const googleIdentity = user.identities?.find(
        identity => identity.provider === 'google'
      );

      return googleIdentity?.identity_data || null;
    } catch (error) {
      console.error('❌ Failed to get Google user info:', error);
      return null;
    }
  }
}

export const googleAuthService = GoogleAuthService.getInstance();
export default googleAuthService;
