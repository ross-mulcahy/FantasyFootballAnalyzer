import { NflTeamChip } from './NflTeamChip';
// Compatibility wrapper: all legacy consumers now use the same ticker identity.
export function NflTeamLabel({ team, className }: { team: string | null | undefined; size?: 'xs' | 'sm'; logoOnly?: boolean; className?: string }) {
  return <NflTeamChip team={team} className={className} />;
}
