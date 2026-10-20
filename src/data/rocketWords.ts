export type RocketWordTier = 1 | 2 | 3;

export interface RocketWord {
  id: string;
  word: string;          // uppercase, e.g. "ORBIT"
  tier: RocketWordTier;  // 1 = 3-4 letters, 2 = 5-6 letters, 3 = 7+ letters
}

const WORDS: Record<RocketWordTier, string[]> = {
  1: ['SUN', 'MOON', 'STAR', 'SKY', 'ORB', 'RAY', 'GAS', 'DUST', 'NOVA', 'MARS', 'ZOOM', 'FUEL', 'SHIP', 'AXIS', 'BEAM', 'GLOW', 'HALO'],
  2: ['ORBIT', 'COMET', 'PLANET', 'ROCKET', 'LAUNCH', 'GALAXY', 'METEOR', 'SATURN', 'VENUS', 'PLUTO', 'EARTH', 'LUNAR', 'SOLAR', 'ALIEN', 'SPACE', 'CRATER', 'NEBULA', 'COSMOS'],
  3: ['ASTEROID', 'SATELLITE', 'ASTRONAUT', 'MERCURY', 'JUPITER', 'NEPTUNE', 'ECLIPSE', 'GRAVITY', 'TELESCOPE', 'SPACESHIP', 'COUNTDOWN', 'UNIVERSE', 'MOONWALK', 'STARDUST', 'LIFTOFF', 'BLASTOFF', 'SUPERNOVA'],
};

export const ROCKET_WORDS: RocketWord[] = ([1, 2, 3] as RocketWordTier[]).flatMap((tier) =>
  WORDS[tier].map((word) => ({ id: word.toLowerCase(), word, tier })),
);

export function wordsForTier(tier: RocketWordTier): RocketWord[] {
  return ROCKET_WORDS.filter((w) => w.tier === tier);
}
