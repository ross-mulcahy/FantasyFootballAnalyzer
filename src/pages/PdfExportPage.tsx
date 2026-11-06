import { StudioTeleprompterBar } from '@/components/StudioTeleprompterBar';
import { StudioMonitorFrame } from '@/components/StudioMonitorFrame';
import { useState } from 'react';
import type { League } from '@/types';
import { importChunk } from '@/utils/staleChunk';
import { Analytics } from '@/utils/analytics';
import { BroadcastIcon } from '@/components/BroadcastIcon';
import styles from './GameDayPage.module.css';
export function PdfExportPage({ league }: { league: League }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const exportReport = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const { exportLeagueReport } = await importChunk(() => import('@/utils/exportPdf'), 'PDF export');
      Analytics.pdfExported('league_report');
      await exportLeagueReport(league);
    } catch { setError("Couldn't build the PDF report. Check your connection and try again."); }
    finally { setBusy(false); }
  };
  return <div className={`${styles.page} ${styles.settingsPage}`}><div className="container"><StudioTeleprompterBar takes={["Report desk open. The loaded league is going on the record.", "Missing provider data stays unavailable in the export."]} /><div className={styles.header}><h1>PDF Export</h1><p className={styles.subtitle}>The front office, on the record.</p></div><StudioMonitorFrame as="section" padded className={styles.card}><h2 className={styles.sectionTitle}>LEAGUE REPORT // {league.name}</h2><p className={styles.hint}>Export draft grades, trades, waiver returns, luck and awards using the currently loaded league data.</p><dl className={styles.exportSummary}><div><dt>Season</dt><dd>{league.season}</dd></div><div><dt>Teams</dt><dd>{league.teams.length}</dd></div><div><dt>Platform</dt><dd>{league.platform.toUpperCase()}</dd></div></dl><button className="btn btn-primary" disabled={busy} aria-busy={busy} onClick={() => void exportReport()}><BroadcastIcon kind="file" />{busy ? 'Building report…' : 'Export PDF'}</button>{error && <p className={styles.error} role="alert">{error}</p>}<p className={styles.hint}>Saved directly to your device. Missing provider data stays unavailable.</p></StudioMonitorFrame></div></div>;
}
