import { KEYBOARD_ROWS, FINGER_COLORS, FINGER_HIGHLIGHT, getKeyDef } from '../../data/keyboard';

interface Props {
  /** The character that should be highlighted as "press this next" */
  nextChar?: string;
  /** Keys explicitly highlighted (e.g. for intro displays) */
  highlightKeys?: string[];
  /** Whether to show the keyboard at all */
  visible?: boolean;
}

export default function Keyboard({ nextChar, highlightKeys = [], visible = true }: Props) {
  if (!visible) return null;

  const nextKey = nextChar?.toLowerCase() ?? '';
  const highlighted = new Set([
    nextKey,
    ...highlightKeys.map((k) => k.toLowerCase()),
  ]);

  // If the next char is uppercase, also highlight shift
  const shiftNeeded = nextChar !== undefined && nextChar !== nextChar.toLowerCase() && nextChar !== ' ';

  return (
    <div
      aria-label="Virtual keyboard"
      className="bg-gray-800 rounded-2xl p-3 shadow-xl inline-flex flex-col gap-1.5 mx-auto"
    >
      {KEYBOARD_ROWS.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-1.5 justify-center">
          {row.map((keyDef, keyIdx) => {
            const isNext =
              highlighted.has(keyDef.key) ||
              (shiftNeeded && keyDef.key === 'shift');
            const colorClass = isNext
              ? FINGER_HIGHLIGHT[keyDef.finger]
              : FINGER_COLORS[keyDef.finger];

            return (
              <div
                key={`${keyDef.key}-${keyIdx}`}
                className={`
                  ${keyDef.width ?? 'w-9'} h-9
                  flex items-center justify-center
                  rounded-lg font-body font-bold text-xs
                  select-none transition-all duration-150
                  ${colorClass}
                  ${isNext ? 'animate-pop z-10' : ''}
                `}
              >
                {keyDef.display}
                {(keyDef.key === 'f' || keyDef.key === 'j') && (
                  <span className="absolute bottom-1 w-2 h-0.5 bg-current opacity-60 rounded" />
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Finger color legend */}
      <div className="flex flex-wrap gap-1.5 justify-center mt-1 pt-2 border-t border-gray-700">
        {[
          { label: 'Left pinky', color: 'bg-blue-400' },
          { label: 'Left ring', color: 'bg-green-400' },
          { label: 'Left middle', color: 'bg-yellow-400' },
          { label: 'Left index', color: 'bg-orange-400' },
          { label: 'Right index', color: 'bg-red-400' },
          { label: 'Right middle', color: 'bg-pink-400' },
          { label: 'Right ring', color: 'bg-purple-400' },
          { label: 'Right pinky', color: 'bg-teal-400' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${color}`} />
            <span className="text-gray-400 text-xs font-body">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
