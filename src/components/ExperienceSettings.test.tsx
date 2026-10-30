import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ExperienceSettings } from './ExperienceSettings';
import { readExperience } from '@/utils/experience';
import { loadSavedLeagues } from '@/utils/savedLeagues';
const backup = { format: 'ffa-personal-backup', version: 1, createdAt: '2026-10-30T12:00:00Z', leagues: [{ platform: 'espn', leagueId: '123', season: 2026, name: 'Restored League', teamId: '1' }], recaps: [], preferences: { kickoffAlerts: false, alertPriority: 'close' } };
beforeEach(() => localStorage.clear()); afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('saves alert priority and kickoff preference without requesting browser permission', () => {
  render(<ExperienceSettings />);
  fireEvent.change(screen.getByLabelText('Alert priority'), { target: { value: 'impact' } });
  fireEvent.click(screen.getByLabelText('Pre-kickoff lineup checks'));
  expect(readExperience()).toEqual({ kickoffAlerts: false, alertPriority: 'impact' });
});
it('previews a chosen backup and restores only after the explicit restore click', async () => {
  render(<ExperienceSettings />);
  fireEvent.change(screen.getByLabelText('Choose backup file'), { target: { files: [{ size: 100, text: async () => JSON.stringify(backup) }] } });
  await screen.findByRole('button', { name: 'Restore this backup' });
  expect(screen.getByText(/Restored League/)).toBeInTheDocument(); expect(loadSavedLeagues()).toEqual([]);
  fireEvent.click(screen.getByRole('button', { name: 'Restore this backup' }));
  await waitFor(() => expect(loadSavedLeagues()[0].name).toBe('Restored League'));
  expect(screen.queryByRole('button', { name: 'Restore this backup' })).not.toBeInTheDocument();
});
it('does not alter browser data when backup parsing fails', async () => {
  render(<ExperienceSettings />);
  fireEvent.change(screen.getByLabelText('Choose backup file'), { target: { files: [{ size: 10, text: async () => '{bad' }] } });
  expect(await screen.findByRole('status')).toHaveTextContent('valid JSON'); expect(loadSavedLeagues()).toEqual([]);
});
