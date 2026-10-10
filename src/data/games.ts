import { Package, Rocket, Car, TrainFront, Factory, type LucideIcon } from 'lucide-react';

export interface GameDefinition {
  id: string;
  name: string;
  description: string;
  Icon: LucideIcon;
  color: string;             // Tailwind classes for the hub card when playable
  playable: boolean;         // false → "Coming soon" card on the hub
  route: string;
  unit: { one: string; many: string }; // what a point of score is called
  // Max plausible single-round score. Present only for games the API accepts;
  // must match GAME_IDS in lambda/handler.js (checked by an integration test).
  maxScore?: number;
}

// Single source of truth for the Games section. Order is the hub's card order.
export const GAMES = [
  {
    id: 'post-office',
    name: 'Post Office',
    description: 'Type the city code to sort each parcel before it falls off the belt!',
    Icon: Package,
    color: 'bg-gradient-to-br from-orange-400 to-pink-500',
    playable: true,
    route: '/games/post-office',
    unit: { one: 'parcel', many: 'parcels' },
    maxScore: 100,
  },
  {
    id: 'rockets',
    name: 'Rockets',
    description: 'Launch rockets with lightning-fast typing.',
    Icon: Rocket,
    color: '',
    playable: false, // becomes playable with the Rockets screens ticket
    route: '/games/rockets',
    unit: { one: 'km', many: 'km' },
    maxScore: 1000,
  },
  {
    id: 'cars',
    name: 'Cars',
    description: 'Race to the finish line, one word at a time.',
    Icon: Car,
    color: '',
    playable: false,
    route: '/games/cars',
    unit: { one: 'point', many: 'points' },
  },
  {
    id: 'trains',
    name: 'Trains',
    description: 'Keep the trains running on time.',
    Icon: TrainFront,
    color: '',
    playable: false,
    route: '/games/trains',
    unit: { one: 'point', many: 'points' },
  },
  {
    id: 'factories',
    name: 'Factories',
    description: 'Build gadgets on the assembly line.',
    Icon: Factory,
    color: '',
    playable: false, // becomes playable with the Factories screens ticket
    route: '/games/factories',
    unit: { one: 'toy', many: 'toys' },
    maxScore: 100,
  },
] as const satisfies readonly GameDefinition[];

export type GameId = (typeof GAMES)[number]['id'];

export const GAME_IDS: readonly GameId[] = GAMES.map((g) => g.id);

export const GAMES_BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g])) as Record<GameId, GameDefinition>;

export function isGameId(id: string): id is GameId {
  return (GAME_IDS as readonly string[]).includes(id);
}

export interface GameStats {
  best: number;   // best single round
  total: number;  // running total across all rounds
}

/** A zero entry for every registered game, so stats.games[id] always exists. */
export function zeroGameStats(): Record<GameId, GameStats> {
  return Object.fromEntries(GAME_IDS.map((id) => [id, { best: 0, total: 0 }])) as Record<GameId, GameStats>;
}
