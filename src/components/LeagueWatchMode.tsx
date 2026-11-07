import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { NFLTimeline } from '@/api/nflTimeline';
import { canPlayInRegion, fetchNFLHighlights, gameHighlightSearch, matchGameHighlights, matchGameHighlightsCandidates, matchPlayHighlight, matchPlayHighlightCandidates, nflChannelVideosUrl, nflEmbedUrl, nflVideoUrl, playHighlightSearch } from '@/api/nflHighlights';
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
        {alert.kind === 'play' && clip?.embeddable && <button type="button" onClick={() => onPlay(clip)}>WATCH LIKELY CLIP ▶</button>}
        {alert.kind === 'play' && clip && !clip.embeddable && <a href={nflVideoUrl(clip)} target="_blank" rel="noopener noreferrer">CLIP ON YOUTUBE ↗</a>}
        {alert.kind === 'play' && playSearch && <a href={playSearch} target="_blank" rel="noopener noreferrer">{clip ? `CHECK ${clip.source ?? 'NFL'} ↗` : 'FIND CLIP ON @NFL ↗'}</a>}
        <button type="button" onClick={onHighlights}>GAME HIGHLIGHTS →</button>
      </div>
    </> : <><p className={styles.storyKicker}>DIRECTOR'S WATCH</p><h3>WAITING FOR THE NEXT CUT</h3><p className={styles.storyDetail}>{channel.currentGap !== null && channel.currentGap <= 10 ? `Only ${points(channel.currentGap)} points separate these teams. The director is watching for a confirmed score change.` : 'No confirmed score change or linked NFL play is available for this matchup yet.'}</p><p className={styles.storyFoot}>The wire will take this screen when a relevant update arrives.</p></>}
  </section>;
}

type YouTubePlayer = { destroy: () => void; playVideo: () => void };
type YouTubePlayerEvent = { data: number; target: { mute: () => void; playVideo: () => void } };
declare global {
  interface Window {
    YT?: { Player: new (element: HTMLIFrameElement, options: { events: { onReady: (event: YouTubePlayerEvent) => void; onError: (event: YouTubePlayerEvent) => void; onStateChange: (event: YouTubePlayerEvent) => void; onAutoplayBlocked: () => void } }) => YouTubePlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}
let youtubeApiReady: Promise<void> | null = null;
function loadYouTubePlayerApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiReady) return youtubeApiReady;
  youtubeApiReady = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => { youtubeApiReady = null; reject(new Error('YouTube player timed out')); }, 12000);
    window.onYouTubeIframeAPIReady = () => { window.clearTimeout(timeout); previous?.(); resolve(); };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => { window.clearTimeout(timeout); youtubeApiReady = null; reject(new Error('YouTube player unavailable')); };
    document.head.appendChild(script);
  });
  return youtubeApiReady;
}

type VideoPhase = 'loading' | 'ready' | 'playing' | 'paused' | 'start-delayed' | 'autoplay-blocked' | 'blocked' | 'unavailable';
type VideoCue = { video: NFLVideo; automatic: boolean; remaining: NFLVideo[]; phase: VideoPhase; headline: string };
const blockedStorageKey = 'witching-hour:blocked-youtube-embeds';
function savedBlockedVideos(): Set<string> {
  try { return new Set(JSON.parse(sessionStorage.getItem(blockedStorageKey) ?? '[]').filter((id: unknown) => typeof id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(id))); }
  catch { return new Set(); }
}

