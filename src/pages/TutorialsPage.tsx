import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Volume2, VolumeX } from 'lucide-react';
import Keyboard from '../components/Keyboard/Keyboard';
import TipIcon from '../components/icons/TipIcon';
import { useSpeech } from '../hooks/useSpeech';
import { TIPS, HOME_ROW_KEYS as HOME_ROW } from '../data/tips';

function TipCard({ tip }: { tip: typeof TIPS[number] }) {
  const { speak, stop, speaking } = useSpeech();

  const toggle = () => {
    if (speaking) { stop(); } else { speak(`${tip.title}. ${tip.body}`); }
  };

  return (
    <div className={`bg-gradient-to-br ${tip.gradient} rounded-3xl p-6 text-white shadow-lg hover:scale-105 transition-transform`}>
      <div className="flex items-start justify-between mb-4">
        <TipIcon type={tip.type} size={72} />
        <button
          onClick={toggle}
          aria-label={speaking ? 'Stop' : 'Listen'}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors mt-1"
        >
          {speaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
      <h3 className="font-display text-xl mb-2">{tip.title}</h3>
      <p className="font-body text-sm text-white/90 leading-relaxed">{tip.body}</p>
    </div>
  );
}

function HomeRowDemo() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const { speak } = useSpeech();

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setActiveIdx((i) => (i + 1) % HOME_ROW.length), 900);
    return () => clearInterval(id);
  }, [paused]);

  const active = HOME_ROW[activeIdx];

  return (
    <div className="flex flex-col items-center gap-6">
      <div className={`${active.bgClass} rounded-3xl px-10 py-5 text-white text-center shadow-lg transition-colors duration-300 min-w-[200px]`}>
        <div className="font-display text-6xl mb-1">
          {active.key === ';' ? ';' : active.key.toUpperCase()}
        </div>
        <div className="font-body text-xl font-bold">{active.finger}</div>
        <button
          className="mt-2 text-xs text-white/70 hover:text-white underline"
          onClick={() => speak(`${active.finger} finger presses ${active.key === ';' ? 'semicolon' : active.key.toUpperCase()}`)}
        >
          hear it
        </button>
      </div>

      <div className="flex gap-2">
        {HOME_ROW.map((k, i) => (
          <button
            key={k.key}
            onClick={() => { setActiveIdx(i); setPaused(true); }}
            onMouseLeave={() => setPaused(false)}
            className={`
              w-12 h-12 rounded-xl font-display text-lg font-bold text-white
              transition-all duration-200 ${k.bgClass}
              ${i === activeIdx ? 'scale-125 shadow-lg -translate-y-2' : 'opacity-50 hover:opacity-80 hover:scale-110'}
            `}
          >
            {k.key === ';' ? ';' : k.key.toUpperCase()}
          </button>
        ))}
      </div>

      <p className="font-body text-sm text-gray-500 text-center max-w-sm">
        Feel the bump on <strong>F</strong> and <strong>J</strong> — that ridge lets you find home row without looking!
      </p>
      <p className="font-body text-xs text-gray-400">Click any key to pause the animation</p>
    </div>
  );
}

function PostureGuide() {
  const items = [
    { label: 'Back straight',       fill: '#818cf8' },
    { label: 'Feet flat on floor',  fill: '#34d399' },
    { label: 'Elbows at 90°',       fill: '#f472b6' },
    { label: 'Wrists level',        fill: '#fb923c' },
    { label: 'Screen at eye level', fill: '#60a5fa' },
    { label: 'Relax your shoulders',fill: '#a78bfa' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {items.map(({ label, fill }) => (
        <div key={label} className="flex flex-col items-center gap-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 hover:scale-105 transition-transform">
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="26" r="26" fill={fill} opacity="0.15" />
            <circle cx="26" cy="26" r="20" fill={fill} opacity="0.25" />
            <polyline points="16,26 22,32 36,18" stroke={fill} strokeWidth="3.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-body text-sm font-bold text-gray-700 text-center">{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function TutorialsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50 to-yellow-50 pb-16">
      {/* Hero */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 py-14 text-center text-white px-4">
        <div className="flex justify-center mb-4">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="40" fill="rgba(255,255,255,0.2)" />
            <text x="40" y="55" textAnchor="middle" fontSize="44" fontFamily="serif">🎓</text>
          </svg>
        </div>
        <h1 className="font-display text-5xl mb-3">How to Type</h1>
        <p className="font-body text-lg text-white/90 max-w-xl mx-auto">
          Typing is a superpower! Follow these tips and you'll be touch typing before you know it.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-12 space-y-16">

        {/* Tip cards */}
        <section>
          <h2 className="font-display text-3xl text-center text-purple-700 mb-8">Top Tips</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TIPS.map((tip) => <TipCard key={tip.title} tip={tip} />)}
          </div>
        </section>

        {/* Home row demo */}
        <section className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="font-display text-3xl text-center text-purple-700 mb-2">Home Row Demo</h2>
          <p className="font-body text-center text-gray-500 mb-8">
            Watch which finger presses each home row key — then try it yourself!
          </p>
          <HomeRowDemo />
        </section>

        {/* Finger zone map */}
        <section className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="font-display text-3xl text-center text-purple-700 mb-2">Finger Zone Map</h2>
          <p className="font-body text-center text-gray-500 mb-8">
            Every key belongs to exactly one finger. The colours show you which finger to use.
          </p>
          <div className="overflow-x-auto flex justify-center">
            <Keyboard />
          </div>
        </section>

        {/* Posture guide */}
        <section className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="font-display text-3xl text-center text-purple-700 mb-2">Posture Check</h2>
          <p className="font-body text-center text-gray-500 mb-8">
            Good posture makes typing easier and keeps you comfortable. Run through this checklist!
          </p>
          <PostureGuide />
        </section>

        {/* CTA */}
        <section className="text-center">
          <h2 className="font-display text-3xl text-purple-700 mb-4">Ready to Practice?</h2>
          <p className="font-body text-gray-500 mb-6">Head to the Level Map and start with Level 1 — Home Base!</p>
          <Link
            to="/map"
            className="inline-block px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-500
                       text-white font-display text-2xl rounded-2xl shadow-lg hover:scale-105 transition-transform"
          >
            Go to Level Map
          </Link>
        </section>

      </div>
    </div>
  );
}
