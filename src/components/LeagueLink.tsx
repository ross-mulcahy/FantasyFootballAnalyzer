import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { League } from '@/types';
import { leagueGameDayHref } from '@/utils/gameDayLinks';
import styles from './LeagueLink.module.css';

export function LeagueLink({ league, children, className = '' }: { league: Pick<League, 'platform' | 'id' | 'season'>; children: ReactNode; className?: string }) {
  return <Link to={leagueGameDayHref(league)} className={`${styles.link} ${className}`}>{children}</Link>;
}
