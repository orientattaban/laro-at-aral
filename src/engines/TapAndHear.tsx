// Engine 1: Tap and hear. Picture cards that say their name.
// There is no right or wrong here. Two cards at a time at Stage A, four at Stage B.
import { useEffect, useMemo, useState } from 'react';
import { getItem } from '../content';
import type { ItemActivity } from '../content/types';
import { sfx } from '../core/audio';
import { t } from '../core/i18n';
import { chunk } from '../core/util';
import { Arrow } from '../draw/Drawn';
import { Card, useAlive } from './Card';
import type { EngineProps } from './types';
import { MAX_CHOICES_YOUNG } from './types';

export function cardsPerPage(stage: string, maxChoices: number): number {
  return Math.min(MAX_CHOICES_YOUNG, maxChoices, stage === 'A' ? 2 : 4);
}

export function TapAndHear({ activity, lang, stage, maxChoices, captions, speak, report, finish }: EngineProps<ItemActivity>) {
  const pages = useMemo(
    () => chunk(activity.items, cardsPerPage(stage, maxChoices)),
    [activity, stage, maxChoices],
  );
  const [page, setPage] = useState(0);
  const [heard, setHeard] = useState<Set<string>>(new Set());
  const [bouncing, setBouncing] = useState<string | null>(null);
  const alive = useAlive();

  useEffect(() => {
    void speak(activity.instruction, { pose: 'wave' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = pages[page];
  const allHeard = items.every((id) => heard.has(id));
  const last = page === pages.length - 1;

  const tap = (id: string) => {
    sfx.tap();
    setBouncing(id);
    if (!heard.has(id)) {
      report({ competencies: activity.competencies, itemId: id, firstTry: true, scored: false });
      setHeard((old) => new Set(old).add(id));
    }
    const item = getItem(id);
    void speak(item.text, { picture: item.image, transient: true, pose: 'idle' }).then(() => {
      if (alive.current) setBouncing((current) => (current === id ? null : current));
    });
  };

  const next = () => {
    sfx.tap();
    if (last) finish();
    else setPage(page + 1);
  };

  return (
    <div className="engine tap-and-hear">
      <div className={`card-row count-${items.length}`}>
        {items.map((id) => (
          <Card
            key={id}
            itemId={id}
            lang={lang}
            caption={captions}
            state={bouncing === id ? 'bounce' : 'idle'}
            onTap={() => tap(id)}
            testId="tap-card"
          />
        ))}
      </div>
      <button
        type="button"
        className={`next-button${allHeard ? ' ready' : ''}`}
        aria-label={t(lang, 'ui.next')}
        data-testid="next"
        disabled={!allHeard}
        onClick={next}
      >
        <Arrow />
      </button>
    </div>
  );
}
