import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MatchupPanel } from './MatchupPanel';

afterEach(cleanup);

function LiveContent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(value => value + 1)}>Live count {count}</button>;
}

it('opens the same live panel in a dialog and returns focus on Escape', () => {
  render(<MatchupPanel title="ROOTING CONFLICTS" panelKey="popout-test" popout><LiveContent /></MatchupPanel>);
  const open = screen.getByRole('button', { name: 'Open ROOTING CONFLICTS in pop-up' });
  fireEvent.click(screen.getByRole('button', { name: 'Live count 0' }));
  fireEvent.click(open);
  expect(screen.getByRole('dialog', { name: 'ROOTING CONFLICTS' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Live count 1' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Close ROOTING CONFLICTS pop-up' })).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Live count 1' })).toBeInTheDocument();
  expect(open).toHaveFocus();
});
