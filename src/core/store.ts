// One place that holds the saved data while the app is open, and writes it
// to the device a moment after every change.
import { useSyncExternalStore } from 'react';
import { content } from '../content';
import { defaultSave } from './save';
import type { SaveData } from './save';
import { clearSave, loadSave, writeSave } from './storage';

type Listener = () => void;

const SAVE_EVERY_MS = 4000;

class Store {
  private data: SaveData = defaultSave(content.dailyCapMinutes);
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;
  ready = false;

  async init(): Promise<void> {
    const saved = await loadSave(content.dailyCapMinutes);
    if (saved) this.data = saved;
    this.ready = true;
    this.emit();
  }

  get = (): SaveData => this.data;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  set(updater: (data: SaveData) => SaveData, saveNow = false): void {
    const next = updater(this.data);
    if (next === this.data) return;
    this.data = next;
    this.dirty = true;
    this.emit();
    if (saveNow) void this.flush();
    else if (!this.timer) this.timer = setTimeout(() => void this.flush(), SAVE_EVERY_MS);
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.dirty) return;
    this.dirty = false;
    try {
      await writeSave(this.data);
    } catch {
      this.dirty = true; // try again on the next change
    }
  }

  async replace(data: SaveData): Promise<void> {
    this.data = data;
    this.dirty = true;
    this.emit();
    await this.flush();
  }

  async resetAll(): Promise<void> {
    await clearSave();
    this.data = defaultSave(content.dailyCapMinutes);
    this.dirty = false;
    this.emit();
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }
}

export const store = new Store();

/** Read part of the saved data in a screen. The screen redraws when that part changes. */
export function useSave<T>(selector: (data: SaveData) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()));
}
