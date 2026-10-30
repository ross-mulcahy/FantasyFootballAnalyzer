// The always-mounted shell's routing decisions: the ?league=sleeper:<id>
// share-link loader (and its no-retry loop guard), the guest-vs-data route
// guards, guest auto-enter on public draft-prep routes, the client half of
// Yahoo OAuth (CSRF state validation), and the share-param URL rewrite.
// Everything below App itself is stubbed: these tests pin who renders where,
// not what the pages draw.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import App from './App';
import type { League } from '@/types';

const h = vi.hoisted(() => {
  // A tiny external store so tests (and the load mock) can swap the league
  // mid-flight and the mocked useLeague re-renders App like the real hook.
  const listeners = new Set<() => void>();
  const store = {
    league: null as unknown,
    isLoading: false,
    version: 0,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getSnapshot: () => store.version,
    set(patch: { league?: unknown; isLoading?: boolean }) {
      Object.assign(store, patch);
      store.version += 1;
      listeners.forEach(fn => fn());
    },
  };
  return {
    store,
    loadMock: vi.fn(),
    enterGuestMock: vi.fn(),
    noop: () => {},
    saveTokens: vi.fn(),
    validateOAuthState: vi.fn(),
    clearOAuthState: vi.fn(),
    takeOAuthReturn: vi.fn(() => null),
    loggerError: vi.fn(),
    blockRedirect: false,
    yahooAuthed: false,
  };
});

vi.mock('@/hooks/useLeague', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    useLeague: () => {
      useSyncExternalStore(h.store.subscribe, h.store.getSnapshot);
      return {
        league: h.store.league as League | null,
        credentials: null,
        isLoading: h.store.isLoading,
        error: null,
        progress: null,
        load: h.loadMock,
        refresh: h.noop,
        clear: h.noop,
        enterGuest: h.enterGuestMock,
        updateGuest: h.noop,
        seasonFallbackNotice: null,
        dismissSeasonFallbackNotice: h.noop,
      };
    },
  };
});

// Routing tests isolate the shared polling/data layer; its scheduler and
// provider behavior are verified in dedicated hook tests.
vi.mock('@/hooks/useGameDay', async importOriginal => ({
  ...await importOriginal<typeof import('@/hooks/useGameDay')>(),
  useGameDayState: () => ({ snapshot: null, isRefreshing: false, error: null, cacheWarning: false, refresh: async () => {}, polling: null }),
}));

// The one thing the strand detector needs and the app no longer does: a
// <Navigate> that does not navigate. Off by default, so every other test runs
// against the real router.
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    Navigate: (props: React.ComponentProps<typeof actual.Navigate>) =>
      h.blockRedirect ? null : <actual.Navigate {...props} />,
  };
});

vi.mock('@/hooks/useSounds', () => ({
  useSounds: () => ({ playLoadComplete: h.noop, playError: h.noop }),
}));

vi.mock('@/api/yahoo', async importOriginal => ({
  ...(await importOriginal<object>()),
  isAuthenticated: () => h.yahooAuthed,
  saveTokens: h.saveTokens,
  validateOAuthState: h.validateOAuthState,
  clearOAuthState: h.clearOAuthState,
  takeOAuthReturn: h.takeOAuthReturn,
}));

vi.mock('@/api/sleeper', async importOriginal => ({
  ...(await importOriginal<object>()),
  findSuccessorLeague: vi.fn(async () => null),
}));

vi.mock('@/utils/analytics', () => ({
  Analytics: { pageView: h.noop, connectAttempt: h.noop },
}));

vi.mock('@/utils/logger', () => ({
  logger: { debug: h.noop, warn: h.noop, error: h.loggerError },
}));

