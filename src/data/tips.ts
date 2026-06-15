import type { TipType } from '../components/icons/TipIcon';

export interface Tip {
  type: TipType;
  title: string;
  body: string;
  gradient: string;
}

export const TIPS: Tip[] = [
  {
    type: 'home-row',
    title: 'Start at Home Row',
    body: 'Place your left fingers on A S D F and right fingers on J K L ; — feel the bumps on F and J, those are your anchors!',
    gradient: 'from-orange-400 to-amber-500',
  },
  {
    type: 'no-peek',
    title: "Don't Peek!",
    body: "Try not to look at the keyboard. Keep your eyes on the screen. Your muscle memory will learn where every key lives over time.",
    gradient: 'from-pink-400 to-red-500',
  },
  {
    type: 'slow-wins',
    title: 'Slow Beats Fast',
    body: 'Accuracy first, speed second. Every correct keystroke teaches your fingers exactly where to go — rushing just builds bad habits.',
    gradient: 'from-green-400 to-emerald-500',
  },
  {
    type: 'return-home',
    title: 'Always Return Home',
    body: 'After pressing any key, bring your fingers back to the home row. This one habit is the whole secret to touch typing!',
    gradient: 'from-blue-400 to-indigo-500',
  },
  {
    type: 'posture',
    title: 'Sit Up Straight',
    body: 'Back straight, feet flat, wrists level. Good posture means you can type for longer without getting tired or sore.',
    gradient: 'from-purple-400 to-violet-500',
  },
];

export const HOME_ROW_KEYS = [
  { key: 'a', finger: 'Left Pinky',   bgClass: 'bg-blue-400'   },
  { key: 's', finger: 'Left Ring',    bgClass: 'bg-green-400'  },
  { key: 'd', finger: 'Left Middle',  bgClass: 'bg-yellow-400' },
  { key: 'f', finger: 'Left Index',   bgClass: 'bg-orange-400' },
  { key: 'j', finger: 'Right Index',  bgClass: 'bg-red-400'    },
  { key: 'k', finger: 'Right Middle', bgClass: 'bg-pink-400'   },
  { key: 'l', finger: 'Right Ring',   bgClass: 'bg-purple-400' },
  { key: ';', finger: 'Right Pinky',  bgClass: 'bg-teal-400'   },
];
