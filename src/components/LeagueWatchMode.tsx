import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { NFLTimeline } from '@/api/nflTimeline';
import { fetchNFLHighlights, gameHighlightSearch, matchGameHighlights, matchPlayHighlight, nflChannelVideosUrl, nflEmbedUrl, nflVideoUrl, playHighlightSearch } from '@/api/nflHighlights';
import type { HighlightCatalog, NFLVideo } from '@/api/nflHighlights';
import type { GameDaySnapshot } from '@/types/gameDay';
import type { ScoreChange } from '@/utils/broadcastControl';
import type { WatchAlert, WatchChannel, WatchSide } from '@/utils/leagueWatch';
import { curatedWatchAlerts, leagueWatchChannels } from '@/utils/leagueWatch';
import type { SavedLeague } from '@/utils/savedLeagues';
import { StudioMonitorFrame } from './StudioMonitorFrame';
import { PixelScott } from './PixelScott';
import { ProjectionBar } from './ProjectionBar';
import styles from './LeagueWatchMode.module.css';

const points = (value: number | null) => value === null ? '—' : value.toFixed(2);
const syncTime = (value: number) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function ImpactStarters({ side }: { side: WatchSide }) {
  return <div className={styles.impactSide}>
    <h4>{side.name} <span>{side.featuredMode === 'scorers' ? 'TOP SCORERS' : 'STARTERS TO WATCH'}</span></h4>
    {side.featured.length ? side.featured.map(player => <div className={styles.impactPlayer} key={player.id}>
      <div><strong title={player.name}>{player.name}</strong><small>{player.position} · {player.nflTeam || 'NFL TEAM PENDING'} · {player.game}</small></div>
      <b>{side.featuredMode === 'scorers' ? points(player.points) : player.projection !== null ? `${points(player.projection)} PROJ` : 'PROJ —'}</b>
    </div>) : <p>STARTER DETAILS UNAVAILABLE</p>}
  </div>;
}

