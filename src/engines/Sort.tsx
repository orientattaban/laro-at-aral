// Engine 4: Sort. One thing at a time is dragged (or tapped) into a basket.
// The sorting rule can change mid-game: each "round" in the content file has
// its own rule, and Butil announces the new one.
// Difficulty: step 0 sorts four things per round, step 1 sorts all of them.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { getItem } from '../content';
import type { BasketCue, Lang, SortActivity, SortEntry, SortRound } from '../content/types';
import { Picture } from '../components/Picture';
import { sfx } from '../core/audio';
import { t } from '../core/i18n';
import { capturePointer, wait } from '../core/util';
import { Arrow, Basket, Drawn, OtherSwatches, Swatch } from '../draw/Drawn';
import { useAlive } from './Card';
import type { EngineProps } from './types';
import { praiseKey } from './types';

export const SORT_ENTRIES_EASY = 4;

export function entriesForStep(round: SortRound, step: number): SortEntry[] {
  return step >= 1 ? round.entries : round.entries.slice(0, SORT_ENTRIES_EASY);
}

function Cue({ cue, lang }: { cue: BasketCue; lang: Lang }) {
  switch (cue.kind) {
    case 'item': {
      const item = getItem(cue.item);
      return <Picture image={item.image} label={t(lang, item.text)} />;
    }
    case 'draw':
      return <span className="pic pic-drawn"><Drawn image={cue.image} /></span>;
    case 'colour':
      return <span className="pic pic-drawn"><Swatch colour={cue.value} /></span>;
    case 'other-colours':
      return <span className="pic pic-drawn"><OtherSwatches except={cue.value} /></span>;
    case 'size':
      return null; // the basket itself is drawn big or small
  }
}

export function Sort({ activity, lang, step, captions, speak, report, finish }: EngineProps<SortActivity>) {
  const plan = useMemo(
    () => activity.rounds.map((round) => ({ round, entries: entriesForStep(round, step) })),
    [activity, step],
  );
  const [roundIndex, setRoundIndex] = useState(0);
  const [entryIndex, setEntryIndex] = useState(0);
  const [tries, setTries] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [wobbleBasket, setWobbleBasket] = useState<string | null>(null);
  const [landed, setLanded] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const busy = useRef(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const basketRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const alive = useAlive();

  const { round, entries } = plan[roundIndex];
  const entry = entries[entryIndex];
  const item = getItem(entry.item);
  const competencies = [round.competency ?? activity.competencies[0]];

  useEffect(() => {
    setCounts({});
    void speak(round.instruction, { pose: 'wave' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex]);

  // A new thing to sort is on screen: taps count again.
  useEffect(() => {
    busy.current = false;
  }, [roundIndex, entryIndex]);

  const place = async (basketId: string) => {
    if (busy.current) return;
    busy.current = true;
    setDrag(null);
    if (basketId === entry.basket) {
      const firstTry = tries === 0;
      sfx.correct();
      setLanded(basketId);
      setCounts((c) => ({ ...c, [basketId]: (c[basketId] ?? 0) + 1 }));
      report({ competencies, firstTry, scored: true });
      const basket = round.baskets.find((b) => b.id === basketId)!;
      await speak(basket.label, { transient: true, pose: 'cheer' });
      if (!alive.current) return;
      setLanded(null);
      setTries(0);
      if (entryIndex + 1 < entries.length) {
        setEntryIndex(entryIndex + 1);
      } else {
        await speak(firstTry ? praiseKey(roundIndex) : 'fb.effort', { transient: true, pose: 'cheer' });
        await wait(300);
        if (!alive.current) return;
        if (roundIndex + 1 < plan.length) {
          setEntryIndex(0);
          setRoundIndex(roundIndex + 1);
        } else {
          finish();
          return;
        }
      }
      // Stay locked until the next thing is on screen (released by the effect below),
      // so a quick second tap cannot count twice for the thing just placed.
    } else {
      const nextTries = tries + 1;
      sfx.tryAgain();
      setWobbleBasket(basketId);
      setTries(nextTries);
      await speak(nextTries >= 2 ? 'fb.look-here' : 'fb.try-again', { transient: true, pose: 'think' });
      if (!alive.current) return;
      setWobbleBasket(null);
      busy.current = false;
    }
  };

  const basketAt = (x: number, y: number): string | null => {
    for (const basket of round.baskets) {
      const rect = basketRefs.current[basket.id]?.getBoundingClientRect();
      if (rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return basket.id;
    }
    return null;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (busy.current) return;
    capturePointer(e.currentTarget, e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0 });
    sfx.tap();
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    setDrag({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    dragStart.current = null;
    const target = basketAt(e.clientX, e.clientY);
    if (target) void place(target);
    else setDrag(null); // let go outside a basket: it simply floats back
  };

  const scale = entry.variant === 'maliit' ? 0.5 : 1;
  const itemStyle: CSSProperties = {
    transform: `translate(${drag?.x ?? 0}px, ${drag?.y ?? 0}px) scale(${landed ? scale * 0.3 : scale})`,
    transition: drag ? 'none' : 'transform 0.25s ease-out, opacity 0.25s',
    opacity: landed ? 0 : 1,
  };

  return (
    <div className="engine sort" data-testid="sort" data-answer={entry.basket} data-rule={round.rule}>
      <div className="sort-stage">
        <div
          className="sort-item"
          style={itemStyle}
          data-testid="sort-item"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { dragStart.current = null; setDrag(null); }}
        >
          <Picture image={item.image} label={t(lang, item.text)} />
        </div>
      </div>
      <div className={`basket-row count-${round.baskets.length}`}>
        {round.baskets.map((basket) => {
          const small = basket.cue.kind === 'size' && basket.cue.value === 'maliit';
          const hint = tries >= 2 && basket.id === entry.basket && !landed;
          return (
            <button
              key={`${roundIndex}-${basket.id}`}
              type="button"
              ref={(el) => { basketRefs.current[basket.id] = el; }}
              className={`basket${wobbleBasket === basket.id ? ' basket-wobble' : ''}${hint ? ' basket-hint' : ''}${landed === basket.id ? ' basket-landed' : ''}`}
              aria-label={t(lang, basket.label)}
              data-testid="basket"
              data-basket={basket.id}
              onClick={() => void place(basket.id)}
            >
              {hint && <span className="card-pointer"><Arrow direction="down" /></span>}
              <span className="basket-cue"><Cue cue={basket.cue} lang={lang} /></span>
              <Basket small={small} />
              {captions && <span className="basket-caption">{t(lang, basket.label)}</span>}
              <span className="basket-count" aria-hidden="true">
                {Array.from({ length: counts[basket.id] ?? 0 }, (_, i) => <i key={i} />)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