// Chrome stubs: these tests pin routing, not chrome or page content.
vi.mock('@/components/Header', () => ({
  Header: ({ yahooConnected }: { yahooConnected?: boolean }) => (
    <div data-testid="header" data-yahoo={String(!!yahooConnected)} />
  ),
}));
vi.mock('@/components/YearSelector', () => ({ YearSelector: () => null }));
vi.mock('@/components/SeasonLoadingOverlay', () => ({ SeasonLoadingOverlay: () => null }));
vi.mock('@/components/DraftPrepBanner', () => ({ DraftPrepBanner: () => null }));
vi.mock('@/components/GuestBanner', () => ({ GuestBanner: () => null }));
vi.mock('@/components/SeasonFallbackNotice', () => ({
  SeasonFallbackNotice: ({ message }: { message: string }) => <div data-testid="notice">{message}</div>,
}));
// The connect form stands in for the real one: a button that hands App the
// credentials, so handleLoadLeague (load -> navigate) runs for real.
vi.mock('@/pages/SettingsPage', () => ({
  SettingsPage: ({ onLoadLeague }: { onLoadLeague: (c: unknown) => void }) => (
    <div data-testid="settings-page">
      <button type="button" onClick={() => onLoadLeague({ platform: 'sleeper', leagueId: '77' })}>
        Load League
      </button>
    </div>
  ),
}));
vi.mock('@/pages/GameDayRecapPage', () => ({ GameDayRecapPage: () => <div data-testid="recap-page" /> }));
vi.mock('@/pages/MyGameDayPage', () => ({ MyGameDayPage: () => <div data-testid="home-page" /> }));
// The lazy pages the routes below can reach (lazyPage resolves these mocks
// through the same dynamic import).
vi.mock('@/pages/GameDayPage', () => ({ GameDayPage: () => <div data-testid="league-game-day" /> }));
vi.mock('@/pages/AwardsPage', () => ({ AwardsPage: () => <div data-testid="awards-page" /> }));
vi.mock('@/pages/RankingsPage', () => ({ RankingsPage: () => <div data-testid="rankings-page" /> }));
vi.mock('@/pages/TrendsPage', () => ({ TrendsPage: () => <div data-testid="trends-page" /> }));
vi.mock('@/pages/DraftPage', () => ({ DraftPage: () => <div data-testid="draft-page" /> }));
vi.mock('@/pages/DraftRoomPage', () => ({ DraftRoomPage: () => <div data-testid="draft-room-page" /> }));
vi.mock('@/pages/TeamsPage', () => ({ TeamsPage: () => <div data-testid="teams-page" /> }));

function sleeperLeague(id: string, overrides: Partial<League> = {}): League {
  return {
    id,
    platform: 'sleeper',
    name: 'Route Test League',
    season: 2025,
    teams: [],
    scoringType: 'half_ppr',
    totalTeams: 10,
    isLoaded: true,
    ...overrides,
  } as unknown as League;
}

function LocationSpy() {
  const location = useLocation();
  return <div data-testid="loc">{location.pathname + location.search}</div>;
}

// A real history-backed router, not MemoryRouter: App compares the browser
// URL against useLocation() to spot a navigation the router has not committed
// yet (React Router 7 commits location updates in a transition), and only a
// history-backed router reproduces that.
function renderApp(initialEntry: string) {
  window.history.replaceState(null, '', initialEntry);
  return render(
    <BrowserRouter>
      <App />
      <LocationSpy />
    </BrowserRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
  vi.clearAllMocks();
  h.store.league = null;
  h.store.isLoading = false;
  h.blockRedirect = false;
  h.yahooAuthed = false;
  h.takeOAuthReturn.mockReturnValue(null);
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  // Default load: succeed and swap the store's league in, like the real hook.
  h.loadMock.mockImplementation(async ({ leagueId }: { leagueId: string }) => {
    const league = sleeperLeague(leagueId);
    h.store.set({ league });
    return league;
  });
  h.enterGuestMock.mockImplementation(() => {
    h.store.set({ league: sleeperLeague('guest', { isGuest: true } as Partial<League>) });
  });
});

