// Mastery is tracked per competency, not per game.
// The four labels are descriptive, not grades: LRP 1 page 16 says ratings
// for young children "should be qualitative/descriptive and not only numerical".

export interface CompetencyProgress {
  /** Times a picture for this competency was simply heard (Tap and hear) */
  exposures: number;
  /** Scored questions answered */
  attempts: number;
  /** Scored questions answered correctly on the first try */
  firstTry: number;
  /** The last ten scored questions: 1 = first try correct, 0 = not */
  recent: number[];
  /** Different days on which it was practised (most recent 30) */
  days: string[];
}

export type MasteryLabel = 'new' | 'starting' | 'growing' | 'can';

export const RECENT_WINDOW = 10;

export function newCompetencyProgress(): CompetencyProgress {
  return { exposures: 0, attempts: 0, firstTry: 0, recent: [], days: [] };
}

function withDay(days: string[], today: string): string[] {
  if (days.includes(today)) return days;
  return [...days, today].slice(-30);
}

export function recordExposure(p: CompetencyProgress, today: string): CompetencyProgress {
  return { ...p, exposures: p.exposures + 1, days: withDay(p.days, today) };
}

export function recordAttempt(p: CompetencyProgress, firstTryCorrect: boolean, today: string): CompetencyProgress {
  return {
    ...p,
    attempts: p.attempts + 1,
    firstTry: p.firstTry + (firstTryCorrect ? 1 : 0),
    recent: [...p.recent, firstTryCorrect ? 1 : 0].slice(-RECENT_WINDOW),
    days: withDay(p.days, today),
  };
}

/**
 * "can"      : at least 8 of the last 10 right on the first try, on 2 or more different days
 * "growing"  : at least 5 tries and 60% of recent tries right
 * "starting" : has been seen or tried
 * "new"      : not tried yet
 */
export function masteryLabel(p: CompetencyProgress | undefined): MasteryLabel {
  if (!p || (p.attempts === 0 && p.exposures === 0)) return 'new';
  const right = p.recent.reduce((a, b) => a + b, 0);
  if (p.recent.length >= RECENT_WINDOW && right >= 8 && p.days.length >= 2) return 'can';
  if (p.attempts >= 5 && right / p.recent.length >= 0.6) return 'growing';
  return 'starting';
}
