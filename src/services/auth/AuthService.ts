import {
  LoginCredentials,
  RegisterCredentials,
  AuthUser,
} from "../../types/user";
import { AuthResponse, AuthSession } from "./types";
import { GoogleSignInResult } from "../googleAuth";
import * as registerModule from "./register";
import * as loginModule from "./login";
import * as sessionModule from "./session";
import * as passwordModule from "./password";
import * as googleModule from "./google";

class AuthService {
  private static instance: AuthService;
  private currentSession: AuthSession | null = null;

  private constructor() {
    this.initializeGoogleAuth();
  }

  private async initializeGoogleAuth(): Promise<void> {
    await googleModule.initializeGoogleAuth();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    return await registerModule.register(credentials, (session) => {
      this.currentSession = session;
    });
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return await loginModule.login(credentials, (session) => {
      this.currentSession = session;
    });
  }

  async logout(): Promise<AuthResponse> {
    return await loginModule.logout((session) => {
      this.currentSession = session;
    });
  }

  async resetPassword(email: string): Promise<AuthResponse> {
    return await passwordModule.resetPassword(email);
  }

  async resendEmailVerification(email: string): Promise<AuthResponse> {
    return await registerModule.resendEmailVerification(email);
  }

  async checkEmailVerification(
    email: string,
  ): Promise<{ isVerified: boolean; error?: string }> {
    return await registerModule.checkEmailVerification(email);
  }

  getCurrentSession(): AuthSession | null {
    return sessionModule.getCurrentSession(this.currentSession);
  }

  isAuthenticated(): boolean {
    return sessionModule.isAuthenticated(this.currentSession);
  }

  getCurrentUser(): AuthUser | null {
    return sessionModule.getCurrentUser(this.currentSession);
  }

  async restoreSession(): Promise<AuthResponse> {
    return await sessionModule.restoreSession((session) => {
      this.currentSession = session;
    });
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return sessionModule.onAuthStateChange(callback, (session) => {
      this.currentSession = session;
    });
  }

  async signInWithGoogle(): Promise<GoogleSignInResult> {
    return await googleModule.signInWithGoogle();
  }

  async handleGoogleCallback(url: string): Promise<GoogleSignInResult> {
    return await googleModule.handleGoogleCallback(url);
  }

  async linkGoogleAccount(): Promise<GoogleSignInResult> {
    return await googleModule.linkGoogleAccount();
  }

  async unlinkGoogleAccount(): Promise<GoogleSignInResult> {
    return await googleModule.unlinkGoogleAccount();
  }

  async isGoogleLinked(): Promise<boolean> {
    return await googleModule.isGoogleLinked();
  }

  async getGoogleUserInfo(): Promise<any> {
    return await googleModule.getGoogleUserInfo();
  }
}

export { AuthService };
export const authService = AuthService.getInstance();
export default authService;
