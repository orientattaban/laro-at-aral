// Play-time limits. There is no visible clock or countdown for the child:
// when time is up, the current question finishes and Butil says goodbye.
//
// Why: the World Health Organization advises no more than one hour of
// sedentary screen time a day for ages 2 to 4, and less is better.

export interface DayUsage {
  /** Seconds played today */
  seconds: number;
  /** Seconds played in the current session */
  sessionSeconds: number;
  /** Extra seconds a parent has allowed today, beyond the daily cap */
  allowance: number;
  /** true once a session has ended, until a parent allows more or the day changes */
  locked: boolean;
}

export type TimeState = 'ok' | 'session-over' | 'daily-over';

/** If the child is in the middle of something, wait this long at most before stopping. */
export const GRACE_SECONDS = 60;

export function newDayUsage(): DayUsage {
  return { seconds: 0, sessionSeconds: 0, allowance: 0, locked: false };
}

export function timeState(usage: DayUsage, sessionLimitSeconds: number, dailyCapSeconds: number): TimeState {
  if (usage.seconds >= dailyCapSeconds + usage.allowance) return 'daily-over';
  if (usage.locked || usage.sessionSeconds >= sessionLimitSeconds) return 'session-over';
  return 'ok';
}

/** Has the limit been passed by more than the grace period? */
export function pastGrace(usage: DayUsage, sessionLimitSeconds: number, dailyCapSeconds: number): boolean {
  return (
    usage.seconds >= dailyCapSeconds + usage.allowance + GRACE_SECONDS ||
    usage.sessionSeconds >= sessionLimitSeconds + GRACE_SECONDS
  );
}

export function addPlayTime(usage: DayUsage, seconds: number): DayUsage {
  return { ...usage, seconds: usage.seconds + seconds, sessionSeconds: usage.sessionSeconds + seconds };
}

/** Called when Butil says goodbye. */
export function endSession(usage: DayUsage): DayUsage {
  return { ...usage, locked: true };
}

/** A parent (behind the gate) allows one more session today. */
export function allowAnotherSession(usage: DayUsage, sessionLimitSeconds: number, dailyCapSeconds: number): DayUsage {
  const next: DayUsage = { ...usage, sessionSeconds: 0, locked: false };
  const room = dailyCapSeconds + next.allowance - next.seconds;
  if (room < sessionLimitSeconds) {
    // Give exactly one more session's worth of time today.
    next.allowance += sessionLimitSeconds - room;
  }
  return next;
}

export function clampMinutes(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}
