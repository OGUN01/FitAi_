import { supabase } from './supabase';
import { AuthUser, LoginCredentials, RegisterCredentials } from '../types/user';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

class AuthService {
  private static instance: AuthService;
  private currentSession: AuthSession | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Register a new user with email and password
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const { email, password, confirmPassword } = credentials;

      // Validate passwords match
      if (password !== confirmPassword) {
        return {
          success: false,
          error: 'Passwords do not match',
        };
      }

      // Validate password strength
      if (password.length < 8) {
        return {
          success: false,
          error: 'Password must be at least 8 characters long',
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // We'll handle email verification in-app
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      if (data.user && data.session) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email!,
          isEmailVerified: data.user.email_confirmed_at !== null,
          lastLoginAt: new Date().toISOString(),
        };

        // Save session for persistence
        const session: AuthSession = {
          user: authUser,
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at || 0,
        };

        this.currentSession = session;
        await AsyncStorage.setItem('auth_session', JSON.stringify(session));

        return {
          success: true,
          user: authUser,
        };
      }

      return {
        success: false,
        error: 'Registration failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  /**
   * Sign in with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { email, password } = credentials;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      if (data.user && data.session) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email!,
          isEmailVerified: data.user.email_confirmed_at !== null,
          lastLoginAt: new Date().toISOString(),
        };

        // Store session
        this.currentSession = {
          user: authUser,
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at || 0,
        };

        // Store session in AsyncStorage for persistence
        await AsyncStorage.setItem('auth_session', JSON.stringify(this.currentSession));

        return {
          success: true,
          user: authUser,
        };
      }

      return {
        success: false,
        error: 'Login failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  /**
   * Sign out the current user
   */
  async logout(): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // Clear local session
      this.currentSession = null;
      await AsyncStorage.removeItem('auth_session');

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      };
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: undefined, // We'll handle password reset in-app
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password reset failed',
      };
    }
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(email: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email verification failed',
      };
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(): AuthSession | null {
    return this.currentSession;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentSession !== null;
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentSession?.user || null;
  }

  /**
   * Restore session from AsyncStorage
   */
  async restoreSession(): Promise<AuthResponse> {
    try {
      const sessionData = await AsyncStorage.getItem('auth_session');
      if (sessionData) {
        const session: AuthSession = JSON.parse(sessionData);
        
        // Check if session is still valid
        if (session.expiresAt > Date.now() / 1000) {
          this.currentSession = session;
          return {
            success: true,
            user: session.user,
          };
        } else {
          // Session expired, clear it
          await AsyncStorage.removeItem('auth_session');
        }
      }

      // Try to get session from Supabase
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      if (session && session.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email!,
          isEmailVerified: session.user.email_confirmed_at !== null,
          lastLoginAt: new Date().toISOString(),
        };

        this.currentSession = {
          user: authUser,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at || 0,
        };

        await AsyncStorage.setItem('auth_session', JSON.stringify(this.currentSession));

        return {
          success: true,
          user: authUser,
        };
      }

      return {
        success: false,
        error: 'No valid session found',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Session restoration failed',
      };
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email!,
          isEmailVerified: session.user.email_confirmed_at !== null,
          lastLoginAt: new Date().toISOString(),
        };

        this.currentSession = {
          user: authUser,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at || 0,
        };

        await AsyncStorage.setItem('auth_session', JSON.stringify(this.currentSession));
        callback(authUser);
      } else if (event === 'SIGNED_OUT') {
        this.currentSession = null;
        await AsyncStorage.removeItem('auth_session');
        callback(null);
      }
    });
  }
}

export const authService = AuthService.getInstance();
export default authService;
