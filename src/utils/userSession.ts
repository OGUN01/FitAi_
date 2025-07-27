// Utility to get current user session info across the app
import { useAuth } from '../hooks/useAuth';

class UserSessionManager {
  private static instance: UserSessionManager;
  private currentUserId: string | null = null;

  private constructor() {}

  static getInstance(): UserSessionManager {
    if (!UserSessionManager.instance) {
      UserSessionManager.instance = new UserSessionManager();
    }
    return UserSessionManager.instance;
  }

  setUserId(userId: string | null): void {
    this.currentUserId = userId;
    console.log('👤 User session updated:', userId ? 'logged in' : 'logged out');
  }

  getUserId(): string {
    return this.currentUserId || 'guest_user';
  }

  isAuthenticated(): boolean {
    return this.currentUserId !== null && this.currentUserId !== 'guest_user';
  }

  // For development/demo purposes
  getDevUserId(): string {
    return this.currentUserId || 'demo_user_' + Date.now().toString().slice(-6);
  }
}

export const userSessionManager = UserSessionManager.getInstance();
export default userSessionManager;