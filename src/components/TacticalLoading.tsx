import { useEffect, useState } from 'react';

const MESSAGES = [
  'Checking hamstring reports…',
  'Calculating garbage time upside…',
  'Scanning the Octobox…',
];

export function TacticalLoading({ label }: { label?: string }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setIndex(value => (value + 1) % MESSAGES.length), 2800);
    return () => window.clearInterval(timer);
  }, []);
  return <span className="tactical-loading" role="status" aria-live="polite"><span className="tactical-loading-mark" aria-hidden="true">▌</span>{label ?? MESSAGES[index]}</span>;
}
