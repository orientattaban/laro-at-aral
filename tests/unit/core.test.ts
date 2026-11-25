import { describe, expect, it } from 'vitest';
import { content } from '../../src/content';
import { addDays, dayKey } from '../../src/core/dates';
import { applyResult, newDifficulty } from '../../src/core/difficulty';
import { t } from '../../src/core/i18n';
import { masteryLabel, newCompetencyProgress, recordAttempt, recordExposure } from '../../src/core/mastery';
import { currentStep, recordActivityPlayed, recordTrial } from '../../src/core/progress';
import { isDue, newItemProgress, orderForPlay, pickReviewExtras, reviewItem } from '../../src/core/review';
import { defaultSave, sanitizeSave } from '../../src/core/save';
import { eligibleActivities, pickTiles } from '../../src/core/scheduler';
import {
  addPlayTime, allowAnotherSession, endSession, newDayUsage, pastGrace, timeState,
} from '../../src/core/session';

describe('difficulty', () => {
  it('steps up after three correct in a row', () => {
    let s = newDifficulty();
    s = applyResult(s, true, 2);
    s = applyResult(s, true, 2);
    expect(s.step).toBe(0);
    s = applyResult(s, true, 2);
    expect(s.step).toBe(1);
  });

  it('a miss breaks the row', () => {
    let s = newDifficulty();
    s = applyResult(s, true, 2);
    s = applyResult(s, true, 2);
    s = applyResult(s, false, 2);
    s = applyResult(s, true, 2);
    expect(s.step).toBe(0);
  });

  it('steps down after two misses', () => {
    let s = { step: 2, streak: 0, missStreak: 0 };
    s = applyResult(s, false, 2);
    expect(s.step).toBe(2);
    s = applyResult(s, false, 2);
    expect(s.step).toBe(1);
  });

  it('never goes below the easiest or above the hardest step', () => {
    let s = newDifficulty();
    for (let i = 0; i < 6; i++) s = applyResult(s, false, 2);
    expect(s.step).toBe(0);
    for (let i = 0; i < 30; i++) s = applyResult(s, true, 2);
    expect(s.step).toBe(2);
  });
});

describe('mastery per competency', () => {
  it('starts as new', () => {
    expect(masteryLabel(undefined)).toBe('new');
    expect(masteryLabel(newCompetencyProgress())).toBe('new');
  });

  it('hearing a word counts as starting', () => {
    expect(masteryLabel(recordExposure(newCompetencyProgress(), '2026-11-17'))).toBe('starting');
  });

  it('needs success on two different days to be "can"', () => {
    let p = newCompetencyProgress();
    for (let i = 0; i < 10; i++) p = recordAttempt(p, true, '2026-11-17');
    expect(masteryLabel(p)).toBe('growing');
    p = recordAttempt(p, true, '2026-11-18');
    expect(masteryLabel(p)).toBe('can');
  });

  it('drops back when recent answers are missed', () => {
    let p = newCompetencyProgress();
    for (let i = 0; i < 10; i++) p = recordAttempt(p, true, '2026-11-17');
    for (let i = 0; i < 6; i++) p = recordAttempt(p, false, '2026-11-18');
    expect(masteryLabel(p)).toBe('starting');
  });
});

describe('review on later days', () => {
  const today = '2026-11-17';

  it('a correct item comes back tomorrow, then after longer gaps', () => {
    let p = reviewItem(newItemProgress(), true, today);
    expect(p.due).toBe('2026-11-18');
    expect(isDue(p, today)).toBe(false);
    expect(isDue(p, '2026-11-18')).toBe(true);
    p = reviewItem(p, true, '2026-11-18');
    expect(p.due).toBe('2026-11-20');
    p = reviewItem(p, true, '2026-11-20');
    expect(p.due).toBe('2026-11-24');
  });

  it('a missed item goes back to the start', () => {
    let p = reviewItem(newItemProgress(), true, today);
    p = reviewItem(p, true, '2026-11-18');
    p = reviewItem(p, false, '2026-11-20');
    expect(p.box).toBe(0);
    expect(p.due).toBe('2026-11-21');
  });

  it('mixes items due for review with new items', () => {
    const progress = {
      a: { seen: 1, box: 0, due: '2026-11-16', last: '2026-11-15' },
      b: { seen: 1, box: 1, due: '2026-11-25', last: '2026-11-16' },
    };
    expect(orderForPlay(['a', 'b', 'c', 'd'], progress, today)).toEqual(['a', 'c', 'd', 'b']);
  });

  it('brings due items in from other games, but not ones met today', () => {
    const progress = {
      x: { seen: 2, box: 0, due: '2026-11-17', last: '2026-11-16' },
      y: { seen: 2, box: 0, due: '2026-11-17', last: '2026-11-17' },
      z: { seen: 1, box: 2, due: '2026-12-01', last: '2026-11-10' },
    };
    expect(pickReviewExtras(['x', 'y', 'z', 'own'], ['own'], progress, today, 2)).toEqual(['x']);
  });
});