describe('share links (?league=sleeper:<id>)', () => {
  it('loads the linked league and holds the deep link instead of bouncing home', async () => {
    renderApp('/awards?league=sleeper:999');
    // The guard shows a spinner while the load is in flight, then the page.
    expect(await screen.findByTestId('awards-page')).toBeTruthy();
    expect(h.loadMock).toHaveBeenCalledTimes(1);
    expect(h.loadMock).toHaveBeenCalledWith({ platform: 'sleeper', leagueId: '999' });
    expect(decodeURIComponent(screen.getByTestId('loc').textContent ?? '')).toBe(
      '/awards?league=sleeper:999',
    );
  });

  it('tries a failing share link once, then falls through to home without looping', async () => {
    // Like the real hook, a failed load still toggles isLoading, which is
    // the re-render that lets the guard resolve to the redirect.
    h.loadMock.mockImplementation(async () => {
      h.store.set({ isLoading: true });
      h.store.set({ isLoading: false });
      return null;
    });
    renderApp('/awards?league=sleeper:404404');
    // The failed load resolves the guard to the no-league redirect.
    expect(await screen.findByTestId('settings-page')).toBeTruthy();
    // The attempted-id guard must hold across the re-renders: one try only.
    expect(h.loadMock).toHaveBeenCalledTimes(1);
  });

  it('restores the share param the in-app navigation dropped', async () => {
    h.store.league = sleeperLeague('55');
    renderApp('/awards');
    expect(await screen.findByTestId('awards-page')).toBeTruthy();
    // URLSearchParams percent-encodes the colon; decode before comparing.
    await waitFor(() =>
      expect(decodeURIComponent(screen.getByTestId('loc').textContent ?? '')).toBe(
        '/awards?league=sleeper:55',
      ),
    );
  });

  it('loads a public ESPN league from ?league=espn:<id> and holds the deep link', async () => {
    h.loadMock.mockImplementation(async ({ leagueId }: { leagueId: string }) => {
      const league = sleeperLeague(leagueId, { platform: 'espn' } as Partial<League>);
      h.store.set({ league });
      return league;
    });
    renderApp('/awards?league=espn:123456789');
    expect(await screen.findByTestId('awards-page')).toBeTruthy();
    expect(h.loadMock).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'espn', leagueId: '123456789' }),
    );
    expect(decodeURIComponent(screen.getByTestId('loc').textContent ?? '')).toBe(
      '/awards?league=espn:123456789',
    );
  });

  it('degrades a private ESPN share link to the prefilled connect form', async () => {
    // A cookie-less load of a private league fails; the link should land on
    // the connect form (home), tried exactly once, not loop or strand the
    // visitor on a guarded route.
    h.loadMock.mockImplementation(async () => {
      h.store.set({ isLoading: true });
      h.store.set({ isLoading: false });
      return null;
    });
    renderApp('/awards?league=espn:123456789');
    expect(await screen.findByTestId('settings-page')).toBeTruthy();
    expect(h.loadMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('loc').textContent).toMatch(/^\//);
    // The prefill for the connect form persists like a manual attempt would.
    expect(JSON.parse(localStorage.getItem('ffa:lastconn:v1') ?? 'null')).toMatchObject({
      platform: 'espn',
    });
  });
});

describe('Yahoo reload persistence (?league=yahoo:<league_key>)', () => {
  const KEY = '461.l.12345';

  it('restores a Yahoo league on reload when the browser is logged in, keeping the param', async () => {
    h.yahooAuthed = true;
    h.loadMock.mockImplementation(async ({ leagueId }: { leagueId: string }) => {
      const league = sleeperLeague(leagueId, { platform: 'yahoo' } as Partial<League>);
      h.store.set({ league });
      return league;
    });
    renderApp(`/awards?league=yahoo:${KEY}`);
    expect(await screen.findByTestId('awards-page')).toBeTruthy();
    expect(h.loadMock).toHaveBeenCalledTimes(1);
    expect(h.loadMock).toHaveBeenCalledWith({ platform: 'yahoo', leagueId: KEY });
    expect(decodeURIComponent(screen.getByTestId('loc').textContent ?? '')).toBe(
      `/awards?league=yahoo:${KEY}`,
    );
  });

  it('sends a logged-out visitor to the connect form on the Yahoo tab without loading', async () => {
    renderApp(`/awards?league=yahoo:${KEY}`);
    expect(await screen.findByTestId('settings-page')).toBeTruthy();
    expect(h.loadMock).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('ffa:lastconn:v1') ?? 'null')).toMatchObject({
      platform: 'yahoo',
      yahoo: { leagueId: KEY },
    });
  });

  it('ignores a malformed Yahoo key', async () => {
    h.yahooAuthed = true;
    renderApp('/awards?league=yahoo:notakey');
    expect(await screen.findByTestId('settings-page')).toBeTruthy();
    expect(h.loadMock).not.toHaveBeenCalled();
  });
});

