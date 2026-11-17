import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { content } from '../../src/content';
import { validateContent } from '../../src/content/validate';
import type { ContentBundle } from '../../src/content/types';

function copy(): ContentBundle {
  return JSON.parse(JSON.stringify(content)) as ContentBundle;
}

describe('content files', () => {
  it('follow every project rule', () => {
    expect(validateContent(content)).toEqual([]);
  });

  it('give every lesson item a source and a status', () => {
    for (const thing of [...content.items, ...content.activities, ...content.competencies, ...content.cards]) {
      expect(thing.source.doc, thing.id).toBeTruthy();
      expect(thing.source.ref.trim().length, thing.id).toBeGreaterThan(0);
      expect(['verified', 'needs-review'], thing.id).toContain(thing.status);
    }
  });

  it('only mark something verified when its document is in /curriculum', () => {
    for (const thing of [...content.items, ...content.activities, ...content.competencies, ...content.cards]) {
      if (thing.status === 'verified') {
        expect(content.sources[thing.source.doc].inCurriculumFolder, thing.id).toBe(true);
        expect(typeof thing.source.page, thing.id).toBe('number');
      }
    }
  });

  it('leave Ilokano empty until the family fills it in, but keep the same keys', () => {
    expect(Object.keys(content.lang.ilo).sort()).toEqual(Object.keys(content.lang.fil).sort());
  });

  it('contain no child name, links or scarecrows', () => {
    const everything = JSON.stringify(content).toLowerCase();
    expect(everything).not.toContain('scarecrow');
    expect(everything).not.toMatch(/https?:\/\//);
  });

  it('every picture and voice clip the game lists really exists', () => {
    const missing = [...Object.values(content.assets.images), ...Object.values(content.assets.audio)]
      .filter((path) => !existsSync(join('public', path)));
    expect(missing).toEqual([]);
  });

  it('voice clips exist only for Filipino and English (no Ilokano until a speaker writes it)', () => {
    for (const key of Object.keys(content.assets.audio)) expect(['fil', 'en']).toContain(key.split('/')[0]);
  });

  it('only build Level 1', () => {
    expect(content.levels.filter((l) => l.built).map((l) => l.id)).toEqual([1]);
    expect(content.activities.every((a) => a.level === 1)).toBe(true);
  });
});

describe('the content checker catches mistakes', () => {
  it('a lesson without a source', () => {
    const c = copy();
    (c.activities[0] as unknown as { source: unknown }).source = undefined;
    expect(validateContent(c).join('\n')).toContain('has no source');
  });

  it('a made-up "verified" from a document that is not in the folder', () => {
    const c = copy();
    c.items[0].source = { doc: 'who-2019', page: 1, ref: 'x' };
    c.items[0].status = 'verified';
    expect(validateContent(c).join('\n')).toContain('not in /curriculum');
  });

  it('a word missing in English', () => {
    const c = copy();
    delete c.lang.en['item.pamilya.nanay'];
    expect(validateContent(c).join('\n')).toContain('item.pamilya.nanay');
  });

  it('"pambansa" on something that is not an official symbol', () => {
    const c = copy();
    c.lang.fil['item.pagkain.mangga'] = 'pambansang prutas';
    expect(validateContent(c).join('\n')).toContain('pambansa');
  });

  it('allows "pambansa" for an officially declared symbol', () => {
    const c = copy();
    c.lang.fil['item.pagkain.mangga'] = 'sampaguita, ang pambansang bulaklak';
    expect(validateContent(c).filter((p) => p.includes('pambansa'))).toEqual([]);
  });

  it('a scarecrow', () => {
    const c = copy();
    c.lang.en['item.pagkain.mais'] = 'corn and a scarecrow';
    expect(validateContent(c).join('\n')).toContain('scarecrow');
  });

  it('more than four choices at Level 1', () => {
    const c = copy();
    c.levels[0].stages[1].maxChoices = 6;
    expect(validateContent(c).join('\n')).toContain('more than four choices');
  });

  it('a dragging game at Stage A', () => {
    const c = copy();
    const sort = c.activities.find((a) => a.engine === 'sort')!;
    sort.stage = 'A';
    expect(validateContent(c).join('\n')).toContain('cannot be Stage A');
  });

  it('an engine that is not built yet', () => {
    const c = copy();
    (c.activities[0] as { engine: string }).engine = 'puzzle';
    expect(validateContent(c).join('\n')).toContain('not built yet');
  });
});
