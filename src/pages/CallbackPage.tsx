import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeCodeForTokens } from '../services/auth';
import { useAuth } from '../context/AuthContext';

export default function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code  = searchParams.get('code');
    const error = searchParams.get('error');

    if (error || !code) {
      navigate('/?auth_error=' + encodeURIComponent(error ?? 'missing_code'), { replace: true });
      return;
    }

    exchangeCodeForTokens(code)
      .then(() => refresh())
      .then(() => navigate('/map', { replace: true }))
      .catch(() => navigate('/?auth_error=token_exchange', { replace: true }));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center text-gray-500">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Signing you in…</p>
      </div>
    </div>
  );
}
