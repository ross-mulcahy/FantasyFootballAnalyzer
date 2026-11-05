import type { Platform } from '@/types';

// Keep saved leagues and provider data intact while new connections are paused.
export const leagueConnectorEnabled = (platform: Platform): boolean => platform === 'sleeper';
