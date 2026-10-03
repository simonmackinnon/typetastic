import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import AuthModal from '../Auth/AuthModal';
import { Map, GraduationCap, Award, Gamepad2, User, Rocket, LogOut, LogIn, type LucideIcon } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showAuth, setShowAuth] = useState(false);

  const navLink = (to: string, label: string, Icon: LucideIcon) => (
    <Link
      to={to}
      aria-label={label}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full font-body font-bold text-sm transition-all
        ${location.pathname === to
          ? 'bg-white text-purple-700 shadow-md'
          : 'text-white hover:bg-white/20'}`}
    >
      <Icon size={15} />
      <span className="hidden sm:inline">{label}</span>
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
              alt="TypeStar logo"
              className="w-10 h-10 drop-shadow-lg group-hover:animate-wiggle"
            />
            <span className="font-display text-2xl text-white drop-shadow">TypeStar</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-white/80 font-body text-xs mt-1">
              <Rocket size={12} /> Learn to Type!
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-2">
            {navLink('/map', 'Levels', Map)}
            {navLink('/tutorials', 'How to Type', GraduationCap)}
            {navLink('/games', 'Games', Gamepad2)}
            {navLink('/badges', 'Badges', Award)}
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-white/80 font-body text-xs hidden sm:flex items-center gap-1">
                  <User size={12} /> {user.email.split('@')[0]}
                </span>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full font-body font-bold text-sm text-white hover:bg-white/20 transition-all"
                >
                  <LogOut size={14} /><span className="hidden sm:inline">Log out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-body font-bold text-sm bg-white text-purple-700 shadow hover:shadow-md transition-all"
              >
                <LogIn size={14} /><span className="hidden sm:inline">Log in</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
