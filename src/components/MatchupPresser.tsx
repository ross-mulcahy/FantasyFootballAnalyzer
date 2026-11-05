import { useState } from 'react';
import styles from './StudioHardware.module.css';
export function MatchupPresser({ own, opponent }: { own: string; opponent: string }) {
  const [quote, setQuote] = useState('');
  const [last, setLast] = useState(-1);
  const excuses = [
    `Look, hats off to ${opponent}. When their roster defies the laws of probability, there's nothing our coaching staff can do.`,
    `${own} had a tremendous week of practice. Unfortunately, ${opponent} insisted on counting the actual games.`,
    `We're not making excuses at ${own}. We're commissioning an independent review of ${opponent}'s relationship with the fantasy gods.`,
    `Credit to ${opponent}. Our game plan was flawless until the players started scoring points.`,
    `The ${own} locker room remains united. Mostly against whoever recommended this starting lineup.`,
    `We prepared for every version of ${opponent} except the one that showed up. We'll look at the tape.`,
  ];
  return <div className={styles.presser}><button type="button" className={styles.excuseButton} aria-label={`Draft excuse for ${own} versus ${opponent}`} aria-expanded={!!quote} onClick={() => { const index = (last + 1 + Math.floor(Math.random() * (excuses.length - 1))) % excuses.length; setLast(index); setQuote(excuses[index]); }}>DRAFT EXCUSE</button>{quote && <div className={styles.quote} role="status"><span>POSTGAME PRESSER // COACH'S STATEMENT</span><p>“{quote}”</p><button type="button" onClick={() => setQuote('')} aria-label="Dismiss coaching excuse">×</button></div>}</div>;
}
