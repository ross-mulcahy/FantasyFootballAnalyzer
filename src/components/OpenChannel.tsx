import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './OpenChannel.module.css';

const nflGifs = [
  { id: '2E6OYt2yphlWTGZeYK', title: 'Tom Brady · Let’s go', source: 'NFL', page: 'https://giphy.com/gifs/nfl-tampa-bay-buccaneers-bucs-2E6OYt2yphlWTGZeYK' },
  { id: 'JRZSkYmS9VFWsdttyU', title: 'Tom Brady · Absolutely not', source: 'NFL', page: 'https://giphy.com/gifs/nfl-smh-tom-brady-JRZSkYmS9VFWsdttyU' },
  { id: '4Saev27Yqrspf77lqr', title: 'Justin Jefferson · The Griddy', source: 'Minnesota Vikings', page: 'https://giphy.com/gifs/vikings-griddy-jefferson-justin-4Saev27Yqrspf77lqr' },
  { id: '9tUaoKhU78qCtoirDF', title: 'Mahomes & Kelce · Sideline disbelief', source: 'NFL', page: 'https://giphy.com/gifs/nfl-sports-football-sport-9tUaoKhU78qCtoirDF' },
  { id: 'oXPDGAE9ud8Zpkfanq', title: 'Russell Wilson · Let’s ride', source: 'Chris Cimino', page: 'https://giphy.com/gifs/tophermcgee3-wilson-lets-ride-im-unlimited-oXPDGAE9ud8Zpkfanq' },
  { id: 'kiBh0ERhYj1KPUZgKQ', title: 'Marshawn Lynch · Seahawks throwback', source: 'NFL', page: 'https://giphy.com/gifs/nfl-kiBh0ERhYj1KPUZgKQ' },
] as const;

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
      setIndex(current => (current + 1) % nflGifs.length);
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
  const gif = nflGifs[index];

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
    <span>REDZONE // OPEN CHANNEL</span>
    {powered ? <>
      <div className={styles.screen}>
        <iframe key={gif.id} src={`https://giphy.com/embed/${gif.id}`} title={`${gif.title} GIF`} loading="lazy" allowFullScreen />
        {switching && <div className={styles.tuning} role="status" aria-label="Changing NFL GIF channel"><span className={styles.tuningLine} /><strong>TUNING // CH {String((index + 1) % nflGifs.length + 1).padStart(2, '0')}</strong></div>}
      </div>
      <div className={styles.caption}><strong>{switching ? 'CHANNEL SWITCH' : gif.title}</strong>{!switching && <a href={gif.page} target="_blank" rel="noopener noreferrer">GIF BY {gif.source} ↗</a>}</div>
    </> : <strong>PUT ANOTHER GAME ON THE WALL</strong>}
    <div className={styles.controls}>
      <Link to={patchHref}>{patchLabel}</Link>
      <button type="button" className={styles.power} aria-pressed={powered} onClick={togglePower}>
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 2v10 M7 5a9 9 0 1 0 10 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" /></svg>
        {powered ? 'POWER OFF' : 'POWER ON // NFL MEMES'}
      </button>
      {powered && <button type="button" className={styles.next} onClick={startSwitch} disabled={switching}>NEXT GIF →</button>}
    </div>
  </div>;
}
