import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { StudioMonitorFrame } from './StudioMonitorFrame';
import { StudioTeleprompterBar } from './StudioTeleprompterBar';
afterEach(cleanup);
it('minimises the screen while retaining channel chrome and reports state', () => {
  const onMinimise = vi.fn();
  render(<StudioMonitorFrame title="TAPE ROOM" channelCode="TAPE 01" badge="LIVE" onMinimise={onMinimise}><button>Playback</button></StudioMonitorFrame>);
  fireEvent.click(screen.getByRole('button', { name: 'Minimise TAPE ROOM' }));
  expect(screen.queryByRole('button', { name: 'Playback' })).not.toBeInTheDocument();
  expect(screen.getByText('TAPE 01')).toBeVisible();
  expect(onMinimise).toHaveBeenLastCalledWith(true);
  fireEvent.click(screen.getByRole('button', { name: 'Expand TAPE ROOM' }));
  expect(screen.getByRole('button', { name: 'Playback' })).toBeVisible();
  expect(onMinimise).toHaveBeenLastCalledWith(false);
});
it('cycles takes and resets to the first take when page context changes', () => {
  const { rerender } = render(<StudioTeleprompterBar takes={['First page take', 'Second page take']} />);
  fireEvent.click(screen.getByRole('button', { name: 'NEXT TAKE' }));
  expect(screen.getByRole('status')).toHaveTextContent('Second page take');
  rerender(<StudioTeleprompterBar takes={['New team take', 'New follow-up']} />);
  expect(screen.getByRole('status')).toHaveTextContent('New team take');
});
