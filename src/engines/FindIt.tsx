// Engine 2: Find it. Butil asks for a picture; the child taps it.
// Two pictures at Stage A. At Stage B it grows to three, then four.
// A wrong answer wobbles gently and Butil says "try again".
// After two tries the right answer is softly pointed out.
import { useEffect, useMemo, useRef, useState } from 'react';
import { getItem } from '../content';
import type { ItemActivity } from '../content/types';
import { sfx } from '../core/audio';
import { shuffle, wait } from '../core/util';
import type { Rng } from '../core/util';
import { Card, useAlive } from './Card';
import type { CardState } from './Card';
import type { EngineProps } from './types';
import { MAX_CHOICES_YOUNG, praiseKey } from './types';

export const FIND_IT_TRIALS = 4;

export interface FindItTrial {
  target: string;
  choices: string[];
}

export function findItChoiceCount(level: number, maxChoices: number, step: number, poolSize: number): number {
  const cap = level <= 2 ? Math.min(MAX_CHOICES_YOUNG, maxChoices) : maxChoices;
  return Math.max(2, Math.min(cap, 2 + step, poolSize));
}

export function buildFindItTrials(
  targets: string[], pool: string[], choiceCount: number, trials: number, rng: Rng = Math.random,
): FindItTrial[] {
  return targets.slice(0, trials).map((target) => {
    const distractors = shuffle(pool.filter((id) => id !== target), rng).slice(0, choiceCount - 1);
    return { target, choices: shuffle([target, ...distractors], rng) };
  });
}

export function FindIt({
  activity, lang, step, maxChoices, itemOrder, reviewExtras, speak, report, finish,
}: EngineProps<ItemActivity>) {
  const trials = useMemo(() => {
    const count = findItChoiceCount(activity.level, maxChoices, step, activity.items.length);
    return buildFindItTrials([...reviewExtras, ...itemOrder], activity.items, count, FIND_IT_TRIALS);
    // Built once per play so the cards do not jump around.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [index, setIndex] = useState(0);
  const [tries, setTries] = useState(0);
  const [wobble, setWobble] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const busy = useRef(false);
  const alive = useAlive();
  const trial = trials[index];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      busy.current = true;
      if (index === 0) await speak(activity.instruction, { pose: 'wave' });
      if (cancelled) return;
      busy.current = false;
      const target = getItem(trial.target);
      await speak(`${target.text}.find`, { pictureIfSilent: target.image, pose: 'wave' });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const tap = async (id: string) => {
    if (busy.current || solved) return;
    busy.current = true;
    if (id === trial.target) {
      const firstTry = tries === 0;
      setSolved(true);
      sfx.correct();
      report({ competencies: activity.competencies, itemId: trial.target, firstTry, scored: true });
      await speak(firstTry ? praiseKey(index) : 'fb.effort', { transient: true, pose: 'cheer' });
      await wait(300);
      if (!alive.current) return;
      if (index + 1 < trials.length) {
        setTries(0);
        setSolved(false);
        setIndex(index + 1);
      } else {
        finish();
      }
    } else {
      const nextTries = tries + 1;
      sfx.tryAgain();
      setWobble(id);
      setTries(nextTries);
      await speak(nextTries >= 2 ? 'fb.look-here' : 'fb.try-again', { transient: true, pose: 'think' });
      if (!alive.current) return;
      setWobble(null);
      busy.current = false;
    }
  };

  const stateOf = (id: string): CardState => {
    if (solved && id === trial.target) return 'correct';
    if (wobble === id) return 'wobble';
    if (!solved && tries >= 2 && id === trial.target) return 'hint';
    return 'idle';
  };

  return (
    <div className="engine find-it">
      <div className={`card-row count-${trial.choices.length}`} data-testid="choices" data-target={trial.target}>
        {trial.choices.map((id) => (
          <Card
            key={`${index}-${id}`}
            itemId={id}
            lang={lang}
            // Never write the word under the choices: it would give the answer away.
            caption={false}
            state={stateOf(id)}
            onTap={() => void tap(id)}
            testId="choice"
          />
        ))}
      </div>
    </div>
  );
}
