// ============================================================================
// BatchGuard Amazon Cognito Authentication Service
// Manages Cognito User Pool authentication, token lifecycle, JWT decoding,
// session persistence, automatic token renewal, TOTP MFA challenge response,
// and safe development fallback.
// ============================================================================

export interface UserSession {
  sub: string;
  username: string;
  email: string;
  orgId: string;
  roles: string[];
  isDevMode?: boolean;
}

export interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

export interface LoginResult {
  session?: UserSession;
  mfaRequired?: boolean;
  challengeName?: string;
  challengeSession?: string;
  username?: string;
}

type AuthChangeListener = (session: UserSession | null) => void;
type SessionExpiredListener = () => void;

const STORAGE_KEYS = {
  ID_TOKEN: 'batchguard_id_token',
  ACCESS_TOKEN: 'batchguard_access_token',
  REFRESH_TOKEN: 'batchguard_refresh_token',
  EXPIRES_AT: 'batchguard_expires_at',
  USER_SESSION: 'batchguard_user_session',
};

// Safe storage access (supports SSR or sandboxed environments)
function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch {
    // SessionStorage restricted
  }
  return null;
}

/**
 * Base64URL-decode a JWT payload without external dependencies.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Failed to decode JWT payload:', err);
    return null;
  }
}

class AuthService {
  private userPoolId: string;
  private clientId: string;
  private region: string;
  private currentSession: UserSession | null = null;
  private authChangeListeners: Set<AuthChangeListener> = new Set();
  private sessionExpiredListeners: Set<SessionExpiredListener> = new Set();
  private isRefreshing = false;

  constructor() {
    this.userPoolId = (import.meta.env.VITE_COGNITO_USER_POOL_ID || '').trim();
    this.clientId = (import.meta.env.VITE_COGNITO_CLIENT_ID || '').trim();
    this.region = (import.meta.env.VITE_AWS_REGION || 'us-east-1').trim();

    this.restoreSession();
  }

  public isCognitoConfigured(): boolean {
    return Boolean(this.userPoolId && this.clientId && !this.userPoolId.includes('ExamplePoolId'));
  }

  public getSession(): UserSession | null {
    return this.currentSession;
  }

  public isAuthenticated(): boolean {
    if (!this.currentSession) return false;
    const expiresAt = this.getStoredExpiresAt();
    if (!expiresAt) return false;
    return Date.now() < expiresAt;
  }

  /**
   * Retrieves a valid ID token for Authorization: Bearer <token>.
   * Automatically refreshes if token is expiring within 60 seconds.
   */
  public async getIdToken(): Promise<string | null> {
    const storage = getStorage();
    if (!storage) return null;

    const idToken = storage.getItem(STORAGE_KEYS.ID_TOKEN);
    const expiresAt = this.getStoredExpiresAt();

    if (!idToken || !expiresAt) {
      return null;
    }

    // If token expires in less than 60 seconds, attempt proactive background refresh
    if (Date.now() >= expiresAt - 60000) {
      const refreshed = await this.refreshSession();
      if (refreshed) {
        return storage.getItem(STORAGE_KEYS.ID_TOKEN);
      }
    }

    // If completely expired, return null
    if (Date.now() >= expiresAt) {
      this.handleUnauthorized();
      return null;
    }

    return idToken;
  }

  /**
   * Authenticate against Amazon Cognito User Pool via standard InitiateAuth API.
   * Handles immediate AuthenticationResult or returns MFA challenge requirements.
   */
  public async login(username: string, password: string): Promise<LoginResult> {
    if (!this.isCognitoConfigured()) {
      // In development mode when Cognito variables are unconfigured, provide a safe dev officer session
      const devSession = this.loginDev({
        username,
        email: username.includes('@') ? username : `${username}@batchguard.internal`,
      });
      return { session: devSession };
    }

    const endpoint = `https://cognito-idp.${this.region}.amazonaws.com/`;

    const requestBody = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: this.clientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorCode = data.__type || data.code || 'AuthenticationError';
      const errorMessage = data.message || 'Cognito authentication failed.';
      throw new Error(`[${errorCode}] ${errorMessage}`);
    }

    // Handle MFA Challenge (e.g. SOFTWARE_TOKEN_MFA or SMS_MFA)
    if (data.ChallengeName) {
      if (data.ChallengeName === 'SOFTWARE_TOKEN_MFA' || data.ChallengeName === 'SMS_MFA') {
        return {
          mfaRequired: true,
          challengeName: data.ChallengeName,
          challengeSession: data.Session,
          username,
        };
      }
      throw new Error(`Cognito challenge '${data.ChallengeName}' is not currently supported in this client.`);
    }

    const result = data.AuthenticationResult;
    if (!result || !result.IdToken) {
      throw new Error('Authentication challenge required or missing authentication tokens.');
    }

    const session = this.processAuthResult(result, username);
    return { session };
  }

  /**
   * Completes authentication by responding to a SOFTWARE_TOKEN_MFA challenge.
   */
  public async respondToMfaChallenge(
    username: string,
    challengeSession: string,
    mfaCode: string
  ): Promise<UserSession> {
    const endpoint = `https://cognito-idp.${this.region}.amazonaws.com/`;

    const requestBody = {
      ChallengeName: 'SOFTWARE_TOKEN_MFA',
      ClientId: this.clientId,
      ChallengeResponses: {
        USERNAME: username,
        SOFTWARE_TOKEN_MFA_CODE: mfaCode,
      },
      Session: challengeSession,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorCode = data.__type || data.code || 'AuthenticationError';
      const errorMessage = data.message || 'MFA verification failed.';
      throw new Error(`[${errorCode}] ${errorMessage}`);
    }

    const result = data.AuthenticationResult;
    if (!result || !result.IdToken) {
      throw new Error('MFA challenge failed: No authentication tokens received.');
    }

    return this.processAuthResult(result, username);
  }

  /**
   * Processes successful Cognito AuthenticationResult, persists tokens, and notifies listeners.
   */
  private processAuthResult(
    result: { IdToken: string; AccessToken: string; RefreshToken?: string; ExpiresIn?: number },
    username: string
  ): UserSession {
    const expiresInSeconds = result.ExpiresIn || 3600;
    const expiresAt = Date.now() + expiresInSeconds * 1000;

    const tokens: AuthTokens = {
      idToken: result.IdToken,
      accessToken: result.AccessToken,
      refreshToken: result.RefreshToken,
      expiresAt,
    };

    const payload = decodeJwtPayload(result.IdToken) || {};
    const roles: string[] = Array.isArray(payload['cognito:groups'])
      ? (payload['cognito:groups'] as string[])
      : typeof payload['cognito:groups'] === 'string'
      ? (payload['cognito:groups'] as string).split(',')
      : ['COMPLIANCE_OFFICER'];

    const session: UserSession = {
      sub: (payload.sub as string) || username,
      username: (payload['cognito:username'] as string) || username,
      email: (payload.email as string) || username,
      orgId: (payload['custom:org_id'] as string) || (payload.org_id as string) || 'ORG#apex-foods-north-america',
      roles,
      isDevMode: false,
    };

    this.saveTokens(tokens, session);
    this.currentSession = session;
    this.notifyAuthChange(session);

    return session;
  }

  /**
   * Safe local development authentication fallback when Cognito is unconfigured.
   * Generates a local mock session with a synthetic token to enable testing.
   */
  public loginDev(customFields?: Partial<UserSession>): UserSession {
    const expiresAt = Date.now() + 8 * 3600 * 1000; // 8 hours for dev session

    const session: UserSession = {
      sub: customFields?.sub || 'usr-dev-officer-001',
      username: customFields?.username || 'sarah.chen',
      email: customFields?.email || 'sarah.chen@apexnutrition.internal',
      orgId: customFields?.orgId || 'ORG#apex-foods-north-america',
      roles: customFields?.roles || ['COMPLIANCE_OFFICER', 'ADMIN'],
      isDevMode: true,
    };

    // Synthetic development token (contains recognizable header & payload for dev inspection)
    const devPayload = {
      sub: session.sub,
      email: session.email,
      'custom:org_id': session.orgId,
      'cognito:groups': session.roles,
      exp: Math.floor(expiresAt / 1000),
      iss: 'https://cognito-idp.us-east-1.amazonaws.com/dev-local',
    };

    const b64Payload = btoa(JSON.stringify(devPayload));
    const syntheticIdToken = `dev.mock.${b64Payload}.signature`;

    const tokens: AuthTokens = {
      idToken: syntheticIdToken,
      accessToken: syntheticIdToken,
      expiresAt,
    };

    this.saveTokens(tokens, session);
    this.currentSession = session;
    this.notifyAuthChange(session);

    return session;
  }

  /**
   * Refreshes the Cognito session using the stored RefreshToken.
   */
  public async refreshSession(): Promise<boolean> {
    if (this.isRefreshing) return false;
    this.isRefreshing = true;

    try {
      const storage = getStorage();
      if (!storage) return false;

      const refreshToken = storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

      // In dev mode, simply renew timestamp
      if (this.currentSession?.isDevMode) {
        const newExpiresAt = Date.now() + 8 * 3600 * 1000;
        storage.setItem(STORAGE_KEYS.EXPIRES_AT, newExpiresAt.toString());
        return true;
      }

      if (!refreshToken || !this.isCognitoConfigured()) {
        return false;
      }

      const endpoint = `https://cognito-idp.${this.region}.amazonaws.com/`;

      const requestBody = {
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const result = data.AuthenticationResult;

      if (!result || !result.IdToken) {
        return false;
      }

      const expiresInSeconds = result.ExpiresIn || 3600;
      const expiresAt = Date.now() + expiresInSeconds * 1000;

      storage.setItem(STORAGE_KEYS.ID_TOKEN, result.IdToken);
      storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, result.AccessToken);
      storage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());

      return true;
    } catch (err) {
      console.error('Session refresh failed:', err);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  public logout(): void {
    const storage = getStorage();
    if (storage) {
      storage.removeItem(STORAGE_KEYS.ID_TOKEN);
      storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      storage.removeItem(STORAGE_KEYS.EXPIRES_AT);
      storage.removeItem(STORAGE_KEYS.USER_SESSION);
    }
    this.currentSession = null;
    this.notifyAuthChange(null);
  }

  public handleUnauthorized(): void {
    this.logout();
    this.notifySessionExpired();
  }

  public onAuthChange(callback: AuthChangeListener): () => void {
    this.authChangeListeners.add(callback);
    return () => this.authChangeListeners.delete(callback);
  }

  public onSessionExpired(callback: SessionExpiredListener): () => void {
    this.sessionExpiredListeners.add(callback);
    return () => this.sessionExpiredListeners.delete(callback);
  }

  private notifyAuthChange(session: UserSession | null): void {
    this.authChangeListeners.forEach((cb) => {
      try {
        cb(session);
      } catch (err) {
        console.error('Error in auth listener:', err);
      }
    });
  }

  private notifySessionExpired(): void {
    this.sessionExpiredListeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Error in session expired listener:', err);
      }
    });
  }

  private saveTokens(tokens: AuthTokens, session: UserSession): void {
    const storage = getStorage();
    if (!storage) return;

    storage.setItem(STORAGE_KEYS.ID_TOKEN, tokens.idToken);
    storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    if (tokens.refreshToken) {
      storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    }
    storage.setItem(STORAGE_KEYS.EXPIRES_AT, tokens.expiresAt.toString());
    storage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
  }

  private restoreSession(): void {
    const storage = getStorage();
    if (!storage) return;

    const sessionJson = storage.getItem(STORAGE_KEYS.USER_SESSION);
    const expiresAt = this.getStoredExpiresAt();

    if (sessionJson && expiresAt && Date.now() < expiresAt) {
      try {
        this.currentSession = JSON.parse(sessionJson);
      } catch {
        this.logout();
      }
    } else if (expiresAt && Date.now() >= expiresAt) {
      this.logout();
    } else {
      // Default initial state: if not logged in and in dev environment, automatically establish default session
      const isDev = import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development';
      if (isDev && !this.isCognitoConfigured()) {
        this.loginDev();
      }
    }
  }

  private getStoredExpiresAt(): number | null {
    const storage = getStorage();
    if (!storage) return null;
    const raw = storage.getItem(STORAGE_KEYS.EXPIRES_AT);
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? null : parsed;
  }
}

export const authService = new AuthService();
