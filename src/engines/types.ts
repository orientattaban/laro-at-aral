// What every mini-game engine receives. An engine knows nothing about
// saving, timers or screens: it only shows an activity and reports what happened.
import type { Activity, Lang, StageId } from '../content/types';
import type { Pose } from '../components/Butil';
import type { TrialReport } from '../core/progress';

export interface SpeakOptions {
  /** Picture to show in Butil's bubble */
  picture?: string;
  /** Picture to show ONLY when there is no narration clip (the silent picture cue) */
  pictureIfSilent?: string;
  pose?: Pose;
  /** true = short feedback like "Magaling!". The instruction comes back afterwards. */
  transient?: boolean;
}

export interface EngineProps<A extends Activity = Activity> {
  activity: A;
  lang: Lang;
  stage: StageId;
  /** Difficulty step, 0 = easiest */
  step: number;
  /** Most choices allowed on screen for this child */
  maxChoices: number;
  captions: boolean;
  /** The activity's items in the order to use today (review first) */
  itemOrder: string[];
  /** Items from other games that are due for review today */
  reviewExtras: string[];
  /** Butil says a line (or shows it silently if there is no clip yet) */
  speak: (key: string, options?: SpeakOptions) => Promise<void>;
  report: (report: TrialReport) => void;
  finish: () => void;
}

/** Hard limit for very young players, whatever the content says. */
export const MAX_CHOICES_YOUNG = 4;

export const PRAISE_KEYS = ['fb.praise.1', 'fb.praise.2', 'fb.praise.3'];

export function praiseKey(n: number): string {
  return PRAISE_KEYS[n % PRAISE_KEYS.length];
}
