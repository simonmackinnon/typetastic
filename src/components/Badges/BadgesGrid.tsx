import { useState } from 'react';
import { Award, Share2, Check, Copy } from 'lucide-react';
import { BADGES } from '../../data/badges';
import type { Badge } from '../../types';
import { useProgress } from '../../context/ProgressContext';
import BadgeIcon from '../icons/BadgeIcon';

const SITE_URL = 'https://typestar.theclouddevopslearningblog.com';

async function shareBadge(badge: Badge, setCopied: (v: boolean) => void) {
  const text = `I just earned the "${badge.name}" badge on TypeStar! ${badge.description} Try it at ${SITE_URL}`;
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: `TypeStar — ${badge.name}`, text, url: SITE_URL });
      return;
    } catch {
      // user cancelled or share not supported — fall through to clipboard
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } catch { /* ignore */ }
}

function ShareButton({ badge }: { badge: Badge }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); shareBadge(badge, setCopied); }}
      aria-label={`Share ${badge.name} badge`}
      className="mt-1 flex items-center gap-1 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-full font-body text-xs text-white transition-colors"
    >
      {copied ? <><Check size={11} /> Copied!</> : <><Share2 size={11} /> Share</>}
    </button>
  );
}

export default function BadgesGrid() {
  const { earnedBadges } = useProgress();
  const earned = new Set(earnedBadges);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="font-display text-5xl text-purple-700 mb-2 flex items-center justify-center gap-3">
          <Award size={44} className="text-purple-600" /> Badge Cabinet
        </h1>
        <p className="font-body text-gray-500 text-lg">
          {earned.size} of {BADGES.length} badges earned — keep going!
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {BADGES.map((badge) => {
          const isEarned = earned.has(badge.id);
          return (
            <div
              key={badge.id}
              data-testid={`badge-${badge.id}`}
              className={`
                flex flex-col items-center gap-2 p-5 rounded-2xl border-2 text-center
                transition-all duration-200
                ${isEarned
                  ? `${badge.color} border-white/40 shadow-lg hover:scale-105`
                  : 'bg-gray-100 border-gray-200 grayscale opacity-50'}
              `}
            >
              <BadgeIcon badgeId={badge.id} earned={isEarned} size={56} />
              <div className={`font-display text-base ${isEarned ? 'text-white' : 'text-gray-400'}`}>
                {badge.name}
              </div>
              <div className={`font-body text-xs ${isEarned ? 'text-white/80' : 'text-gray-400'}`}>
                {badge.description}
              </div>
              {isEarned && (
                <>
                  <div className="px-2 py-0.5 bg-white/20 rounded-full font-body text-xs text-white">
                    ✓ Earned!
                  </div>
                  <ShareButton badge={badge} />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
