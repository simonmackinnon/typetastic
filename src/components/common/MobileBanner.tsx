import { useState } from 'react';
import { X, Keyboard } from 'lucide-react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'ts_banner_dismissed';

export default function MobileBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === '1'
  );

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="md:hidden bg-gradient-to-r from-purple-700 to-pink-600 text-white px-4 py-3">
      <div className="flex items-start gap-3">
        <Keyboard size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="font-body text-sm font-bold leading-snug">
            TypeStar is a keyboard typing game
          </p>
          <p className="font-body text-xs text-white/80 mt-1 leading-relaxed">
            Playing levels needs a real keyboard, but you can still browse{' '}
            <Link to="/tutorials" className="underline hover:text-white">tutorials</Link>,{' '}
            <Link to="/badges" className="underline hover:text-white">badges</Link>, and{' '}
            <Link to="/about" className="underline hover:text-white">learn more</Link>.
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss notice"
          className="shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
