export type FactoryTier = 1 | 2 | 3;

export interface FactoryToy {
  id: string;
  name: string;
  icon: string;          // emoji shown on the order ticket
  parts: string[];       // typed in order, uppercase letters only
  tier: FactoryTier;     // 1 = 2 short parts, 2 = 3 parts, 3 = 4 parts of up to 6 letters
}

export const FACTORY_TOYS: FactoryToy[] = [
  // Tier 1: 2 parts of 3-4 letters
  { id: 'kite', name: 'Kite', icon: '🪁', parts: ['SAIL', 'TAIL'], tier: 1 },
  { id: 'boat', name: 'Boat', icon: '⛵', parts: ['HULL', 'SAIL'], tier: 1 },
  { id: 'drum', name: 'Drum', icon: '🥁', parts: ['BASE', 'SKIN'], tier: 1 },
  { id: 'duck', name: 'Duck', icon: '🦆', parts: ['BODY', 'BEAK'], tier: 1 },
  { id: 'yoyo', name: 'Yo-yo', icon: '🪀', parts: ['DISC', 'CORD'], tier: 1 },
  { id: 'snowman', name: 'Snowman', icon: '⛄', parts: ['BALL', 'HAT'], tier: 1 },
  { id: 'gift', name: 'Gift', icon: '🎁', parts: ['BOX', 'BOW'], tier: 1 },

  // Tier 2: 3 parts
  { id: 'car', name: 'Car', icon: '🚗', parts: ['WHEEL', 'WHEEL', 'SEAT'], tier: 2 },
  { id: 'teddy', name: 'Teddy', icon: '🧸', parts: ['EAR', 'EAR', 'NOSE'], tier: 2 },
  { id: 'plane', name: 'Plane', icon: '✈️', parts: ['WING', 'WING', 'TAIL'], tier: 2 },
  { id: 'train', name: 'Train', icon: '🚂', parts: ['ENGINE', 'WAGON', 'WHEEL'], tier: 2 },
  { id: 'doll', name: 'Doll', icon: '🪆', parts: ['HEAD', 'DRESS', 'SHOES'], tier: 2 },
  { id: 'truck', name: 'Truck', icon: '🚚', parts: ['CAB', 'WHEEL', 'WHEEL'], tier: 2 },
  { id: 'clock', name: 'Clock', icon: '⏰', parts: ['FACE', 'HAND', 'HAND'], tier: 2 },

  // Tier 3: 4 parts of up to 6 letters
  { id: 'robot', name: 'Robot', icon: '🤖', parts: ['HEAD', 'BODY', 'ARM', 'ARM'], tier: 3 },
  { id: 'dragon', name: 'Dragon', icon: '🐉', parts: ['HEAD', 'WING', 'WING', 'TAIL'], tier: 3 },
  { id: 'rocket', name: 'Rocket', icon: '🚀', parts: ['NOSE', 'FIN', 'FIN', 'ENGINE'], tier: 3 },
  { id: 'castle', name: 'Castle', icon: '🏰', parts: ['TOWER', 'TOWER', 'WALL', 'GATE'], tier: 3 },
  { id: 'dino', name: 'Dinosaur', icon: '🦕', parts: ['HEAD', 'LEG', 'LEG', 'TAIL'], tier: 3 },
  { id: 'bike', name: 'Bike', icon: '🚲', parts: ['FRAME', 'WHEEL', 'WHEEL', 'SEAT'], tier: 3 },
  { id: 'puppet', name: 'Puppet', icon: '🎭', parts: ['HEAD', 'ARM', 'ARM', 'STRING'], tier: 3 },
];

export function toysForTier(tier: FactoryTier): FactoryToy[] {
  return FACTORY_TOYS.filter((t) => t.tier === tier);
}
