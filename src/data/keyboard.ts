export type FingerZone =
  | 'left-pinky'
  | 'left-ring'
  | 'left-middle'
  | 'left-index'
  | 'right-index'
  | 'right-middle'
  | 'right-ring'
  | 'right-pinky'
  | 'thumb'
  | 'none';

export const FINGER_COLORS: Record<FingerZone, string> = {
  'left-pinky':   'bg-blue-400 text-white',
  'left-ring':    'bg-green-400 text-white',
  'left-middle':  'bg-yellow-400 text-gray-800',
  'left-index':   'bg-orange-400 text-white',
  'right-index':  'bg-red-400 text-white',
  'right-middle': 'bg-pink-400 text-white',
  'right-ring':   'bg-purple-400 text-white',
  'right-pinky':  'bg-teal-400 text-white',
  'thumb':        'bg-gray-300 text-gray-700',
  'none':         'bg-gray-100 text-gray-600',
};

export const FINGER_HIGHLIGHT: Record<FingerZone, string> = {
  'left-pinky':   'bg-blue-600 text-white scale-125 shadow-lg shadow-blue-300',
  'left-ring':    'bg-green-600 text-white scale-125 shadow-lg shadow-green-300',
  'left-middle':  'bg-yellow-500 text-white scale-125 shadow-lg shadow-yellow-300',
  'left-index':   'bg-orange-500 text-white scale-125 shadow-lg shadow-orange-300',
  'right-index':  'bg-red-600 text-white scale-125 shadow-lg shadow-red-300',
  'right-middle': 'bg-pink-600 text-white scale-125 shadow-lg shadow-pink-300',
  'right-ring':   'bg-purple-600 text-white scale-125 shadow-lg shadow-purple-300',
  'right-pinky':  'bg-teal-600 text-white scale-125 shadow-lg shadow-teal-300',
  'thumb':        'bg-gray-500 text-white scale-125 shadow-lg',
  'none':         'bg-gray-200 text-gray-700 scale-110',
};

interface KeyDef {
  key: string;          // canonical key name (lowercase for letters)
  display: string;      // label shown on the key
  finger: FingerZone;
  width?: string;       // Tailwind width class override (default: 'w-9')
}

export const KEYBOARD_ROWS: KeyDef[][] = [
  // Number row
  [
    { key: '`',  display: '`',    finger: 'left-pinky' },
    { key: '1',  display: '1',    finger: 'left-pinky' },
    { key: '2',  display: '2',    finger: 'left-ring' },
    { key: '3',  display: '3',    finger: 'left-middle' },
    { key: '4',  display: '4',    finger: 'left-index' },
    { key: '5',  display: '5',    finger: 'left-index' },
    { key: '6',  display: '6',    finger: 'right-index' },
    { key: '7',  display: '7',    finger: 'right-index' },
    { key: '8',  display: '8',    finger: 'right-middle' },
    { key: '9',  display: '9',    finger: 'right-ring' },
    { key: '0',  display: '0',    finger: 'right-pinky' },
    { key: '-',  display: '-',    finger: 'right-pinky' },
    { key: '=',  display: '=',    finger: 'right-pinky' },
  ],
  // QWERTY row
  [
    { key: 'tab', display: 'Tab', finger: 'none', width: 'w-14' },
    { key: 'q',  display: 'Q',    finger: 'left-pinky' },
    { key: 'w',  display: 'W',    finger: 'left-ring' },
    { key: 'e',  display: 'E',    finger: 'left-middle' },
    { key: 'r',  display: 'R',    finger: 'left-index' },
    { key: 't',  display: 'T',    finger: 'left-index' },
    { key: 'y',  display: 'Y',    finger: 'right-index' },
    { key: 'u',  display: 'U',    finger: 'right-index' },
    { key: 'i',  display: 'I',    finger: 'right-middle' },
    { key: 'o',  display: 'O',    finger: 'right-ring' },
    { key: 'p',  display: 'P',    finger: 'right-pinky' },
    { key: '[',  display: '[',    finger: 'right-pinky' },
    { key: ']',  display: ']',    finger: 'right-pinky' },
  ],
  // Home row
  [
    { key: 'caps', display: 'Caps', finger: 'none', width: 'w-16' },
    { key: 'a',  display: 'A',    finger: 'left-pinky' },
    { key: 's',  display: 'S',    finger: 'left-ring' },
    { key: 'd',  display: 'D',    finger: 'left-middle' },
    { key: 'f',  display: 'F',    finger: 'left-index' },
    { key: 'g',  display: 'G',    finger: 'left-index' },
    { key: 'h',  display: 'H',    finger: 'right-index' },
    { key: 'j',  display: 'J',    finger: 'right-index' },
    { key: 'k',  display: 'K',    finger: 'right-middle' },
    { key: 'l',  display: 'L',    finger: 'right-ring' },
    { key: ';',  display: ';',    finger: 'right-pinky' },
    { key: "'",  display: "'",    finger: 'right-pinky' },
    { key: 'enter', display: 'Enter', finger: 'none', width: 'w-16' },
  ],
  // Bottom row
  [
    { key: 'shift', display: 'Shift', finger: 'none', width: 'w-20' },
    { key: 'z',  display: 'Z',    finger: 'left-pinky' },
    { key: 'x',  display: 'X',    finger: 'left-ring' },
    { key: 'c',  display: 'C',    finger: 'left-middle' },
    { key: 'v',  display: 'V',    finger: 'left-index' },
    { key: 'b',  display: 'B',    finger: 'left-index' },
    { key: 'n',  display: 'N',    finger: 'right-index' },
    { key: 'm',  display: 'M',    finger: 'right-index' },
    { key: ',',  display: ',',    finger: 'right-middle' },
    { key: '.',  display: '.',    finger: 'right-ring' },
    { key: '/',  display: '/',    finger: 'right-pinky' },
    { key: 'shift', display: 'Shift', finger: 'none', width: 'w-20' },
  ],
  // Space row
  [
    { key: ' ', display: 'SPACE', finger: 'thumb', width: 'w-64' },
  ],
];

export function getKeyDef(char: string): KeyDef | undefined {
  const lower = char.toLowerCase();
  for (const row of KEYBOARD_ROWS) {
    const found = row.find((k) => k.key === lower);
    if (found) return found;
  }
  return undefined;
}
