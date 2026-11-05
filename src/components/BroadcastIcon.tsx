export function BroadcastIcon({ kind = 'grid', size = 14 }: { kind?: string; size?: number }) {
  const paths: Record<string, string> = {
    close: 'M6 6l12 12 M18 6 6 18',
    star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z',
    target: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z M9 12l2 2 4-4',
    check: 'M4 12l5 5L20 6',
    grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    activity: 'M2 12h5l3-8 4 16 3-8h5',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    swap: 'M3 7h17l-4-4 M21 17H4l4 4 M20 7l-4 4 M4 17l4-4',
    shield: 'M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7z M8 12l3 3 5-6',
    award: 'M8 3h8v5a4 4 0 0 1-8 0z M8 5H4v2a4 4 0 0 0 4 4 M16 5h4v2a4 4 0 0 1-4 4 M12 12v7 M7 21h10',
    file: 'M5 3h9l5 5v13H5z M14 3v6h5 M8 13h8 M8 17h8',
    settings: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
    audio: 'M11 5 6 9H2v6h4l5 4z M15 8a6 6 0 0 1 0 8 M18 5a10 10 0 0 1 0 14',
    sync: 'M20 7a8 8 0 0 0-14-2L3 8 M3 3v5h5 M4 17a8 8 0 0 0 14 2l3-3 M21 21v-5h-5',
    menu: 'M3 6h18 M3 12h18 M3 18h18',
    alert: 'M12 3 2 21h20z M12 9v5 M12 17v1',
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind] ?? paths.grid} /></svg>;
}
