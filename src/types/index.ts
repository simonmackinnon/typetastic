export type LevelType = 'keys' | 'words' | 'sentences' | 'speed';

export type Zone = 1 | 2 | 3 | 4 | 5 | 6;

export interface Exercise {
  id: string;
  prompt: string;           // instructional text shown above typing area
  target: string;           // text to type
  showKeyboard: boolean;    // whether to show the virtual keyboard
}

export interface Level {
  id: string;               // e.g. "01"
  number: number;
  name: string;
  zone: Zone;
  zoneName: string;
  description: string;
  type: LevelType;
  exercises: Exercise[];
  requiredAccuracy: number; // 0-100
  speedTarget?: number;     // WPM target (speed levels)
  color: string;            // Tailwind bg class
  textColor: string;        // Tailwind text class
  icon: string;             // emoji
  highlightKeys: string[];  // keys introduced / practiced in this level
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;             // emoji
  color: string;            // Tailwind bg class
  condition: (stats: PlayerStats) => boolean;
}

export interface LevelProgress {
  levelId: string;
  stars: 0 | 1 | 2 | 3;
  bestAccuracy: number;
  bestWpm: number;
  completedAt: string;      // ISO-8601
}

export interface PlayerStats {
  totalStars: number;
  levelsCompleted: number;
  highestLevel: number;
  bestWpm: number;
  totalTimeMinutes: number;
  badgesEarned: string[];
}

export type GameStatus = 'idle' | 'countdown' | 'playing' | 'complete' | 'failed';

export interface TypingResult {
  accuracy: number;
  wpm: number;
  stars: 0 | 1 | 2 | 3;
  timeSeconds: number;
  errorCount: number;
}

export interface User {
  sub: string;
  email: string;
  username?: string;
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: User };
