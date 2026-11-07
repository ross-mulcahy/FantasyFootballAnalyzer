import { expect, it, vi } from 'vitest';
import type { MajorEvent } from './nflTimeline';
import { fetchNFLHighlights, gameHighlightSearch, matchGameHighlights, matchPlayHighlight, nflEmbedUrl, playHighlightSearch } from './nflHighlights';

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
