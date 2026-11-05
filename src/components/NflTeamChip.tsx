import type { CSSProperties } from 'react';
import { nflTeamInfo } from '@/data/nflTeams';
import styles from './NflTeamChip.module.css';

type Props = { team: string | null | undefined; className?: string };

// The broadcast chip keeps NFL identity legible without fetching logo art.
const broadcastColors: Record<string, string> = {
  DAL: '#003594',
  SEA: '#69BE28',
};

export function NflTeamChip({ team, className = '' }: Props) {
  const info = nflTeamInfo(team);
  const label = info?.abbr ?? (team?.trim().toUpperCase() || 'FA');
  const color = info ? broadcastColors[info.abbr] ?? info.primary : 'var(--bone-dim)';
  return <span className={`${styles.chip} ${className}`} style={{ '--team-color': color } as CSSProperties} title={info?.name ?? (label === 'FA' ? 'Free agent' : label)}>{label}</span>;
}
