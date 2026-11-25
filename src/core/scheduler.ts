// Decides which games a place offers right now.
// A very young child never sees more than four choices, so a place shows at
// most four games: the ones played least recently, with a mix of game types.
import type { Activity, StageId } from '../content/types';
import type { ActivityProgress, Settings } from './save';

const STAGE_ORDER: Record<StageId, number> = { A: 0, B: 1 };

export const MAX_TILES = 4;

export function eligibleActivities(activities: Activity[], settings: Settings, placeId?: string): Activity[] {
  return activities.filter(
    (a) =>
      (placeId === undefined || a.place === placeId) &&
      a.level <= settings.level &&
      (a.level < settings.level || STAGE_ORDER[a.stage] <= STAGE_ORDER[settings.stage]) &&
      (settings.faith || !a.faith),
  );
}

export function pickTiles(
  eligible: Activity[],
  played: Record<string, ActivityProgress>,
  max: number = MAX_TILES,
  currentStage?: StageId,
): Activity[] {
  // Never played first, then least recently played. Among equals, games made for
  // the child's current stage come first (so a 3-year-old meets the Stage B games),
  // then content order.
  const atStage = (a: Activity) => (currentStage !== undefined && a.stage === currentStage ? 0 : 1);
  const ordered = eligible
    .map((activity, index) => ({ activity, index, order: played[activity.id]?.order ?? 0 }))
    .sort((a, b) => a.order - b.order || atStage(a.activity) - atStage(b.activity) || a.index - b.index)
    .map((x) => x.activity);

  const picked: Activity[] = [];
  const engines = new Set<string>();
  // First pass: one of each game type.
  for (const activity of ordered) {
    if (picked.length >= max) break;
    if (!engines.has(activity.engine)) {
      picked.push(activity);
      engines.add(activity.engine);
    }
  }
  // Second pass: fill the remaining places.
  for (const activity of ordered) {
    if (picked.length >= max) break;
    if (!picked.includes(activity)) picked.push(activity);
  }
  return picked;
}
