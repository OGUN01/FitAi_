import { supabase } from './supabase';
import type { AuthResponse } from './auth';
import type { AuthUser } from '../types/user';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';

// Conditionally import Google Sign-in only if not in Expo Go
let GoogleSignin: any = null;
let statusCodes: any = null;

try {
  // This will fail in Expo Go but succeed in dev/production builds
  const googleSigninModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSigninModule.GoogleSignin;
  statusCodes = googleSigninModule.statusCodes;
} catch (error) {
  console.warn('⚠️ Google Sign-in not available (running in Expo Go)');
}

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

    // Skip configuration if GoogleSignin is not available (Expo Go)
    if (!GoogleSignin) {
      console.warn('⚠️ Google Sign-in not configured - module not available');
      this.isConfigured = true;
      return;
    }

    try {
      if (Platform.OS !== 'web') {
        // Configure for mobile platforms (iOS/Android)
        // PRODUCTION BUILD FIX: Multi-strategy environment variable access
        const getEnvVar = (key: string): string | null => {
          try {
            // Strategy 1: Direct process.env access (works in development)
            const processEnvValue = process.env[key];
            if (processEnvValue) {
              return processEnvValue;
            }
            
            // Strategy 2: Constants.expoConfig access (production builds)
            const expoConfigValue = (Constants.expoConfig as any)?.[key];
            if (expoConfigValue) {
              return expoConfigValue;
            }
            
            // Strategy 3: Constants.expoConfig.extra access (CRITICAL for production)
            const extraValue = (Constants.expoConfig as any)?.extra?.[key];
            if (extraValue) {
              return extraValue;
            }
            
            // Strategy 4: Try manifest fallback (legacy support)
            const manifestValue = (Constants.manifest as any)?.extra?.[key];
            if (manifestValue) {
              return manifestValue;
            }
            
            if (Platform.OS === 'ios' || !key.includes('IOS')) {
              console.warn(`❌ ${key} not found in any location`);
            }
            return null;
          } catch (error) {
            console.error(`Error accessing ${key}:`, error);
            return null;
          }
        };

        
        const webClientId = getEnvVar('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID') || '';
        const iosClientId = getEnvVar('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID') || '';

        if (!webClientId) {
          console.warn('⚠️ CRITICAL: Web Client ID not found! Google Sign-In will fail.');
        }


        await GoogleSignin.configure({
          webClientId,
          iosClientId,
          offlineAccess: true,
          hostedDomain: '',
          forceCodeForRefreshToken: true,
        });
      }
      this.isConfigured = true;
    } catch (error) {
      console.warn('⚠️ Google Sign-In configuration failed:', error);
    }
  }

  /**
   * Sign in with Google using native implementation
   */
  async signInWithGoogle(): Promise<GoogleSignInResult> {
    try {

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
    // Return error if GoogleSignin is not available
    if (!GoogleSignin) {
      return {
        success: false,
        error: 'Google Sign-in is not available in Expo Go. Please use email authentication or build a development build.',
      };
    }

    try {
      // Check if device supports Google Play services
      await GoogleSignin.hasPlayServices();

      // Get user info from Google
      const userInfo: any = await GoogleSignin.signIn();

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
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      const isNewUser = !profile;

      if (isNewUser) {
        // Create basic profile for new Google user
        
        // Extract name from Google userInfo - try different possible structures
        const userName = userInfo?.data?.user?.name || 
                        userInfo?.user?.name || 
                        userInfo?.user?.givenName || 
                        userInfo?.displayName ||
                        userInfo?.name ||
                        'Google User';
        
        
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email!,
          name: userName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (profileError) {
          console.warn('⚠️ Failed to create profile for Google user:', profileError);
          console.warn('⚠️ Profile error details:', JSON.stringify(profileError, null, 2));
        } else {
        }
      } else {
      }

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
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      const isNewUser = !profile;

      if (isNewUser) {
        // Create profile for new Google user
        const { error: profileError } = await supabase.from('profiles').insert({
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
    } catch (error) {
      console.error('❌ Google Sign-Out failed:', error);
    }
  }

  /**
   * Link Google account to existing user
   */
  async linkGoogleAccount(): Promise<GoogleSignInResult> {
    try {

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
