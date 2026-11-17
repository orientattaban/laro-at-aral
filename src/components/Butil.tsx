// Butil, the corn-kernel mascot who gives instructions.
// Drawn in code for now. When Phase 2 processes the real poses
// (char-butil-cheer, char-butil-think, char-butil-wave), those are used instead.
// Butil always has his leaf.
import { content } from '../content';

export type Pose = 'idle' | 'wave' | 'think' | 'cheer';

const REAL: Record<Pose, string> = {
  idle: 'char-butil-stand',
  wave: 'char-butil-wave',
  think: 'char-butil-think',
  cheer: 'char-butil-cheer',
};

const BODY = '#f6b73c';
const EDGE = '#b9772a';
const LEAF = '#5a9e4b';
const LEAF_EDGE = '#356b2d';
const INK = '#5b3a22';

function Arms({ pose }: { pose: Pose }) {
  const arm = { fill: 'none', stroke: EDGE, strokeWidth: 9, strokeLinecap: 'round' as const };
  if (pose === 'cheer') {
    return (
      <>
        <path d="M22 78 Q6 62 10 44" {...arm} />
        <path d="M98 78 Q114 62 110 44" {...arm} />
      </>
    );
  }
  if (pose === 'wave') {
    return (
      <>
        <path d="M22 84 Q10 94 12 106" {...arm} />
        <path className="butil-wave-arm" d="M98 78 Q114 64 108 46" {...arm} />
      </>
    );
  }
  if (pose === 'think') {
    return (
      <>
        <path d="M22 84 Q10 94 12 106" {...arm} />
        <path d="M98 96 Q96 110 74 104" {...arm} />
      </>
    );
  }
  return (
    <>
      <path d="M22 84 Q10 94 12 106" {...arm} />
      <path d="M98 84 Q110 94 108 106" {...arm} />
    </>
  );
}

function Face({ pose }: { pose: Pose }) {
  if (pose === 'cheer') {
    return (
      <>
        <path d="M38 72 Q45 64 52 72 M68 72 Q75 64 82 72" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <path d="M46 86 Q60 102 74 86 Z" fill="#fff" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      </>
    );
  }
  const look = pose === 'think' ? 2.5 : 0;
  return (
    <>
      <circle cx="45" cy="72" r="8" fill="#fff" stroke={INK} strokeWidth="2" />
      <circle cx="75" cy="72" r="8" fill="#fff" stroke={INK} strokeWidth="2" />
      <circle cx={45 + look} cy={72 - look} r="4.5" fill={INK} />
      <circle cx={75 + look} cy={72 - look} r="4.5" fill={INK} />
      {pose === 'think'
        ? <path d="M54 92 Q60 89 66 92" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        : <path d="M50 88 Q60 97 70 88" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />}
    </>
  );
}

export function Butil({ pose = 'idle' }: { pose?: Pose }) {
  const real = content.assets.images[REAL[pose]] ?? content.assets.images[REAL.idle];
  if (real) {
    return <img className={`butil butil-${pose}`} src={real} alt="" draggable={false} />;
  }
  return (
    <svg className={`butil butil-${pose}`} viewBox="0 0 120 150" aria-hidden="true" focusable="false">
      {/* legs */}
      <rect x="40" y="122" width="14" height="22" rx="7" fill={BODY} stroke={EDGE} strokeWidth="4" />
      <rect x="66" y="122" width="14" height="22" rx="7" fill={BODY} stroke={EDGE} strokeWidth="4" />
      <Arms pose={pose} />
      {/* the leaf: three small leaves on top */}
      <path d="M60 36 Q40 30 38 10 Q56 14 60 34 Z" fill={LEAF} stroke={LEAF_EDGE} strokeWidth="3" strokeLinejoin="round" />
      <path d="M60 36 Q80 30 82 10 Q64 14 60 34 Z" fill={LEAF} stroke={LEAF_EDGE} strokeWidth="3" strokeLinejoin="round" />
      <path d="M60 38 Q50 18 60 4 Q70 18 60 38 Z" fill={LEAF} stroke={LEAF_EDGE} strokeWidth="3" strokeLinejoin="round" />
      {/* body */}
      <path d="M60 34 C90 34 102 48 102 78 C102 110 86 130 60 130 C34 130 18 110 18 78 C18 48 30 34 60 34 Z"
        fill={BODY} stroke={EDGE} strokeWidth="4" />
      <ellipse cx="42" cy="54" rx="12" ry="7" fill="#fff" opacity="0.35" transform="rotate(-24 42 54)" />
      <Face pose={pose} />
    </svg>
  );
}
