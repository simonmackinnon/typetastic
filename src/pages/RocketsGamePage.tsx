import { Rocket, Fuel, Mountain, Timer, Trophy, Layers, Type, Target, Flame } from 'lucide-react';
import GameFlowPage from '../components/Games/GameFlowPage';
import RocketsGame from '../components/Rockets/RocketsGame';
import { STAGES, EMPTY_LIMIT_MS, type RocketsRoundResult } from '../hooks/useRocketsGame';

const MOON = STAGES.length - 1;

export function resultsHeadline({ stage, endedBy, score }: RocketsRoundResult): string {
  if (stage >= MOON) return 'Moonshot!';
  if (endedBy === 'fuel') return 'Out of fuel!';
  if (stage >= 2) return 'Into space!';
  if (score > 0) return 'Nice flying!';
  return 'Keep practising!';
}

function resultStats(result: RocketsRoundResult) {
  return [
    { label: 'Altitude', value: `${result.score} km`, Icon: Trophy, color: 'text-green-600', bg: 'bg-green-50', id: 'score' },
    { label: 'Highest stage', value: STAGES[result.stage].name, Icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50', id: 'stage' },
    { label: 'Words typed', value: result.wordsTyped, Icon: Type, color: 'text-sky-600', bg: 'bg-sky-50', id: 'words' },
    { label: 'Accuracy', value: `${result.accuracy}%`, Icon: Target, color: 'text-purple-600', bg: 'bg-purple-50', id: 'accuracy' },
    { label: 'Best streak', value: result.bestStreak, Icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50', id: 'streak' },
  ];
}

const instructions = (
  <>
    <ul className="font-body text-gray-600 text-left space-y-3 mb-6">
      <li className="flex gap-3">
        <Fuel size={20} className="shrink-0 text-green-500 mt-0.5" aria-hidden="true" />
        Type the space words to fuel your rocket. Every correct letter adds fuel, and the tank slowly drains.
      </li>
      <li className="flex gap-3">
        <Rocket size={20} className="shrink-0 text-indigo-500 mt-0.5" aria-hidden="true" />
        The fuller the tank, the faster you climb. Fly through the Sky, Clouds, Space and Satellites to reach the Moon!
      </li>
      <li className="flex gap-3">
        <Fuel size={20} className="shrink-0 text-red-500 mt-0.5" aria-hidden="true" />
        If the tank stays empty for {EMPTY_LIMIT_MS / 1000} seconds, the round ends. Keep typing to refuel!
      </li>
      <li className="flex gap-3">
        <Timer size={20} className="shrink-0 text-purple-500 mt-0.5" aria-hidden="true" />
        You have 60 seconds. Words get longer the higher you go.
      </li>
    </ul>
    <div className="flex flex-wrap justify-center gap-2 mb-8">
      {STAGES.map(({ name, km }) => (
        <span key={name} className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 font-body text-sm text-indigo-700">
          <Mountain size={12} className="inline -mt-0.5 mr-1" aria-hidden="true" />
          <strong>{name}</strong> {km} km
        </span>
      ))}
    </div>
  </>
);

export default function RocketsGamePage() {
  return (
    <GameFlowPage<RocketsRoundResult>
      gameId="rockets"
      iconColor="text-indigo-500"
      instructions={instructions}
      renderGame={({ onComplete }) => <RocketsGame autoStart onComplete={onComplete} />}
      resultStats={resultStats}
      headline={resultsHeadline}
    />
  );
}
