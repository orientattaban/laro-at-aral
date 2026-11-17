import { beforeEach, describe, expect, it } from 'vitest';
import { defaultSave } from '../../src/core/save';
import {
  clearSave, loadSave, makeExport, parseImport, resetStorageConnection, writeSave,
} from '../../src/core/storage';

describe('saving on the device', () => {
  beforeEach(async () => {
    resetStorageConnection();
    await clearSave();
  });

  it('starts with nothing saved', async () => {
    expect(await loadSave(30)).toBeNull();
  });

  it('gives back exactly what was saved', async () => {
    const data = defaultSave(30);
    data.settings.childName = 'Test Child';
    data.settings.stage = 'B';
    data.progress.playCounter = 7;
    data.usage['2026-11-17'] = { seconds: 120, sessionSeconds: 120, allowance: 0, locked: false };
    await writeSave(data);
    expect(await loadSave(30)).toEqual(data);
  });

  it('erases on request', async () => {
    await writeSave(defaultSave(30));
    await clearSave();
    expect(await loadSave(30)).toBeNull();
  });
});

describe('export and import of progress', () => {
  it('an exported file imports back unchanged', () => {
    const data = defaultSave(30);
    data.settings.language = 'en';
    data.progress.competencies['l1.pamilya.kasapi'] = {
      exposures: 3, attempts: 4, firstTry: 3, recent: [1, 1, 0, 1], days: ['2026-11-17'],
    };
    const text = makeExport(data, '0.1.0', new Date('2026-11-17T08:00:00Z'));
    expect(parseImport(text, 30)).toEqual(data);
  });

  it('refuses a file from somewhere else and changes nothing', () => {
    expect(parseImport('not a file', 30)).toBeNull();
    expect(parseImport('{"app":"something-else","save":{}}', 30)).toBeNull();
    expect(parseImport('{"app":"laro-at-aral"}', 30)).toBeNull();
  });

  it('keeps only the last 60 days of play-time records', () => {
    const data = defaultSave(30);
    for (let i = 0; i < 90; i++) {
      const day = new Date(2026, 0, 1 + i);
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      data.usage[key] = { seconds: 60, sessionSeconds: 0, allowance: 0, locked: false };
    }
    const back = parseImport(makeExport(data, '0.1.0'), 30)!;
    expect(Object.keys(back.usage).length).toBe(60);
  });
});
