/** Integer-grid studio icons stay sharp at arcade scale. */
export function PixelStudioIcon({ kind = 'award', size = 16 }: { kind?: string; size?: number }) {
  const paths: Record<string, string> = {
    award: 'M4 1h8v6h-1v2H9v3h3v2H4v-2h3V9H5V7H4V1zM1 2h2v4h2v2H2V6H1V2zM13 2h2v4h-1v2h-3V6h2V2z',
    swap: 'M1 4h10V1l4 4-4 4V6H1V4zM15 10H5V7l-4 4 4 4v-3h10v-2z',
    activity: 'M3 1h10v2h2v10h-2v2H3v-2H1V3h2V1zM4 3v1H3v8h1v1h8v-1h1V4h-1V3H4zM7 4h2v4h3v2H7V4z',
    crown: 'M1 4h2v3h2V3h2v4h2V3h2v4h2V4h2v8H1V4zM3 10v1h10v-1H3zM3 13h10v2H3v-2z',
    horseshoe: 'M4 1h8v2H4V1zM2 3h2v8h2v2h4v-2h2V3h2v9h-2v2h-2v1H6v-1H4v-2H2V3zM5 4h2v2H5V4zM9 4h2v2H9V4z',
    dumpster: 'M7 0h2v2h1v2h2v1H5V3h1V1h1V0zM5 5h6v1h4v2H1V6h4V5zM2 9h12v4h-2v2H4v-2H2V9zM5 10v3h2v-3H5zM9 10v3h2v-3H9z',
  };
  return <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true"><path d={paths[kind] ?? paths.award} fill="currentColor" fillRule="evenodd" /></svg>;
}
