/** Integer-grid studio icons stay sharp at arcade scale. */
export function PixelStudioIcon({ kind = 'award', size = 16 }: { kind?: string; size?: number }) {
  const paths: Record<string, string> = {
    award: 'M4 1h8v6h-1v2H9v3h3v2H4v-2h3V9H5V7H4V1zM1 2h2v4h2v2H2V6H1V2zM13 2h2v4h-1v2h-3V6h2V2z',
    swap: 'M1 4h10V1l4 4-4 4V6H1V4zM15 10H5V7l-4 4 4 4v-3h10v-2z',
    activity: 'M3 1h10v2h2v10h-2v2H3v-2H1V3h2V1zM4 3v1H3v8h1v1h8v-1h1V4h-1V3H4zM7 4h2v4h3v2H7V4z',
  };
  return <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true"><path d={paths[kind] ?? paths.award} fill="currentColor" fillRule="evenodd" /></svg>;
}
