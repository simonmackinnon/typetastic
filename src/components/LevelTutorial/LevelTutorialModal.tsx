import { useEffect } from 'react';
import { Volume2, VolumeX, Play } from 'lucide-react';
import type { Level } from '../../types';
import { LEVEL_TUTORIALS } from '../../data/levelTutorials';
import ZoneIcon from '../icons/ZoneIcon';
import { useSpeech } from '../../hooks/useSpeech';

interface Props {
  level: Level;
  onContinue: () => void;
  onDismiss: () => void;
}

export default function LevelTutorialModal({ level, onContinue, onDismiss }: Props) {
  const tutorial = LEVEL_TUTORIALS[level.id];
  const { speak, stop, speaking } = useSpeech();

  const handleSpeak = () => {
    if (!tutorial) return;
    speak(`${tutorial.headline}. ${tutorial.body}`);
  };

  // Auto-play on open
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tutorial) speak(`Level ${level.number}. ${tutorial.headline}. ${tutorial.body}`);
    }, 400);
    return () => { clearTimeout(timer); stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!tutorial) return null;

  const zoneColors: Record<number, string> = {
    1: 'from-pink-500 to-rose-400',
    2: 'from-blue-500 to-indigo-400',
    3: 'from-teal-500 to-cyan-400',
    4: 'from-purple-500 to-violet-400',
    5: 'from-amber-500 to-orange-400',
    6: 'from-sky-500 to-blue-400',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl animate-bounce-in overflow-hidden">

        {/* Coloured header */}
        <div className={`bg-gradient-to-r ${zoneColors[level.zone] ?? 'from-purple-500 to-pink-400'} p-6 flex items-center gap-5`}>
          <ZoneIcon zone={level.zone as 1|2|3|4|5|6} size={72} />
          <div className="text-white">
            <p className="font-body text-sm text-white/70 uppercase tracking-wide">
              Zone {level.zone} · {level.zoneName}
            </p>
            <h2 className="font-display text-3xl leading-tight">
              Level {level.number}: {level.name}
            </h2>
          </div>
        </div>

        {/* Tutorial body */}
        <div className="p-6">
          <h3 className="font-display text-2xl text-gray-800 mb-3">{tutorial.headline}</h3>
          <p className="font-body text-gray-600 leading-relaxed text-base mb-6">{tutorial.body}</p>

          {/* Speech controls */}
          <div className="flex items-center gap-3 mb-6">
            {speaking ? (
              <button
                onClick={stop}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-xl font-body font-bold text-sm hover:bg-red-200 transition-colors"
              >
                <VolumeX size={16} /> Stop
              </button>
            ) : (
              <button
                onClick={handleSpeak}
                className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-600 rounded-xl font-body font-bold text-sm hover:bg-purple-200 transition-colors"
              >
                <Volume2 size={16} /> Listen again
              </button>
            )}
            <span className="font-body text-xs text-gray-400">
              {speaking ? 'Reading aloud…' : 'Click to hear this tip'}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { stop(); onContinue(); }}
              className={`
                w-full py-4 rounded-2xl font-display text-xl text-white shadow-lg
                bg-gradient-to-r ${zoneColors[level.zone] ?? 'from-purple-500 to-pink-500'}
                hover:scale-105 transition-transform flex items-center justify-center gap-2
              `}
            >
              <Play size={20} fill="white" />
              Got it — let's play!
            </button>
            <button
              onClick={() => { stop(); onDismiss(); }}
              className="w-full py-2 font-body text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Don't show this tutorial again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
