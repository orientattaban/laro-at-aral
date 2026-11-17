// Every word shown or spoken comes from content/lang/*.json through this file.
import { content } from '../content';
import type { Lang } from '../content/types';

/**
 * Look up a text. If the chosen language has no text for the key
 * (for example Ilokano, not filled in yet), Filipino is used.
 */
export function t(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let text = content.lang[lang]?.[key];
  if (text === undefined || text.trim() === '') text = content.lang.fil[key];
  if (text === undefined) return key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

/** Which language's narration clip to use for a key (falls back like t()). */
export function clipLang(lang: Lang, key: string): Lang {
  const text = content.lang[lang]?.[key];
  return text === undefined || text.trim() === '' ? 'fil' : lang;
}
