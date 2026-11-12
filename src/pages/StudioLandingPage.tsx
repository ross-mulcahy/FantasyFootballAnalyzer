import { PixelScott } from '@/components/PixelScott';
import { StudioMonitorFrame } from '@/components/StudioMonitorFrame';
import styles from './StudioLandingPage.module.css';

const features = [
  {
    channel: 'CH 01', section: 'GAME DAY', title: 'The live wall',
    text: 'See every matchup, current scores, projections and lineup hazards. Rooting Conflicts shows the players you need both to score and to stop scoring.',
  },
  {
    channel: 'CH 02', section: 'GAME DAY', title: 'RedZone Wire & Scott',
    text: 'Follow relevant NFL plays and fantasy score changes as they arrive. Pixel Scott calls out hazards, close games and the odd absurdity from the studio desk.',
  },
  {
    channel: 'CH 03', section: 'GAME DAY', title: 'Watch Mode',
    text: 'Put one league on the big screen. The director can cut between score swings and relevant NFL plays; matched highlights play here when a source allows embedding.',
  },
  {
    channel: 'CH 04', section: 'FRONT OFFICE', title: 'Rosters & players',
    text: 'Check starters and bench players, follow weekly scores, and trace a player from draft pick to trade, waiver claim or drop.',
  },
  {
    channel: 'CH 05', section: 'FRONT OFFICE', title: 'Waivers & trades',
    text: 'Review pickups, drops and deals across the league. See who gained value and which decisions changed a roster.',
  },
  {
    channel: 'CH 06', section: 'FRONT OFFICE', title: 'The Blue Tent',
    text: 'Compare injury absences through the season. Estimate the points lost above a replacement player, including players added from waivers.',
  },
  {
    channel: 'CH 07', section: 'TELEMETRY', title: 'The season on tape',
    text: 'Compare teams, draft grades, luck and points above replacement. History, awards and recaps give the longer view when the data is available.',
  },
  {
    channel: 'CH 08', section: 'DRAFT ROOM', title: 'Prepare without a league',
    text: 'Browse rankings and site values, watch ADP trends, or run a mock draft. These public draft tools work before you connect anything.',
  },
];

export function StudioLandingPage() {
  const base = import.meta.env.BASE_URL;
  return <div className={styles.page}>
    <header className={styles.hero}>
      <div className={styles.intro}>
        <span className={styles.eyebrow}><span className={styles.onAirDot} /> STUDIO 00 // FIRST VISIT</span>
        <h1><span>THE</span> WITCHING <em>HOUR</em></h1>
        <p className={styles.lead}>A fantasy football control room for the games, decisions and strange turns of your league.</p>
        <p className={styles.explainer}>Connect a league to put its matchups on the wall. Follow the live wire on Sunday, then review the trades, pickups, draft picks and luck that shaped the season.</p>
        <div className={styles.actions}>
          <a className={styles.primaryAction} href={`${base}settings`}>CONNECT YOUR LEAGUE <span aria-hidden="true">↗</span></a>
          <a className={styles.secondaryAction} href="#how-it-works">HOW TO USE IT ↓</a>
        </div>
        <p className={styles.browserNote}>No account needed. Connected leagues are saved in this browser.</p>
      </div>
      <div className={styles.anchor}>
        <StudioMonitorFrame as="div" channelCode="STUDIO 01" title="PIXEL SCOTT" badge="ON AIR" className={styles.scottMonitor}>
          <PixelScott state="clear" />
        </StudioMonitorFrame>
        <div className={styles.speech}>
          <span>SCOTT // OPENING TAKE</span>
          <p>“Welcome to the desk. Patch in a league, pick your team, and I’ll keep an eye on the chaos.”</p>
        </div>
      </div>
    </header>

    <section id="how-it-works" className={styles.guide} aria-labelledby="guide-title">
      <div className={styles.sectionHeading}><span className={styles.sectionCode}>01 // SIGNAL PATH</span><h2 id="guide-title">HOW TO GET ON AIR</h2></div>
      <ol className={styles.steps}>
        <li><b>01</b><div><h3>Connect a league</h3><p>In Settings, find a Sleeper league by username or paste its league link.</p></div></li>
        <li><b>02</b><div><h3>Choose your team</h3><p>Tell the studio which roster is yours so alerts, matchups and rooting conflicts have context.</p></div></li>
        <li><b>03</b><div><h3>Watch or review</h3><p>Use Game Day for the live wall. Open the other rooms whenever you want the season story behind a score.</p></div></li>
      </ol>
    </section>

    <section className={styles.features} aria-labelledby="features-title">
      <div className={styles.sectionHeading}><span className={styles.sectionCode}>02 // STUDIO DIRECTORY</span><h2 id="features-title">WHAT'S IN THE CONTROL ROOM</h2></div>
      <div className={styles.featureGrid}>{features.map(feature => <article className={styles.feature} key={feature.channel}>
        <div className={styles.featureTop}><span>{feature.channel}</span><small>{feature.section}</small></div>
        <h3>{feature.title}</h3><p>{feature.text}</p>
      </article>)}</div>
      <p className={styles.sourceNote}>NFL play reports flag a game involving your starters; fantasy points and projections come from the league provider. The app labels missing or estimated data.</p>
    </section>

    <section className={styles.tail} aria-label="Start using the studio">
      <div><span className={styles.sectionCode}>03 // YOUR CALL</span><h2>PUT A LEAGUE ON THE WALL</h2><p>Start with Sleeper in Settings. Already here for draft prep? Rankings and mock drafts are open without a connection.</p></div>
      <div className={styles.tailActions}><a className={styles.primaryAction} href={`${base}settings`}>CONNECT YOUR LEAGUE ↗</a><a className={styles.textAction} href={`${base}rankings`}>VIEW RANKINGS →</a><a className={styles.textAction} href={`${base}draft-room`}>OPEN DRAFT ROOM →</a></div>
    </section>
  </div>;
}
