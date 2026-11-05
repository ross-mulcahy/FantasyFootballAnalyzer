import { useId } from 'react';
import styles from './StudioAnchorDesk.module.css';
export type AnchorState = 'hazard' | 'sweat' | 'clear';
export function PixelScott({ state }: { state: AnchorState }) {
  const title = useId();
  const accent = state === 'hazard' ? '#ef4444' : state === 'sweat' ? '#ffb800' : '#10b981';
  return <svg viewBox="0 0 64 48" shapeRendering="crispEdges" className={styles.pixelStage} role="img" aria-labelledby={title}>
    <title id={title}>Pixel Scott: {state === 'hazard' ? 'hazard alert, leaning forward and pointing urgently' : state === 'sweat' ? 'Witching Hour sweat, holding a microphone' : 'all clear, smiling with a studio mug'}</title>
    <rect width="64" height="48" fill="#050a19" /><path d="M1 2h62v29H1z" fill="#162752" /><path d="M1 2h62v1H1zM1 29h62v2H1z" fill="#2a3f7a" />
    {[3, 43].map((x, i) => <g key={x}><rect x={x} y="5" width="18" height="10" fill="#030615" /><rect x={x + 1} y="6" width="16" height="7" fill="#0b132b" /><path d={`M${x + 2} 11h3V9h4V7h4v3h3`} fill="none" stroke={i ? '#10b981' : '#e11d48'} strokeWidth="1" /><rect x={x} y="16" width="18" height="10" fill="#060c20" /><path d={`M${x + 1} 19h16M${x + 1} 22h16M${x + 1} 25h16`} stroke="#233c70" /><rect x={x + 2} y="17" width="5" height="1" fill="#ffb800" /></g>)}
    <rect x="3" y="1" width="14" height="3" fill="#6b1631" /><text x="4" y="3" fill="#ff91a2" fontFamily="var(--font-arcade)" fontSize="2">ON AIR</text><path d="M2 28h60v1H2z" fill={accent} opacity=".7" />
    <g className={state === 'hazard' ? styles.beacon : undefined}><rect x="57" y="1" width="4" height="2" fill={accent} /><rect x="58" y="1" width="1" height="1" fill="#fff4c7" />{state === 'hazard' && <path d="M54 1h2M62 1h2M58 4v2" stroke="#ef4444" strokeWidth="1" />}</g>
    {/* One-unit pixels: swept highlights, temple shadow, individual facial features. */}
    <g transform={state === 'hazard' ? 'translate(1 0)' : undefined}>
      <path d="M25 10h13v2h2v8h-2v3h-3v2h-7v-2h-3v-3h-2v-7h2z" fill="#edbb91" />
      <path d="M25 13h2v8h2v2h6v-1h3v-8h2v7h-2v3h-3v1h-7v-2h-3z" fill="#ce936f" /><path d="M27 12h9v7h-2v2h-6v-3h-1z" fill="#f6d0a6" />
      <path d="M23 10h1V8h3V7h10v1h3v2h1v4h-3v-3h-3v1h-8v3h-3z" fill="#a16207" />
      <path d="M24 9h4V8h9v1h3v2h-7v1h-7v2h-2z" fill="#eab308" /><path d="M26 9h4V8h7v1h2v1H29v1h-4v1h-1v-2h2z" fill="#fde047" /><path d="M29 8h7v1h-7z" fill="#fff1a3" /><path d="M25 12h2v2h-1v2h-1zM38 11h2v4h-2z" fill="#a16207" />
      <path d="M27 15h3v1h-3zM34 15h3v1h-3z" fill="#745135" /><rect x="28" y="16" width="1" height="2" fill="#172554" /><rect x="35" y="16" width="1" height="2" fill="#172554" /><rect x="27" y="16" width="1" height="1" fill="#fff1d5" /><rect x="34" y="16" width="1" height="1" fill="#fff1d5" /><path d="M32 16v3h2" fill="none" stroke="#b77c57" strokeWidth="1" />
      {state === 'hazard' ? <><rect x="29" y="20" width="6" height="3" fill="#6d2830" /><rect x="30" y="20" width="4" height="1" fill="#fff1d5" /><rect x="31" y="22" width="3" height="1" fill="#d86c73" /></> : <><path d="M28 20h1v1h6v-1h1v2h-7z" fill="#86483b" /><rect x="29" y="20" width="6" height="1" fill="#fff1d5" /></>}
      <path d="M24 15v-4h1V9h13v2h2v5" fill="none" stroke="#02040c" strokeWidth="1" /><rect x="23" y="14" width="2" height="6" fill="#02040c" /><rect x="24" y="15" width="1" height="3" fill="#52618b" /><rect x="39" y="14" width="2" height="6" fill="#02040c" /><path d="M40 19h-1v1h-2v1h-4" fill="none" stroke="#02040c" strokeWidth="1" /><rect x="32" y="20" width="2" height="1" fill="#02040c" />
    </g>
    {/* Navy double-breasted tailoring, white collar and a stepped crimson tie. */}
    <path d="M27 24h10l7 4 2 8H18l2-8z" fill="#172554" /><path d="M26 25h12l4 4v7H22v-7z" fill="#1e3a8a" /><path d="M28 24h8l-4 6z" fill="#f8fafc" /><path d="m28 25 3 4-4 3-3-5zM36 25l-3 4 4 3 3-5z" fill="#314f9d" /><path d="M31 27h2v2h1v5h-1v1h-2v-1h-1v-5h1z" fill="#e11d48" /><rect x="31" y="29" width="1" height="4" fill="#fb7185" /><rect x="26" y="31" width="1" height="1" fill="#d6b66a" /><rect x="26" y="34" width="1" height="1" fill="#d6b66a" /><rect x="37" y="31" width="1" height="1" fill="#d6b66a" /><rect x="37" y="34" width="1" height="1" fill="#d6b66a" /><path d="M20 29h2v7h-3zM42 29h2l2 7h-3z" fill="#10204c" />
    {state === 'hazard' ? <><path d="M40 27h4v2h6v-1h2v3H42z" fill="#1e3a8a" /><rect x="49" y="28" width="4" height="2" fill="#f6d0a6" /><rect x="52" y="27" width="4" height="1" fill="#f6d0a6" /><rect x="50" y="30" width="2" height="1" fill="#ce936f" /></> : state === 'sweat' ? <><rect x="41" y="29" width="3" height="4" fill="#edbb91" /><rect x="42" y="25" width="1" height="8" fill="#030615" /><rect x="40" y="22" width="5" height="4" fill="#64748b" /><path d="M41 23h3M41 25h3" stroke="#cbd5e1" strokeWidth="1" /></> : <path d="M41 31h4v4h-4z" fill="#edbb91" />}
    {state === 'sweat' && <g className={styles.sweatDrops} fill="#7dd3fc"><path d="M43 12h1v2h1v2h-2zM20 18h1v2h1v2h-2z" /></g>}
    {/* Curved desk, luminous four-panel tablet and coffee stay visible in every pose. */}
    <path d="M6 35h52v1h4v2h1v4h-3v3h-5v2H9v-2H4v-3H1v-4h1v-2h4z" fill="#02040c" /><path d="M6 35h52v1h4v2H2v-2h4z" fill="#ffdb72" /><path d="M4 37h56v2h-4v1H8v-1H4z" fill="#ffb800" /><path d="M6 39h52v5h-5v2H11v-2H6z" fill="#9f1239" /><path d="M9 39h46v4h-5v2H14v-2H9z" fill="#e11d48" /><rect x="11" y="40" width="42" height="1" fill="#fb7185" /><path d="M13 44h38v1H13z" fill="#ffb800" /><rect x="17" y="41" width="30" height="4" fill="#0b132b" /><text x="32" y="44" textAnchor="middle" fill="#ffdc80" fontSize="2.4" fontFamily="var(--font-arcade)">OCTOBOX // LIVE</text>
    <path d="M15 31h13v5H14z" fill="#314f9d" /><rect x="16" y="32" width="11" height="3" fill="#020617" /><rect x="17" y="32" width="4" height="1" fill="#10b981" /><rect x="23" y="32" width="3" height="1" fill="#ffb800" /><rect x="17" y="34" width="4" height="1" fill="#e11d48" /><rect x="23" y="34" width="3" height="1" fill="#38bdf8" /><rect x="13" y="36" width="16" height="1" fill="#526a9b" />
    <rect x="45" y="32" width="5" height="4" fill="#e2e8f0" /><rect x="46" y="32" width="3" height="1" fill="#6b3823" /><path d="M50 33h2v2h-2" fill="none" stroke="#e2e8f0" strokeWidth="1" /><rect x="45" y="35" width="5" height="1" fill="#94a3b8" /><path d="M47 30v-1h1v-1" fill="none" stroke="#64748b" strokeWidth="1" />
  </svg>;
}
