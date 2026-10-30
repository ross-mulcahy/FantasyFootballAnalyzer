import { useEffect, useRef, useState } from 'react';
import { sortMajorEvents, type NFLTimeline, type MajorEvent } from '@/api/nflTimeline';
import { browserAlertsEnabled, browserAlertsSupported, setBrowserAlertsEnabled, useBrowserAlertsEnabled } from '@/utils/browserAlerts';

export function useEventNotifications(key: string, data: NFLTimeline | null, loading: boolean, describeEvent?: (event: MajorEvent) => string) {
  const enabled = useBrowserAlertsEnabled();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => browserAlertsSupported() ? Notification.permission : 'unsupported');
  const [problem, setProblem] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const previous = useRef<{ key: string; ids: Set<string>; enabled: boolean } | null>(null);
  const seenKey = `ffa:notification-seen:${key}`;

  useEffect(() => {
    const update = () => setPermission(browserAlertsSupported() ? Notification.permission : 'unsupported');
    window.addEventListener('focus', update);
    return () => window.removeEventListener('focus', update);
  }, []);

  useEffect(() => {
    if (!data || loading) return;
    const before = previous.current;
    const ids = new Set(before?.key === key ? before.ids : []);
    let saved: string[] = [];
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(seenKey) ?? '[]');
      if (Array.isArray(raw)) saved = raw.filter((id): id is string => typeof id === 'string');
    } catch { /* In-memory deduplication still works. */ }
    const eligible = before?.key === key && before.enabled && enabled && browserAlertsEnabled() && Date.now() - data.fetchedAt < 120000;
    const fresh = sortMajorEvents(data.events).filter(event => !ids.has(event.id) && !saved.includes(event.id));
    for (const event of data.events) ids.add(event.id);
    // Save before delivery so another render (including Strict Mode) cannot replay a batch.
    previous.current = { key, ids, enabled };
    try { localStorage.setItem(seenKey, JSON.stringify([...new Set([...saved, ...ids])].slice(-1000))); } catch { /* Use the in-memory baseline. */ }
    if (!eligible || !fresh.length) return;
    // One alert per polling batch avoids a burst when several games score together.
    const recent = fresh.filter(event => data.games?.some(game => game.id === event.gameId && game.state === 'in') && (!event.occurredAt || Date.now() - Date.parse(event.occurredAt) <= 10 * 60000));
    if (!recent.length) return;
    const latest = recent[0];
    try {
      const notification = new Notification(recent.length === 1 ? `${latest.game} · ${latest.kind}` : `${recent.length} new matchup events`, {
        body: `${describeEvent?.(latest) ?? latest.description}${recent.length > 1 ? ` (+${recent.length - 1} more in the timeline)` : ''}`,
        tag: `ffa-event:${key}:${latest.id}`,
      });
      notification.onclick = () => { window.focus(); notification.close(); };
      setProblem(null);
    } catch { setProblem('This browser could not display an alert. Check its notification settings or try a desktop browser.'); }
  }, [key, data, loading, enabled, seenKey, describeEvent]);

  const toggle = async () => {
    setProblem(null);
    if (enabled) {
      try { setBrowserAlertsEnabled(false); } catch { setProblem('Could not save the alert preference in this browser.'); }
      return;
    }
    if (!browserAlertsSupported()) return;
    setRequesting(true);
    try {
      // Called directly by the button click, as required by browsers.
      const result = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') return;
      const test = new Notification('Game Day alerts enabled', { body: 'New events in this open matchup will appear here.', tag: 'ffa-alerts-enabled' });
      test.onclick = () => { window.focus(); test.close(); };
      setBrowserAlertsEnabled(true);
    } catch { setProblem('Browser alerts could not be enabled. Check notification permissions and browser storage, or try a desktop browser.'); }
    finally { setRequesting(false); }
  };
  return { enabled, permission, problem, requesting, toggle };
}
