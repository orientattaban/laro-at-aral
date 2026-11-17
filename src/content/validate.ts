// Checks the content files against the project rules. The test suite fails if
// this returns any problem, so a mistake in a lesson file never reaches the child.
import { ALL_ENGINES } from './types';
import type { ContentBundle, Sourced, SortActivity } from './types';

/** Engines that have code today. Content may only use these. */
export const BUILT_ENGINES = ['tap-and-hear', 'find-it', 'match-pairs', 'sort'];

/** Only these may be called "pambansa" or "national" (officially declared symbols). */
const OFFICIAL_SYMBOL_WORDS = [
  'watawat', 'flag', 'awit', 'anthem', 'sagisag', 'coat of arms', 'sampaguita', 'narra',
  'agila', 'eagle', 'perlas', 'pearl', 'arnis',
];

const FORBIDDEN_WORDS = ['scarecrow', 'panakot-uwak', 'panakot ng uwak', 'panakot ng ibon'];

export function validateContent(c: ContentBundle): string[] {
  const problems: string[] = [];
  const fil = c.lang.fil;
  const en = c.lang.en;
  const ilo = c.lang.ilo;

  const hasText = (key: string) => (fil[key] ?? '').trim() !== '' && (en[key] ?? '').trim() !== '';
  const needText = (key: string, where: string) => {
    if (!hasText(key)) problems.push(`${where}: text "${key}" is missing in Filipino or English`);
  };

  const checkSource = (thing: Sourced, where: string) => {
    if (!thing.source || !thing.source.doc || !(thing.source.ref ?? '').trim()) {
      problems.push(`${where}: has no source`);
      return;
    }
    if (thing.status !== 'verified' && thing.status !== 'needs-review') {
      problems.push(`${where}: status must be "verified" or "needs-review"`);
    }
    const doc = c.sources[thing.source.doc];
    if (!doc) {
      problems.push(`${where}: source document "${thing.source.doc}" is not in sources.json`);
      return;
    }
    if (thing.status === 'verified') {
      if (!doc.inCurriculumFolder) {
        problems.push(`${where}: marked verified but its document is not in /curriculum`);
      }
      if (typeof thing.source.page !== 'number') {
        problems.push(`${where}: marked verified but has no page number`);
      }
    }
  };

  // Language files
  for (const key of Object.keys(fil)) {
    if (!(key in en)) problems.push(`en.json is missing "${key}"`);
    if (!(key in ilo)) problems.push(`ilo.json is missing "${key}" (run: npm run lang:sync)`);
    if (fil[key].trim() === '') problems.push(`fil.json: "${key}" is empty`);
  }
  for (const key of Object.keys(en)) {
    if (!(key in fil)) problems.push(`fil.json is missing "${key}"`);
    if (en[key].trim() === '') problems.push(`en.json: "${key}" is empty`);
  }
  for (const key of Object.keys(ilo)) {
    if (!(key in fil)) problems.push(`ilo.json has an extra key "${key}"`);
  }

  // Words that must not appear, and words with rules
  for (const [langName, strings] of Object.entries(c.lang)) {
    for (const [key, value] of Object.entries(strings)) {
      const lower = value.toLowerCase();
      for (const word of FORBIDDEN_WORDS) {
        if (lower.includes(word)) problems.push(`${langName}.json "${key}": must not mention "${word}"`);
      }
      if (/https?:\/\//.test(lower) || lower.includes('www.')) {
        problems.push(`${langName}.json "${key}": no web links are allowed in the app`);
      }
      if (lower.includes('pambansa') || /\bnational\b/.test(lower)) {
        const ok = OFFICIAL_SYMBOL_WORDS.some((w) => lower.includes(w));
        if (!ok) problems.push(`${langName}.json "${key}": "pambansa" is only for officially declared symbols`);
      }
    }
  }

  // Items
  const itemIds = new Set<string>();
  for (const item of c.items) {
    const where = `item ${item.id}`;
    if (itemIds.has(item.id)) problems.push(`${where}: duplicate id`);
    itemIds.add(item.id);
    checkSource(item, where);
    needText(item.text, where);
    needText(`${item.text}.find`, where);
    if (!item.image) problems.push(`${where}: has no image name`);
  }

  // Competencies
  const competencyIds = new Set<string>();
  for (const comp of c.competencies) {
    const where = `competency ${comp.id}`;
    if (competencyIds.has(comp.id)) problems.push(`${where}: duplicate id`);
    competencyIds.add(comp.id);
    checkSource(comp, where);
    needText(comp.title, where);
    needText(`area.${comp.area}`, where);
  }

  // Places and levels
  const placeIds = new Set(c.places.map((p) => p.id));
  for (const place of c.places) needText(place.name, `place ${place.id}`);
  for (const level of c.levels) {
    needText(level.name, `level ${level.id}`);
    for (const stage of level.stages) {
      needText(stage.name, `level ${level.id} stage ${stage.id}`);
      if (level.id <= 2 && stage.maxChoices > 4) {
        problems.push(`level ${level.id} stage ${stage.id}: more than four choices is not allowed at Levels 1 and 2`);
      }
    }
  }

  // Activities
  const activityIds = new Set<string>();
  for (const act of c.activities) {
    const where = `activity ${act.id}`;
    if (activityIds.has(act.id)) problems.push(`${where}: duplicate id`);
    activityIds.add(act.id);
    checkSource(act, where);
    if (!ALL_ENGINES.includes(act.engine)) problems.push(`${where}: unknown engine "${act.engine}"`);
    else if (!BUILT_ENGINES.includes(act.engine)) problems.push(`${where}: engine "${act.engine}" is not built yet`);
    if (!placeIds.has(act.place)) problems.push(`${where}: unknown place "${act.place}"`);
    const level = c.levels.find((l) => l.id === act.level);
    if (!level || !level.built) problems.push(`${where}: level ${act.level} is not built`);
    else if (!level.stages.some((s) => s.id === act.stage)) problems.push(`${where}: unknown stage "${act.stage}"`);
    if (act.competencies.length === 0) problems.push(`${where}: names no competency`);
    for (const id of act.competencies) {
      if (!competencyIds.has(id)) problems.push(`${where}: unknown competency "${id}"`);
    }
    needText(act.instruction, where);
    if (!itemIds.has(act.tile)) problems.push(`${where}: unknown tile item "${act.tile}"`);
    if (typeof act.faith !== 'boolean') problems.push(`${where}: "faith" must be true or false`);

    if (act.engine === 'sort') {
      const sort = act as SortActivity;
      if (act.stage === 'A') problems.push(`${where}: sorting needs dragging, so it cannot be Stage A`);
      if (!sort.rounds || sort.rounds.length === 0) problems.push(`${where}: has no rounds`);
      for (const [i, round] of (sort.rounds ?? []).entries()) {
        const rw = `${where} round ${i + 1}`;
        needText(round.instruction, rw);
        if (round.baskets.length < 2 || round.baskets.length > 3) problems.push(`${rw}: needs 2 or 3 baskets`);
        if (round.competency && !competencyIds.has(round.competency)) {
          problems.push(`${rw}: unknown competency "${round.competency}"`);
        }
        const basketIds = new Set(round.baskets.map((b) => b.id));
        for (const basket of round.baskets) {
          needText(basket.label, rw);
          if (basket.cue.kind === 'item' && !itemIds.has(basket.cue.item)) {
            problems.push(`${rw}: basket cue names unknown item "${basket.cue.item}"`);
          }
        }
        if (round.entries.length < 2) problems.push(`${rw}: needs at least 2 things to sort`);
        for (const entry of round.entries) {
          if (!itemIds.has(entry.item)) problems.push(`${rw}: unknown item "${entry.item}"`);
          if (!basketIds.has(entry.basket)) problems.push(`${rw}: unknown basket "${entry.basket}"`);
        }
      }
    } else {
      const items = (act as { items?: string[] }).items ?? [];
      if (items.length < 2) problems.push(`${where}: needs at least 2 items`);
      for (const id of items) {
        if (!itemIds.has(id)) problems.push(`${where}: unknown item "${id}"`);
      }
      if (new Set(items).size !== items.length) problems.push(`${where}: lists an item twice`);
    }
  }

  // Gawin natin cards
  for (const card of c.cards) {
    const where = `card ${card.id}`;
    checkSource(card, where);
    needText(card.text, where);
    if (!itemIds.has(card.tile)) problems.push(`${where}: unknown tile item "${card.tile}"`);
    if (typeof card.faith !== 'boolean') problems.push(`${where}: "faith" must be true or false`);
  }

  return problems;
}