describe('header Yahoo login state', () => {
  it('drops to logged-out when a failed refresh clears the tokens mid-session', async () => {
    h.yahooAuthed = true;
    h.store.league = sleeperLeague('55');
    renderApp('/awards');
    expect((await screen.findByTestId('header')).getAttribute('data-yahoo')).toBe('true');
    // The adapter's refresh failure calls clearTokens(); the next load state
    // change must re-read it instead of showing a stale "connected".
    h.yahooAuthed = false;
    await act(async () => { h.store.set({ isLoading: true }); });
    await act(async () => { h.store.set({ isLoading: false }); });
    expect(screen.getByTestId('header').getAttribute('data-yahoo')).toBe('false');
  });
});

describe('partial Yahoo load notice', () => {
  it('tells the user what is missing when the loaded league is incomplete', async () => {
    h.store.league = sleeperLeague('461.l.1', {
      platform: 'yahoo',
      loadIncomplete: 'Yahoo throttled some requests, so this league is missing matchup scores for week 3.',
    } as Partial<League>);
    renderApp('/awards');
    expect((await screen.findByTestId('notice')).textContent).toMatch(/missing matchup scores for week 3/);
  });

  it('shows no notice for a complete league', async () => {
    h.store.league = sleeperLeague('461.l.1', { platform: 'yahoo' } as Partial<League>);
    renderApp('/awards');
    expect(await screen.findByTestId('awards-page')).toBeTruthy();
    expect(screen.queryByTestId('notice')).toBeNull();
  });
});

describe('route guards', () => {
  it('bounces a guest from a data route to /rankings', async () => {
    h.store.league = sleeperLeague('guest', { isGuest: true } as Partial<League>);
    renderApp('/draft');
    expect(await screen.findByTestId('rankings-page')).toBeTruthy();
    expect(screen.getByTestId('loc').textContent).toBe('/rankings');
  });

  it('sends a visitor with no league from a data route home', async () => {
    renderApp('/teams');
    expect(await screen.findByTestId('settings-page')).toBeTruthy();
    expect(screen.getByTestId('loc').textContent).toBe('/settings');
  });

  it('auto-enters guest mode on the public /rankings instead of redirecting', async () => {
    renderApp('/rankings');
    expect(await screen.findByTestId('rankings-page')).toBeTruthy();
    expect(h.enterGuestMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('loc').textContent).toBe('/rankings');
  });

  it('auto-enters guest mode on the public /trends instead of redirecting', async () => {
    renderApp('/trends');
    expect(await screen.findByTestId('trends-page')).toBeTruthy();
    expect(h.enterGuestMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('loc').textContent).toBe('/trends');
  });

  it('redirects the old /shifts URL to /trends', async () => {
    renderApp('/shifts');
    expect(await screen.findByTestId('trends-page')).toBeTruthy();
    expect(screen.getByTestId('loc').textContent).toBe('/trends');
  });
});

describe('Yahoo OAuth return (/yahoo-success)', () => {
  const tokens = { access_token: 'a', refresh_token: 'r', expires_in: 3600, token_type: 'bearer' };
  const tokensHash = `#tokens=${encodeURIComponent(JSON.stringify(tokens))}`;

  it('rejects a tampered state without saving the tokens riding along', async () => {
    h.validateOAuthState.mockReturnValue(false);
    renderApp(`/yahoo-success?state=forged${tokensHash}`);
    expect(await screen.findByTestId('settings-page')).toBeTruthy();
    expect(h.saveTokens).not.toHaveBeenCalled();
    expect(h.clearOAuthState).toHaveBeenCalled();
    // The stash is discarded so a later login can't replay it.
    expect(h.takeOAuthReturn).toHaveBeenCalled();
    expect(screen.getByTestId('loc').textContent).toBe('/settings');
  });

  it('saves the fragment tokens on a valid state and lands home', async () => {
    h.validateOAuthState.mockReturnValue(true);
    renderApp(`/yahoo-success?state=good${tokensHash}`);
    expect(await screen.findByTestId('settings-page')).toBeTruthy();
    expect(h.saveTokens).toHaveBeenCalledWith(tokens);
    expect(screen.getByTestId('loc').textContent).toBe('/settings');
  });
});


