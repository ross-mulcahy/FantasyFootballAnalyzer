import { useState } from 'react';
import { createBackup, parseBackup, restoreBackup, type PersonalBackup } from '@/utils/backup';
import { readExperience, saveExperience, useExperiencePreferences } from '@/utils/experience';
import { useEventNotifications } from '@/hooks/useEventNotifications';
import styles from '@/pages/GameDayPage.module.css';
export function ExperienceSettings() {
  const preferences = useExperiencePreferences();
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<PersonalBackup | null>(null);
  const [reading, setReading] = useState(false);
  const alerts = useEventNotifications('settings-preferences', null, false);
  const update = (change: Partial<typeof preferences>) => { try { saveExperience({ ...readExperience(), ...change }); setNotice('Preferences saved on this device.'); } catch { setNotice('Could not save preferences in this browser.'); } };
  return <section className={`${styles.card} ${styles.insightPanel}`} aria-labelledby="experience-heading">
    <h2 id="experience-heading" className={styles.sectionTitle}>Game Day preferences</h2>
    <div className={styles.experienceFields}>
      <label>Alert priority<select value={preferences.alertPriority} onChange={event => update({ alertPriority: event.target.value as typeof preferences.alertPriority })}><option value="all">All events · newest first</option><option value="impact">My lineup impact only</option><option value="close">Close matchups first</option></select></label>
      <p className={styles.hint}>Applies to Latest Alerts and browser notifications. The full timeline always stays newest first. Close matchups use a margin of 10 points or less.</p>
      <label className={styles.closeFilter}><input type="checkbox" checked={preferences.kickoffAlerts} onChange={event => update({ kickoffAlerts: event.target.checked })} />Pre-kickoff lineup checks</label>
      <p className={styles.hint}>Recheck lineups in the 15 minutes before a starter’s game. Remind you about empty slots, byes and injury flags. Keep Game Day open; browser delivery requires permission and may be delayed in background tabs.</p>
      <button className="btn" disabled={alerts.requesting || alerts.permission === 'unsupported'} onClick={() => void alerts.toggle()}>{alerts.requesting ? 'Requesting permission…' : alerts.enabled ? 'Disable browser alerts' : 'Enable browser alerts'}</button>
      {alerts.permission === 'unsupported' && <p className={styles.hint}>This browser does not support desktop alerts here.</p>}
      {alerts.permission === 'denied' && <p className={styles.warningText}>Browser alerts are blocked. Allow notifications for this site in your browser settings.</p>}
      {alerts.problem && <p role="status" className={styles.warningText}>{alerts.problem}</p>}
    </div>
    <h3 className={styles.sectionTitle}>Backup & restore</h3>
    <p className={styles.hint}>Save leagues, team choices, recap history and Game Day preferences as a local file. Logins, cookies, API credentials and notification permissions are excluded. Reconnect private leagues after restoring on another browser.</p>
    <div className={styles.toolbarActions}><button className="btn" onClick={() => {
      try {
        const blob = new Blob([JSON.stringify(createBackup(), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href = url; link.download = `game-day-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNotice('Backup downloaded. Keep the file private; it contains your league and team names.');
      } catch { setNotice('Could not create a backup from this browser’s saved data.'); }
    }}>Download backup</button></div>
    <label className={styles.backupFile}>Choose backup file<input type="file" accept=".json,application/json" disabled={reading} onChange={async event => {
      const file = event.target.files?.[0]; setPreview(null); if (!file) return;
      if (file.size > 2_000_000) { setNotice('Backup exceeds the 2 MB limit.'); return; }
      setReading(true); try { setPreview(parseBackup(await file.text())); setNotice('Review the backup below before restoring.'); } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not read this backup.'); } finally { setReading(false); }
    }} /></label>
    {preview && <div className={styles.backupPreview}><p>{preview.leagues.length} leagues · {preview.recaps.length} recap entries · Created {new Date(preview.createdAt).toLocaleString()}</p><ul>{preview.leagues.map(league => <li key={`${league.platform}:${league.leagueId}:${league.season}`}>{league.name} · {league.platform} · {league.season}</li>)}</ul><p>Merge into this browser. Existing team choices are kept; Game Day preferences are restored from the file. No browser login is changed.</p><button className="btn btn-primary" onClick={() => { try { restoreBackup(preview); setNotice('Backup restored. Open Game Day to refresh scores; reconnect private leagues if needed.'); setPreview(null); } catch (error) { setNotice(error instanceof Error ? error.message : 'Restore failed.'); } }}>Restore this backup</button><button className="btn" onClick={() => setPreview(null)}>Cancel restore</button></div>}
    {notice && <p role="status" className={styles.hint}>{notice}</p>}
  </section>;
}
