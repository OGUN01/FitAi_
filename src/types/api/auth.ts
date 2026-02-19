// Authentication API types

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: AuthenticatedUser;
  token: string;
  refreshToken: string;
  expiresAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  acceptTerms: boolean;
}

export interface RegisterResponse {
  user: AuthenticatedUser;
  token: string;
  refreshToken: string;
  emailVerificationRequired: boolean;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  isEmailVerified: boolean;
  profilePicture?: string;
  createdAt: string;
  lastLoginAt: string;
  subscription?: UserSubscription;
}

export interface UserSubscription {
  plan: "free" | "premium" | "pro";
  status: "active" | "cancelled" | "expired" | "trial";
  expiresAt?: string;
  features: string[];
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  expiresAt: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}
