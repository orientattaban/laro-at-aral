// Everything the app remembers. It is saved on this device only.
import type { Lang, StageId } from '../content/types';
import type { DifficultyState } from './difficulty';
import type { CompetencyProgress } from './mastery';
import type { ItemProgress } from './review';
import type { DayUsage } from './session';

export const SAVE_SCHEMA = 1;

export interface Settings {
  /** Typed by the parent. Never leaves the phone and is never in the code. */
  childName: string;
  level: number;
  stage: StageId;
  language: Lang;
  /** null = use the default for the level and stage */
  sessionMinutes: number | null;
  dailyCapMinutes: number;
  faith: boolean;
  captions: boolean;
}

export interface ActivityProgress {
  plays: number;
  /** Day last played */
  last: string;
  /** Counter used to rotate games fairly (higher = more recent) */
  order: number;
}

export interface Progress {
  competencies: Record<string, CompetencyProgress>;
  items: Record<string, ItemProgress>;
  activities: Record<string, ActivityProgress>;
  /** Key: engine + "|" + competency */
  difficulty: Record<string, DifficultyState>;
  playCounter: number;
}

export interface SaveData {
  schema: number;
  settings: Settings;
  progress: Progress;
  /** Key: day like "2026-11-17" */
  usage: Record<string, DayUsage>;
}

export function defaultSettings(dailyCapMinutes: number): Settings {
  return {
    childName: '',
    level: 1,
    stage: 'A',
    language: 'fil',
    sessionMinutes: null,
    dailyCapMinutes,
    faith: false,
    captions: true,
  };
}

export function emptyProgress(): Progress {
  return { competencies: {}, items: {}, activities: {}, difficulty: {}, playCounter: 0 };
}

export function defaultSave(dailyCapMinutes: number): SaveData {
  return {
    schema: SAVE_SCHEMA,
    settings: defaultSettings(dailyCapMinutes),
    progress: emptyProgress(),
    usage: {},
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Turn anything read from storage or from an imported file into safe SaveData.
 * Returns null if it is not a Laro at Aral save at all.
 */
export function sanitizeSave(raw: unknown, dailyCapMinutes: number): SaveData | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.schema !== 'number' || raw.schema > SAVE_SCHEMA) return null;
  if (!isRecord(raw.settings) || !isRecord(raw.progress)) return null;

  const base = defaultSave(dailyCapMinutes);
  const s = raw.settings;
  const settings: Settings = {
    childName: typeof s.childName === 'string' ? s.childName.slice(0, 40) : '',
    level: typeof s.level === 'number' ? s.level : 1,
    stage: s.stage === 'B' ? 'B' : 'A',
    language: s.language === 'en' || s.language === 'ilo' ? s.language : 'fil',
    sessionMinutes: typeof s.sessionMinutes === 'number' ? s.sessionMinutes : null,
    dailyCapMinutes: typeof s.dailyCapMinutes === 'number' ? s.dailyCapMinutes : dailyCapMinutes,
    faith: s.faith === true,
    captions: s.captions !== false,
  };

  const p = raw.progress;
  const progress: Progress = {
    competencies: isRecord(p.competencies) ? (p.competencies as Progress['competencies']) : {},
    items: isRecord(p.items) ? (p.items as Progress['items']) : {},
    activities: isRecord(p.activities) ? (p.activities as Progress['activities']) : {},
    difficulty: isRecord(p.difficulty) ? (p.difficulty as Progress['difficulty']) : {},
    playCounter: typeof p.playCounter === 'number' ? p.playCounter : 0,
  };

  const usage = isRecord(raw.usage) ? (raw.usage as SaveData['usage']) : {};
  return { ...base, settings, progress, usage };
}

/** Keep only the last 60 days of play-time records so the save stays small. */
export function trimUsage(usage: SaveData['usage']): SaveData['usage'] {
  const keys = Object.keys(usage).sort();
  if (keys.length <= 60) return usage;
  const keep = keys.slice(-60);
  return Object.fromEntries(keep.map((k) => [k, usage[k]]));
}
