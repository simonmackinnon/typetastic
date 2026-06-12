import type { Badge, PlayerStats } from '../types';

export const BADGES: Badge[] = [
  {
    id: 'first-keystroke',
    name: 'First Keystroke',
    description: 'You pressed your very first key!',
    icon: '🎉',
    color: 'bg-pink-400',
    condition: (s) => s.levelsCompleted >= 1,
  },
  {
    id: 'home-row-hero',
    name: 'Home Row Hero',
    description: 'Mastered all four home row levels!',
    icon: '🏠',
    color: 'bg-orange-400',
    condition: (s) => s.highestLevel >= 4,
  },
  {
    id: 'tower-climber',
    name: 'Tower Climber',
    description: 'Conquered the Top Tower zone!',
    icon: '🗼',
    color: 'bg-blue-400',
    condition: (s) => s.highestLevel >= 7,
  },
  {
    id: 'bunker-buster',
    name: 'Bunker Buster',
    description: 'Blasted through the Bottom Bunker!',
    icon: '💥',
    color: 'bg-teal-400',
    condition: (s) => s.highestLevel >= 10,
  },
  {
    id: 'word-wizard',
    name: 'Word Wizard',
    description: 'You can type real words now!',
    icon: '🧙',
    color: 'bg-purple-400',
    condition: (s) => s.highestLevel >= 13,
  },
  {
    id: 'sentence-sage',
    name: 'Sentence Sage',
    description: 'Typing full sentences with style!',
    icon: '📝',
    color: 'bg-amber-400',
    condition: (s) => s.highestLevel >= 17,
  },
  {
    id: 'speed-star',
    name: 'Speed Star',
    description: 'Hit 25 words per minute!',
    icon: '⚡',
    color: 'bg-yellow-400',
    condition: (s) => s.bestWpm >= 25,
  },
  {
    id: 'turbo-typist',
    name: 'Turbo Typist',
    description: 'Blazing at 35 words per minute!',
    icon: '🏎️',
    color: 'bg-red-400',
    condition: (s) => s.bestWpm >= 35,
  },
  {
    id: 'touch-type-master',
    name: 'Touch Type Master',
    description: 'Completed all 20 levels!',
    icon: '🏆',
    color: 'bg-gradient-to-br from-yellow-400 to-orange-400',
    condition: (s) => s.levelsCompleted >= 20,
  },
  {
    id: 'star-collector',
    name: 'Star Collector',
    description: 'Earned 30 stars across all levels!',
    icon: '⭐',
    color: 'bg-sky-400',
    condition: (s) => s.totalStars >= 30,
  },
  {
    id: 'perfect-typist',
    name: 'Perfect Typist',
    description: 'Got 3 stars on any level!',
    icon: '✨',
    color: 'bg-violet-400',
    condition: (s) => s.totalStars >= 3,
  },
  {
    id: 'rockstar',
    name: 'Rockstar Typer',
    description: 'Smashed 50 words per minute!',
    icon: '🚀',
    color: 'bg-gradient-to-br from-purple-500 to-pink-500',
    condition: (s) => s.bestWpm >= 50,
  },
];

export function checkNewBadges(stats: PlayerStats, alreadyEarned: string[]): Badge[] {
  return BADGES.filter(
    (b) => !alreadyEarned.includes(b.id) && b.condition(stats),
  );
}
