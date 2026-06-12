import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import AuthModal from '../Auth/AuthModal';

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showAuth, setShowAuth] = useState(false);

  const navLink = (to: string, label: string, emoji: string) => (
    <Link
      to={to}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-body font-bold text-sm transition-all
        ${location.pathname === to
          ? 'bg-white text-purple-700 shadow-md'
          : 'text-white hover:bg-white/20'}`}
    >
      <span>{emoji}</span> {label}
    </Link>
  );

  return (
    <>
      <header className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo + wordmark */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/logo.svg"
              alt="TypeTastic logo"
              className="w-10 h-10 drop-shadow-lg group-hover:animate-wiggle"
            />
            <span className="font-display text-2xl text-white drop-shadow">TypeTastic</span>
            <span className="hidden sm:inline text-white/80 font-body text-xs mt-1">
              🚀 Learn to Type!
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-2">
            {navLink('/map', 'Levels', '🗺️')}
            {navLink('/tutorials', 'How to Type', '🎓')}
            {navLink('/badges', 'Badges', '🏅')}
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-white/80 font-body text-xs hidden sm:block">
                  👤 {user.email.split('@')[0]}
                </span>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded-full font-body font-bold text-sm text-white hover:bg-white/20 transition-all"
                >
                  Log out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="px-4 py-1.5 rounded-full font-body font-bold text-sm bg-white text-purple-700 shadow hover:shadow-md transition-all"
              >
                Log in
              </button>
            )}
          </nav>
        </div>
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
