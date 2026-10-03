import { Link } from 'react-router-dom';
import { Package, Rocket, Car, TrainFront, Factory, Clock, type LucideIcon } from 'lucide-react';

interface GameCard {
  id: string;
  name: string;
  description: string;
  Icon: LucideIcon;
  color: string;
  playable: boolean;
}

const GAMES: GameCard[] = [
  { id: 'post-office', name: 'Post Office', description: 'Type the city code to sort each parcel before it falls off the belt!', Icon: Package, color: 'bg-gradient-to-br from-orange-400 to-pink-500', playable: true },
  { id: 'rockets', name: 'Rockets', description: 'Launch rockets with lightning-fast typing.', Icon: Rocket, color: '', playable: false },
  { id: 'cars', name: 'Cars', description: 'Race to the finish line, one word at a time.', Icon: Car, color: '', playable: false },
  { id: 'trains', name: 'Trains', description: 'Keep the trains running on time.', Icon: TrainFront, color: '', playable: false },
  { id: 'factories', name: 'Factories', description: 'Build gadgets on the assembly line.', Icon: Factory, color: '', playable: false },
];

export default function GamesHubPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="font-display text-5xl text-purple-700 mb-2">Games</h1>
        <p className="font-body text-gray-500 text-lg">
          Quick, replayable typing games to sharpen your speed and accuracy!
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {GAMES.map(({ id, name, description, Icon, color, playable }) => {
          const content = (
            <>
              {!playable && (
                <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-body font-bold text-gray-500 bg-white rounded-full px-2 py-0.5">
                  <Clock size={10} aria-hidden="true" /> Coming soon
                </span>
              )}
              <Icon size={48} className={playable ? 'text-white drop-shadow' : 'text-gray-400'} aria-hidden="true" />
              <div className={`font-display text-2xl ${playable ? 'text-white drop-shadow' : 'text-gray-500'}`}>
                {name}
              </div>
              <div className={`font-body text-sm leading-tight ${playable ? 'text-white/90' : 'text-gray-400'}`}>
                {description}
              </div>
            </>
          );
          const base = 'relative flex flex-col items-center gap-3 p-6 rounded-3xl border-2 text-center transition-all duration-200';

          return playable ? (
            <Link
              key={id}
              to={`/games/${id}`}
              data-testid={`game-${id}`}
              className={`${base} ${color} border-white/40 shadow-md hover:scale-105 hover:shadow-xl`}
            >
              {content}
            </Link>
          ) : (
            <div
              key={id}
              data-testid={`game-${id}`}
              aria-disabled="true"
              className={`${base} bg-gray-100 border-gray-200 opacity-60 grayscale cursor-not-allowed`}
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
