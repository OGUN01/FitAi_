import { AuthUser } from "../../types/user";

/**
 * Google Sign-In Result Interface
 */
export interface GoogleSignInResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  isNewUser?: boolean;
}

/**
 * Google Sign-in module types (conditionally imported)
 */
export interface GoogleSigninModule {
  GoogleSignin: any;
  statusCodes: any;
}

/**
 * Environment variable getter function type
 */
export type EnvVarGetter = (key: string) => string | null;
