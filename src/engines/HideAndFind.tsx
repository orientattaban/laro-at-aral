// Stage A game: Butil hides behind one of two pictures (three at the harder step)
// while the child watches, then the child taps where he went.
// LRP 2 p.8: "Enjoy hide and seek or a game of searching for a toy (object permanence)".
// A wrong tap: the picture wobbles and Butil says he is not there. After two
// misses, the tip of his leaf peeks out above the right picture.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { getItem } from '../content';
import type { ItemActivity } from '../content/types';
import { Butil } from '../components/Butil';
import { Picture } from '../components/Picture';
import { sfx } from '../core/audio';
import { t } from '../core/i18n';
import { shuffle, wait } from '../core/util';
import type { Rng } from '../core/util';
import { useAlive } from './Card';
import type { EngineProps } from './types';
import { MAX_CHOICES_YOUNG, praiseKey } from './types';

export const HIDE_ROUNDS = 4;
/** How long Butil takes to walk behind a picture. Tests may shorten it. */
export const HIDE_TIMING = { walkMs: 1300, pauseMs: 500 };

export interface HideRound { spots: string[]; hiddenAt: number }

export function hideSpotCount(step: number, maxChoices: number): number {
  return Math.max(2, Math.min(MAX_CHOICES_YOUNG, maxChoices, 2 + step, 3));
}

export function buildHideRounds(items: string[], spots: number, rounds = HIDE_ROUNDS, rng: Rng = Math.random): HideRound[] {
  const out: HideRound[] = [];
  let last = -1;
  for (let r = 0; r < rounds; r++) {
    let hiddenAt = Math.floor(rng() * spots);
    if (hiddenAt === last && rng() < 0.7) hiddenAt = (hiddenAt + 1) % spots; // mostly avoid the same place twice
    last = hiddenAt;
    out.push({ spots: shuffle(items, rng).slice(0, spots), hiddenAt });
  }
  return out;
}

type Phase = 'show' | 'hiding' | 'seek' | 'found';

function Leaf() {
  return (
    <svg viewBox="0 0 60 40" aria-hidden="true" focusable="false">
      <path d="M30 40 Q14 34 12 12 Q26 16 30 36 Z M30 40 Q46 34 48 12 Q34 16 30 36 Z M30 40 Q22 18 30 2 Q38 18 30 40 Z"
        fill="#5a9e4b" stroke="#356b2d" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

export function HideAndFind({ activity, lang, step, maxChoices, speak, report, finish }: EngineProps<ItemActivity>) {
  const spotsN = hideSpotCount(step, maxChoices);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rounds = useMemo(() => buildHideRounds(activity.items, spotsN), []);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('show');
  const [tries, setTries] = useState(0);
  const [wobble, setWobble] = useState<number | null>(null);
  const busy = useRef(true);
  const alive = useAlive();
  const round = rounds[index];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      busy.current = true;
      setPhase('show');
      await speak(index === 0 ? activity.instruction : 'instr.hide', { pose: 'wave' });
      await wait(HIDE_TIMING.pauseMs);
      if (cancelled || !alive.current) return;
      setPhase('hiding');
      await wait(HIDE_TIMING.walkMs);
      if (cancelled || !alive.current) return;
      setPhase('seek');
      busy.current = false;
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const tap = async (i: number) => {
    if (busy.current || phase !== 'seek') return;
    busy.current = true;
    if (i === round.hiddenAt) {
      const firstTry = tries === 0;
      setPhase('found');
      sfx.correct();
      report({ competencies: activity.competencies, firstTry, scored: true });
      await speak('hide.found', { transient: true, pose: 'cheer' });
      await speak(firstTry ? praiseKey(index) : 'fb.effort', { transient: true, pose: 'cheer' });
      await wait(400);
      if (!alive.current) return;
      if (index + 1 < rounds.length) {
        setTries(0);
        setIndex(index + 1);
      } else {
        finish();
      }
    } else {
      const nextTries = tries + 1;
      sfx.tryAgain();
      setWobble(i);
      setTries(nextTries);
      await speak(nextTries >= 2 ? 'fb.look-here' : 'hide.not-here', { transient: true, pose: 'think' });
      if (!alive.current) return;
      setWobble(null);
      busy.current = false;
    }
  };

  // Butil's position, as a share of the stage. The spots sit in a row along the bottom.
  const spotCentre = (i: number) => ((i + 0.5) / spotsN) * 100;
  const butilStyle: CSSProperties =
    phase === 'show'
      ? { left: '50%', top: '0%' }
      : phase === 'found'
        ? { left: `${spotCentre(round.hiddenAt)}%`, top: '0%' }
        : { left: `${spotCentre(round.hiddenAt)}%`, top: '38%' };
  const hidden = phase === 'hiding' || phase === 'seek';

  return (
    <div className="engine hide" data-testid="hide" data-phase={phase} data-hidden={hidden ? round.hiddenAt : undefined}>
      <div className="hide-stage">
        <div className={`hide-butil${hidden ? ' behind' : ''}`} style={butilStyle} aria-hidden="true">
          <Butil pose={phase === 'found' ? 'cheer' : 'wave'} />
        </div>
        <div className={`hide-spots count-${spotsN}`}>
          {round.spots.map((id, i) => {
            const item = getItem(id);
            const name = t(lang, item.text);
            const hint = phase === 'seek' && tries >= 2 && i === round.hiddenAt;
            return (
              <button
                key={`${index}-${i}`}
                type="button"
                className={`hide-spot${wobble === i ? ' card-wobble' : ''}${hint ? ' card-hint' : ''}`}
                aria-label={name}
                data-testid="hide-spot"
                data-spot={i}
                onClick={() => void tap(i)}
              >
                {hint && <span className="hide-leaf"><Leaf /></span>}
                <Picture image={item.image} label={name} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
