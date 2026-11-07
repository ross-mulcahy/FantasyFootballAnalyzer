/** A playful fantasy stress index; the first cross-league conflict carries the most weight. */
export function sweatBpm(lineupHazards: number, rootingConflicts: number): number {
  const conflicts = Math.max(0, rootingConflicts);
  return 72 + Math.max(0, lineupHazards) * 10 + (conflicts ? 10 + (conflicts - 1) * 4 : 0);
}
