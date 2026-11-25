// Simple pictures drawn in code (image names that start with "draw:").
import { useId } from 'react';
import type { ReactNode } from 'react';
import { COLOURS, PALETTE } from './colours';
import type { DrawColour } from './colours';

function PatternDef({ id, colour }: { id: string; colour: DrawColour }) {
  const ink = colour.dark;
  switch (colour.pattern) {
    case 'dots':
      return (
        <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill={colour.fill} />
          <circle cx="8" cy="8" r="3.4" fill="#fff" opacity="0.75" />
        </pattern>
      );
    case 'stripes':
      return (
        <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="14" height="14" fill={colour.fill} />
          <rect width="5" height="14" fill="#fff" opacity="0.6" />
        </pattern>
      );
    case 'waves':
      return (
        <pattern id={id} width="20" height="14" patternUnits="userSpaceOnUse">
          <rect width="20" height="14" fill={colour.fill} />
          <path d="M0 7 Q5 1 10 7 T20 7" fill="none" stroke={ink} strokeWidth="2" opacity="0.55" />
        </pattern>
      );
    case 'checks':
      return (
        <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill={colour.fill} />
          <rect width="8" height="8" fill={ink} opacity="0.45" />
          <rect x="8" y="8" width="8" height="8" fill={ink} opacity="0.45" />
        </pattern>
      );
  }
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg className="drawn" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

const SHIRT = 'M31 14 L15 24 L5 45 L20 53 L27 43 L27 88 L73 88 L73 43 L80 53 L95 45 L85 24 L69 14 Q50 30 31 14 Z';

function Shirt({ colour }: { colour: DrawColour }) {
  const id = useId();
  return (
    <Svg>
      <defs><PatternDef id={id} colour={colour} /></defs>
      <path d={SHIRT} fill={`url(#${id})`} stroke={colour.dark} strokeWidth="4" strokeLinejoin="round" />
    </Svg>
  );
}

/** A square of one colour with its pattern, used on sorting baskets. */
export function Swatch({ colour }: { colour: string }) {
  const id = useId();
  const c = COLOURS[colour] ?? COLOURS.pula;
  return (
    <Svg>
      <defs><PatternDef id={id} colour={c} /></defs>
      <rect x="8" y="8" width="84" height="84" rx="18" fill={`url(#${id})`} stroke={c.dark} strokeWidth="5" />
    </Svg>
  );
}

/** Three small squares of every colour except one ("ibang kulay"). */
export function OtherSwatches({ except }: { except: string }) {
  const id = useId();
  const others = Object.entries(COLOURS).filter(([name]) => name !== except).slice(0, 3);
  const spots = [{ x: 6, y: 8 }, { x: 54, y: 8 }, { x: 30, y: 54 }];
  return (
    <Svg>
      <defs>
        {others.map(([name, c]) => <PatternDef key={name} id={`${id}-${name}`} colour={c} />)}
      </defs>
      {others.map(([name, c], i) => (
        <rect key={name} x={spots[i].x} y={spots[i].y} width="40" height="40" rx="10"
          fill={`url(#${id}-${name})`} stroke={c.dark} strokeWidth="4" />
      ))}
    </Svg>
  );
}

function House() {
  return (
    <Svg>
      <path d="M10 48 L50 14 L90 48 Z" fill={PALETTE.clay} stroke={PALETTE.ink} strokeWidth="4" strokeLinejoin="round" />
      <rect x="20" y="46" width="60" height="42" fill="#f6e2b5" stroke={PALETTE.ink} strokeWidth="4" strokeLinejoin="round" />
      <rect x="42" y="60" width="16" height="28" rx="3" fill="#9a6a3c" stroke={PALETTE.ink} strokeWidth="3" />
      <rect x="62" y="56" width="12" height="12" fill={PALETTE.sky} stroke={PALETTE.ink} strokeWidth="3" />
      <rect x="26" y="56" width="12" height="12" fill={PALETTE.sky} stroke={PALETTE.ink} strokeWidth="3" />
    </Svg>
  );
}

function Center() {
  return (
    <Svg>
      <rect x="10" y="40" width="80" height="48" fill="#fbe9c2" stroke={PALETTE.ink} strokeWidth="4" strokeLinejoin="round" />
      <path d="M6 42 L50 18 L94 42 Z" fill={PALETTE.leaf} stroke={PALETTE.ink} strokeWidth="4" strokeLinejoin="round" />
      <rect x="40" y="58" width="20" height="30" rx="3" fill={PALETTE.clay} stroke={PALETTE.ink} strokeWidth="3" />
      <circle cx="24" cy="62" r="7" fill={PALETTE.corn} stroke={PALETTE.ink} strokeWidth="3" />
      <rect x="68" y="55" width="14" height="14" rx="2" fill={PALETTE.sky} stroke={PALETTE.ink} strokeWidth="3" />
    </Svg>
  );
}

function Farm() {
  return (
    <Svg>
      <rect x="6" y="46" width="88" height="44" rx="8" fill="#b7d68a" stroke={PALETTE.ink} strokeWidth="4" />
      <path d="M12 60 H88 M12 74 H88" stroke={PALETTE.leafDark} strokeWidth="3" strokeDasharray="6 6" />
      <path d="M50 52 V20" stroke={PALETTE.leafDark} strokeWidth="5" strokeLinecap="round" />
      <path d="M50 40 Q32 34 28 20 Q44 22 50 36 Z M50 34 Q68 28 72 14 Q56 16 50 30 Z" fill={PALETTE.leaf} stroke={PALETTE.leafDark} strokeWidth="2.5" />
      <ellipse cx="50" cy="24" rx="7" ry="13" fill={PALETTE.corn} stroke={PALETTE.cornDark} strokeWidth="3" />
    </Svg>
  );
}

function Water() {
  return (
    <Svg>
      <path d="M50 10 C66 34 78 48 78 64 A28 28 0 0 1 22 64 C22 48 34 34 50 10 Z" fill="#8fd0ee" stroke="#2f7ea6" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="40" cy="62" r="7" fill="#fff" opacity="0.8" />
      <circle cx="80" cy="26" r="7" fill="#fff" stroke="#2f7ea6" strokeWidth="3" />
      <circle cx="18" cy="34" r="5" fill="#fff" stroke="#2f7ea6" strokeWidth="3" />
    </Svg>
  );
}

function EngineBadge({ engine }: { engine: string }) {
  const ink = PALETTE.ink;
  switch (engine) {
    case 'tap-and-hear':
      return (
        <Svg>
          <path d="M18 40 H34 L56 22 V78 L34 60 H18 Z" fill={PALETTE.corn} stroke={ink} strokeWidth="5" strokeLinejoin="round" />
          <path d="M66 36 Q76 50 66 64 M76 26 Q92 50 76 74" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" />
        </Svg>
      );
    case 'find-it':
      return (
        <Svg>
          <circle cx="42" cy="42" r="24" fill={PALETTE.sky} stroke={ink} strokeWidth="6" />
          <path d="M60 60 L86 86" stroke={ink} strokeWidth="10" strokeLinecap="round" />
        </Svg>
      );
    case 'match-pairs':
      return (
        <Svg>
          <rect x="10" y="22" width="36" height="56" rx="8" fill={PALETTE.corn} stroke={ink} strokeWidth="5" />
          <rect x="54" y="22" width="36" height="56" rx="8" fill={PALETTE.corn} stroke={ink} strokeWidth="5" />
          <circle cx="28" cy="50" r="8" fill={PALETTE.clay} />
          <circle cx="72" cy="50" r="8" fill={PALETTE.clay} />
        </Svg>
      );
    case 'count':
      return (
        <Svg>
          <rect x="8" y="8" width="84" height="84" rx="16" fill={PALETTE.white} stroke={ink} strokeWidth="5" />
          <circle cx="30" cy="30" r="9" fill={PALETTE.clay} /><circle cx="70" cy="30" r="9" fill={PALETTE.clay} />
          <circle cx="50" cy="50" r="9" fill={PALETTE.clay} />
          <circle cx="30" cy="70" r="9" fill={PALETTE.clay} /><circle cx="70" cy="70" r="9" fill={PALETTE.clay} />
        </Svg>
      );
    case 'puzzle':
      return (
        <Svg>
          <path d="M14 14 H44 Q40 4 50 4 Q60 4 56 14 H86 V44 Q96 40 96 50 Q96 60 86 56 V86 H14 Z"
            fill={PALETTE.sky} stroke={ink} strokeWidth="5" strokeLinejoin="round" />
          <path d="M14 50 H50 V86" fill="none" stroke={ink} strokeWidth="4" strokeDasharray="6 5" />
        </Svg>
      );
    case 'hide-and-find':
      return (
        <Svg>
          <path d="M50 38 Q34 30 34 12 Q46 16 50 34 Z M50 38 Q66 30 66 12 Q54 16 50 34 Z M50 40 Q42 22 50 6 Q58 22 50 40 Z"
            fill={PALETTE.leaf} stroke={PALETTE.leafDark} strokeWidth="3" strokeLinejoin="round" />
          <ellipse cx="50" cy="52" rx="20" ry="14" fill={PALETTE.corn} stroke={PALETTE.cornDark} strokeWidth="4" />
          <circle cx="43" cy="50" r="3.5" fill={ink} /><circle cx="57" cy="50" r="3.5" fill={ink} />
          <path d="M8 92 Q12 54 50 58 Q88 54 92 92 Z" fill={PALETTE.leaf} stroke={PALETTE.leafDark} strokeWidth="5" strokeLinejoin="round" />
        </Svg>
      );
    case 'sing-and-move':
      return (
        <Svg>
          <path d="M40 76 V20 L84 10 V64" fill="none" stroke={ink} strokeWidth="7" strokeLinejoin="round" />
          <ellipse cx="30" cy="76" rx="13" ry="10" fill={PALETTE.clay} stroke={ink} strokeWidth="4" />
          <ellipse cx="74" cy="66" rx="13" ry="10" fill={PALETTE.clay} stroke={ink} strokeWidth="4" />
          <path d="M40 32 L84 22" stroke={ink} strokeWidth="7" />
        </Svg>
      );
    default:
      return (
        <Svg>
          <path d="M14 42 H86 L76 86 H24 Z" fill="#d9a55b" stroke={ink} strokeWidth="5" strokeLinejoin="round" />
          <path d="M26 42 Q50 4 74 42" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" />
          <path d="M22 56 H78 M26 70 H74" stroke={ink} strokeWidth="3" opacity="0.6" />
        </Svg>
      );
  }
}

/** Returns the drawing for a "draw:..." image name, or null if unknown. */
export function Drawn({ image }: { image: string }) {
  const [, kind, value] = image.split(':');
  if (kind === 'kamiseta') return <Shirt colour={COLOURS[value] ?? COLOURS.pula} />;
  if (kind === 'lugar' && value === 'bahay') return <House />;
  if (kind === 'lugar' && value === 'cdc') return <Center />;
  if (kind === 'lugar' && value === 'bukid') return <Farm />;
  if (kind === 'tubig') return <Water />;
  if (kind === 'engine') return <EngineBadge engine={value} />;
  return null;
}

export function Star() {
  return (
    <Svg>
      <path d="M50 8 L62 36 L92 38 L69 58 L77 88 L50 71 L23 88 L31 58 L8 38 L38 36 Z"
        fill={PALETTE.corn} stroke={PALETTE.cornDark} strokeWidth="4" strokeLinejoin="round" />
    </Svg>
  );
}

export function Check() {
  return (
    <Svg>
      <circle cx="50" cy="50" r="44" fill={PALETTE.leaf} stroke={PALETTE.leafDark} strokeWidth="5" />
      <path d="M28 52 L44 68 L74 34" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Arrow({ direction = 'right' }: { direction?: 'right' | 'left' | 'down' }) {
  const rotate = direction === 'left' ? 180 : direction === 'down' ? 90 : 0;
  return (
    <Svg>
      <path d="M14 38 H54 V18 L90 50 L54 82 V62 H14 Z" transform={`rotate(${rotate} 50 50)`}
        fill={PALETTE.leaf} stroke={PALETTE.leafDark} strokeWidth="5" strokeLinejoin="round" />
    </Svg>
  );
}

export function Speaker() {
  return <EngineBadge engine="tap-and-hear" />;
}

export function Basket({ small = false }: { small?: boolean }) {
  return (
    <svg className={`basket-art${small ? ' small' : ''}`} viewBox="0 0 200 110" aria-hidden="true" focusable="false">
      <path d="M12 26 H188 L166 104 H34 Z" fill="#d9a55b" stroke={PALETTE.ink} strokeWidth="6" strokeLinejoin="round" />
      <path d="M22 50 H178 M30 76 H170" stroke={PALETTE.ink} strokeWidth="3" opacity="0.5" />
      <path d="M50 28 L60 102 M90 28 L94 102 M130 28 L122 102 M164 28 L146 102" stroke={PALETTE.ink} strokeWidth="3" opacity="0.35" />
      <rect x="6" y="14" width="188" height="18" rx="9" fill="#e8bd7a" stroke={PALETTE.ink} strokeWidth="6" />
    </svg>
  );
}
