import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './OpenChannel.module.css';
import { nflMoments } from './nflMoments';
import type { ChannelMood, ChannelOutlook } from '@/utils/openChannelMood';
import { shuffledMomentIndexes } from '@/utils/openChannelReel';
const CHANNEL_SWITCH_MS = 650;

export function OpenChannel({ className, patchHref, patchLabel, contextKey, contextLabel, outlook }: { className: string; patchHref: string; patchLabel: string; contextKey: string; contextLabel: string; outlook: ChannelOutlook }) {
  const [powered, setPowered] = useState(false);
  const [order, setOrder] = useState<number[]>([]);
  const [position, setPosition] = useState(0);
  const [deckMood, setDeckMood] = useState<ChannelMood>('neutral');
  const [switching, setSwitching] = useState(false);
  const [switchTarget, setSwitchTarget] = useState(0);
  const switchTimer = useRef<number | null>(null);
  const previousContext = useRef(contextKey);
  const patchChannel = useCallback((nextOrder: number[], nextPosition: number) => {
    setSwitchTarget(nextOrder[nextPosition]);
    setSwitching(true);
    switchTimer.current = window.setTimeout(() => {
      setOrder(nextOrder);
      setPosition(nextPosition);
      setDeckMood(outlook.mood);
      setSwitching(false);
      switchTimer.current = null;
    }, CHANNEL_SWITCH_MS);
  }, [outlook.mood]);
  const startSwitch = useCallback(() => {
    if (switchTimer.current !== null) return;
    const freshDeck = deckMood !== outlook.mood || position >= order.length - 1;
    const nextOrder = freshDeck ? shuffledMomentIndexes(outlook.mood, order[position]) : order;
    patchChannel(nextOrder, freshDeck ? 0 : position + 1);
  }, [deckMood, order, outlook.mood, patchChannel, position]);
  useEffect(() => {
    if (previousContext.current === contextKey) return;
    previousContext.current = contextKey;
    if (!powered) return;
    if (switchTimer.current !== null) window.clearTimeout(switchTimer.current);
    switchTimer.current = null;
    patchChannel(shuffledMomentIndexes(outlook.mood, order[position]), 0);
  // A league switch retunes at once; score-driven mood changes wait for clip end.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey]);
  useEffect(() => () => {
    if (switchTimer.current !== null) window.clearTimeout(switchTimer.current);
  }, []);
  const gif = nflMoments[order[position] ?? 0];

  function togglePower() {
    if (powered) {
      if (switchTimer.current !== null) window.clearTimeout(switchTimer.current);
      switchTimer.current = null;
      setSwitching(false);
    } else {
      const nextOrder = shuffledMomentIndexes(outlook.mood, order[position]);
      setOrder(nextOrder);
      setPosition(0);
      setDeckMood(outlook.mood);
      setSwitchTarget(nextOrder[0]);
      setSwitching(true);
      switchTimer.current = window.setTimeout(() => {
        setSwitching(false);
        switchTimer.current = null;
      }, CHANNEL_SWITCH_MS);
    }
    setPowered(value => !value);
  }

  return <div className={`${className} ${powered ? styles.powered : ''}`}>
    {powered ? <>
      <div className={styles.screen}>
        {!switching && <video key={gif.video} src={gif.video} aria-label={`${gif.title} clip`} autoPlay muted playsInline preload="auto" onEnded={startSwitch} onError={startSwitch} />}
        <div className={styles.scanlines} aria-hidden="true" />
        {switching && <div className={styles.tuning} role="status" aria-label="Changing NFL GIF channel">
          <span className={styles.tuningLine} />
          <div className={styles.signalCard}>
            <span className={styles.signalEyebrow}>OCTOBOX // SIGNAL CONTROL</span>
            <span className={styles.signalBars} aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></span>
            <strong>CH {String(switchTarget + 1).padStart(2, '0')}</strong>
            <span className={styles.signalStatus}>PATCHING NEXT MOMENT</span>
          </div>
        </div>}
      </div>
      <div className={styles.overlay}>
        <div className={styles.caption}><small>{contextLabel} // {outlook.mood === 'win' ? 'WINNING' : outlook.mood === 'lose' ? 'CHASING' : outlook.mood === 'mixed' ? 'MIXED BAG' : 'EVEN / PENDING'} · {outlook.wins}W–{outlook.losses}L</small><strong>{gif.title}</strong><a href={gif.page} target="_blank" rel="noopener noreferrer">SOURCE ↗</a></div>
        <div className={styles.controls}>
          <button type="button" className={styles.next} onClick={startSwitch} disabled={switching}>NEXT GIF →</button>
          <button type="button" className={styles.power} aria-pressed="true" onClick={togglePower}>
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 2v10 M7 5a9 9 0 1 0 10 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" /></svg>
            POWER OFF
          </button>
        </div>
      </div>
    </> : <>
      <span>REDZONE // OPEN CHANNEL</span>
      <strong>PUT ANOTHER GAME ON THE WALL</strong>
      <div className={styles.standbyActions}>
        <button type="button" className={styles.powerOn} aria-pressed="false" onClick={togglePower}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 2v10 M7 5a9 9 0 1 0 10 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" /></svg>
          POWER ON // NFL MOMENTS
        </button>
        <Link to={patchHref}>{patchLabel}</Link>
      </div>
    </>}
  </div>;
}
