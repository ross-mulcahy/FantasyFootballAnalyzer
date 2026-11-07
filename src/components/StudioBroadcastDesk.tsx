import { useState } from 'react';
import type { MajorEvent, NFLTimeline } from '@/api/nflTimeline';
import type { SharedLeagueContext } from '@/utils/sharedPlayers';
import { eventImpact } from '@/utils/gameDayInsights';
import type { ComebackRow, DirectorCue, ScoreChange, ShowSummary } from '@/utils/broadcastControl';
import { StudioMonitorFrame } from './StudioMonitorFrame';
import styles from './StudioBroadcastDesk.module.css';

export interface CuePreferences { lead: boolean; swing: boolean }
const signed = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
const escapeXml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);
function downloadShowCard(show: ShowSummary) {
  const fields = [['SCOREBOARD', show.record], ['BIGGEST SWING', show.swing], ['RIDING THE PINE', show.pine], ['ROOTING PARADOX', show.paradox]];
  const lines = fields.flatMap(([label, value], index) => {
    const words = value.split(/\s+/); const wrapped: string[] = []; let line = '';
    for (const word of words) { if (`${line} ${word}`.trim().length > 64) { wrapped.push(line); line = word; } else line = `${line} ${word}`.trim(); }
    if (line) wrapped.push(line);
    const y = 174 + index * 116;
    return `<text x="78" y="${y}" fill="#ffb800" font-size="18" font-weight="700">${escapeXml(label)}</text>${wrapped.slice(0, 2).map((part, partIndex) => `<text x="78" y="${y + 34 + partIndex * 25}" fill="#f8fafc" font-size="19">${escapeXml(part)}</text>`).join('')}`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 3h4" stroke="#000" stroke-opacity=".2"/></pattern></defs><rect width="1200" height="675" fill="#334155"/><rect x="24" y="24" width="1152" height="627" fill="#0d1836" stroke="#64748b" stroke-width="8"/><rect x="42" y="42" width="1116" height="78" fill="#9f1239"/><text x="76" y="94" fill="#fff" font-family="monospace" font-size="37" font-weight="700">${escapeXml(show.title)}</text>${lines.join('')}<rect x="42" y="42" width="1116" height="590" fill="url(#scan)"/><text x="1050" y="623" fill="#10b981" font-family="monospace" font-size="13">WITCHING HOUR</text></svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = `witching-hour-${show.phase.toLowerCase()}-show.svg`; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function DirectorCueBar({ cue, onFocus }: { cue: DirectorCue | null; onFocus: (leagueKey: string) => void }) {
  if (!cue) return null;
  return <div className={styles.director} role="status"><span className={styles.live}>DIRECTOR'S CUE</span><div><strong>{cue.headline}</strong><p>{cue.detail}</p></div><button className="studio-key" type="button" onClick={() => onFocus(cue.leagueKey)}>TAKE CHANNEL ↗</button></div>;
}
export function StudioBroadcastDesk({ changes, comebacks, events, contexts, show, cues, onCuesChange }: {
  changes: ScoreChange[]; comebacks: ComebackRow[]; events: { event: MajorEvent; data: NFLTimeline | null }[]; contexts: SharedLeagueContext[];
  show: ShowSummary; cues: CuePreferences; onCuesChange: (next: CuePreferences) => void;
}) {
  const [tab, setTab] = useState<'comeback' | 'replay' | 'show' | 'audio'>('comeback');
  const [position, setPosition] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const change = changes[Math.min(position, changes.length - 1)];
  const event = events.find(row => row.event.id === selectedEvent) ?? events[0];
  return <StudioMonitorFrame as="section" className={styles.desk} title="SUNDAY PRODUCTION DESK" channelCode="STUDIO 02" badge="LIVE TAPE">
    <div className={styles.tabs} role="group" aria-label="Production desk views">{([['comeback', 'COMEBACK WATCH'], ['replay', 'INSTANT REPLAY'], ['show', 'HALFTIME / FINAL'], ['audio', 'STUDIO AUDIO']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>)}</div>
    {tab === 'comeback' && <div className={styles.content}><p className={styles.note}>Current scores and starters still live or yet to play. No win probability is inferred.</p>{comebacks.length ? <ul className={styles.rows}>{comebacks.map(row => <li key={row.key}><div><strong>{row.league}</strong><span>{row.own} vs {row.opponent}</span></div><b className={row.margin !== null && row.margin < 0 ? styles.behind : styles.ahead}>{row.margin === null ? 'SCORE PENDING' : row.margin < 0 ? `NEED ${(-row.margin + 0.01).toFixed(2)} TO LEAD` : row.margin === 0 ? 'TIED' : `LEAD ${row.margin.toFixed(2)}`}</b><small>{row.unknown || row.ownLeft === null || row.opponentLeft === null ? 'Remaining starters unconfirmed' : `${row.ownLeft} yours left · ${row.opponentLeft} theirs left`}</small></li>)}</ul> : <p>No matchups with your selected team are on the board.</p>}</div>}
    {tab === 'replay' && <div className={styles.content}><div className={styles.replayGrid}><div><h3>SCORE TAPE</h3>{change ? <><input type="range" min="0" max={changes.length - 1} value={Math.min(position, changes.length - 1)} onChange={e => setPosition(Number(e.target.value))} aria-label="Scrub score changes" /><p className={styles.note}>{changes.length - Math.min(position, changes.length - 1)} / {changes.length} · {new Date(change.at).toLocaleTimeString()} · {change.leagueName}</p><div className={styles.replayScore}><span>{change.ownName}<strong>{change.beforeOwn.toFixed(2)} → {change.own.toFixed(2)}</strong><b className={change.ownDelta < 0 ? styles.negative : undefined}>{signed(change.ownDelta)}</b></span><span>{change.opponentName}<strong>{change.beforeOpponent.toFixed(2)} → {change.opponent.toFixed(2)}</strong><b className={change.opponentDelta < 0 ? styles.negative : undefined}>{signed(change.opponentDelta)}</b></span></div><p className={styles.note}>Provider score changes between refreshes. A play below is not automatically credited for this delta.</p></> : <p className={styles.note}>Score tape starts when this browser observes a later score refresh. Keep Game Day open during play.</p>}</div><div><h3>PLAY TAPE</h3>{events.length ? <><div className={styles.playButtons}>{events.slice(0, 8).map(row => <button type="button" key={row.event.id} aria-pressed={event?.event.id === row.event.id} onClick={() => setSelectedEvent(row.event.id)}>{row.event.game} · {row.event.kind}</button>)}</div>{event && <div className={styles.playDetail}><strong>{event.event.description}</strong><p>{eventImpact(event.event, contexts, event.data).map(impact => `${impact.league.name}: ${impact.good.length ? `helps via ${impact.good.join(', ')}` : ''}${impact.good.length && impact.bad.length ? '; ' : ''}${impact.bad.length ? `hurts via ${impact.bad.join(', ')}` : ''}`).join(' · ') || 'Fantasy impact unconfirmed.'}</p><small>Likely direction only; scoring follows each league's provider.</small></div>}</> : <p className={styles.note}>No major NFL plays in the current feed yet.</p>}</div></div></div>}
    {tab === 'show' && <div className={styles.content}><div className={styles.showHeader}><h3>{show.title}</h3><button className="studio-key" type="button" onClick={() => downloadShowCard(show)}>SAVE SHOW CARD ↗</button></div><div className={styles.showGrid}><div><span>SCOREBOARD</span><p>{show.record}</p></div><div><span>BIGGEST SWING</span><p>{show.swing}</p></div><div><span>RIDING THE PINE</span><p>{show.pine}</p></div><div><span>ROOTING PARADOX</span><p>{show.paradox}</p></div></div><p className={styles.note}>This show card reflects the latest loaded data and the score changes saved by this browser. Final results can change after provider corrections.</p></div>}
    {tab === 'audio' && <div className={styles.content}><h3>ORIGINAL STUDIO CUES</h3><p className={styles.note}>Opt in to short synthesized cues. The sidebar audio switch remains the master mute.</p><label className={styles.audioControl}><input type="checkbox" checked={cues.lead} onChange={e => onCuesChange({ ...cues, lead: e.target.checked })} /><span>Lead change</span><small>Two-note channel stinger when a score refresh flips the lead.</small></label><label className={styles.audioControl}><input type="checkbox" checked={cues.swing} onChange={e => onCuesChange({ ...cues, swing: e.target.checked })} /><span>Major swing</span><small>Short pulse for a net change of at least 10 points.</small></label><p className={styles.note}>Cues only fire for new changes after the board is open, while this tab is visible.</p></div>}
  </StudioMonitorFrame>;
}
