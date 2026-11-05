import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
/** Contextual controls share the dock; standalone renders retain an inline fallback. */
export function WorkspaceControls({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => { setTarget(document.getElementById('workspace-controls')); }, []);
  return target ? createPortal(children, target) : <>{children}</>;
}
