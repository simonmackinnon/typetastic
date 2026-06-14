import { Link } from 'react-router-dom';
import { Keyboard, Map, GraduationCap, Award, Save, ExternalLink } from 'lucide-react';

const ZONES = [
  { name: 'Keyboard Kingdom',  levels: '1–4',   desc: 'Home row keys — ASDF and JKL;' },
  { name: 'Top Tower',         levels: '5–8',   desc: 'Top row — QWERTY and UIOP' },
  { name: 'Bottom Bunker',     levels: '9–12',  desc: 'Bottom row — ZXCV and NM' },
  { name: 'Word World',        levels: '13–16', desc: 'Real words and punctuation' },
  { name: 'Sentence City',     levels: '17–19', desc: 'Full sentences and accuracy drills' },
  { name: 'Speed Summit',      levels: '20',    desc: 'Master level — 50 WPM challenge' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50 to-yellow-50 pb-16">

      {/* Hero */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 py-14 text-center text-white px-4">
        <div className="flex justify-center mb-4">
          <Keyboard size={64} className="opacity-90" />
        </div>
        <h1 className="font-display text-5xl mb-3">About TypeStar</h1>
        <p className="font-body text-lg text-white/90 max-w-xl mx-auto">
          A free, fun typing tutor built for kids — and anyone who wants to learn touch typing properly.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-12 space-y-12">

        {/* What is TypeStar */}
        <section className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="font-display text-3xl text-purple-700 mb-4">What is TypeStar?</h2>
          <p className="font-body text-gray-600 leading-relaxed mb-4">
            TypeStar is a free typing tutor designed to teach kids (and beginners of all ages) how to
            touch type — that means typing without looking at the keyboard. It's a skill that pays
            dividends for life, whether you're writing stories, doing homework, or building software.
          </p>
          <p className="font-body text-gray-600 leading-relaxed">
            The app is built around 20 progressive levels grouped into 6 zones. Each zone introduces
            a new part of the keyboard, building muscle memory one key at a time. Audio tutorials
            and real-time feedback keep things engaging without being stressful.
          </p>
        </section>

        {/* Zone breakdown */}
        <section>
          <h2 className="font-display text-3xl text-center text-purple-700 mb-6">The 6 Zones</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {ZONES.map((z, i) => (
              <div key={z.name} className="bg-white rounded-2xl shadow p-5 flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center text-white font-display text-lg shrink-0">
                  {i + 1}
                </div>
                <div>
                  <p className="font-display text-base text-gray-800">{z.name}</p>
                  <p className="font-body text-xs text-purple-600 font-bold mb-1">Levels {z.levels}</p>
                  <p className="font-body text-sm text-gray-500">{z.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="font-display text-3xl text-purple-700 mb-6">Features</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { Icon: GraduationCap, title: 'Audio Tutorials',   body: 'Every level has a spoken tip read by a natural Australian voice (powered by ElevenLabs). Tutorials can be listened to on any device.' },
              { Icon: Map,           title: 'Progressive Levels', body: '20 levels with real-time WPM and accuracy tracking. Stars awarded for accuracy, and a personal best is saved for each level.' },
              { Icon: Award,         title: 'Badge Cabinet',      body: '12 collectible badges earned by hitting milestones like first completion, perfect accuracy, speed goals, and zone clears.' },
              { Icon: Save,          title: 'Progress Saved',     body: 'Sign up for a free account to save your progress across devices. Progress is stored securely in the cloud — no ads, no tracking.' },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Icon size={20} className="text-purple-600" />
                </div>
                <div>
                  <p className="font-display text-base text-gray-800 mb-1">{title}</p>
                  <p className="font-body text-sm text-gray-500 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mobile note */}
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex gap-3 items-start">
            <Keyboard size={22} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-display text-lg text-amber-800 mb-1">A note on mobile</p>
              <p className="font-body text-sm text-amber-700 leading-relaxed">
                Typing levels require a physical keyboard, so they're best experienced on a desktop
                or laptop. That said, you can browse tutorials (and listen to them!), check your
                badges, and manage your account from any device.
              </p>
            </div>
          </div>
        </section>

        {/* Credits */}
        <section className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="font-display text-3xl text-purple-700 mb-4">Made by</h2>
          <p className="font-body text-gray-600 leading-relaxed mb-4">
            TypeStar was built by{' '}
            <a
              href="https://theclouddevopslearningblog.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-800 font-bold underline"
            >
              The Cloud DevOps Learning Blog
            </a>{' '}
            — a site dedicated to making cloud and software skills approachable for everyone.
          </p>
          <a
            href="https://theclouddevopslearningblog.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-body font-bold rounded-xl text-sm hover:scale-105 transition-transform"
          >
            Visit the blog <ExternalLink size={14} />
          </a>
        </section>

        {/* CTA */}
        <section className="text-center">
          <h2 className="font-display text-3xl text-purple-700 mb-4">Ready to type?</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/map"
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-display text-xl rounded-2xl shadow-lg hover:scale-105 transition-transform"
            >
              Go to Level Map
            </Link>
            <Link
              to="/tutorials"
              className="px-8 py-3 bg-white text-purple-700 font-display text-xl rounded-2xl shadow-lg border-2 border-purple-200 hover:scale-105 transition-transform"
            >
              How to Type
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
