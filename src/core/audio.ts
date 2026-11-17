// Sound. Narration clips are files bundled with the app (made in Phase 2).
// Sound effects are made in code, so they need no files at all.
// If a narration clip does not exist yet, nothing is played, the picture cue
// is shown instead, and the clip is added to the "missing" list.
import { content } from '../content';
import type { Lang } from '../content/types';
import { clipLang } from './i18n';

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let currentSpeech: AudioBufferSourceNode | null = null;
const buffers = new Map<string, AudioBuffer>();
const missing = new Set<string>();

function getCtx(): Ctx | null {
  if (ctx) return ctx;
  const AC: typeof AudioContext | undefined =
    typeof window !== 'undefined'
      ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Phones only allow sound after the first touch. Call this on that touch. */
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === 'suspended') void c.resume();
}

export function clipKey(lang: Lang, key: string): string {
  return `${clipLang(lang, key)}/${key}`;
}

export function hasClip(lang: Lang, key: string): boolean {
  return clipKey(lang, key) in content.assets.audio;
}

export function missingClips(): string[] {
  return [...missing].sort();
}

let finishCurrent: (() => void) | null = null;

export function stopSpeech(): void {
  if (currentSpeech) {
    try {
      currentSpeech.onended = null;
      currentSpeech.stop();
    } catch {
      /* already stopped */
    }
    currentSpeech = null;
  }
  // Whoever was waiting for the clip to end must not wait forever.
  if (finishCurrent) {
    const done = finishCurrent;
    finishCurrent = null;
    done();
  }
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Play the narration clip for a text key. Resolves when it has finished.
 * Returns false if there is no clip (the caller shows the picture cue).
 */
export async function playClip(lang: Lang, key: string): Promise<boolean> {
  const id = clipKey(lang, key);
  const path = content.assets.audio[id];
  if (!path) {
    missing.add(id);
    // A short pause keeps the pacing gentle even without a voice.
    await wait(450);
    return false;
  }
  const c = getCtx();
  if (!c) return false;
  try {
    let buffer = buffers.get(id);
    if (!buffer) {
      // Same-origin file that the app precached at install. Not a network call when offline.
      const response = await fetch(path);
      buffer = await c.decodeAudioData(await response.arrayBuffer());
      buffers.set(id, buffer);
    }
    stopSpeech();
    const source = c.createBufferSource();
    source.buffer = buffer;
    source.connect(c.destination);
    currentSpeech = source;
    await new Promise<void>((resolve) => {
      finishCurrent = resolve;
      source.onended = () => {
        if (finishCurrent === resolve) finishCurrent = null;
        resolve();
      };
      source.start();
    });
    if (currentSpeech === source) currentSpeech = null;
    return true;
  } catch {
    missing.add(id);
    return false;
  }
}

// ---------- Sound effects made in code ----------

interface Tone {
  freq: number;
  start: number;
  length: number;
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
}

function playTones(tones: Tone[]): void {
  const c = getCtx();
  if (!c || c.state !== 'running') return;
  const now = c.currentTime;
  for (const tone of tones) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = tone.type ?? 'sine';
    osc.frequency.setValueAtTime(tone.freq, now + tone.start);
    if (tone.slideTo) osc.frequency.linearRampToValueAtTime(tone.slideTo, now + tone.start + tone.length);
    const peak = tone.gain ?? 0.16;
    gain.gain.setValueAtTime(0.0001, now + tone.start);
    gain.gain.linearRampToValueAtTime(peak, now + tone.start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.length);
    osc.connect(gain).connect(c.destination);
    osc.start(now + tone.start);
    osc.stop(now + tone.start + tone.length + 0.05);
  }
}

export const sfx = {
  /** A soft "pop" when something is touched */
  tap: () => playTones([{ freq: 520, start: 0, length: 0.09, type: 'triangle', gain: 0.12 }]),
  /** Two rising notes */
  correct: () =>
    playTones([
      { freq: 660, start: 0, length: 0.16, type: 'triangle' },
      { freq: 880, start: 0.13, length: 0.22, type: 'triangle' },
    ]),
  /** A low, gentle "hmm": never harsh */
  tryAgain: () => playTones([{ freq: 330, start: 0, length: 0.22, type: 'sine', gain: 0.1, slideTo: 290 }]),
  flip: () => playTones([{ freq: 420, start: 0, length: 0.06, type: 'triangle', gain: 0.08 }]),
  /** Three calm notes for the end of a game. Under two seconds. */
  reward: () =>
    playTones([
      { freq: 523, start: 0, length: 0.25, type: 'triangle' },
      { freq: 659, start: 0.2, length: 0.25, type: 'triangle' },
      { freq: 784, start: 0.4, length: 0.5, type: 'triangle' },
    ]),
};