const freshAlert = (alert: WatchAlert | undefined, now: number) => !!alert?.at && now - alert.at >= 0 && now - alert.at < 2 * 60000;
function WatchStory({ alert, channel, now, playSearch, clip, onPlay, onHighlights }: { alert: WatchAlert | undefined; channel: WatchChannel; now: number; playSearch: string | null; clip: NFLVideo | null; onPlay: (video: NFLVideo) => void; onHighlights: () => void }) {
  const fresh = freshAlert(alert, now);
  return <section className={`${styles.story} ${alert?.kind === 'score' ? styles.scoreStory : alert ? styles.playStory : styles.quietStory}`} aria-label="On air story">
    <div className={styles.storyTop}><span>{alert ? fresh ? '● BREAKING NOW' : 'LAST VERIFIED UPDATE' : '● MONITORING THIS GAME'}</span><small>{alert?.at ? syncTime(alert.at) : 'AWAITING THE NEXT CONFIRMED UPDATE'}</small></div>
    {alert ? <><p className={styles.storyKicker}>{alert.kind === 'score' ? 'FANTASY SCORE TAPE' : 'NFL GAME WIRE // FANTASY IMPACT UNCONFIRMED'}</p>
      <h3>{alert.headline}</h3>
      <p className={styles.storyDetail}>{alert.kind === 'play' ? alert.detail.replace(/ · NFL play involving a game with starters in this matchup; fantasy impact unconfirmed\.$/, '') : alert.detail}</p>
      {alert.score && <div className={styles.scoreSwing} aria-label="Score change before and after provider refresh">
        <div><span>{alert.score.ownName}</span><strong>{points(alert.score.beforeOwn)} <i>→</i> {points(alert.score.own)}</strong><b>{alert.score.ownDelta >= 0 ? '+' : ''}{points(alert.score.ownDelta)}</b></div>
        <div><span>{alert.score.opponentName}</span><strong>{points(alert.score.beforeOpponent)} <i>→</i> {points(alert.score.opponent)}</strong><b>{alert.score.opponentDelta >= 0 ? '+' : ''}{points(alert.score.opponentDelta)}</b></div>
      </div>}
      {alert.kind === 'play' && <p className={styles.storyFoot}>This NFL play is from a game involving starters in this matchup. Fantasy points update only when the league provider confirms them.</p>}
      <div className={styles.storyActions}>
        {alert.kind === 'play' && clip && <button type="button" onClick={() => onPlay(clip)}>WATCH LIKELY CLIP ▶</button>}
        {alert.kind === 'play' && playSearch && <a href={playSearch} target="_blank" rel="noopener noreferrer">{clip ? 'CHECK ON @NFL ↗' : 'FIND CLIP ON @NFL ↗'}</a>}
        <button type="button" onClick={onHighlights}>GAME HIGHLIGHTS →</button>
      </div>
    </> : <><p className={styles.storyKicker}>DIRECTOR'S WATCH</p><h3>WAITING FOR THE NEXT CUT</h3><p className={styles.storyDetail}>{channel.currentGap !== null && channel.currentGap <= 10 ? `Only ${points(channel.currentGap)} points separate these teams. The director is watching for a confirmed score change.` : 'No confirmed score change or linked NFL play is available for this matchup yet.'}</p><p className={styles.storyFoot}>The wire will take this screen when a relevant update arrives.</p></>}
  </section>;
}

type VideoCue = { video: NFLVideo; automatic: boolean };

function HighlightPlayer({ video, automatic, onBack }: { video: NFLVideo; automatic: boolean; onBack: () => void }) {
  return <section className={styles.videoStage} aria-label="Official NFL highlight player">
    <div className={styles.videoHeading}><span>{automatic ? '● AUTO DIRECTOR // LIKELY PLAY MATCH' : 'OFFICIAL @NFL VIDEO · TITLE/DATE MATCH'}</span><button type="button" onClick={onBack}>← RETURN TO LIVE</button></div>
    <iframe title={video.title} src={`${nflEmbedUrl(video)}${automatic ? '?autoplay=1&mute=1&playsinline=1' : ''}`} loading={automatic ? 'eager' : 'lazy'} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
    <div className={styles.videoCaption}><strong>{video.title}</strong><small>Published {syncTime(Date.parse(video.publishedAt))}. Title and date suggest a match; check the video to confirm it.</small><a href={nflVideoUrl(video)} target="_blank" rel="noopener noreferrer">OPEN ON YOUTUBE ↗</a></div>
    {automatic && <p className={styles.autoCueNote}>MUTED AUTO CUE · RETURNING TO THE LIVE WIRE IN 40 SECONDS · UNMUTE IN THE PLAYER</p>}
  </section>;
}

function WatchTaleOfTape({ channel, fetchedAt, nflFetchedAt }: { channel: WatchChannel; fetchedAt: number; nflFetchedAt: number | null }) {
  const { first, second } = channel;
  const scored = first.points !== null && second.points !== null && (first.points !== 0 || second.points !== 0);
  const current = !scored ? 'AWAITING SCORES' : first.points === second.points ? 'TIED' : `${first.points! > second.points! ? first.name : second.name} +${points(channel.currentGap)}`;
  const projected = first.projectedValue === null || second.projectedValue === null ? 'PROJECTION PENDING' : first.projectedValue === second.projectedValue ? 'EVEN' : `${first.projectedValue > second.projectedValue ? first.name : second.name} +${points(channel.projectedGap)}`;
  const live = first.live + second.live;
  const remaining = first.left === null || second.left === null ? null : first.left + second.left;
  return <section className={styles.tape} aria-label="Matchup tale of the tape">
    <div className={styles.tapeMetrics}>
      <div><span>CURRENT MARGIN</span><strong title={current}>{current}</strong></div>
      <div><span>PROJECTED EDGE</span><strong title={projected}>{projected}</strong></div>
      <div><span>STARTER STATUS</span><strong>{remaining === null ? 'STATUS PENDING' : `${live} IN LIVE GAMES · ${Math.max(0, remaining - live)} TO PLAY`}</strong></div>
    </div>
    <details className={styles.tapeDetails}><summary>MATCHUP INTEL <span>PLAYER SPOTLIGHT + PROJECTION SHARE</span></summary>
      <div className={styles.impactGrid}><ImpactStarters side={first} /><ImpactStarters side={second} /></div>
      <div className={styles.meter}><ProjectionBar own={first.projectedValue} opponent={second.projectedValue} /><small>PROJECTED POINT SHARE // NOT WIN PROBABILITY</small></div>
    </details>
    <small className={styles.sourceLine}>FANTASY SYNC {syncTime(fetchedAt)} · NFL FEED {nflFetchedAt ? syncTime(nflFetchedAt) : 'PENDING'} · GAME STATUS IS NOT PLAYER PARTICIPATION</small>
  </section>;
}
export function LeagueWatchMode({ saved, snapshot, data, changes, hazards, now, onClose }: {
  saved: SavedLeague; snapshot: GameDaySnapshot; data: NFLTimeline | null; changes: ScoreChange[]; hazards: number; now: number; onClose: () => void;
}) {
  const channels = useMemo(() => leagueWatchChannels(saved, snapshot, data, changes, now), [saved, snapshot, data, changes, now]);
  const allAlerts = useMemo(() => curatedWatchAlerts(channels).slice(0, 12), [channels]);
  const [activeKey, setActiveKey] = useState(() => channels[0]?.key ?? '');
  const [auto, setAuto] = useState(true);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<HighlightCatalog | null>(null);
  const [highlightsOpen, setHighlightsOpen] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<VideoCue | null>(null);
  const active = channels.find(channel => channel.key === activeKey) ?? channels[0];
  const selectedIndex = channels.findIndex(channel => channel.key === active?.key);
  const latestAlert = allAlerts[0];
  const seenAlert = useRef(latestAlert?.id);
  const autoCuedPlayIds = useRef(new Set<string>());
  const breakingHoldUntil = useRef(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    const load = () => { void fetchNFLHighlights().then(result => { if (mounted) setCatalog(result); }); };
    load();
    const timer = window.setInterval(load, 5 * 60_000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const root = document.getElementById('root');
    const wasInert = root?.hasAttribute('inert');
    root?.setAttribute('inert', '');
    closeRef.current?.focus();
    return () => { if (!wasInert) root?.removeAttribute('inert'); };
  }, []);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab' && panelRef.current) {
        const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('button, a[href]')].filter(element => !element.hasAttribute('disabled'));
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [onClose]);
  useEffect(() => {
    if (!auto || playingVideo || channels.length < 2) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() >= breakingHoldUntil.current) { setActiveKey(previous => channels[(channels.findIndex(channel => channel.key === previous) + 1) % channels.length].key); setSelectedAlertId(null); }
    }, 18000);
    return () => window.clearInterval(timer);
  }, [auto, channels, playingVideo]);
  useEffect(() => {
    if (playingVideo) return;
    if (!latestAlert || latestAlert.id === seenAlert.current) return;
    seenAlert.current = latestAlert.id;
    if (auto && freshAlert(latestAlert, now)) { breakingHoldUntil.current = Date.now() + 30000; setActiveKey(latestAlert.channelKey); setSelectedAlertId(latestAlert.id); }
  }, [latestAlert, auto, now, playingVideo]);

  useEffect(() => {
    if (!auto || playingVideo || document.visibilityState !== 'visible') return;
    const cue = allAlerts.flatMap(alert => {
      if (alert.kind !== 'play' || !freshAlert(alert, now) || autoCuedPlayIds.current.has(alert.id)) return [];
      const play = data?.events.find(event => event.id === alert.id);
      const video = play ? matchPlayHighlight(play, catalog?.videos ?? []) : null;
      return video ? [{ alert, video }] : [];
    })[0];
    if (!cue) return;
    autoCuedPlayIds.current.add(cue.alert.id);
    breakingHoldUntil.current = Date.now() + 40_000;
    setActiveKey(cue.alert.channelKey);
    setSelectedAlertId(cue.alert.id);
    setPlayingVideo({ video: cue.video, automatic: true });
  }, [auto, playingVideo, allAlerts, now, data, catalog]);

  useEffect(() => {
    if (!playingVideo?.automatic) return;
    const timer = window.setTimeout(() => setPlayingVideo(null), 40_000);
    return () => window.clearTimeout(timer);
  }, [playingVideo]);

  const take = (key: string, alertId: string | null = null) => { setAuto(false); setActiveKey(key); setSelectedAlertId(alertId); setPlayingVideo(null); };
  const next = () => { if (channels.length) take(channels[(selectedIndex + 1) % channels.length].key); };
  const activeAlert = active?.alerts.find(alert => alert.id === selectedAlertId) ?? active?.alerts[0];
  const closeGame = active && (active.currentGap !== null && active.currentGap <= 10 || active.projectedGap !== null && active.projectedGap <= 10);
  const pose = freshAlert(activeAlert, now) || hazards ? 'hazard' : closeGame ? 'sweat' : 'clear';
  const call = activeAlert ? activeAlert.kind === 'score' ? freshAlert(activeAlert, now) ? 'SCORE UPDATE' : 'LAST SCORE CHANGE' : freshAlert(activeAlert, now) ? 'NFL PLAY ALERT' : 'LAST NFL PLAY' : closeGame ? 'WITCHING HOUR WATCH' : 'MONITORING';
  const channelNumber = active ? snapshot.matchups.findIndex(match => match.id === active.match.id) + 1 : 0;
  const playEvent = activeAlert?.kind === 'play' ? data?.events.find(event => event.id === activeAlert.id) : undefined;
  const playClip = playEvent ? matchPlayHighlight(playEvent, catalog?.videos ?? []) : null;
  const playSearch = playEvent ? playHighlightSearch(playEvent) : null;
  const playVideo = (video: NFLVideo) => { setAuto(false); setPlayingVideo({ video, automatic: false }); };

  return createPortal(<div className={styles.overlay} ref={panelRef} role="dialog" aria-modal="true" aria-label={`${saved.name} watch mode`}>
    <header className={styles.header}><div className={styles.brand}><span className={styles.live}>● LIVE</span><div><strong>WITCHING HOUR // WATCH MODE</strong><small>{saved.name} · Week {snapshot.week} · {channels.length} {channels.length === 1 ? 'game' : 'games'}</small></div></div><div className={styles.headerActions}>
      <button type="button" aria-pressed={highlightsOpen} onClick={() => setHighlightsOpen(value => !value)}>NFL HIGHLIGHTS</button>
      <button type="button" className={auto ? styles.activeControl : ''} aria-pressed={auto} onClick={() => { setAuto(value => !value); if (playingVideo?.automatic) setPlayingVideo({ ...playingVideo, automatic: false }); }}>{auto ? 'AUTO DIRECTOR // ON' : 'AUTO DIRECTOR // OFF'}</button>
      <button type="button" onClick={() => { setActiveKey(channels[0]?.key ?? ''); setSelectedAlertId(null); setPlayingVideo(null); setHighlightsOpen(false); setAuto(true); }}>GO LIVE</button>
      <button type="button" ref={closeRef} onClick={onClose} aria-label="Close watch mode">CLOSE ×</button>
    </div></header>
    <div className={styles.stage}><StudioMonitorFrame as="section" className={styles.feature} title={playingVideo ? 'NFL HIGHLIGHTS // @NFL' : active ? `CH ${String(channelNumber).padStart(2, '0')} // ${saved.name}` : saved.name} badge={playingVideo ? 'OFFICIAL NFL' : call}>
      {playingVideo ? <HighlightPlayer video={playingVideo.video} automatic={playingVideo.automatic} onBack={() => setPlayingVideo(null)} /> : active ? <>
        <WatchStory alert={activeAlert} channel={active} now={now} playSearch={playSearch} clip={playClip} onPlay={playVideo} onHighlights={() => setHighlightsOpen(true)} />
        <div className={styles.broadcastCanvas} aria-label="Featured matchup scorebug">
          <div className={styles.scorebug}><div className={styles.identity}><span>TEAM 1</span><strong title={active.first.name}>{active.first.name}</strong><small>PROJ. {active.first.projection} · {active.first.left === null ? 'STARTERS UNCONFIRMED' : `${active.first.left} LEFT`}</small></div><b>{points(active.first.points)}</b></div>
          <div className={styles.seam}>VS</div>
          <div className={`${styles.scorebug} ${styles.opponent}`}><div className={styles.identity}><span>TEAM 2</span><strong title={active.second.name}>{active.second.name}</strong><small>PROJ. {active.second.projection} · {active.second.left === null ? 'STARTERS UNCONFIRMED' : `${active.second.left} LEFT`}</small></div><b>{points(active.second.points)}</b></div>
        </div>
        <WatchTaleOfTape channel={active} fetchedAt={snapshot.fetchedAt} nflFetchedAt={data?.fetchedAt ?? null} />
      </> : <div className={styles.empty}>Awaiting matchup signal.</div>}
    </StudioMonitorFrame><aside className={styles.director}>
      {highlightsOpen ? <>
        <h2>NFL HIGHLIGHTS <span>@NFL</span></h2>
        <p className={styles.caveat}>{catalog?.status === 'ready' ? 'Official NFL uploads. A title/date match suggests a clip; check playback to confirm the play.' : 'Automatic matching is unavailable. Search the official NFL channel for each game.'}</p>
        <div className={styles.alertList}>
          {active?.games.length ? active.games.map(game => {
            const video = matchGameHighlights(game, catalog?.videos ?? []);
            return <div className={styles.highlightCard} key={game.id}><span>{game.name} · {game.state === 'post' ? 'FINAL' : game.state === 'in' ? 'IN PROGRESS' : 'UPCOMING'}</span>
              <strong>{video?.title ?? 'GAME HIGHLIGHTS'}</strong>
              <small>{video ? `Likely match · uploaded ${syncTime(Date.parse(video.publishedAt))}` : 'No reliable title/date match yet.'}</small>
              <div>{video && <button type="button" onClick={() => playVideo(video)}>WATCH LIKELY MATCH ▶</button>}<a href={gameHighlightSearch(game)} target="_blank" rel="noopener noreferrer">SEARCH @NFL ↗</a></div>
            </div>;
          }) : <p>NFL game details for this fantasy matchup are pending.</p>}
        </div>
        <a className={styles.channelLink} href={nflChannelVideosUrl} target="_blank" rel="noopener noreferrer">OPEN NFL VIDEO CHANNEL ↗</a>
        <button type="button" className={styles.next} onClick={() => setHighlightsOpen(false)}>← BACK TO THE WIRE</button>
      </> : <>
        <div className={styles.scott}><PixelScott state={pose} compact /><div><span>PIXEL SCOTT // DIRECTOR'S DESK</span><strong>{auto ? 'Watching the wire. Cutting to new score swings and starter-game plays.' : 'Manual channel selected. Choose a wire item to take the story.'}</strong></div></div>
        <h2>THE WIRE <span>{allAlerts.length} REPORTS</span></h2><p className={styles.caveat}>Fantasy score swings are confirmed by provider refreshes. NFL play reports flag games involving starters; fantasy impact remains unconfirmed.</p>
        <div className={styles.alertList}>{allAlerts.length ? allAlerts.slice(0, 8).map(alert => <button key={`${alert.kind}:${alert.gameId ?? ''}:${alert.id}`} type="button" className={alert.kind === 'score' ? styles.scoreAlert : styles.playAlert} aria-current={active?.key === alert.channelKey && activeAlert?.id === alert.id ? 'true' : undefined} onClick={() => take(alert.channelKey, alert.id)}><span>{freshAlert(alert, now) ? '● NEW' : 'RECORDED'} · {alert.kind === 'score' ? 'SCORE CHANGE' : 'NFL PLAY'} · {alert.at ? syncTime(alert.at) : 'TIME UNCONFIRMED'}{(alert.relatedChannels ?? 1) > 1 ? ` · ${alert.relatedChannels} CHANNELS` : ''}</span><strong>{alert.headline}</strong><small>{alert.detail}</small><em>TAKE THIS STORY ↗</em></button>) : <p>No score changes or relevant NFL plays in the current feed yet.</p>}</div>
        <button type="button" className={styles.next} onClick={next} disabled={channels.length < 2}>NEXT GAME →</button>
      </>}
    </aside></div>
    <nav className={styles.channelRail} aria-label="League game channels">{channels.map(channel => { const number = snapshot.matchups.findIndex(match => match.id === channel.match.id) + 1; return <button type="button" key={channel.key} aria-current={active?.key === channel.key ? 'true' : undefined} onClick={() => take(channel.key)}><span>CH {String(number).padStart(2, '0')}{channel.currentGap !== null && channel.currentGap <= 10 ? ' · CLOSE' : ''}</span><strong>{channel.first.name} <i>VS</i> {channel.second.name}</strong><small>{points(channel.first.points)} : {points(channel.second.points)}</small></button>; })}</nav>
  </div>, document.body);
}
