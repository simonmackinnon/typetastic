import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import type { ParcelRegion } from '../../data/postOfficeParcels';

interface Props {
  region: ParcelRegion;
  name: string;
  count: number;
}

export default function Bucket({ region, name, count }: Props) {
  return (
    <div
      data-bucket={region}
      data-testid={`bucket-${region}`}
      className="flex flex-col items-center gap-1 px-3 py-3 rounded-2xl bg-blue-50 border-2 border-blue-300 min-w-[6rem]"
    >
      <Inbox size={26} className="text-blue-600" aria-hidden="true" />
      <div className="font-display text-lg text-blue-800">{region}</div>
      <div className="font-body text-xs text-gray-500">{name}</div>
      {/* Re-keyed on count so each delivery replays the pop */}
      <motion.div
        key={count}
        initial={{ scale: count > 0 ? 1.6 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        data-testid={`bucket-${region}-count`}
        className="font-display text-2xl text-blue-700"
      >
        {count}
      </motion.div>
    </div>
  );
}
