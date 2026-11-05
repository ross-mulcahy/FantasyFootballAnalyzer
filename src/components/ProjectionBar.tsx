// A share of weekly projected points, never an implied win probability.
export function ProjectionBar({ own, opponent }: { own: number | null | undefined; opponent: number | null | undefined }) {
  if (typeof own !== 'number' || typeof opponent !== 'number' || !Number.isFinite(own) || !Number.isFinite(opponent) || own < 0 || opponent < 0 || own + opponent <= 0) return <div className="projection-bar unavailable" aria-label="Projection share unavailable" />;
  return <div className="projection-bar" title="Weekly projection share, not win probability" role="img" aria-label={`Weekly projection share: ${own.toFixed(2)} versus ${opponent.toFixed(2)} points`}><span style={{ width: `${own / (own + opponent) * 100}%` }} /></div>;
}
