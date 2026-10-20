import { Package, Trophy, PackageX, Target, Flame, Timer, Inbox } from 'lucide-react';
import GameFlowPage from '../components/Games/GameFlowPage';
import PostOfficeGame from '../components/PostOffice/PostOfficeGame';
import { REGIONS } from '../data/postOfficeParcels';
import type { PostOfficeRoundResult } from '../hooks/usePostOfficeGame';

function resultsHeadline({ score }: PostOfficeRoundResult): string {
  if (score >= 20) return 'Super Sorter!';
  if (score >= 10) return 'Great sorting!';
  if (score > 0) return 'Nice work!';
  return 'Keep practising!';
}

function resultStats(result: PostOfficeRoundResult) {
  return [
    { label: 'Parcels sorted', value: result.score, Icon: Trophy, color: 'text-green-600', bg: 'bg-green-50', id: 'score' },
    { label: 'Parcels missed', value: result.parcelsMissed, Icon: PackageX, color: 'text-red-500', bg: 'bg-red-50', id: 'missed' },
    { label: 'Accuracy', value: `${result.accuracy}%`, Icon: Target, color: 'text-purple-600', bg: 'bg-purple-50', id: 'accuracy' },
    { label: 'Best streak', value: result.bestStreak, Icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50', id: 'streak' },
  ];
}

const instructions = (
  <>
    <ul className="font-body text-gray-600 text-left space-y-3 mb-6">
      <li className="flex gap-3">
        <Package size={20} className="shrink-0 text-amber-500 mt-0.5" aria-hidden="true" />
        Parcels ride along the belt, each with a city code like <strong className="font-display text-purple-700">BOS</strong>.
      </li>
      <li className="flex gap-3">
        <Inbox size={20} className="shrink-0 text-blue-500 mt-0.5" aria-hidden="true" />
        Type the front parcel&apos;s code before it reaches the end of the belt to sort it into its bucket.
      </li>
      <li className="flex gap-3">
        <Timer size={20} className="shrink-0 text-purple-500 mt-0.5" aria-hidden="true" />
        You have 60 seconds. Parcels come faster and codes get longer as time runs down!
      </li>
    </ul>
    <div className="flex flex-wrap justify-center gap-2 mb-8">
      {REGIONS.map(({ region, name }) => (
        <span key={region} className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 font-body text-sm text-blue-700">
          <strong>{region}</strong> {name}
        </span>
      ))}
    </div>
  </>
);

export default function PostOfficeGamePage() {
  return (
    <GameFlowPage<PostOfficeRoundResult>
      gameId="post-office"
      iconColor="text-amber-500"
      instructions={instructions}
      renderGame={({ onComplete }) => <PostOfficeGame autoStart onComplete={onComplete} />}
      resultStats={resultStats}
      headline={resultsHeadline}
    />
  );
}
