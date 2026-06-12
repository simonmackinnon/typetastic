import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Keyboard from '../components/Keyboard/Keyboard';

const HOME_ROW = [
  { key: 'a', finger: 'Left Pinky',   bgClass: 'bg-blue-400'   },
  { key: 's', finger: 'Left Ring',    bgClass: 'bg-green-400'  },
  { key: 'd', finger: 'Left Middle',  bgClass: 'bg-yellow-400' },
  { key: 'f', finger: 'Left Index',   bgClass: 'bg-orange-400' },
  { key: 'j', finger: 'Right Index',  bgClass: 'bg-red-400'    },
  { key: 'k', finger: 'Right Middle', bgClass: 'bg-pink-400'   },
  { key: 'l', finger: 'Right Ring',   bgClass: 'bg-purple-400' },
  { key: ';', finger: 'Right Pinky',  bgClass: 'bg-teal-400'   },
];

const TIPS = [
  {
    icon: '🏠',
    title: 'Start at Home Row',
    body: 'Place your left fingers on A S D F and your right fingers on J K L ; — feel the little bumps on F and J, those are your anchors!',
    gradient: 'from-blue-400 to-purple-500',
  },
  {
    icon: '👀',
    title: "Don't Peek!",
    body: "Try not to look at the keyboard. Keep your eyes on the screen. Your muscle memory will learn where every key lives over time.",
    gradient: 'from-pink-400 to-red-500',
  },
  {
    icon: '🐢',
    title: 'Slow Beats Fast',
    body: 'Accuracy first, speed second. Every correct keystroke teaches your fingers exactly where to go — rushing just builds bad habits.',
    gradient: 'from-green-400 to-emerald-500',
  },
  {
    icon: '🔄',
    title: 'Always Return Home',
    body: 'After pressing any key, bring your fingers back to the home row. This one habit is the whole secret to touch typing!',
    gradient: 'from-orange-400 to-yellow-500',
  },
  {
    icon: '🪑',
    title: 'Sit Up Straight',
    body: 'Back straight, feet flat on the floor, wrists level with the keyboard. Good posture means you can type longer without getting tired.',
    gradient: 'from-purple-400 to-pink-500',
  },
];

function HomeRowDemo() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setActiveIdx((i) => (i + 1) % HOME_ROW.length);
    }, 900);
    return () => clearInterval(id);
  }, [paused]);

  const active = HOME_ROW[activeIdx];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Big animated key + finger name */}
      <div
        className={`${active.bgClass} rounded-3xl px-10 py-5 text-white text-center shadow-lg transition-colors duration-300 min-w-[200px]`}
      >
        <div className="font-display text-6xl mb-1">
          {active.key === ';' ? ';' : active.key.toUpperCase()}
        </div>
        <div className="font-body text-xl font-bold">{active.finger}</div>
      </div>

      {/* Mini home row keyboard — click to pause on that key */}
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
        👆 Feel the bump on <strong>F</strong> and <strong>J</strong> — that ridge lets you find home row without looking!
      </p>
      <p className="font-body text-xs text-gray-400">Click any key to pause the animation</p>
    </div>
  );
}

function PostureGuide() {
  const items = [
    { emoji: '🦴', label: 'Back straight' },
    { emoji: '🦶', label: 'Feet flat on floor' },
    { emoji: '💪', label: 'Elbows at 90°' },
    { emoji: '🙌', label: 'Wrists level' },
    { emoji: '👁️', label: 'Screen at eye level' },
    { emoji: '😌', label: 'Relax your shoulders' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {items.map(({ emoji, label }) => (
        <div
          key={label}
          className="flex flex-col items-center gap-2 bg-gradient-to-br from-indigo-50 to-purple-50
                     rounded-2xl p-4 hover:scale-105 transition-transform"
        >
          <span className="text-4xl">{emoji}</span>
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
        <div className="text-6xl mb-3">🎓</div>
        <h1 className="font-display text-5xl mb-3">How to Type</h1>
        <p className="font-body text-lg text-white/90 max-w-xl mx-auto">
          Typing is a superpower! Follow these tips and you'll be touch typing before you know it.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-12 space-y-16">

        {/* Tip cards */}
        <section>
          <h2 className="font-display text-3xl text-center text-purple-700 mb-8">Top Tips 💡</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TIPS.map((tip) => (
              <div
                key={tip.title}
                className={`bg-gradient-to-br ${tip.gradient} rounded-3xl p-6 text-white shadow-lg
                            hover:scale-105 transition-transform cursor-default`}
              >
                <div className="text-5xl mb-3">{tip.icon}</div>
                <h3 className="font-display text-xl mb-2">{tip.title}</h3>
                <p className="font-body text-sm text-white/90 leading-relaxed">{tip.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Home row demo */}
        <section className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="font-display text-3xl text-center text-purple-700 mb-2">Home Row Demo 🏠</h2>
          <p className="font-body text-center text-gray-500 mb-8">
            Watch which finger presses each home row key — then try it yourself!
          </p>
          <HomeRowDemo />
        </section>

        {/* Finger zone keyboard map */}
        <section className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="font-display text-3xl text-center text-purple-700 mb-2">Finger Zone Map 🗺️</h2>
          <p className="font-body text-center text-gray-500 mb-8">
            Every key belongs to exactly one finger. The colours show you which finger to use.
          </p>
          <div className="overflow-x-auto flex justify-center">
            <Keyboard />
          </div>
        </section>

        {/* Posture guide */}
        <section className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="font-display text-3xl text-center text-purple-700 mb-2">Posture Check 🪑</h2>
          <p className="font-body text-center text-gray-500 mb-8">
            Good posture makes typing easier and keeps you comfortable. Run through this checklist before you start!
          </p>
          <PostureGuide />
        </section>

        {/* CTA */}
        <section className="text-center">
          <h2 className="font-display text-3xl text-purple-700 mb-4">Ready to Practice? 🎮</h2>
          <p className="font-body text-gray-500 mb-6">
            Head to the Level Map and start with Level 1 — Home Base!
          </p>
          <Link
            to="/map"
            className="inline-block px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-500
                       text-white font-display text-2xl rounded-2xl shadow-lg hover:scale-105 transition-transform"
          >
            🗺️ Go to Level Map
          </Link>
        </section>

      </div>
    </div>
  );
}
