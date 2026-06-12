interface Props {
  stars: 0 | 1 | 2 | 3;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' };

export default function StarRating({ stars, size = 'md' }: Props) {
  const sz = SIZE_MAP[size];
  return (
    <span className="inline-flex gap-0.5" aria-label={`${stars} out of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={`${sz} ${n <= stars ? 'text-yellow-400' : 'text-gray-300'}`}>
          {n <= stars ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}