function HighlightPlayer({ video, automatic, phase, headline, onPhase, onFailed, onEnded, onManualPlay, onBack }: {
  video: NFLVideo; automatic: boolean; phase: VideoPhase; headline: string;
  onPhase: (phase: VideoPhase) => void; onFailed: (blocked: boolean) => void; onEnded: () => void; onManualPlay: () => void; onBack: () => void;
}) {
  const playerSlotRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const callbacks = useRef({ onPhase, onFailed, onEnded });
  callbacks.current = { onPhase, onFailed, onEnded };
  const automaticRef = useRef(automatic);
  automaticRef.current = automatic;
  const unavailable = phase === 'blocked' || phase === 'unavailable';
  useEffect(() => {
    if (unavailable) return;
    let disposed = false;
    let failed = false;
    let player: YouTubePlayer | null = null;
    let readyTimer = 0;
    let startTimer = 0;
    let stallTimer = 0;
    let hasPlayed = false;
    const clearTimers = () => { window.clearTimeout(readyTimer); window.clearTimeout(startTimer); window.clearTimeout(stallTimer); };
    const fail = (blocked: boolean) => { if (!disposed && !failed) { failed = true; clearTimers(); callbacks.current.onFailed(blocked); } };
    const frame = document.createElement('iframe');
    frame.title = video.title;
    frame.src = `${nflEmbedUrl(video)}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
    frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allowFullscreen = true;
    playerSlotRef.current?.appendChild(frame);
    readyTimer = window.setTimeout(() => fail(false), 15000);
    void loadYouTubePlayerApi().then(() => {
      if (disposed || !frame.isConnected || !window.YT?.Player) return;
      player = new window.YT.Player(frame, { events: {
        onReady: event => {
          if (disposed || failed) return;
          window.clearTimeout(readyTimer);
          if (automaticRef.current) {
            event.target.mute();
            try { event.target.playVideo(); }
            catch { callbacks.current.onPhase('autoplay-blocked'); return; }
            startTimer = window.setTimeout(() => { if (!disposed && !failed && !hasPlayed) callbacks.current.onPhase('start-delayed'); }, 12000);
          } else callbacks.current.onPhase('ready');
        },
        onError: event => fail(event?.data === 100 || event?.data === 101 || event?.data === 150),
        onStateChange: event => {
          if (disposed || failed) return;
          if (event.data === 1) { hasPlayed = true; clearTimers(); callbacks.current.onPhase('playing'); }
          else if (event.data === 0) { clearTimers(); callbacks.current.onEnded(); }
          else if (event.data === 2) { window.clearTimeout(stallTimer); callbacks.current.onPhase('paused'); }
          else if (event.data === 3 && hasPlayed) {
            window.clearTimeout(stallTimer);
            stallTimer = window.setTimeout(() => fail(false), 15000);
          }
        },
        onAutoplayBlocked: () => { if (!disposed && !failed) { window.clearTimeout(startTimer); callbacks.current.onPhase('autoplay-blocked'); } },
      } });
      playerRef.current = player;
    }).catch(() => fail(false));
    return () => { disposed = true; clearTimers(); player?.destroy(); playerRef.current = null; frame.remove(); };
  }, [video, unavailable]);
  const status = phase === 'loading' ? 'CONNECTING TO OFFICIAL VIDEO…' : phase === 'ready' ? 'READY // PRESS PLAY IN THE PLAYER' : phase === 'playing' ? '● PLAYING' : phase === 'paused' ? 'PAUSED' : phase === 'autoplay-blocked' ? 'AUTOPLAY BLOCKED // PRESS PLAY TO WATCH' : phase === 'start-delayed' ? 'PLAYBACK DELAYED // PRESS PLAY TO WATCH' : phase === 'blocked' ? 'EMBED RESTRICTED' : 'PLAYER UNAVAILABLE';
  return <section className={styles.videoStage} aria-label="Official NFL highlight player">
    <div className={styles.videoHeading}><span>{automatic ? `● AUTO DIRECTOR // ${video.source ?? 'NFL'} PLAY MATCH` : `OFFICIAL ${video.source ?? 'NFL'} VIDEO · TITLE/DATE MATCH`}</span><button type="button" onClick={onBack}>← RETURN TO LIVE</button></div>
    <div className={styles.videoStory}><span>ON AIR // {video.source ?? 'NFL'}</span><strong>{headline}</strong><small>{video.title}</small></div>
    <div className={styles.videoStatus} role="status">{status}{(phase === 'autoplay-blocked' || phase === 'start-delayed') && <button type="button" onClick={() => { onManualPlay(); playerRef.current?.playVideo(); }}>PLAY CLIP ▶</button>}</div>
    {phase === 'blocked' || phase === 'unavailable' ? <div className={styles.videoPreview}>
      <span>OFFICIAL {video.source ?? 'NFL'} CLIP // EXTERNAL PLAYBACK</span>
      <strong>{video.title}</strong>
      <p>{phase === 'blocked' ? 'This clip is blocked from playing here.' : 'The video player could not load here.'} Open it on YouTube while the live wire stays on this screen.</p>
      <a href={nflVideoUrl(video)} target="_blank" rel="noopener noreferrer">WATCH ON YOUTUBE ↗</a>
    </div> : <div className={styles.videoPlayerSlot} ref={playerSlotRef} />}
    <div className={styles.videoCaption}><small>Published {syncTime(Date.parse(video.publishedAt))}. Title and date suggest a match; check the video to confirm it.</small></div>
    {automatic && <p className={styles.autoCueNote}>{phase === 'blocked' || phase === 'unavailable' || phase === 'autoplay-blocked' || phase === 'start-delayed' ? 'RETURNING TO THE LIVE WIRE IN 12 SECONDS' : phase === 'playing' ? 'MUTED AUTO CUE · RETURNING TO LIVE AFTER THE CLIP OR IN 40 SECONDS' : 'WAITING FOR VIDEO PLAYBACK · RETURN TO LIVE AT ANY TIME'}</p>}
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
  const [blockedVideoIds, setBlockedVideoIds] = useState(savedBlockedVideos);
  const availableVideos = useMemo(() => (catalog?.videos ?? []).filter(video => !blockedVideoIds.has(video.id) && canPlayInRegion(video, catalog?.viewerCountry)), [catalog, blockedVideoIds]);
  const playableVideos = useMemo(() => availableVideos.filter(video => video.embeddable), [availableVideos]);
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
      const candidates = play ? matchPlayHighlightCandidates(play, playableVideos) : [];
      return candidates[0] ? [{ alert, candidates }] : [];
    })[0];
    if (!cue) return;
    autoCuedPlayIds.current.add(cue.alert.id);
    breakingHoldUntil.current = Date.now() + 40_000;
    setActiveKey(cue.alert.channelKey);
    setSelectedAlertId(cue.alert.id);
    setPlayingVideo({ video: cue.candidates[0], remaining: cue.candidates.slice(1), automatic: true, phase: 'loading', headline: cue.alert.headline });
  }, [auto, playingVideo, allAlerts, now, data, playableVideos]);

  useEffect(() => {
    if (!playingVideo?.automatic) return;
    const duration = playingVideo.phase === 'playing' ? 40_000 : ['blocked', 'unavailable', 'autoplay-blocked', 'start-delayed'].includes(playingVideo.phase) ? 12_000 : null;
    if (duration === null) return;
    const timer = window.setTimeout(() => setPlayingVideo(null), duration);
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
  const playCandidates = playEvent ? matchPlayHighlightCandidates(playEvent, playableVideos) : [];
  const playClip = playCandidates[0] ?? (playEvent ? matchPlayHighlight(playEvent, availableVideos) : null);
  const playSearch = playEvent ? playHighlightSearch(playEvent, playClip?.source) : null;
  const playVideo = (video: NFLVideo, candidates: NFLVideo[] = playCandidates, headline = activeAlert?.headline ?? video.title) => { setAuto(false); setPlayingVideo({ video, remaining: candidates.filter(candidate => candidate.id !== video.id), automatic: false, phase: 'loading', headline }); };
  const handleVideoFailure = (blocked: boolean) => {
    if (!playingVideo) return;
    if (blocked) setBlockedVideoIds(previous => {
      const next = new Set(previous).add(playingVideo.video.id);
      try { sessionStorage.setItem(blockedStorageKey, JSON.stringify([...next])); } catch { /* Private storage may be unavailable. */ }
      return next;
    });
    breakingHoldUntil.current = Date.now() + 12_000;
    setPlayingVideo(current => current ? current.remaining.length
      ? { ...current, video: current.remaining[0], remaining: current.remaining.slice(1), phase: 'loading' }
      : { ...current, phase: blocked ? 'blocked' : 'unavailable' } : null);
  };
  const updateVideoPhase = (videoId: string, phase: VideoPhase) => setPlayingVideo(current => current?.video.id === videoId && current.phase !== 'blocked' && current.phase !== 'unavailable' ? { ...current, phase } : current);

  return createPortal(<div className={styles.overlay} ref={panelRef} role="dialog" aria-modal="true" aria-label={`${saved.name} watch mode`}>
    <header className={styles.header}><div className={styles.brand}><span className={styles.live}>● LIVE</span><div><strong>WITCHING HOUR // WATCH MODE</strong><small>{saved.name} · Week {snapshot.week} · {channels.length} {channels.length === 1 ? 'game' : 'games'}</small></div></div><div className={styles.headerActions}>
      <button type="button" aria-pressed={highlightsOpen} onClick={() => setHighlightsOpen(value => !value)}>NFL HIGHLIGHTS</button>
      <button type="button" className={auto ? styles.activeControl : ''} aria-pressed={auto} onClick={() => { setAuto(value => !value); if (playingVideo?.automatic) setPlayingVideo({ ...playingVideo, automatic: false }); }}>{auto ? 'AUTO DIRECTOR // ON' : 'AUTO DIRECTOR // OFF'}</button>
      <button type="button" onClick={() => { setActiveKey(channels[0]?.key ?? ''); setSelectedAlertId(null); setPlayingVideo(null); setHighlightsOpen(false); setAuto(true); }}>GO LIVE</button>
      <button type="button" ref={closeRef} onClick={onClose} aria-label="Close watch mode">CLOSE ×</button>
    </div></header>
    <div className={styles.stage}><StudioMonitorFrame as="section" className={styles.feature} title={playingVideo ? `NFL HIGHLIGHTS // ${playingVideo.video.source ?? 'NFL'}` : active ? `CH ${String(channelNumber).padStart(2, '0')} // ${saved.name}` : saved.name} badge={playingVideo ? 'OFFICIAL NFL' : call}>
      {playingVideo ? <HighlightPlayer video={playingVideo.video} automatic={playingVideo.automatic} phase={playingVideo.phase} headline={playingVideo.headline} onPhase={phase => updateVideoPhase(playingVideo.video.id, phase)} onFailed={handleVideoFailure} onEnded={() => setPlayingVideo(null)} onManualPlay={() => setPlayingVideo(current => current ? { ...current, automatic: false, phase: 'ready' } : null)} onBack={() => setPlayingVideo(null)} /> : active ? <>
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
        <h2>NFL HIGHLIGHTS <span>OFFICIAL CHANNELS</span></h2>
        <p className={styles.caveat}>{catalog?.status === 'ready' ? 'FOX and CBS clips take priority when they match; NFL uploads cover the rest. Check the video to confirm the play.' : 'Automatic matching is unavailable. Search the official NFL channel for each game.'}</p>
        <div className={styles.alertList}>
          {active?.games.length ? active.games.map(game => {
            const candidates = matchGameHighlightsCandidates(game, playableVideos);
            const video = candidates[0] ?? matchGameHighlights(game, availableVideos);
            return <div className={styles.highlightCard} key={game.id}><span>{game.name} · {game.state === 'post' ? 'FINAL' : game.state === 'in' ? 'IN PROGRESS' : 'UPCOMING'}</span>
              <strong>{video?.title ?? 'GAME HIGHLIGHTS'}</strong>
              <small>{video ? `${video.source ?? 'NFL'} · likely match · uploaded ${syncTime(Date.parse(video.publishedAt))}` : 'No reliable title/date match yet.'}</small>
              <div>{video?.embeddable ? <button type="button" onClick={() => playVideo(video, candidates, video.title)}>WATCH LIKELY MATCH ▶</button> : video ? <a href={nflVideoUrl(video)} target="_blank" rel="noopener noreferrer">CLIP ON YOUTUBE ↗</a> : null}<a href={gameHighlightSearch(game)} target="_blank" rel="noopener noreferrer">SEARCH @NFL ↗</a></div>
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
