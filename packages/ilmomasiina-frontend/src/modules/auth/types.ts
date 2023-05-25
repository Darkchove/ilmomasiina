export interface AccessToken {
  token: string;
  expiresAt: number; // Unix timestamp
}
export interface AuthState {
  accessToken?: AccessToken;
  loggedIn: boolean;
  loggingIn: boolean;
  loginError: boolean;
}

export type { AuthActions } from './actions';
