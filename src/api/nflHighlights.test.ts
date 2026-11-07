import { expect, it, vi } from 'vitest';
import type { MajorEvent } from './nflTimeline';
import { fetchNFLHighlights, gameHighlightSearch, matchGameHighlights, matchPlayHighlight, matchPlayHighlightCandidates, nflEmbedUrl, playHighlightSearch } from './nflHighlights';

const kickoff = '2026-11-08T18:00:00Z';
const event: MajorEvent = { id: 'e1', gameId: 'g1', game: 'LAR @ SF', kickoff, occurredAt: '2026-11-08T19:21:00Z', quarter: 2, clock: '7:30', kind: 'Rushing Touchdown', description: 'Puka Nacua 65 Yd Rush (Kick)' };
const videos = [
  { id: 'AAAAAAAAAAA', title: 'Puka Nacua 65-Yard Touchdown! Rams vs. 49ers', publishedAt: '2026-11-08T20:00:00Z' },
  { id: 'BBBBBBBBBBB', title: 'Rams vs 49ers Game Highlights | 2026', publishedAt: '2026-11-09T04:00:00Z' },
  { id: 'CCCCCCCCCCC', title: 'Puka Nacua 65-Yard Touchdown! Rams vs. 49ers', publishedAt: '2026-10-08T20:00:00Z' },
];

it('matches a play only when player, yardage, kind and game date agree', () => {
  expect(matchPlayHighlight(event, videos)?.id).toBe('AAAAAAAAAAA');
  expect(matchPlayHighlight({ ...event, description: 'Derrick Henry 65 Yd Rush (Kick)' }, videos)).toBeNull();
  expect(matchPlayHighlight({ ...event, description: 'Puka Nacua 42 Yd Rush (Kick)' }, videos)).toBeNull();
  expect(matchPlayHighlight(event, videos.slice(1))).toBeNull();
});

it('recognizes official NFL play-title patterns with the actor at either end', () => {
  const gameEvent = { ...event, game: 'JAX @ BAL', kickoff: '2026-11-06T01:00:00Z', occurredAt: '2026-11-06T02:00:00Z' };
  const title = (name: string) => [{ id: 'DDDDDDDDDDD', title: name, publishedAt: '2026-11-06T03:00:00Z' }];
  expect(matchPlayHighlight({ ...gameEvent, description: 'Justice Hill 65 Yd Rush (Kick)' }, title('JUSTICE HILL MAKES 65 YARD RUSHING TD'))?.id).toBe('DDDDDDDDDDD');
  expect(matchPlayHighlight({ ...gameEvent, kind: 'Interception', description: 'Trevor Lawrence Pass Intercepted by Jourdan Lewis' }, title('INT. BY JOURDAN LEWIS'))?.id).toBe('DDDDDDDDDDD');
  expect(matchPlayHighlight({ ...gameEvent, kind: 'Passing Touchdown', description: 'Parker Washington 18 Yd Pass from Trevor Lawrence (Kick)' }, title('TD PASS DOWN THE MIDDLE TO PARKER WASHINGTON'))?.id).toBe('DDDDDDDDDDD');
  expect(matchPlayHighlight({ ...gameEvent, description: 'Bhayshul Tuten 6 Yd Rush (Kick)' }, title('JAGUARS END THE FIRST DRIVE WITH A RUSHING TD BY BHAYSHUL TUTEN'))?.id).toBe('DDDDDDDDDDD');
  expect(matchPlayHighlight({ ...gameEvent, kind: 'Scoring play', description: 'Justice Hill 65 Yd Rush (Kick)' }, title('JUSTICE HILL MAKES 65 YARD RUSHING TD'))?.id).toBe('DDDDDDDDDDD');
});

it('rejects misleading recaps, old clips, conflicting plays and ambiguous same-player clips', () => {
  const clip = (id: string, title: string, publishedAt = '2026-11-08T20:00:00Z') => ({ id, title, publishedAt });
  expect(matchPlayHighlight(event, [clip('DDDDDDDDDDD', 'Puka Nacua 42 Yard Rushing TD')])).toBeNull();
  expect(matchPlayHighlight(event, [clip('DDDDDDDDDDD', 'Puka Nacua 65 Yard Receiving TD')])).toBeNull();
  expect(matchPlayHighlight(event, [clip('DDDDDDDDDDD', 'Puka Nacua best plays and touchdowns | Week 9')])).toBeNull();
  expect(matchPlayHighlight(event, [clip('DDDDDDDDDDD', 'Puka Nacua rushing TD', '2026-11-08T18:00:00Z')])).toBeNull();
  expect(matchPlayHighlight(event, [clip('DDDDDDDDDDD', 'Puka Nacua rushing TD | 2025 NFL Season')])).toBeNull();
  expect(matchPlayHighlight(event, [clip('DDDDDDDDDDD', 'Puka Nacua rushing TD'), clip('EEEEEEEEEEE', 'Puka Nacua touchdown')])).toBeNull();
  expect(matchPlayHighlight(event, [clip('DDDDDDDDDDD', 'Puka Nacua 65 Yard Rushing TD'), clip('EEEEEEEEEEE', 'Puka Nacua touchdown')])?.id).toBe('DDDDDDDDDDD');
});

it('prefers a playable FOX scoring clip, then CBS, then NFL for the same verified play', () => {
  const publishedAt = '2026-11-08T20:00:00Z';
  const candidates = matchPlayHighlightCandidates(event, [
    { id: 'NNNNNNNNNNN', title: 'Puka Nacua 65 Yard Rushing TD', publishedAt, source: 'NFL' },
    { id: 'CCCCCCCCCCC', title: 'Puka Nacua 65 Yard Rushing TD', publishedAt, source: 'NFL on CBS' },
    { id: 'FFFFFFFFFFF', title: 'Puka Nacua 65 YARDS for a TOUCHDOWN vs. 49ers | NFL Highlights', publishedAt, source: 'NFL on FOX' },
  ]);
  expect(candidates.map(video => video.id)).toEqual(['FFFFFFFFFFF', 'CCCCCCCCCCC', 'NNNNNNNNNNN']);
});

it('finds an official-channel game recap and provides searches when no metadata match exists', () => {
  const game = { name: 'LAR @ SF', kickoff };
  expect(matchGameHighlights(game, videos)?.id).toBe('BBBBBBBBBBB');
  expect(matchGameHighlights({ name: 'BUF @ KC', kickoff }, videos)).toBeNull();
  expect(gameHighlightSearch(game)).toContain('youtube.com/@NFL/search?query=');
  expect(playHighlightSearch(event)).toContain('Puka%20Nacua');
  expect(nflEmbedUrl(videos[0])).toBe('https://www.youtube-nocookie.com/embed/AAAAAAAAAAA');
});

it('treats an unconfigured metadata service as a search-only experience', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ configured: false, videos: [] }) }));
  expect(await fetchNFLHighlights()).toEqual({ status: 'unconfigured', videos: [] });
  vi.unstubAllGlobals();
});
