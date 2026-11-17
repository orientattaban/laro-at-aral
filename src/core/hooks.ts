import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lang } from '../content/types';
import type { Pose } from '../components/Butil';
import type { SpeakOptions } from '../engines/types';
import { hasClip, playClip, stopSpeech } from './audio';
import { wait } from './util';

/** true while the component is on screen. Stops late sounds changing a closed screen. */
export function useAlive() {
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  return alive;
}

export interface Line {
  key: string;
  picture?: string;
  pose: Pose;
}

/**
 * Butil's voice for one screen. `speak` plays the narration clip for a text
 * key and shows it in his bubble. If the clip does not exist yet, the bubble
 * shows the picture cue silently. `replay` repeats the last instruction.
 */
export function useNarrator(lang: Lang) {
  const [line, setLine] = useState<Line | null>(null);
  const prompt = useRef<{ key: string; options: SpeakOptions } | null>(null);
  const sequence = useRef(0);
  const alive = useAlive();

  const speak = useCallback(async (key: string, options: SpeakOptions = {}) => {
    const mine = ++sequence.current;
    const silent = !hasClip(lang, key);
    const picture = options.picture ?? (silent ? options.pictureIfSilent : undefined);
    if (!options.transient) prompt.current = { key, options };
    if (alive.current) setLine({ key, picture, pose: options.pose ?? 'wave' });
    await playClip(lang, key);
    if (silent && options.transient) await wait(500);
    // After short feedback, bring the instruction back.
    if (options.transient && alive.current && sequence.current === mine && prompt.current) {
      const p = prompt.current;
      const promptSilent = !hasClip(lang, p.key);
      setLine({
        key: p.key,
        picture: p.options.picture ?? (promptSilent ? p.options.pictureIfSilent : undefined),
        pose: 'idle',
      });
    }
  }, [lang, alive]);

  const replay = useCallback(() => {
    if (prompt.current) void speak(prompt.current.key, prompt.current.options);
  }, [speak]);

  useEffect(() => () => stopSpeech(), []);

  return { line, speak, replay };
}