describe('play-time limits', () => {
  const session = 5 * 60;
  const cap = 30 * 60;

  it('is fine until the session limit, then says goodbye', () => {
    let u = newDayUsage();
    u = addPlayTime(u, session - 1);
    expect(timeState(u, session, cap)).toBe('ok');
    u = addPlayTime(u, 1);
    expect(timeState(u, session, cap)).toBe('session-over');
  });

  it('stays locked after goodbye until a parent allows more', () => {
    let u = endSession(addPlayTime(newDayUsage(), session));
    expect(timeState(u, session, cap)).toBe('session-over');
    u = allowAnotherSession(u, session, cap);
    expect(timeState(u, session, cap)).toBe('ok');
    expect(u.sessionSeconds).toBe(0);
    expect(u.seconds).toBe(session);
  });

  it('stops at the daily cap', () => {
    const u = { seconds: cap, sessionSeconds: 10, allowance: 0, locked: false };
    expect(timeState(u, session, cap)).toBe('daily-over');
  });

  it('a parent can allow exactly one more session past the daily cap', () => {
    let u = { seconds: cap + 20, sessionSeconds: session, allowance: 0, locked: true };
    u = allowAnotherSession(u, session, cap);
    expect(timeState(u, session, cap)).toBe('ok');
    u = addPlayTime(u, session);
    expect(timeState(u, session, cap)).toBe('daily-over');
  });

  it('never cuts a child off mid-question until the grace period has passed', () => {
    const u = addPlayTime(newDayUsage(), session + 30);
    expect(pastGrace(u, session, cap)).toBe(false);
    expect(pastGrace(addPlayTime(u, 31), session, cap)).toBe(true);
  });

  it('uses the defaults from the brief: 5 minutes at Stage A, 10 at Stage B, 30 a day', () => {
    const level1 = content.levels[0];
    expect(level1.stages.find((s) => s.id === 'A')!.sessionMinutes).toBe(5);
    expect(level1.stages.find((s) => s.id === 'B')!.sessionMinutes).toBe(10);
    expect(content.dailyCapMinutes).toBe(30);
    expect(content.levels.map((l) => l.sessionMinutes)).toEqual([10, 10, 15, 15, 20, 20]);
  });
});

describe('saved progress', () => {
  const today = '2026-11-17';

  it('credits every competency of a question and moves difficulty', () => {
    let data = defaultSave(30);
    const report = { competencies: ['a', 'b'], itemId: 'pamilya.nanay', firstTry: true, scored: true };
    for (let i = 0; i < 3; i++) data = recordTrial(data, 'find-it', 'a', report, today, 2);
    expect(data.progress.competencies.a.attempts).toBe(3);
    expect(data.progress.competencies.b.firstTry).toBe(3);
    expect(currentStep(data, 'find-it', 'a', 2)).toBe(1);
    expect(data.progress.items['pamilya.nanay'].seen).toBe(3);
  });

  it('Tap and hear counts as hearing, not as a question', () => {
    let data = defaultSave(30);
    data = recordTrial(data, 'tap-and-hear', 'a', { competencies: ['a'], itemId: 'x', firstTry: true, scored: false }, today, 0);
    expect(data.progress.competencies.a.exposures).toBe(1);
    expect(data.progress.competencies.a.attempts).toBe(0);
    expect(data.progress.items.x.due).toBe('');
  });

  it('the hardest step respects the stage (Stage A stays at two choices)', () => {
    let data = defaultSave(30);
    const report = { competencies: ['a'], firstTry: true, scored: true };
    for (let i = 0; i < 9; i++) data = recordTrial(data, 'find-it', 'a', report, today, 0);
    expect(currentStep(data, 'find-it', 'a', 0)).toBe(0);
  });

  it('rejects files that are not a Laro at Aral save', () => {
    expect(sanitizeSave(null, 30)).toBeNull();
    expect(sanitizeSave({ hello: 1 }, 30)).toBeNull();
    expect(sanitizeSave({ schema: 99, settings: {}, progress: {} }, 30)).toBeNull();
  });

  it('repairs odd values instead of crashing', () => {
    const fixed = sanitizeSave({ schema: 1, settings: { stage: 'Z', language: 'xx' }, progress: {} }, 30)!;
    expect(fixed.settings.stage).toBe('A');
    expect(fixed.settings.language).toBe('fil');
    expect(fixed.settings.dailyCapMinutes).toBe(30);
    expect(fixed.settings.faith).toBe(false);
  });
});

