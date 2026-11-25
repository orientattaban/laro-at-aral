// Engine 5: Count. A few of one thing appear. The child taps each one and hears
// it counted ("isa, dalawa, tatlo..."), then picks how many there are.
// Each number button shows the numeral AND that many dots, so no reading is needed.
// Step 0: counts of 1 to 3 with two choices. Step 1: counts up to the content's
// "max" (5 at Level 1) with three choices. Never more than four choices.
import { useEffect, useMemo, useRef, useState } from 'react';
import { getItem } from '../content';
import type { CountActivity } from '../content/types';
import { Picture } from '../components/Picture';
import { sfx } from '../core/audio';
import { t } from '../core/i18n';
import { shuffle, wait } from '../core/util';
import type { Rng } from '../core/util';
import { useAlive } from './Card';
import type { EngineProps } from './types';
import { MAX_CHOICES_YOUNG, praiseKey } from './types';

export const COUNT_ROUNDS = 4;

export interface CountRound {
  itemId: string;
  amount: number;
  choices: number[];
}

export function countRange(step: number, max: number): number {
  return step >= 1 ? max : Math.min(3, max);
}

export function countChoiceCount(step: number, maxChoices: number): number {
  return Math.min(MAX_CHOICES_YOUNG, maxChoices, step >= 1 ? 3 : 2);
}

export function buildCountRounds(
  items: string[], step: number, max: number, maxChoices: number, rounds = COUNT_ROUNDS, rng: Rng = Math.random,
): CountRound[] {
  const top = countRange(step, max);
  const nChoices = countChoiceCount(step, maxChoices);
  const order = shuffle(items, rng);
  const out: CountRound[] = [];
  let last = 0;
  for (let r = 0; r < rounds; r++) {
    let amount = 1 + Math.floor(rng() * top);
    if (amount === last) amount = (amount % top) + 1; // never the same number twice in a row
    last = amount;
    const others = shuffle(Array.from({ length: top }, (_, i) => i + 1).filter((n) => n !== amount), rng)
      .slice(0, nChoices - 1);
    out.push({ itemId: order[r % order.length], amount, choices: [amount, ...others].sort((a, b) => a - b) });
  }
  return out;
}

function Dots({ n }: { n: number }) {
  return (
    <span className="count-dots" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <i key={i} />)}
    </span>
  );
}

export function Count({ activity, lang, step, maxChoices, speak, report, finish }: EngineProps<CountActivity>) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rounds = useMemo(() => buildCountRounds(activity.items, step, activity.max, maxChoices), []);
  const [index, setIndex] = useState(0);
  const [tapped, setTapped] = useState<number[]>([]);
  const [tries, setTries] = useState(0);
  const [wobble, setWobble] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const busy = useRef(false);
  const alive = useAlive();
  const round = rounds[index];
  const item = getItem(round.itemId);
  const name = t(lang, item.text);
  const counted = tapped.length === round.amount;

  useEffect(() => {
    busy.current = false;
    void speak(activity.instruction, { pose: 'wave' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const tapObject = (i: number) => {
    if (tapped.includes(i) || solved) return;
    sfx.tap();
    const next = [...tapped, i];
    setTapped(next);
    void speak(`num.${next.length}`, { transient: next.length < round.amount, pose: 'cheer' }).then(() => {
      if (alive.current && next.length === round.amount) void speak('instr.count.ask', { pose: 'think' });
    });
  };

  const choose = async (n: number) => {
    if (busy.current || solved || !counted) return;
    busy.current = true;
    if (n === round.amount) {
      const firstTry = tries === 0;
      setSolved(true);
      sfx.correct();
      report({ competencies: activity.competencies, itemId: round.itemId, firstTry, scored: true });
      await speak(`num.${n}`, { transient: true, pose: 'cheer' });
      await speak(firstTry ? praiseKey(index) : 'fb.effort', { transient: true, pose: 'cheer' });
      await wait(300);
      if (!alive.current) return;
      if (index + 1 < rounds.length) {
        setTapped([]);
        setTries(0);
        setSolved(false);
        setIndex(index + 1); // the effect above unlocks taps once the new round is on screen
      } else {
        finish();
      }
    } else {
      const nextTries = tries + 1;
      sfx.tryAgain();
      setWobble(n);
      setTries(nextTries);
      await speak(nextTries >= 2 ? 'fb.look-here' : 'fb.try-again', { transient: true, pose: 'think' });
      if (!alive.current) return;
      setWobble(null);
      busy.current = false;
    }
  };

  return (
    <div className="engine count" data-testid="count" data-amount={round.amount} data-round={index}>
      <div className={`count-objects n-${round.amount}`}>
        {Array.from({ length: round.amount }, (_, i) => {
          const order = tapped.indexOf(i);
          return (
            <button
              key={`${index}-${i}`}
              type="button"
              className={`count-object${order >= 0 ? ' counted' : ''}`}
              aria-label={order >= 0 ? `${name} ${order + 1}` : name}
              data-testid="count-object"
              onClick={() => tapObject(i)}
            >
              <Picture image={item.image} label={name} />
              {order >= 0 && <span className="count-badge">{order + 1}</span>}
            </button>
          );
        })}
      </div>
      <div className={`count-choices${counted ? ' ready' : ''}`} aria-hidden={!counted}>
        {round.choices.map((n) => (
          <button
            key={`${index}-${n}`}
            type="button"
            className={`count-choice${wobble === n ? ' card-wobble' : ''}${solved && n === round.amount ? ' card-correct' : ''}${!solved && tries >= 2 && n === round.amount ? ' card-hint' : ''}`}
            aria-label={t(lang, `num.${n}`)}
            data-testid="count-choice"
            data-value={n}
            disabled={!counted}
            onClick={() => void choose(n)}
          >
            <span className="count-numeral">{n}</span>
            <Dots n={n} />
          </button>
        ))}
      </div>
    </div>
  );
}
