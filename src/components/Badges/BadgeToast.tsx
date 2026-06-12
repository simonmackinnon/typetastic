import { useEffect } from 'react';
import { useProgress } from '../../context/ProgressContext';
import type { Badge } from '../../types';

function BadgeToastItem({ badge }: { badge: Badge }) {
  return (
    <div className={`flex items-center gap-3 p-4 ${badge.color} rounded-2xl shadow-xl text-white animate-bounce-in`}>
      <span className="text-4xl">{badge.icon}</span>
      <div>
        <p className="font-display text-lg">Badge Unlocked!</p>
        <p className="font-body font-bold">{badge.name}</p>
        <p className="font-body text-xs opacity-80">{badge.description}</p>
      </div>
    </div>
  );
}

export default function BadgeToast() {
  const { newBadges, dismissNewBadges } = useProgress();

  useEffect(() => {
    if (newBadges.length === 0) return;
    const t = setTimeout(dismissNewBadges, 4000);
    return () => clearTimeout(t);
  }, [newBadges, dismissNewBadges]);

  if (newBadges.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-xs" aria-live="polite">
      {newBadges.map((badge) => (
        <BadgeToastItem key={badge.id} badge={badge} />
      ))}
    </div>
  );
}
