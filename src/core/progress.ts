// Turns what happened in a game into saved progress.
import type { EngineId } from '../content/types';
import { applyResult, newDifficulty } from './difficulty';
import { newCompetencyProgress, recordAttempt, recordExposure } from './mastery';
import { exposeItem, newItemProgress, reviewItem } from './review';
import type { SaveData } from './save';

export interface TrialReport {
  /** Competencies that get credit for this question */
  competencies: string[];
  /** The picture-word asked about, if any */
  itemId?: string;
  /** Right on the first try? */
  firstTry: boolean;
  /** false = only heard or looked at (Tap and hear), not a question */
  scored: boolean;
}

export function difficultyKey(engine: EngineId, competency: string): string {
  return `${engine}|${competency}`;
}

export function currentStep(data: SaveData, engine: EngineId, competency: string, maxStep: number): number {
  const state = data.progress.difficulty[difficultyKey(engine, competency)];
  return Math.min(state?.step ?? 0, maxStep);
}

export function recordTrial(
  data: SaveData,
  engine: EngineId,
  primaryCompetency: string,
  report: TrialReport,
  today: string,
  maxStep: number,
): SaveData {
  const progress = { ...data.progress };

  const competencies = { ...progress.competencies };
  for (const id of report.competencies) {
    const current = competencies[id] ?? newCompetencyProgress();
    competencies[id] = report.scored
      ? recordAttempt(current, report.firstTry, today)
      : recordExposure(current, today);
  }
  progress.competencies = competencies;

  if (report.itemId) {
    const current = progress.items[report.itemId] ?? newItemProgress();
    progress.items = {
      ...progress.items,
      [report.itemId]: report.scored ? reviewItem(current, report.firstTry, today) : exposeItem(current, today),
    };
  }

  if (report.scored) {
    const key = difficultyKey(engine, primaryCompetency);
    progress.difficulty = {
      ...progress.difficulty,
      [key]: applyResult(progress.difficulty[key] ?? newDifficulty(), report.firstTry, maxStep),
    };
  }

  return { ...data, progress };
}

export function recordActivityPlayed(data: SaveData, activityId: string, today: string): SaveData {
  const counter = data.progress.playCounter + 1;
  const current = data.progress.activities[activityId];
  return {
    ...data,
    progress: {
      ...data.progress,
      playCounter: counter,
      activities: {
        ...data.progress.activities,
        [activityId]: { plays: (current?.plays ?? 0) + 1, last: today, order: counter },
      },
    },
  };
}
