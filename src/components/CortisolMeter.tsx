import styles from './StudioHardware.module.css';
import { sweatBpm } from '@/utils/cortisol';
export function CortisolMeter({ lineupHazards, rootingConflicts, compact = false }: { lineupHazards: number; rootingConflicts: number; compact?: boolean }) {
  const bpm = sweatBpm(lineupHazards, rootingConflicts);
  const status = bpm >= 150 ? 'CRITICAL' : bpm >= 110 ? 'ELEVATED' : 'COMPOSED';
  const readout = bpm >= 150 ? 'Recommend immediate beverage' : bpm >= 110 ? 'Do not check bench scores' : 'Suspiciously calm. Stay hydrated.';
  return <div className={`${styles.cortisol} ${compact ? styles.compactMeter : ''} ${bpm >= 150 ? styles.critical : bpm >= 110 ? styles.elevated : ''}`} aria-label={`Cortisol telemetry, ${bpm} sweat BPM, ${status}. Fantasy stress index, not a medical measurement.`} title="Fantasy stress index: 72 + 10 per lineup hazard; rooting conflicts add 10 for the first and 4 for each additional one. For entertainment.">
    <svg className={styles.ecg} viewBox="0 0 110 32" aria-hidden="true"><path d="M0 17h25l5-6 5 12 6-22 7 29 6-13h56" /></svg>
    <div><span className={styles.telemetryLabel}>CORTISOL TELEMETRY</span><strong>{bpm} <small>SWEAT BPM // {status}</small></strong><span className={styles.telemetryReadout}>{readout}</span></div>
  </div>;
}
