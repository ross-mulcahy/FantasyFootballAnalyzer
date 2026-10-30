import { useSyncExternalStore } from 'react';

export const BROWSER_ALERTS_KEY = 'ffa:browser-event-alerts:v1';
const changed = 'ffa-browser-alerts-changed';
export const browserAlertsSupported = () => typeof Notification !== 'undefined' && window.isSecureContext !== false;
export function browserAlertsEnabled(): boolean {
  try { return browserAlertsSupported() && Notification.permission === 'granted' && localStorage.getItem(BROWSER_ALERTS_KEY) === 'enabled'; }
  catch { return false; }
}
export function setBrowserAlertsEnabled(enabled: boolean) {
  localStorage.setItem(BROWSER_ALERTS_KEY, enabled ? 'enabled' : 'disabled');
  window.dispatchEvent(new Event(changed));
}
function subscribe(callback: () => void) {
  window.addEventListener(changed, callback);
  window.addEventListener('storage', callback);
  window.addEventListener('focus', callback);
  return () => {
    window.removeEventListener(changed, callback);
    window.removeEventListener('storage', callback);
    window.removeEventListener('focus', callback);
  };
}
export function useBrowserAlertsEnabled() {
  return useSyncExternalStore(subscribe, browserAlertsEnabled, () => false);
}
