// Difficulty inside each engine.
// Rule from the project brief: step up after three correct in a row,
// step down after two misses (we count two misses in a row).
// A "miss" is a question the child did not get on the first try.

export interface DifficultyState {
  step: number;
  streak: number;
  missStreak: number;
}

export const STEP_UP_AFTER = 3;
export const STEP_DOWN_AFTER = 2;

export function newDifficulty(): DifficultyState {
  return { step: 0, streak: 0, missStreak: 0 };
}

export function applyResult(state: DifficultyState, firstTryCorrect: boolean, maxStep: number): DifficultyState {
  let { step, streak, missStreak } = state;
  if (firstTryCorrect) {
    streak += 1;
    missStreak = 0;
    if (streak >= STEP_UP_AFTER) {
      step = Math.min(maxStep, step + 1);
      streak = 0;
    }
  } else {
    missStreak += 1;
    streak = 0;
    if (missStreak >= STEP_DOWN_AFTER) {
      step = Math.max(0, step - 1);
      missStreak = 0;
    }
  }
  return { step: Math.min(step, maxStep), streak, missStreak };
}
