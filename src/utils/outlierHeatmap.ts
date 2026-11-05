/** Presentation only: highlight strict, measured tails without inventing zeros. */
export function outlierHeatmap(values: (number | null | undefined)[]) {
  const sorted = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value)).sort((a, b) => a - b);
  return (value: number | null | undefined): string => {
    if (sorted.length < 7 || typeof value !== 'number' || !Number.isFinite(value) || sorted[0] === sorted[sorted.length - 1]) return '';
    const tail = Math.floor(sorted.length * .15);
    if (value > sorted[sorted.length - tail - 1]) return 'outlier-high';
    if (value < sorted[tail]) return 'outlier-low';
    return '';
  };
}
