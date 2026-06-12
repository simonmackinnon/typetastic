interface Props { zone: 1 | 2 | 3 | 4 | 5 | 6; size?: number; }

export default function ZoneIcon({ zone, size = 72 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {zone === 1 && <Zone1 />}
      {zone === 2 && <Zone2 />}
      {zone === 3 && <Zone3 />}
      {zone === 4 && <Zone4 />}
      {zone === 5 && <Zone5 />}
      {zone === 6 && <Zone6 />}
    </svg>
  );
}

// Zone 1 — Keyboard Kingdom: Crown
function Zone1() {
  return (
    <>
      <circle cx="40" cy="40" r="40" fill="#f472b6" />
      {/* Crown base */}
      <rect x="16" y="50" width="48" height="12" rx="4" fill="white" />
      {/* Crown points */}
      <polygon points="16,50 16,28 26,40 40,20 54,40 64,28 64,50" fill="white" />
      {/* Jewels */}
      <circle cx="40" cy="24" r="4" fill="#f472b6" />
      <circle cx="26" cy="42" r="3" fill="#f472b6" />
      <circle cx="54" cy="42" r="3" fill="#f472b6" />
      {/* Keyboard keys at base */}
      <rect x="22" y="52" width="10" height="7" rx="2" fill="#f472b6" opacity="0.5" />
      <rect x="35" y="52" width="10" height="7" rx="2" fill="#f472b6" opacity="0.5" />
      <rect x="48" y="52" width="10" height="7" rx="2" fill="#f472b6" opacity="0.5" />
    </>
  );
}

// Zone 2 — Top Tower: Castle tower
function Zone2() {
  return (
    <>
      <circle cx="40" cy="40" r="40" fill="#60a5fa" />
      {/* Tower body */}
      <rect x="24" y="32" width="32" height="40" rx="3" fill="white" />
      {/* Battlements (crenellations) */}
      <rect x="24" y="22" width="8" height="12" rx="2" fill="white" />
      <rect x="36" y="22" width="8" height="12" rx="2" fill="white" />
      <rect x="48" y="22" width="8" height="12" rx="2" fill="white" />
      {/* Arrow slits */}
      <rect x="37" y="40" width="6" height="12" rx="1" fill="#60a5fa" />
      <rect x="37" y="60" width="6" height="8" rx="1" fill="#60a5fa" />
      {/* Window */}
      <rect x="30" y="42" width="6" height="6" rx="1" fill="#60a5fa" />
      <rect x="44" y="42" width="6" height="6" rx="1" fill="#60a5fa" />
      {/* Star at top */}
      <polygon points="40,6 41.8,11.5 47.6,11.5 42.9,14.8 44.7,20.3 40,17 35.3,20.3 37.1,14.8 32.4,11.5 38.2,11.5"
        fill="#fbbf24" />
    </>
  );
}