describe('which games a place offers', () => {
  const settingsA = { ...defaultSave(30).settings };
  const settingsB = { ...settingsA, stage: 'B' as const };

  it('Stage A offers tapping games only', () => {
    const list = eligibleActivities(content.activities, settingsA, 'bahay');
    expect(list.length).toBeGreaterThan(0);
    expect(new Set(list.map((a) => a.engine))).toEqual(new Set(['tap-and-hear', 'find-it']));
  });

  it('Stage B adds Match pairs and Sort', () => {
    const engines = new Set(eligibleActivities(content.activities, settingsB, 'bahay').map((a) => a.engine));
    expect(engines).toEqual(new Set(['tap-and-hear', 'find-it', 'match-pairs', 'sort']));
  });

  it('never shows more than four, and mixes game types', () => {
    const tiles = pickTiles(eligibleActivities(content.activities, settingsB, 'bahay'), {});
    expect(tiles.length).toBe(4);
    expect(new Set(tiles.map((a) => a.engine)).size).toBe(4);
  });

  it('a 3-year-old first meets the games made for Stage B', () => {
    const tiles = pickTiles(eligibleActivities(content.activities, settingsB, 'cdc'), {}, 4, 'B');
    const engines = tiles.map((a) => a.engine);
    expect(engines).toContain('count');
    expect(engines).toContain('puzzle');
    expect(new Set(engines).size).toBe(4);
  });

  it('rotates: a game just played moves to the back of the queue', () => {
    const eligible = eligibleActivities(content.activities, settingsA, 'bahay');
    const first = pickTiles(eligible, {});
    let data = defaultSave(30);
    for (const a of first) data = recordActivityPlayed(data, a.id, '2026-11-17');
    const second = pickTiles(eligible, data.progress.activities);
    expect(second.some((a) => !first.includes(a))).toBe(true);
  });

  it('all three Level 1 places are open, with only tapping games at Stage A', () => {
    for (const place of ['bahay', 'cdc', 'bukid']) {
      const a = eligibleActivities(content.activities, settingsA, place);
      expect(a.length, place).toBeGreaterThan(0);
      for (const act of a) expect(['sort', 'puzzle', 'match-pairs', 'count'], act.id).not.toContain(act.engine);
    }
  });

  it('Stage A has hide-and-find and sing-and-move; Stage B adds Count and Puzzle', () => {
    const engines = (s: typeof settingsA) => new Set(content.activities
      .filter((a) => eligibleActivities(content.activities, s).includes(a)).map((a) => a.engine));
    const a = engines(settingsA);
    expect(a.has('hide-and-find')).toBe(true);
    expect(a.has('sing-and-move')).toBe(true);
    const b = engines(settingsB);
    for (const e of ['count', 'puzzle', 'match-pairs', 'sort']) expect(b.has(e as never), e).toBe(true);
  });

  it('every theme of Pre-K1 has games: Ako, Pamilya, Komunidad, Mundo', () => {
    const themes = new Set(content.activities.map((a) => a.theme));
    for (const t of ['ako', 'pamilya', 'komunidad', 'mundo']) expect(themes.has(t), t).toBe(true);
  });
});

describe('languages and dates', () => {
  it('Filipino is the default and English is complete', () => {
    expect(defaultSave(30).settings.language).toBe('fil');
    expect(t('fil', 'item.pamilya.nanay')).toBe('Nanay');
    expect(t('en', 'item.pamilya.nanay')).toBe('Mother');
  });

  it('empty Ilokano falls back to Filipino', () => {
    expect(t('ilo', 'item.pamilya.nanay')).toBe('Nanay');
  });

  it('fills in names without putting them in the code', () => {
    expect(t('fil', 'ui.hello', { name: 'Test' })).toBe('Kumusta, Test!');
  });

  it('counts days by the phone calendar', () => {
    expect(dayKey(new Date(2026, 10, 17, 23, 59))).toBe('2026-11-17');
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});
