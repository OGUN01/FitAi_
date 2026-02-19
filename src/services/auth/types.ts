import { AuthUser } from "../../types/user";

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