// Zone 3 — Bottom Bunker: Shield
function Zone3() {
  return (
    <>
      <circle cx="40" cy="40" r="40" fill="#2dd4bf" />
      {/* Shield outline */}
      <path d="M40 12 L68 24 L68 46 Q68 65 40 74 Q12 65 12 46 L12 24 Z" fill="white" />
      {/* Shield inner */}
      <path d="M40 19 L62 29 L62 47 Q62 62 40 69 Q18 62 18 47 L18 29 Z" fill="#2dd4bf" opacity="0.3" />
      {/* Downward chevron inside */}
      <polyline points="28,36 40,52 52,36" stroke="white" strokeWidth="5" fill="none"
        strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="28,24 40,40 52,24" stroke="white" strokeWidth="5" fill="none"
        strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

// Zone 4 — Word World: Open book with sparkles
function Zone4() {
  return (
    <>
      <circle cx="40" cy="40" r="40" fill="#a78bfa" />
      {/* Left page */}
      <path d="M40 20 Q28 22 18 26 L18 62 Q28 58 40 60 Z" fill="white" />
      {/* Right page */}
      <path d="M40 20 Q52 22 62 26 L62 62 Q52 58 40 60 Z" fill="white" opacity="0.9" />
      {/* Spine highlight */}
      <line x1="40" y1="20" x2="40" y2="60" stroke="#a78bfa" strokeWidth="2" />
      {/* Text lines on left page */}
      <line x1="22" y1="33" x2="36" y2="31" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="22" y1="39" x2="36" y2="37" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="22" y1="45" x2="32" y2="43" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Stars / sparkles above book */}
      <polygon points="56,10 57,14 61,14 58,16.5 59,20.5 56,18 53,20.5 54,16.5 51,14 55,14"
        fill="#fbbf24" />
      <circle cx="24" cy="14" r="3" fill="#fbbf24" />
      <circle cx="30" cy="10" r="2" fill="#fbbf24" opacity="0.7" />
    </>
  );
}

// Zone 5 — Sentence City: City skyline
function Zone5() {
  return (
    <>
      <circle cx="40" cy="40" r="40" fill="#fbbf24" />
      {/* Building 1 (left, medium) */}
      <rect x="8" y="36" width="16" height="36" rx="2" fill="white" />
      {/* Building 2 (center, tall) */}
      <rect x="28" y="22" width="24" height="50" rx="2" fill="white" />
      {/* Building 3 (right, short-medium) */}
      <rect x="56" y="40" width="16" height="32" rx="2" fill="white" />
      {/* Windows — building 1 */}
      <rect x="11" y="40" width="4" height="4" rx="1" fill="#fbbf24" opacity="0.6" />
      <rect x="17" y="40" width="4" height="4" rx="1" fill="#fbbf24" opacity="0.6" />
      <rect x="11" y="48" width="4" height="4" rx="1" fill="#fbbf24" opacity="0.6" />
      <rect x="17" y="48" width="4" height="4" rx="1" fill="#fbbf24" opacity="0.6" />
      {/* Windows — building 2 */}
      <rect x="31" y="26" width="5" height="5" rx="1" fill="#fbbf24" opacity="0.6" />
      <rect x="39" y="26" width="5" height="5" rx="1" fill="#fbbf24" opacity="0.6" />
      <rect x="31" y="35" width="5" height="5" rx="1" fill="#fbbf24" opacity="0.6" />
      <rect x="39" y="35" width="5" height="5" rx="1" fill="#fbbf24" opacity="0.6" />
      <rect x="31" y="44" width="5" height="5" rx="1" fill="#fbbf24" opacity="0.6" />
      <rect x="39" y="44" width="5" height="5" rx="1" fill="#fbbf24" opacity="0.6" />
      {/* Windows — building 3 */}
      <rect x="59" y="44" width="4" height="4" rx="1" fill="#fbbf24" opacity="0.6" />
      <rect x="65" y="44" width="4" height="4" rx="1" fill="#fbbf24" opacity="0.6" />
      {/* Antenna on center building */}
      <line x1="40" y1="10" x2="40" y2="22" stroke="white" strokeWidth="2" />
      <circle cx="40" cy="9" r="2.5" fill="#f87171" />
      {/* Ground */}
      <rect x="5" y="72" width="70" height="4" rx="2" fill="white" opacity="0.4" />
    </>
  );
}

// Zone 6 — Speed Summit: Mountain + lightning
function Zone6() {
  return (
    <>
      <circle cx="40" cy="40" r="40" fill="#38bdf8" />
      {/* Snow cap */}
      <polygon points="40,8 30,26 50,26" fill="white" />
      {/* Mountain body */}
      <polygon points="40,8 10,68 70,68" fill="white" opacity="0.8" />
      {/* Mountain outline */}
      <polygon points="40,8 10,68 70,68" fill="none" stroke="white" strokeWidth="2" />
      {/* Lightning bolt */}
      <polygon points="44,26 34,46 40,46 36,64 52,40 44,40 50,26" fill="#fbbf24" />
      {/* Speed lines */}
      <line x1="6" y1="42" x2="14" y2="42" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="4" y1="50" x2="14" y2="50" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="66" y1="42" x2="74" y2="42" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="66" y1="50" x2="76" y2="50" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </>
  );
}
