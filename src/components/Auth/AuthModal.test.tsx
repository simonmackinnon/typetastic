import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthModal from './AuthModal';
import { AuthContext } from '../../context/AuthContext';
import type { AuthState } from '../../types';

vi.mock('../../services/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  confirmSignUp: vi.fn(),
  getCurrentUser: vi.fn().mockResolvedValue(null),
  getIdToken: vi.fn().mockResolvedValue(null),
}));

// Minimal context value for tests
function makeContext(overrides: Partial<{
  login: (e: string, p: string) => Promise<void>;
  register: (e: string, p: string) => Promise<void>;
  verify: (e: string, c: string) => Promise<void>;
}> = {}) {
  return {
    authState: { status: 'unauthenticated' } as AuthState,
    user: null,
    login: vi.fn().mockResolvedValue(undefined),
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    register: vi.fn().mockResolvedValue(undefined),
    verify: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderModal(ctx = makeContext(), onClose = vi.fn()) {
  return render(
    <AuthContext.Provider value={ctx as ReturnType<typeof makeContext>}>
      <AuthModal onClose={onClose} />
    </AuthContext.Provider>,
  );
}

describe('AuthModal', () => {
  it('renders login form by default', () => {
    renderModal();
    expect(screen.getByText('Welcome Back!')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
  });

  it('switches to register mode', () => {
    renderModal();
    fireEvent.click(screen.getByText('Sign up free!'));
    expect(screen.getByText('Join TypeStar!')).toBeInTheDocument();
  });

  it('calls login on submit', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    const ctx = makeContext({ login });
    renderModal(ctx);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'Password1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('test@example.com', 'Password1'));
  });

  it('shows error message on failed login', async () => {
    const login = vi.fn().mockRejectedValue(new Error('Incorrect username or password.'));
    const ctx = makeContext({ login });
    renderModal(ctx);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() =>
      expect(screen.getByText(/incorrect username or password/i)).toBeInTheDocument(),
    );
  });

  it('moves to verify mode after successful register', async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    const ctx = makeContext({ register });
    renderModal(ctx);

    fireEvent.click(screen.getByText('Sign up free!'));
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'Password1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText('Check Your Email!')).toBeInTheDocument(),
    );
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    renderModal(makeContext(), onClose);
    // Click the backdrop (dialog container)
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalled();
  });
});
