// The list of engines that exist. To add an engine later:
// 1. write its component in this folder,
// 2. add one line here,
// 3. add its name to BUILT_ENGINES in src/content/validate.ts.
import type { ComponentType } from 'react';
import type { Activity, EngineId, StageId } from '../content/types';
import { FindIt } from './FindIt';
import { MatchPairs } from './MatchPairs';
import { Sort } from './Sort';
import { TapAndHear } from './TapAndHear';
import type { EngineProps } from './types';

interface EngineEntry {
  // Each engine accepts its own kind of activity; the registry treats them alike.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<EngineProps<any>>;
  /** Highest difficulty step, given the most choices the stage allows */
  maxStep: (maxChoices: number) => number;
  /** Can earlier items from other games be mixed in for review? */
  mixesReview: boolean;
}

export const ENGINES: Partial<Record<EngineId, EngineEntry>> = {
  'tap-and-hear': { component: TapAndHear, maxStep: () => 0, mixesReview: false },
  'find-it': { component: FindIt, maxStep: (maxChoices) => Math.max(0, maxChoices - 2), mixesReview: true },
  'match-pairs': { component: MatchPairs, maxStep: () => 1, mixesReview: false },
  sort: { component: Sort, maxStep: () => 1, mixesReview: false },
};

export function engineFor(activity: Activity): EngineEntry {
  const entry = ENGINES[activity.engine];
  if (!entry) throw new Error(`Engine not built yet: ${activity.engine}`);
  return entry;
}

/** How many review items from other games may join one play. */
export function reviewExtrasAllowed(stage: StageId): number {
  return stage === 'A' ? 1 : 2;
}