// A connect resolves the league and navigates in the same tick. React Router 7
// commits the location in a transition, so the render that reacts to the new
// league still reports the OLD pathname; a URL rewrite built from it navigates
// back and cancels the redirect. The home route's <Navigate> fires once (its
// effect deps never change again), so a cancelled redirect stranded the app on
// '/' rendering nothing under the header - the blank page users reported after
// loading a league. These two pin the destinations; the one below pins the
// rewrite guard that keeps them reachable.
describe('connect flow lands on a page', () => {
  it('returns to unified Game Day after connecting from Settings', async () => {
    renderApp('/settings');
    fireEvent.click(await screen.findByRole('button', { name: 'Load League' }));

    expect(await screen.findByTestId('home-page')).toBeTruthy();
    await waitFor(() =>
      expect(decodeURIComponent(screen.getByTestId('loc').textContent ?? '')).toBe(
        '/',
      ),
    );
  });

  it('returns to Game Day for a preseason connection too', async () => {
    h.loadMock.mockImplementation(async ({ leagueId }: { leagueId: string }) => {
      const league = sleeperLeague(leagueId, { status: 'preseason' } as Partial<League>);
      h.store.set({ league });
      return league;
    });
    renderApp('/settings');
    fireEvent.click(await screen.findByRole('button', { name: 'Load League' }));

    expect(await screen.findByTestId('home-page')).toBeTruthy();
    await waitFor(() =>
      expect(decodeURIComponent(screen.getByTestId('loc').textContent ?? '')).toBe(
        '/',
      ),
    );
  });

  it('leaves the URL alone when the browser has already left the rendered path', async () => {
    h.store.league = sleeperLeague('55');
    renderApp('/awards');
    expect(await screen.findByTestId('awards-page')).toBeTruthy();
    await waitFor(() => expect(window.location.pathname).toBe('/awards'));

    // What an uncommitted navigate() looks like from inside the effect: history
    // is already on the new path while useLocation() still reports the old one.
    // Swapping the league gives the effect a param to want to rewrite.
    window.history.replaceState(null, '', '/teams');
    await act(async () => {
      h.store.set({ league: sleeperLeague('66') });
    });

    expect(window.location.pathname).toBe('/teams');
  });
});



describe('Game Day homepage and Settings', () => {
  it('renders the homepage for a connected league without redirecting to analysis or reporting a false stranded page', async () => {
    h.store.league = sleeperLeague('55');
    renderApp('/');
    expect(await screen.findByTestId('home-page')).toBeInTheDocument();
    expect(screen.getByTestId('loc')).toHaveTextContent(/^\/$/);
    expect(h.loggerError).not.toHaveBeenCalled();
  });
  it('keeps league connections on Settings even when a league is already connected', async () => {
    h.store.league = sleeperLeague('55');
    renderApp('/settings');
    expect(await screen.findByTestId('settings-page')).toBeInTheDocument();
    expect(screen.getByTestId('loc')).toHaveTextContent(/^\/settings$/);
  });
});

it('opens a scoped league Game Day rather than the combined homepage when a league name is followed', async () => {
  renderApp('/game-day?league=sleeper:55&year=2025');
  expect(await screen.findByTestId('league-game-day')).toBeInTheDocument();
  expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
  expect(h.loadMock).toHaveBeenCalledWith(expect.objectContaining({ platform: 'sleeper', leagueId: '55' }));
});

it('opens Recap directly without requiring or adding a league context', async () => {
  renderApp('/recap');
  expect(await screen.findByTestId('recap-page')).toBeInTheDocument();
  expect(screen.getByTestId('loc')).toHaveTextContent('/recap');
});
