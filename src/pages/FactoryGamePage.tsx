import { ToyBrick, ListOrdered, Timer, Zap, Trophy, PackageX, Wrench, Target, Flame } from 'lucide-react';
import GameFlowPage from '../components/Games/GameFlowPage';
import FactoryGame from '../components/Factory/FactoryGame';
import { COMBO_BONUS_AT, COMBO_BONUS_MS, type FactoryRoundResult } from '../hooks/useFactoryGame';

export function resultsHeadline({ score }: FactoryRoundResult): string {
  if (score >= 10) return 'Toy tycoon!';
  if (score >= 6) return 'Busy builder!';
  if (score > 0) return 'Nice building!';
  return 'Keep practising!';
}

function resultStats(result: FactoryRoundResult) {
  return [
    { label: 'Toys built', value: result.score, Icon: Trophy, color: 'text-green-600', bg: 'bg-green-50', id: 'score' },
    { label: 'Orders missed', value: result.ordersMissed, Icon: PackageX, color: 'text-red-500', bg: 'bg-red-50', id: 'missed' },
    { label: 'Parts built', value: result.partsBuilt, Icon: Wrench, color: 'text-teal-600', bg: 'bg-teal-50', id: 'parts' },
    { label: 'Accuracy', value: `${result.accuracy}%`, Icon: Target, color: 'text-purple-600', bg: 'bg-purple-50', id: 'accuracy' },
    { label: 'Best combo', value: result.bestStreak, Icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50', id: 'streak' },
  ];
}

const instructions = (
  <ul className="font-body text-gray-600 text-left space-y-3 mb-8">
    <li className="flex gap-3">
      <ToyBrick size={20} className="shrink-0 text-teal-500 mt-0.5" aria-hidden="true" />
      Toy orders arrive on tickets, like a robot made of <strong className="font-display text-purple-700">HEAD BODY ARM ARM</strong>.
    </li>
    <li className="flex gap-3">
      <ListOrdered size={20} className="shrink-0 text-blue-500 mt-0.5" aria-hidden="true" />
      Type each part in order. Every finished part snaps onto the toy, and the next part starts by itself.
    </li>
    <li className="flex gap-3">
      <Timer size={20} className="shrink-0 text-red-500 mt-0.5" aria-hidden="true" />
      Every order has a timer. Finish the toy before it runs out, or the order is missed!
    </li>
    <li className="flex gap-3">
      <Zap size={20} className="shrink-0 text-orange-500 mt-0.5" aria-hidden="true" />
      Build {COMBO_BONUS_AT} toys in a row with no mistakes and the next order gets {COMBO_BONUS_MS / 1000} extra seconds.
    </li>
    <li className="flex gap-3">
      <Timer size={20} className="shrink-0 text-purple-500 mt-0.5" aria-hidden="true" />
      You have 60 seconds. Orders come faster and toys get bigger as time runs down!
    </li>
  </ul>
);

export default function FactoryGamePage() {
  return (
    <GameFlowPage<FactoryRoundResult>
      gameId="factories"
      iconColor="text-teal-500"
      instructions={instructions}
      renderGame={({ onComplete }) => <FactoryGame autoStart onComplete={onComplete} />}
      resultStats={resultStats}
      headline={resultsHeadline}
    />
  );
}
