import {
  Keyboard, Home, Building2, Shield, BookOpen, FileText,
  Zap, Gauge, Trophy, Star, Sparkles, Rocket, Mail, PackageCheck, type LucideIcon
} from 'lucide-react';

const BADGE_ICON_MAP: Record<string, LucideIcon> = {
  'first-keystroke':  Keyboard,
  'home-row-hero':    Home,
  'tower-climber':    Building2,
  'bunker-buster':    Shield,
  'word-wizard':      BookOpen,
  'sentence-sage':    FileText,
  'speed-star':       Zap,
  'turbo-typist':     Gauge,
  'touch-type-master': Trophy,
  'star-collector':   Star,
  'perfect-typist':   Sparkles,
  'rockstar':         Rocket,
  'mail-sorter':      Mail,
  'speed-sorter':     PackageCheck,
};

interface Props {
  badgeId: string;
  earned: boolean;
  size?: number;
}

export default function BadgeIcon({ badgeId, earned, size = 56 }: Props) {
  const Icon = BADGE_ICON_MAP[badgeId] ?? Star;
  const color = size > 40 ? 36 : 22;

  return (
    <div className="relative flex items-center justify-center">
      {/* Medal circle */}
      <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Ribbon tab at top */}
        <rect x="19" y="0" width="18" height="10" rx="4"
          fill={earned ? 'rgba(255,255,255,0.6)' : '#d1d5db'} />
        {/* Medal circle */}
        <circle cx="28" cy="36" r="19"
          fill={earned ? 'rgba(255,255,255,0.35)' : '#e5e7eb'}
          stroke={earned ? 'rgba(255,255,255,0.6)' : '#d1d5db'}
          strokeWidth="2.5" />
        {/* Inner ring */}
        <circle cx="28" cy="36" r="14"
          fill="none"
          stroke={earned ? 'rgba(255,255,255,0.4)' : '#d1d5db'}
          strokeWidth="1.5" />
      </svg>
      {/* Icon centred in medal */}
      <div className="absolute" style={{ bottom: 7 }}>
        <Icon
          size={color}
          color={earned ? 'white' : '#9ca3af'}
        />
      </div>
    </div>
  );
}
