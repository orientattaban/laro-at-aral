// Saving to the device with IndexedDB (the browser's built-in local database).
// Nothing here ever uses the network.
import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import { sanitizeSave, trimUsage } from './save';
import type { SaveData } from './save';

const DB_NAME = 'laro-at-aral';
const STORE = 'kv';
const KEY = 'save';

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE);
      },
    });
  }
  return dbPromise;
}

/** For tests only: forget the open connection. */
export function resetStorageConnection(): void {
  dbPromise = null;
}

export async function loadSave(dailyCapMinutes: number): Promise<SaveData | null> {
  try {
    const raw = await (await db()).get(STORE, KEY);
    return sanitizeSave(raw, dailyCapMinutes);
  } catch {
    return null;
  }
}

export async function writeSave(data: SaveData): Promise<void> {
  const toStore: SaveData = { ...data, usage: trimUsage(data.usage) };
  await (await db()).put(STORE, toStore, KEY);
}

export async function clearSave(): Promise<void> {
  await (await db()).delete(STORE, KEY);
}

export interface ExportFile {
  app: 'laro-at-aral';
  exportedAt: string;
  appVersion: string;
  save: SaveData;
}

export function makeExport(data: SaveData, appVersion: string, now: Date = new Date()): string {
  const file: ExportFile = {
    app: 'laro-at-aral',
    exportedAt: now.toISOString(),
    appVersion,
    save: { ...data, usage: trimUsage(data.usage) },
  };
  return JSON.stringify(file, null, 2);
}

/** Read an exported file. Returns null (and changes nothing) if it is not valid. */
export function parseImport(text: string, dailyCapMinutes: number): SaveData | null {
  try {
    const file = JSON.parse(text) as Partial<ExportFile>;
    if (!file || file.app !== 'laro-at-aral') return null;
    return sanitizeSave(file.save, dailyCapMinutes);
  } catch {
    return null;
  }
}
