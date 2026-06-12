import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

type Mode = 'login' | 'register' | 'verify';

interface Props {
  onClose: () => void;
}

export default function AuthModal({ onClose }: Props) {
  const { login, register, verify } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        onClose();
      } else if (mode === 'register') {
        await register(email, password);
        setMode('verify');
      } else {
        await verify(email, code);
        await login(email, password);
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to TypeStar"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm animate-bounce-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🚀</div>
          <h2 className="font-display text-3xl text-purple-700">
            {mode === 'login' ? 'Welcome Back!' : mode === 'register' ? 'Join TypeStar!' : 'Check Your Email!'}
          </h2>
          <p className="font-body text-gray-500 text-sm mt-1">
            {mode === 'login'
              ? 'Log in to save your progress'
              : mode === 'register'
              ? 'Create your free account'
              : `We sent a code to ${email}`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode !== 'verify' && (
            <>
              <div>
                <label className="block font-body font-bold text-gray-700 text-sm mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 border-2 border-purple-200 rounded-xl font-body focus:outline-none focus:border-purple-500 transition"
                />
              </div>
              <div>
                <label className="block font-body font-bold text-gray-700 text-sm mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border-2 border-purple-200 rounded-xl font-body focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </>
          )}

          {mode === 'verify' && (
            <div>
              <label className="block font-body font-bold text-gray-700 text-sm mb-1">
                Verification code
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-full px-4 py-2.5 border-2 border-purple-200 rounded-xl font-body focus:outline-none focus:border-purple-500 transition text-center text-2xl tracking-widest"
              />
            </div>
          )}

          {error && (
            <p className="text-red-500 font-body text-sm bg-red-50 rounded-xl p-3">
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-body font-bold text-lg rounded-xl hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading
              ? '⏳ Loading...'
              : mode === 'login'
              ? '🚀 Log In'
              : mode === 'register'
              ? '✨ Create Account'
              : '✅ Verify & Log In'}
          </button>
        </form>

        {mode !== 'verify' && (
          <p className="text-center font-body text-sm text-gray-500 mt-4">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              className="text-purple-600 font-bold hover:underline"
              onClick={() => { setError(''); setMode(mode === 'login' ? 'register' : 'login'); }}
            >
              {mode === 'login' ? 'Sign up free!' : 'Log in'}
            </button>
          </p>
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
