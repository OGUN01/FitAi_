import { supabase } from './supabase';
import { AuthResponse } from './auth';
import { AuthUser } from '../types/user';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';

/**
 * Google Authentication Service
 * Handles Google Sign-In integration with Supabase for React Native and Web
 */

export interface GoogleSignInResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  isNewUser?: boolean;
}

class GoogleAuthService {
  private static instance: GoogleAuthService;
  private isConfigured = false;

  private constructor() {}

  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  /**
   * Configure Google Sign-In
   * Call this once during app initialization
   */
  async configure(): Promise<void> {
    if (this.isConfigured) return;

    try {
      if (Platform.OS !== 'web') {
        // Configure for mobile platforms (iOS/Android)
        await GoogleSignin.configure({
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '', // You'll need to set this
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '', // You'll need to set this
          offlineAccess: true,
          hostedDomain: '',
          forceCodeForRefreshToken: true,
        });
      }
      this.isConfigured = true;
      console.log('✅ Google Sign-In configured successfully');
    } catch (error) {
      console.error('❌ Google Sign-In configuration failed:', error);
    }
  }

  /**
   * Sign in with Google using native implementation
   */
  async signInWithGoogle(): Promise<GoogleSignInResult> {
    try {
      console.log('🔐 Starting Google Sign-In process...');

      // Ensure configuration is done
      await this.configure();

      if (Platform.OS === 'web') {
        return await this.signInWithGoogleWeb();
      } else {
        return await this.signInWithGoogleNative();
      }
    } catch (error) {
      console.error('❌ Google Sign-In failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google Sign-In failed',
      };
    }
  }

  /**
   * Native Google Sign-In for iOS/Android
   */
  private async signInWithGoogleNative(): Promise<GoogleSignInResult> {
    try {
      // Check if device supports Google Play services
      await GoogleSignin.hasPlayServices();

      // Get user info from Google
      const userInfo: any = await GoogleSignin.signIn();
      console.log('✅ Google Sign-In successful');

      // Get ID token for Supabase
      const tokens = await GoogleSignin.getTokens();

      if (!tokens.idToken) {
        throw new Error('No ID token received from Google');
      }

      // Sign in to Supabase with Google ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: tokens.idToken,
      });

      if (error) {
        console.error('❌ Supabase Google Sign-In error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'No user data received from authentication',
        };
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email!,
        isEmailVerified: true, // Google accounts are always verified
        lastLoginAt: new Date().toISOString(),
      };

      // Check if this is a new user
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      const isNewUser = !profile;

      if (isNewUser) {
        // Create basic profile for new Google user
        const { error: profileError } = await supabase.from('user_profiles').insert({
          id: data.user.id,
          email: data.user.email!,
          name: (userInfo as any)?.user?.name || (userInfo as any)?.user?.givenName || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (profileError) {
          console.warn('⚠️ Failed to create profile for Google user:', profileError);
        }
      }

      console.log('✅ Google Sign-In completed successfully');
      return {
        success: true,
        user: authUser,
        isNewUser,
      };
    } catch (error: any) {
      console.error('❌ Native Google Sign-In error:', error);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return {
          success: false,
          error: 'Sign-in was cancelled',
        };
      } else if (error.code === statusCodes.IN_PROGRESS) {
        return {
          success: false,
          error: 'Sign-in is already in progress',
        };
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return {
          success: false,
          error: 'Google Play services not available',
        };
      }

      return {
        success: false,
        error: error.message || 'Google Sign-In failed',
      };
    }
  }

  /**
   * Web Google Sign-In using Expo AuthSession
   */
  private async signInWithGoogleWeb(): Promise<GoogleSignInResult> {
    try {
      // Generate random state for security
      const state = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString(),
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      // Use Supabase OAuth for web
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo:
            Platform.OS === 'web' && typeof window !== 'undefined' && window.location
              ? `${window.location.origin}/auth/callback`
              : 'exp://localhost:8081/--/auth/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            state,
          },
        },
      });

      if (error) {
        console.error('❌ Web Google Sign-In error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // For web, the OAuth flow will handle the redirect
      console.log('✅ Google OAuth flow initiated for web');
      return {
        success: true,
      };
    } catch (error) {
      console.error('❌ Web Google Sign-In failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google Sign-In failed',
      };
    }
  }

  /**
   * Handle Google OAuth callback (mainly for web)
   * This will be called when the OAuth flow completes
   */
  async handleGoogleCallback(url: string): Promise<GoogleSignInResult> {
    try {
      console.log('🔄 Handling Google OAuth callback...');

      // Extract the session from the callback URL
      const code = new URL(url).searchParams.get('code') || '';
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

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
        isEmailVerified: true, // Google accounts are always verified
        lastLoginAt: new Date().toISOString(),
      };

      // Check if this is a new user by looking for existing profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      const isNewUser = !profile;

      if (isNewUser) {
        // Create profile for new Google user
        const { error: profileError } = await supabase.from('user_profiles').insert({
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
   * Sign out from Google
   */
  async signOut(): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        // Sign out from Google on mobile
        await GoogleSignin.signOut();
      }
      console.log('✅ Google Sign-Out successful');
    } catch (error) {
      console.error('❌ Google Sign-Out failed:', error);
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

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        return { success: false, error: userErr?.message || 'No authenticated user' };
      }
      const googleIdentity = user.identities?.find((i) => i.provider === 'google');
      if (!googleIdentity) {
        return { success: false, error: 'No Google identity linked' };
      }
      const { data, error } = await supabase.auth.unlinkIdentity(googleIdentity);

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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return false;

      // Check if user has Google identity linked
      const googleIdentity = user.identities?.find((identity) => identity.provider === 'google');

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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const googleIdentity = user.identities?.find((identity) => identity.provider === 'google');

      return googleIdentity?.identity_data || null;
    } catch (error) {
      console.error('❌ Failed to get Google user info:', error);
      return null;
    }
  }
}

export const googleAuthService = GoogleAuthService.getInstance();
export default googleAuthService;
