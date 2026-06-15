import React, { createContext, useContext, useEffect, useReducer } from 'react';
import {
  getCurrentUser,
  signIn,
  signOut as authSignOut,
  signUp,
  confirmSignUp,
  redirectToGoogle,
} from '../services/auth';
import type { AuthState, User } from '../types';

interface AuthContextValue {
  authState: AuthState;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  verify: (email: string, code: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

type Action =
  | { type: 'SET_LOADING' }
  | { type: 'SET_USER'; user: User }
  | { type: 'CLEAR_USER' };

function reducer(_: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'SET_LOADING':  return { status: 'loading' };
    case 'SET_USER':     return { status: 'authenticated', user: action.user };
    case 'CLEAR_USER':   return { status: 'unauthenticated' };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, dispatch] = useReducer(reducer, { status: 'loading' });

  useEffect(() => {
    getCurrentUser().then((user) => {
      dispatch(user ? { type: 'SET_USER', user } : { type: 'CLEAR_USER' });
    });
  }, []);

  async function login(email: string, password: string) {
    const user = await signIn(email, password);
    dispatch({ type: 'SET_USER', user });
  }

  async function logout() {
    await authSignOut();
    dispatch({ type: 'CLEAR_USER' });
  }

  async function register(email: string, password: string) {
    await signUp(email, password);
  }

  async function verify(email: string, code: string) {
    await confirmSignUp(email, code);
  }

  function loginWithGoogle() {
    redirectToGoogle();
  }

  async function refresh() {
    const user = await getCurrentUser();
    dispatch(user ? { type: 'SET_USER', user } : { type: 'CLEAR_USER' });
  }

  const user = authState.status === 'authenticated' ? authState.user : null;

  return (
    <AuthContext.Provider value={{ authState, user, login, loginWithGoogle, logout, register, verify, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
