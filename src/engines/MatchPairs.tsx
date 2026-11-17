// Engine 3: Match pairs. Four cards, two pairs (never more at Level 1).
// Step 0: the cards are face up; tap the two that are the same.
// Step 1: the cards are face down, like a memory game.
// After two mismatches, the partner of a chosen card is softly pointed out.
import { useEffect, useMemo, useRef, useState } from 'react';
import { getItem } from '../content';
import type { ItemActivity } from '../content/types';
import { sfx } from '../core/audio';
import { shuffle, wait } from '../core/util';
import type { Rng } from '../core/util';
import { Card, useAlive } from './Card';
import type { CardState } from './Card';
import type { EngineProps } from './types';
import { praiseKey } from './types';

export const PAIRS_PER_ROUND = 2;
export const MATCH_ROUNDS = 2;

export interface MatchCard {
  key: string;
  itemId: string;
}

export function buildMatchRounds(order: string[], rounds: number, rng: Rng = Math.random): MatchCard[][] {
  const out: MatchCard[][] = [];
  for (let r = 0; r < rounds; r++) {
    const pair = order.slice(r * PAIRS_PER_ROUND, r * PAIRS_PER_ROUND + PAIRS_PER_ROUND);
    if (pair.length < PAIRS_PER_ROUND) break;
    const cards = pair.flatMap((itemId) => [
      { key: `${r}-${itemId}-a`, itemId },
      { key: `${r}-${itemId}-b`, itemId },
    ]);
    out.push(shuffle(cards, rng));
  }
  return out;
}

export function MatchPairs({ activity, lang, step, captions, itemOrder, speak, report, finish }: EngineProps<ItemActivity>) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rounds = useMemo(() => buildMatchRounds(itemOrder, MATCH_ROUNDS), []);
  const faceDownMode = step >= 1;
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wobbling, setWobbling] = useState(false);
  const [mismatches, setMismatches] = useState(0);
  const missedItems = useRef<Set<string>>(new Set());
  const busy = useRef(false);
  const alive = useAlive();
  const cards = rounds[round];

  useEffect(() => {
    void speak(activity.instruction, { pose: 'wave' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = async (i: number) => {
    if (busy.current || picked.includes(i) || matched.has(cards[i].itemId)) return;
    sfx.flip();
    if (picked.length === 0) {
      setPicked([i]);
      return;
    }
    busy.current = true;
    const first = cards[picked[0]];
    const second = cards[i];
    setPicked([picked[0], i]);

    if (first.itemId === second.itemId) {
      const itemId = first.itemId;
      const nowMatched = new Set(matched).add(itemId);
      sfx.correct();
      setMatched(nowMatched);
      setPicked([]);
      report({
        competencies: activity.competencies, itemId,
        firstTry: !missedItems.current.has(itemId), scored: true,
      });
      const item = getItem(itemId);
      await speak(item.text, { picture: item.image, transient: true, pose: 'cheer' });
      if (!alive.current) return;
      if (nowMatched.size === cards.length / 2) {
        await speak(praiseKey(round), { transient: true, pose: 'cheer' });
        await wait(300);
        if (!alive.current) return;
        if (round + 1 < rounds.length) {
          setRound(round + 1);
          setMatched(new Set());
          setMismatches(0);
          missedItems.current = new Set();
        } else {
          finish();
          return;
        }
      }
      busy.current = false;
    } else {
      missedItems.current.add(first.itemId);
      missedItems.current.add(second.itemId);
      sfx.tryAgain();
      setWobbling(true);
      setMismatches((n) => n + 1);
      await speak('fb.try-again', { transient: true, pose: 'think' });
      await wait(faceDownMode ? 500 : 100);
      if (!alive.current) return;
      setWobbling(false);
      setPicked([]);
      busy.current = false;
    }
  };

  const stateOf = (i: number): CardState => {
    const card = cards[i];
    if (matched.has(card.itemId)) return 'done';
    if (picked.includes(i)) return wobbling ? 'wobble' : 'selected';
    // Gentle help after two mismatches: point to the partner of the chosen card.
    if (mismatches >= 2 && picked.length === 1 && cards[picked[0]].itemId === card.itemId) return 'hint';
    return 'idle';
  };

  return (
    <div className="engine match-pairs">
      <div className="card-row count-4" data-testid="match-cards">
        {cards.map((card, i) => {
          const state = stateOf(i);
          const showFace = !faceDownMode || state === 'done' || picked.includes(i);
          return (
            <Card
              key={card.key}
              itemId={card.itemId}
              lang={lang}
              caption={captions && showFace}
              faceDown={!showFace}
              state={state}
              onTap={() => void tap(i)}
              testId="match-card"
            />
          );
        })}
      </div>
    </div>
  );
}
