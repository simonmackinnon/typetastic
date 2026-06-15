import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  type ISignUpResult,
} from 'amazon-cognito-identity-js';
import type { User } from '../types';

// ── Cognito SRP (email/password) ──────────────────────────────────────────────

let _pool: CognitoUserPool | null = null;

function getPool(): CognitoUserPool {
  if (!_pool) {
    _pool = new CognitoUserPool({
      UserPoolId: process.env.COGNITO_USER_POOL_ID ?? '',
      ClientId:   process.env.COGNITO_CLIENT_ID ?? '',
    });
  }
  return _pool;
}

function cognitoUser(email: string): CognitoUser {
  return new CognitoUser({ Username: email, Pool: getPool() });
}

export async function signUp(email: string, password: string): Promise<ISignUpResult> {
  return new Promise((resolve, reject) => {
    getPool().signUp(
      email,
      password,
      [new CognitoUserAttribute({ Name: 'email', Value: email })],
      [],
      (err, result) => (err ? reject(err) : resolve(result!)),
    );
  });
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    cognitoUser(email).confirmRegistration(code, true, (err) =>
      err ? reject(err) : resolve(),
    );
  });
}

export async function signIn(email: string, password: string): Promise<User> {
  return new Promise((resolve, reject) => {
    cognitoUser(email).authenticateUser(
      new AuthenticationDetails({ Username: email, Password: password }),
      {
        onSuccess: (session) => {
          const payload = session.getIdToken().decodePayload();
          resolve({ sub: payload['sub'], email: payload['email'] });
        },
        onFailure: reject,
      },
    );
  });
}

export async function signOut(): Promise<void> {
  clearOAuthTokens();
  const user = getPool().getCurrentUser();
  if (user) user.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  // Check Google OAuth tokens first
  const oauthUser = getOAuthUser();
  if (oauthUser) return oauthUser;

  // Fall back to SRP/Cognito session
  return new Promise((resolve) => {
    let user: CognitoUser | null;
    try { user = getPool().getCurrentUser(); }
    catch { return resolve(null); }
    if (!user) return resolve(null);

    user.getSession((err: Error | null, session: { isValid: () => boolean } | null) => {
      if (err || !session?.isValid()) return resolve(null);
      user!.getUserAttributes((attrErr, attrs) => {
        if (attrErr || !attrs) return resolve(null);
        const get = (name: string) => attrs.find((a) => a.getName() === name)?.getValue() ?? '';
        resolve({ sub: get('sub'), email: get('email') });
      });
    });
  });
}

export async function getIdToken(): Promise<string | null> {
  // Check Google OAuth tokens first
  const tokens = loadOAuthTokens();
  if (tokens) return tokens.id_token;

  // Fall back to SRP tokens
  return new Promise((resolve) => {
    let user: CognitoUser | null;
    try { user = getPool().getCurrentUser(); }
    catch { return resolve(null); }
    if (!user) return resolve(null);
    user.getSession((err: Error | null, session: { isValid: () => boolean; getIdToken: () => { getJwtToken: () => string } } | null) => {
      if (err || !session?.isValid()) return resolve(null);
      resolve(session.getIdToken().getJwtToken());
    });
  });
}

// ── Google OAuth (Authorization Code + PKCE via Cognito Hosted UI) ────────────

const COGNITO_DOMAIN  = process.env.COGNITO_DOMAIN ?? '';
const COGNITO_CLIENT  = process.env.COGNITO_CLIENT_ID ?? '';
const OAUTH_KEY       = 'ts_oauth_tokens';

interface OAuthTokens {
  id_token:      string;
  access_token:  string;
  refresh_token: string;
  expires_at:    number; // ms
}

function loadOAuthTokens(): OAuthTokens | null {
  try {
    const raw = localStorage.getItem(OAUTH_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as OAuthTokens;
    if (Date.now() > t.expires_at) { localStorage.removeItem(OAUTH_KEY); return null; }
    return t;
  } catch { return null; }
}

function clearOAuthTokens() {
  localStorage.removeItem(OAUTH_KEY);
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(b64));
}

function getOAuthUser(): User | null {
  const t = loadOAuthTokens();
  if (!t) return null;
  try {
    const p = decodeJwtPayload(t.id_token);
    return { sub: p['sub'] as string, email: p['email'] as string };
  } catch { return null; }
}

/** Redirect the browser to Google sign-in via Cognito's hosted UI. */
export function redirectToGoogle(): void {
  const redirectUri = `${window.location.origin}/callback`;
  const params = new URLSearchParams({
    client_id:         COGNITO_CLIENT,
    response_type:     'code',
    scope:             'email openid profile',
    redirect_uri:      redirectUri,
    identity_provider: 'Google',
  });
  window.location.href = `${COGNITO_DOMAIN}/oauth2/authorize?${params}`;
}

/** Exchange an authorization code for tokens. Saves tokens to localStorage. */
export async function exchangeCodeForTokens(code: string): Promise<User> {
  const redirectUri = `${window.location.origin}/callback`;
  const body = new URLSearchParams({
    grant_type:   'authorization_code',
    client_id:    COGNITO_CLIENT,
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Sign-in failed (${res.status}): ${detail}`);
  }

  const data = await res.json() as {
    id_token: string; access_token: string; refresh_token: string; expires_in: number;
  };

  const tokens: OAuthTokens = {
    id_token:      data.id_token,
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expires_at:    Date.now() + data.expires_in * 1000,
  };
  localStorage.setItem(OAUTH_KEY, JSON.stringify(tokens));

  const user = getOAuthUser();
  if (!user) throw new Error('Could not read user from token');
  return user;
}
