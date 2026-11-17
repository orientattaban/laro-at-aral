// Loads every content file at build time. Nothing is fetched while the game runs.
import type {
  Activity, AssetManifest, Competency, ContentBundle, GawinNatinCard, Item, Lang, Level, Place,
  SourceDoc, Stage, StageId, Strings,
} from './types';

import sourcesFile from '../../content/sources.json';
import levelsFile from '../../content/levels.json';
import placesFile from '../../content/places.json';
import assetsFile from '../../content/asset-manifest.json';
import fil from '../../content/lang/fil.json';
import en from '../../content/lang/en.json';
import ilo from '../../content/lang/ilo.json';

// Any new file dropped into these folders is picked up automatically.
const competencyFiles = import.meta.glob<{ competencies: Competency[] }>(
  '../../content/competencies/*.json', { eager: true, import: 'default' },
);
const itemFiles = import.meta.glob<{ items: Item[] }>(
  '../../content/items/*.json', { eager: true, import: 'default' },
);
const activityFiles = import.meta.glob<{ activities: Activity[] }>(
  '../../content/activities/**/*.json', { eager: true, import: 'default' },
);
const cardFiles = import.meta.glob<{ cards: GawinNatinCard[] }>(
  '../../content/gawin-natin/*.json', { eager: true, import: 'default' },
);

function sortedValues<T>(files: Record<string, T>): T[] {
  return Object.keys(files).sort().map((k) => files[k]);
}

export const content: ContentBundle = {
  sources: sourcesFile.sources as Record<string, SourceDoc>,
  levels: levelsFile.levels as Level[],
  dailyCapMinutes: levelsFile.dailyCapMinutes,
  places: placesFile.places as Place[],
  mapImage: placesFile.mapImage,
  competencies: sortedValues(competencyFiles).flatMap((f) => f.competencies),
  items: sortedValues(itemFiles).flatMap((f) => f.items),
  activities: sortedValues(activityFiles).flatMap((f) => f.activities),
  cards: sortedValues(cardFiles).flatMap((f) => f.cards),
  lang: { fil: fil as Strings, en: en as Strings, ilo: ilo as Strings },
  assets: { images: assetsFile.images, audio: assetsFile.audio } as AssetManifest,
};

const itemMap = new Map(content.items.map((i) => [i.id, i]));
const activityMap = new Map(content.activities.map((a) => [a.id, a]));
const competencyMap = new Map(content.competencies.map((c) => [c.id, c]));
const placeMap = new Map(content.places.map((p) => [p.id, p]));

export function getItem(id: string): Item {
  const item = itemMap.get(id);
  if (!item) throw new Error(`Unknown item: ${id}`);
  return item;
}

export function getActivity(id: string): Activity {
  const activity = activityMap.get(id);
  if (!activity) throw new Error(`Unknown activity: ${id}`);
  return activity;
}

export function getCompetency(id: string): Competency | undefined {
  return competencyMap.get(id);
}

export function getPlace(id: string): Place {
  const place = placeMap.get(id);
  if (!place) throw new Error(`Unknown place: ${id}`);
  return place;
}

export function getLevel(id: number): Level {
  const level = content.levels.find((l) => l.id === id);
  if (!level) throw new Error(`Unknown level: ${id}`);
  return level;
}

export function getStage(levelId: number, stageId: StageId): Stage | undefined {
  return getLevel(levelId).stages.find((s) => s.id === stageId);
}

/** Is Ilokano filled in enough to offer it? (Every string must have text.) */
export function languageReady(lang: Lang): boolean {
  const strings = content.lang[lang];
  const base = content.lang.fil;
  return Object.keys(base).every((k) => (strings[k] ?? '').trim() !== '');
}
