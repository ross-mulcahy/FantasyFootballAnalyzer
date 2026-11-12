import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './OpenChannel.module.css';

const nflGifs = [
  { id: '2E6OYt2yphlWTGZeYK', title: 'Tom Brady · Let’s go', source: 'NFL', page: 'https://giphy.com/gifs/nfl-tampa-bay-buccaneers-bucs-2E6OYt2yphlWTGZeYK' },
  { id: '4Saev27Yqrspf77lqr', title: 'Justin Jefferson · The Griddy', source: 'Minnesota Vikings', page: 'https://giphy.com/gifs/vikings-griddy-jefferson-justin-4Saev27Yqrspf77lqr' },
  { id: 'Fg9A0eOf1FoNgvgHaD', title: 'Derrick Henry · Flex', source: 'Tennessee Titans', page: 'https://giphy.com/gifs/titans-tennessee-titans-derrick-henry-tough-Fg9A0eOf1FoNgvgHaD' },
  { id: 'kiBh0ERhYj1KPUZgKQ', title: 'Marshawn Lynch · Seahawks throwback', source: 'NFL', page: 'https://giphy.com/gifs/nfl-kiBh0ERhYj1KPUZgKQ' },
] as const;

export function OpenChannel({ className, patchHref, patchLabel }: { className: string; patchHref: string; patchLabel: string }) {
  const [powered, setPowered] = useState(false);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!powered) return;
    const timer = window.setInterval(() => setIndex(current => (current + 1) % nflGifs.length), 12000);
    return () => window.clearInterval(timer);
  }, [powered]);
  const gif = nflGifs[index];

  return <div className={`${className} ${powered ? styles.powered : ''}`}>
    <span>REDZONE // OPEN CHANNEL</span>
    {powered ? <>
      <div className={styles.screen}><iframe key={gif.id} src={`https://giphy.com/embed/${gif.id}`} title={`${gif.title} GIF`} loading="lazy" allowFullScreen /></div>
      <div className={styles.caption}><strong>{gif.title}</strong><a href={gif.page} target="_blank" rel="noopener noreferrer">GIF BY {gif.source} ↗</a></div>
    </> : <strong>PUT ANOTHER GAME ON THE WALL</strong>}
    <div className={styles.controls}>
      <Link to={patchHref}>{patchLabel}</Link>
      <button type="button" className={styles.power} aria-pressed={powered} onClick={() => setPowered(value => !value)}>
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 2v10 M7 5a9 9 0 1 0 10 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" /></svg>
        {powered ? 'POWER OFF' : 'POWER ON // NFL GIFS'}
      </button>
      {powered && <button type="button" className={styles.next} onClick={() => setIndex(current => (current + 1) % nflGifs.length)}>NEXT GIF →</button>}
    </div>
  </div>;
}
