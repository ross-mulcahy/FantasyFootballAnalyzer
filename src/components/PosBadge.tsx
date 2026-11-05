import styles from './PosBadge.module.css';

interface PosBadgeProps {
  pos: string;
  // Optional position rank, rendered inside the badge ("RB12").
  posRank?: number;
  className?: string;
}

const KNOWN = new Set(['QB', 'RB', 'WR', 'TE', 'FLEX', 'SF', 'SUPERFLEX', 'PICK', 'K', 'DST', 'DEF']);

// Position chip with restrained fill, border and text in one semantic colour.
export function PosBadge({ pos, posRank, className }: PosBadgeProps) {
  const base = pos.toUpperCase().replace(/[^A-Z]/g, '');
  const known = KNOWN.has(base);
  return (
    <span
      className={`${styles.badge} ${known ? styles[base.toLowerCase()] : ''} ${className ?? ''}`}
    >
      {base}
      {posRank ? <span className={styles.rank}>{posRank}</span> : null}
    </span>
  );
}
