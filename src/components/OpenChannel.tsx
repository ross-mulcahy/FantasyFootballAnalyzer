import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './OpenChannel.module.css';
import { nflMoments } from './nflMoments';



const CHANNEL_HOLD_MS = 12000;
const CHANNEL_SWITCH_MS = 650;

export function OpenChannel({ className, patchHref, patchLabel }: { className: string; patchHref: string; patchLabel: string }) {
  const [powered, setPowered] = useState(false);
  const [index, setIndex] = useState(0);
  const [switching, setSwitching] = useState(false);
  const switchTimer = useRef<number | null>(null);
  const startSwitch = useCallback(() => {
    if (switchTimer.current !== null) return;
    setSwitching(true);
    switchTimer.current = window.setTimeout(() => {
      setIndex(current => (current + 1) % nflMoments.length);
      setSwitching(false);
      switchTimer.current = null;
    }, CHANNEL_SWITCH_MS);
  }, []);
  useEffect(() => {
    if (!powered) return;
    const timer = window.setInterval(startSwitch, CHANNEL_HOLD_MS);
    return () => {
      window.clearInterval(timer);
      if (switchTimer.current !== null) window.clearTimeout(switchTimer.current);
      switchTimer.current = null;
    };
  }, [powered, startSwitch]);
  const gif = nflMoments[index];

  function togglePower() {
    if (powered) {
      if (switchTimer.current !== null) window.clearTimeout(switchTimer.current);
      switchTimer.current = null;
      setSwitching(false);
    } else {
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
        <img key={gif.src} src={gif.src} alt={`${gif.title} GIF`} loading="lazy" />
        <div className={styles.scanlines} aria-hidden="true" />
        {switching && <div className={styles.tuning} role="status" aria-label="Changing NFL GIF channel"><span className={styles.tuningLine} /><strong>TUNING // CH {String((index + 1) % nflMoments.length + 1).padStart(2, '0')}</strong></div>}
      </div>
      <div className={styles.overlay}>
        <div className={styles.caption}><strong>{gif.title}</strong><a href={gif.page} target="_blank" rel="noopener noreferrer">SOURCE ↗</a></div>
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
      <div className={styles.controls}>
        <Link to={patchHref}>{patchLabel}</Link>
        <button type="button" className={styles.power} aria-pressed="false" onClick={togglePower}>
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 2v10 M7 5a9 9 0 1 0 10 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" /></svg>
          POWER ON // NFL MOMENTS
        </button>
      </div>
    </>}
  </div>;
}
