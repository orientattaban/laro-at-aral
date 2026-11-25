// Engine 9: Puzzle. A picture is cut into 2, 3 or 4 pieces (step 0, 1, 2).
// A faint copy of the whole picture shows where each piece belongs.
// A piece can be dragged to its place, or tapped and then its place tapped.
// A piece dropped in the wrong place wobbles and floats back; after two
// misses its place glows softly.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { content, getItem } from '../content';
import type { ItemActivity } from '../content/types';
import { sfx } from '../core/audio';
import { t } from '../core/i18n';
import { capturePointer, shuffle, wait } from '../core/util';
import type { Rng } from '../core/util';
import { useAlive } from './Card';
import type { EngineProps } from './types';
import { praiseKey } from './types';

export const PUZZLE_PICTURES = 2;

export interface PuzzleShape { cols: number; rows: number }

/** 2 pieces side by side, 3 strips, or 2 by 2. */
export function puzzleShape(step: number): PuzzleShape {
  if (step >= 2) return { cols: 2, rows: 2 };
  if (step >= 1) return { cols: 3, rows: 1 };
  return { cols: 2, rows: 1 };
}

export function trayOrder(count: number, rng: Rng = Math.random): number[] {
  const ids = Array.from({ length: count }, (_, i) => i);
  let order = shuffle(ids, rng);
  // Never start already solved.
  if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]];
  return order;
}

function PieceArt({ src, index, shape }: { src: string; index: number; shape: PuzzleShape }) {
  const col = index % shape.cols;
  const row = Math.floor(index / shape.cols);
  const style: CSSProperties = {
    width: `${shape.cols * 100}%`,
    height: `${shape.rows * 100}%`,
    left: `${-col * 100}%`,
    top: `${-row * 100}%`,
  };
  return <img className="puzzle-art" src={src} alt="" draggable={false} style={style} />;
}

export function Puzzle({ activity, lang, step, itemOrder, speak, report, finish }: EngineProps<ItemActivity>) {
  const shape = puzzleShape(step);
  const count = shape.cols * shape.rows;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pictures = useMemo(() => itemOrder.slice(0, PUZZLE_PICTURES), []);
  const [round, setRound] = useState(0);
  const [tray, setTray] = useState<number[]>(() => trayOrder(count));
  const [placed, setPlaced] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [wobble, setWobble] = useState<number | null>(null);
  const [misses, setMisses] = useState(0);
  const [drag, setDrag] = useState<{ piece: number; x: number; y: number } | null>(null);
  const [done, setDone] = useState(false);
  const busy = useRef(false);
  const dragStart = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const alive = useAlive();

  const item = getItem(pictures[round]);
  const src = content.assets.images[item.image];

  useEffect(() => {
    busy.current = false;
    if (round === 0) void speak(activity.instruction, { pose: 'wave' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const completePicture = async () => {
    busy.current = true;
    setDone(true);
    sfx.correct();
    report({ competencies: activity.competencies, itemId: item.id, firstTry: misses === 0, scored: true });
    await speak(item.text, { picture: item.image, transient: true, pose: 'cheer' });
    await speak(misses === 0 ? praiseKey(round) : 'fb.effort', { transient: true, pose: 'cheer' });
    await wait(500);
    if (!alive.current) return;
    if (round + 1 < pictures.length) {
      setPlaced([]);
      setTray(trayOrder(count));
      setMisses(0);
      setDone(false);
      setRound(round + 1);
    } else {
      finish();
    }
  };

  const tryPlace = async (piece: number, slot: number) => {
    if (busy.current) return;
    setDrag(null);
    setSelected(null);
    if (piece === slot) {
      sfx.flip();
      const next = [...placed, piece];
      setPlaced(next);
      if (next.length === count) await completePicture();
    } else {
      busy.current = true;
      sfx.tryAgain();
      setWobble(piece);
      const nextMisses = misses + 1;
      setMisses(nextMisses);
      await speak(nextMisses >= 2 ? 'fb.look-here' : 'fb.try-again', { transient: true, pose: 'think' });
      if (!alive.current) return;
      setWobble(null);
      busy.current = false;
    }
  };

  const slotAt = (x: number, y: number): number | null => {
    for (let i = 0; i < count; i++) {
      const r = slotRefs.current[i]?.getBoundingClientRect();
      if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i;
    }
    return null;
  };

  const onPointerDown = (piece: number) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (busy.current) return;
    capturePointer(e.currentTarget, e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY, moved: false };
    setDrag({ piece, x: 0, y: 0 });
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current || !drag) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.hypot(dx, dy) > 8) dragStart.current.moved = true;
    setDrag({ ...drag, x: dx, y: dy });
  };
  const onPointerUp = (piece: number) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    const start = dragStart.current;
    dragStart.current = null;
    if (!start) return;
    if (!start.moved) {
      // A tap: choose this piece, then tap its place.
      setDrag(null);
      sfx.tap();
      setSelected(selected === piece ? null : piece);
      return;
    }
    const slot = slotAt(e.clientX, e.clientY);
    if (slot === null || placed.includes(slot)) {
      setDrag(null); // let go outside the board: it floats back
      return;
    }
    void tryPlace(piece, slot);
  };

  // The place that glows after two misses: for the chosen piece, or the first piece left.
  const hintSlot = misses >= 2 && !done ? (selected ?? tray.find((p) => !placed.includes(p)) ?? null) : null;

  return (
    <div className="engine puzzle" data-testid="puzzle" data-round={round} data-pieces={count}>
      <div
        className="puzzle-board"
        style={{ gridTemplateColumns: `repeat(${shape.cols}, 1fr)`, gridTemplateRows: `repeat(${shape.rows}, 1fr)` }}
      >
        {src && <img className="puzzle-ghost" src={src} alt="" draggable={false} />}
        {Array.from({ length: count }, (_, slot) => (
          <div
            key={`${round}-${slot}`}
            ref={(el) => { slotRefs.current[slot] = el; }}
            className={`puzzle-slot${placed.includes(slot) ? ' filled' : ''}${hintSlot === slot ? ' hint' : ''}`}
            data-testid="puzzle-slot"
            data-slot={slot}
            onClick={() => { if (selected !== null && !placed.includes(slot)) void tryPlace(selected, slot); }}
          >
            {placed.includes(slot) && src && (
              <span className="puzzle-piece-art"><PieceArt src={src} index={slot} shape={shape} /></span>
            )}
          </div>
        ))}
      </div>
      <div className={`puzzle-tray n-${count}`}>
        {tray.filter((p) => !placed.includes(p)).map((piece) => {
          const dragging = drag?.piece === piece;
          const style: CSSProperties = {
            aspectRatio: `${shape.rows} / ${shape.cols}`,
            transform: dragging ? `translate(${drag.x}px, ${drag.y}px)` : undefined,
            transition: dragging ? 'none' : 'transform 0.25s ease-out',
            zIndex: dragging ? 5 : undefined,
          };
          return (
            <button
              key={`${round}-${piece}`}
              type="button"
              className={`puzzle-piece${selected === piece ? ' selected' : ''}${wobble === piece ? ' card-wobble' : ''}${hintSlot === piece ? ' card-hint' : ''}`}
              style={style}
              aria-label={`${t(lang, item.text)} ${piece + 1}`}
              data-testid="puzzle-piece"
              data-piece={piece}
              onPointerDown={onPointerDown(piece)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp(piece)}
              onPointerCancel={() => { dragStart.current = null; setDrag(null); }}
            >
              <span className="puzzle-piece-art">{src && <PieceArt src={src} index={piece} shape={shape} />}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
