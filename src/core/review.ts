// Bringing earlier items back for review on later days.
// Each picture-word sits in a "box". A right answer moves it up a box and it
// returns after a longer gap. A miss sends it back to the first box, so it
// returns tomorrow.
import { addDays } from './dates';

export interface ItemProgress {
  /** Times heard or asked */
  seen: number;
  box: number;
  /** Day it should come back, or '' if never asked */
  due: string;
  /** Last day it was heard or asked */
  last: string;
}

/** Days until an item returns, by box. */
export const REVIEW_GAPS = [1, 2, 4, 7, 14];

export function newItemProgress(): ItemProgress {
  return { seen: 0, box: 0, due: '', last: '' };
}

export function reviewItem(p: ItemProgress, firstTryCorrect: boolean, today: string): ItemProgress {
  const box = firstTryCorrect ? Math.min(REVIEW_GAPS.length - 1, p.box + (p.due === '' ? 0 : 1)) : 0;
  return { seen: p.seen + 1, box, due: addDays(today, REVIEW_GAPS[box]), last: today };
}

export function exposeItem(p: ItemProgress, today: string): ItemProgress {
  return { ...p, seen: p.seen + 1, last: today };
}

export function isDue(p: ItemProgress | undefined, today: string): boolean {
  return !!p && p.due !== '' && p.due <= today;
}

/**
 * Order an activity's items for one play.
 * Items due for review (longest overdue first) and items never met take
 * turns, so every play mixes something old with something new.
 * After those come the rest, least recently met first.
 * The order inside each group follows the content file.
 */
export function orderForPlay(
  itemIds: string[],
  progress: Record<string, ItemProgress>,
  today: string,
): string[] {
  const due = itemIds
    .filter((id) => isDue(progress[id], today))
    .sort((a, b) => progress[a].due.localeCompare(progress[b].due));
  const fresh = itemIds.filter((id) => !progress[id] || progress[id].seen === 0);
  const rest = itemIds
    .filter((id) => !due.includes(id) && !fresh.includes(id))
    .sort((a, b) => progress[a].last.localeCompare(progress[b].last));

  const mixed: string[] = [];
  for (let i = 0; i < Math.max(due.length, fresh.length); i++) {
    if (i < due.length) mixed.push(due[i]);
    if (i < fresh.length) mixed.push(fresh[i]);
  }
  return [...mixed, ...rest];
}

/**
 * Items from OTHER games, already met on an earlier day and now due,
 * that can be mixed into today's game.
 */
export function pickReviewExtras(
  candidateIds: string[],
  excludeIds: string[],
  progress: Record<string, ItemProgress>,
  today: string,
  max: number,
): string[] {
  const exclude = new Set(excludeIds);
  return candidateIds
    .filter((id) => !exclude.has(id) && isDue(progress[id], today) && progress[id].last < today)
    .sort((a, b) => progress[a].due.localeCompare(progress[b].due))
    .slice(0, max);
}
