export type TipType = 'home-row' | 'no-peek' | 'slow-wins' | 'return-home' | 'posture';

interface Props { type: TipType; size?: number; }

export default function TipIcon({ type, size = 80 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {type === 'home-row' && <HomeRowIcon />}
      {type === 'no-peek'  && <NoPeekIcon />}
      {type === 'slow-wins' && <SlowWinsIcon />}
      {type === 'return-home' && <ReturnHomeIcon />}
      {type === 'posture' && <PostureIcon />}
    </svg>
  );
}

function HomeRowIcon() {
  return (
    <>
      {/* Orange circle background */}
      <circle cx="40" cy="40" r="40" fill="#fb923c" />
      {/* House body */}
      <rect x="27" y="28" width="26" height="20" rx="2" fill="white" />
      {/* House roof */}
      <polygon points="40,10 22,28 58,28" fill="white" />
      {/* Door */}
      <rect x="35" y="36" width="10" height="12" rx="2" fill="#fb923c" />
      {/* Home row: 8 keys — left 4 (ASDF) orange, right 4 (JKL;) red */}
      {[0,1,2,3].map((i) => (
        <rect key={i} x={6 + i*10} y={55} width={8} height={16} rx={2} fill="white" opacity={0.9} />
      ))}
      {[0,1,2,3].map((i) => (
        <rect key={i} x={46 + i*10} y={55} width={8} height={16} rx={2} fill="white" opacity={0.9} />
      ))}
      {/* Bump indicator on F (position 3) and J (position 4) */}
      <rect x="30" y="55" width="5" height="2.5" rx="1.25" fill="#fb923c" />
      <rect x="47" y="55" width="5" height="2.5" rx="1.25" fill="#ef4444" />
    </>
  );
}

function NoPeekIcon() {
  return (
    <>
      {/* Red circle background */}
      <circle cx="40" cy="40" r="40" fill="#f87171" />
      {/* Eye white — almond shape */}
      <ellipse cx="40" cy="40" rx="24" ry="13" fill="white" />
      {/* Iris */}
      <circle cx="40" cy="40" r="8" fill="#f87171" />
      {/* Pupil */}
      <circle cx="40" cy="40" r="4" fill="#7f1d1d" />
      {/* White highlight */}
      <circle cx="43" cy="37" r="2" fill="white" />
      {/* Slash line — thick diagonal with rounded cap */}
      <line x1="16" y1="16" x2="64" y2="64" stroke="white" strokeWidth="7" strokeLinecap="round" />
      {/* Dark outline on slash for contrast */}
      <line x1="16" y1="16" x2="64" y2="64" stroke="#f87171" strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function SlowWinsIcon() {
  return (
    <>
      {/* Green circle background */}
      <circle cx="40" cy="40" r="40" fill="#4ade80" />
      {/* Shell (oval body) */}
      <ellipse cx="38" cy="44" rx="22" ry="16" fill="white" />
      {/* Shell pattern lines */}
      <ellipse cx="38" cy="44" rx="14" ry="9" fill="none" stroke="#4ade80" strokeWidth="2" />
      <line x1="38" y1="35" x2="38" y2="60" stroke="#4ade80" strokeWidth="1.5" />
      <line x1="16" y1="44" x2="60" y2="44" stroke="#4ade80" strokeWidth="1.5" />
      {/* Head */}
      <circle cx="61" cy="38" r="8" fill="white" />
      {/* Eye */}
      <circle cx="64" cy="36" r="2" fill="#166534" />
      {/* Smile */}
      <path d="M58 40 Q61 43 64 40" stroke="#166534" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Legs (4 small ovals) */}
      <ellipse cx="22" cy="57" rx="6" ry="4" fill="white" />
      <ellipse cx="35" cy="60" rx="6" ry="4" fill="white" />
      <ellipse cx="48" cy="60" rx="6" ry="4" fill="white" />
      <ellipse cx="58" cy="55" rx="5" ry="4" fill="white" />
      {/* Star badge on shell */}
      <polygon points="38,36 39.5,40 44,40 40.5,42.5 42,46.5 38,44 34,46.5 35.5,42.5 32,40 36.5,40"
        fill="#fbbf24" />
    </>
  );
}

function ReturnHomeIcon() {
  return (
    <>
      {/* Blue circle background */}
      <circle cx="40" cy="40" r="40" fill="#60a5fa" />
      {/* Circular return arrow (thick arc) */}
      <path
        d="M 62 26 A 24 24 0 1 0 64 46"
        stroke="white" strokeWidth="6" fill="none" strokeLinecap="round"
      />
      {/* Arrowhead pointing down-right */}
      <polygon points="64,46 56,40 72,38" fill="white" />
      {/* Home key at bottom */}
      <rect x="28" y="60" width="24" height="14" rx="4" fill="white" />
      {/* House icon inside key */}
      <polygon points="40,63 32,68 48,68" fill="#60a5fa" />
      <rect x="35" y="68" width="10" height="6" rx="1" fill="#60a5fa" />
    </>
  );
}

function PostureIcon() {
  return (
    <>
      {/* Purple circle background */}
      <circle cx="40" cy="40" r="40" fill="#a78bfa" />
      {/* Desk surface */}
      <rect x="12" y="56" width="56" height="5" rx="2.5" fill="white" />
      {/* Chair back */}
      <rect x="28" y="30" width="6" height="28" rx="3" fill="white" opacity="0.7" />
      {/* Chair seat */}
      <rect x="22" y="52" width="22" height="6" rx="3" fill="white" opacity="0.7" />
      {/* Head */}
      <circle cx="47" cy="18" r="9" fill="white" />
      {/* Torso — straight spine shown by bright line */}
      <rect x="44" y="27" width="6" height="26" rx="3" fill="white" />
      {/* Spine highlight (straight back indicator) */}
      <line x1="47" y1="27" x2="47" y2="52" stroke="#a78bfa" strokeWidth="2" />
      {/* Arms on desk */}
      <rect x="44" y="50" width="22" height="5" rx="2.5" fill="white" />
      {/* Legs */}
      <rect x="44" y="58" width="5" height="14" rx="2.5" fill="white" />
      <rect x="54" y="58" width="5" height="14" rx="2.5" fill="white" />
      {/* Feet */}
      <ellipse cx="46.5" cy="72" rx="5" ry="3" fill="white" />
      <ellipse cx="56.5" cy="72" rx="5" ry="3" fill="white" />
      {/* Checkmark above head (good posture!) */}
      <circle cx="47" cy="7" r="5" fill="#22c55e" />
      <polyline points="44,7 46,9 51,4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </>
  );
}
