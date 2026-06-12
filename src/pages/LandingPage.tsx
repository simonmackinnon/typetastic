import { Link } from 'react-router-dom';
import { LEVELS, ZONES } from '../data/levels';
import { useProgress } from '../context/ProgressContext';

export default function LandingPage() {
  const { stats } = useProgress();

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50 to-yellow-50">
      {/* Hero */}
      <section className="text-center py-16 px-4">
        <div className="animate-float inline-block mb-4">
          <img src="/logo.svg" alt="" className="w-24 h-24 mx-auto drop-shadow-xl" />
        </div>
        <h1 className="font-display text-6xl sm:text-7xl text-purple-700 mb-4 drop-shadow-sm">
          TypeTastic! 🚀
        </h1>
        <p className="font-body text-xl text-gray-600 max-w-xl mx-auto mb-8">
          Learn to type like a superstar! 20 fun levels, colourful challenges,
          and awesome badges waiting for you.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/play/01"
            className="px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-display text-2xl rounded-2xl shadow-lg hover:scale-105 transition-transform active:scale-95"
          >
            🎮 Play Now!
          </Link>
          <Link
            to="/map"
            className="px-10 py-4 bg-white text-purple-700 font-display text-2xl rounded-2xl shadow-lg hover:scale-105 transition-transform active:scale-95 border-2 border-purple-200"
          >
            🗺️ See All Levels
          </Link>
        </div>
      </section>

      {/* Stats (if playing) */}
      {stats.levelsCompleted > 0 && (
        <section className="max-w-2xl mx-auto px-4 mb-12">
          <div className="bg-white rounded-3xl shadow-lg p-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="font-display text-4xl text-purple-600">{stats.levelsCompleted}</div>
              <div className="font-body text-sm text-gray-500">Levels done</div>
            </div>
            <div>
              <div className="font-display text-4xl text-yellow-500">{stats.totalStars}</div>
              <div className="font-body text-sm text-gray-500">Stars</div>
            </div>
            <div>
              <div className="font-display text-4xl text-green-500">{stats.bestWpm}</div>
              <div className="font-body text-sm text-gray-500">Best WPM</div>
            </div>
          </div>
        </section>
      )}

      {/* Zone preview cards */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="font-display text-4xl text-center text-gray-700 mb-8">
          6 Worlds to Explore 🌍
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {ZONES.map(({ zone, name, icon, color }) => {
            const zoneLevelCount = LEVELS.filter((l) => l.zone === zone).length;
            return (
              <div
                key={zone}
                className={`${color} border-2 rounded-2xl p-5 text-center shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className="text-4xl mb-2">{icon}</div>
                <div className="font-display text-xl text-gray-700">{name}</div>
                <div className="font-body text-sm text-gray-500 mt-1">{zoneLevelCount} levels</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-display text-4xl text-center text-purple-700 mb-10">
            Why kids love TypeTastic ❤️
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: '🎨', title: 'Super Colourful', text: 'Each key and finger zone has its own rainbow colour!' },
              { icon: '🏆', title: 'Earn Badges', text: '12 awesome badges to unlock as you improve.' },
              { icon: '📈', title: 'Level Up', text: '20 levels from beginner to touch typing master.' },
              { icon: '⌨️', title: 'Visual Keyboard', text: 'See exactly which finger to use for every key.' },
              { icon: '⭐', title: 'Star Ratings', text: 'Get 1, 2, or 3 stars based on your accuracy.' },
              { icon: '💾', title: 'Save Progress', text: 'Create a free account to save your scores.' },
            ].map(({ icon, title, text }) => (
              <div key={title} className="text-center">
                <div className="text-4xl mb-2">{icon}</div>
                <h3 className="font-display text-xl text-gray-700 mb-1">{title}</h3>
                <p className="font-body text-gray-500 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
