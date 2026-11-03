import { AnimatePresence, motion } from 'framer-motion';
import type { FactoryOrderView } from '../../hooks/useFactoryGame';

interface Props {
  order: FactoryOrderView | null; // the order being built (the front one)
  builtUid: number | null;        // uid of the toy just finished, so it rolls off
}

// The assembly line: the toy under construction, with each finished part
// snapping on. Animations are one-off (a part attaching, a toy leaving), never
// per tick.
export default function ToyAssembly({ order, builtUid }: Props) {
  return (
    <div
      data-testid="assembly-line"
      className="relative w-full h-44 rounded-2xl bg-gray-700 border-4 border-gray-800 overflow-hidden
                 bg-[repeating-linear-gradient(90deg,#4b5563_0_2px,transparent_2px_40px)]"
    >
      <AnimatePresence custom={builtUid}>
        {order && (
          <motion.div
            key={order.uid}
            data-testid="toy-assembly"
            data-toy={order.toy.id}
            className="absolute inset-0 flex items-center justify-center gap-4"
            variants={{
              enter: { x: -120, opacity: 0 },
              onLine: { x: 0, opacity: 1, transition: { duration: 0.3 } },
              // A finished toy rolls off to the right; a missed one just fades.
              exit: (uid: number | null) =>
                uid === order.uid
                  ? { x: 400, opacity: 0, transition: { duration: 0.5 } }
                  : { opacity: 0, transition: { duration: 0.3 } },
            }}
            initial="enter"
            animate="onLine"
            exit="exit"
          >
            <span className="text-6xl" aria-hidden="true">{order.toy.icon}</span>
            <div className="flex flex-wrap gap-2 max-w-sm">
              {order.toy.parts.slice(0, order.partsDone).map((part, i) => (
                <motion.span
                  key={i}
                  data-testid="attached-part"
                  initial={{ scale: 0, y: -30 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  className="px-3 py-1 rounded-lg bg-amber-300 border-2 border-amber-500 font-display text-gray-800"
                >
                  {part}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
