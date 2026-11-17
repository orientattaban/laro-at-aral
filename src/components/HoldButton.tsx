// A button that only works when held down for three seconds.
// A quick tap by a small child does nothing.
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { capturePointer } from '../core/util';

export const HOLD_SECONDS = 3;

export function HoldButton({
  label, onComplete, children, className = '', seconds = HOLD_SECONDS,
}: {
  label: string;
  onComplete: () => void;
  children: ReactNode;
  className?: string;
  seconds?: number;
}) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };

  const start = () => {
    if (timer.current) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      onComplete();
    }, seconds * 1000);
  };

  useEffect(() => stop, []);

  return (
    <button
      type="button"
      className={`hold-button ${holding ? 'holding' : ''} ${className}`}
      aria-label={label}
      title={label}
      style={{ ['--hold-seconds' as string]: `${seconds}s` }}
      onPointerDown={(e) => { capturePointer(e.currentTarget, e.pointerId); start(); }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg className="hold-ring" viewBox="0 0 100 100" aria-hidden="true">
        <circle className="hold-ring-track" cx="50" cy="50" r="44" />
        <circle className="hold-ring-fill" cx="50" cy="50" r="44" pathLength="100" />
      </svg>
      <span className="hold-content">{children}</span>
    </button>
  );
}

/** A small picture of two grown-ups, used on the parent button. */
export function ParentIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle cx="34" cy="34" r="13" fill="#5b3a22" />
      <path d="M12 84 Q12 54 34 54 Q56 54 56 84 Z" fill="#5b3a22" />
      <circle cx="68" cy="40" r="11" fill="#8a5a36" />
      <path d="M50 84 Q50 58 68 58 Q88 58 88 84 Z" fill="#8a5a36" />
    </svg>
  );
}
