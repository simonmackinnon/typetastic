import { useState } from 'react';
import { X, LogIn, UserPlus, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type Mode = 'login' | 'register' | 'verify';

interface Props {
  onClose: () => void;
}

export default function AuthModal({ onClose }: Props) {
  const { login, loginWithGoogle, register, verify } = useAuth();
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
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm animate-bounce-in relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <img
            src="/logo.svg"
            alt="TypeStar"
            className="w-16 h-16 mx-auto mb-3 drop-shadow-md"
          />
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
            <div className="flex items-start gap-2 text-red-600 bg-red-50 rounded-xl p-3">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p className="font-body text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-body font-bold text-lg rounded-xl hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Loading…</>
            ) : mode === 'login' ? (
              <><LogIn size={18} /> Log In</>
            ) : mode === 'register' ? (
              <><UserPlus size={18} /> Create Account</>
            ) : (
              <><CheckCircle size={18} /> Verify &amp; Log In</>
            )}
          </button>
        </form>

        {mode !== 'verify' && (
          <>
            {/* Google sign-in */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs text-gray-400 font-body">
                <span className="bg-white px-2">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={loginWithGoogle}
              className="w-full py-2.5 border-2 border-gray-200 rounded-xl font-body font-bold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
                <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"/>
              </svg>
              Continue with Google
            </button>

            <p className="text-center font-body text-sm text-gray-500 mt-4">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                className="text-purple-600 font-bold hover:underline"
                onClick={() => { setError(''); setMode(mode === 'login' ? 'register' : 'login'); }}
              >
                {mode === 'login' ? 'Sign up free!' : 'Log in'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
