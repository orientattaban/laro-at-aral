// The shape of every content file. If you add a field to a content file,
// describe it here so mistakes are caught before the game runs.

export type Status = 'verified' | 'needs-review';
export type Lang = 'fil' | 'en' | 'ilo';
export type StageId = 'A' | 'B';

/** The fifteen engines from the brief, plus the Stage A hide-and-find game. */
export type EngineId =
  | 'tap-and-hear'
  | 'find-it'
  | 'match-pairs'
  | 'sort'
  | 'count'
  | 'pattern'
  | 'sequence'
  | 'trace'
  | 'puzzle'
  | 'story'
  | 'word-builder'
  | 'number-work'
  | 'read-and-answer'
  | 'sing-and-move'
  | 'gawin-natin'
  | 'hide-and-find';

export const ALL_ENGINES: EngineId[] = [
  'tap-and-hear', 'find-it', 'match-pairs', 'sort', 'count', 'pattern', 'sequence', 'trace',
  'puzzle', 'story', 'word-builder', 'number-work', 'read-and-answer', 'sing-and-move', 'gawin-natin',
  'hide-and-find',
];

export type AreaId = 'physical' | 'social-emotional' | 'character' | 'cognitive' | 'language' | 'creative';

export interface SourceRef {
  /** Key in content/sources.json */
  doc: string;
  /** Page number as printed on the page, or null when not from a page */
  page: number | null;
  /** The theme, subtheme or competency named in the document */
  ref: string;
}

export interface SourceDoc {
  title: string;
  publisher: string;
  file: string | null;
  inCurriculumFolder: boolean;
  pageNote: string;
}

export interface Sourced {
  source: SourceRef;
  status: Status;
}

export interface Item extends Sourced {
  id: string;
  image: string;
  /** Language key of the word. The Find-it question is at `${text}.find`. */
  text: string;
  tags: string[];
}

export interface Competency extends Sourced {
  id: string;
  level: number;
  theme: string;
  area: AreaId;
  title: string;
}

interface ActivityBase extends Sourced {
  id: string;
  engine: EngineId;
  level: number;
  /** Earliest stage that may play it */
  stage: StageId;
  place: string;
  theme: string;
  competencies: string[];
  /** Language key of the spoken instruction */
  instruction: string;
  /** Item whose picture stands for this game on the place screen, or a "draw:" picture */
  tile: string;
  /** true = prayer or faith content, shown only when the parent switches it on */
  faith: boolean;
}

export interface ItemActivity extends ActivityBase {
  engine: 'tap-and-hear' | 'find-it' | 'match-pairs' | 'hide-and-find' | 'puzzle';
  items: string[];
}

export interface CountActivity extends ActivityBase {
  engine: 'count';
  /** The things to count; one kind is shown per question */
  items: string[];
  /** Highest number asked (Level 1: 5) */
  max: number;
}

export type MoveAction = 'clap' | 'stomp' | 'pat' | 'turn';
export const MOVE_ACTIONS: MoveAction[] = ['clap', 'stomp', 'pat', 'turn'];

export interface SingVerse {
  /** Language key of the spoken chant line */
  line: string;
  action: MoveAction;
}

export interface SingActivity extends ActivityBase {
  engine: 'sing-and-move';
  /** Speed of the drum beat made in code */
  bpm: number;
  verses: SingVerse[];
  /** After which verses (counting from 0) the beat stops for the freeze game */
  freezeAfter: number[];
}

export type BasketCue =
  | { kind: 'size'; value: 'malaki' | 'maliit' }
  | { kind: 'item'; item: string }
  | { kind: 'draw'; image: string }
  | { kind: 'colour'; value: string }
  | { kind: 'other-colours'; value: string };

export interface SortBasket {
  id: string;
  label: string;
  cue: BasketCue;
}

export interface SortEntry {
  item: string;
  variant?: 'malaki' | 'maliit';
  basket: string;
}

export interface SortRound {
  rule: string;
  /** Competency this round practises. Defaults to the activity's first one. */
  competency?: string;
  instruction: string;
  baskets: SortBasket[];
  entries: SortEntry[];
}

export interface SortActivity extends ActivityBase {
  engine: 'sort';
  rounds: SortRound[];
}

export type Activity = ItemActivity | SortActivity | CountActivity | SingActivity;

export interface GawinNatinCard extends Sourced {
  id: string;
  level: number;
  theme: string;
  text: string;
  tile: string;
  faith: boolean;
}

export interface Stage {
  id: StageId;
  name: string;
  sessionMinutes: number;
  maxChoices: number;
  status: Status;
  note: string;
}

export interface Level {
  id: number;
  key: string;
  name: string;
  built: boolean;
  sessionMinutes: number;
  stages: Stage[];
}

export interface Place {
  id: string;
  level: number;
  name: string;
  image: string;
  icon: string;
  mapSpot: { x: number; y: number };
}

export interface AssetManifest {
  images: Record<string, string>;
  audio: Record<string, string>;
}

export type Strings = Record<string, string>;

export interface ContentBundle {
  sources: Record<string, SourceDoc>;
  levels: Level[];
  dailyCapMinutes: number;
  places: Place[];
  mapImage: string;
  competencies: Competency[];
  items: Item[];
  activities: Activity[];
  cards: GawinNatinCard[];
  lang: Record<Lang, Strings>;
  assets: AssetManifest;
}
