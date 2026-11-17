// Reading and writing narration.csv in a way Excel understands.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export const HEADER = ['file name', 'language', 'speaker', 'exact text', 'pronunciation note', 'status'];

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

const escape = (v) => (/[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);

/** Rows as objects: { file, language, speaker, text, note, status } */
export function readNarration(path) {
  if (!existsSync(path)) return [];
  const [head, ...rest] = parseCsv(readFileSync(path, 'utf8'));
  const col = (name) => head.indexOf(name);
  return rest.map((r) => ({
    file: r[col('file name')] ?? '',
    language: r[col('language')] ?? '',
    speaker: r[col('speaker')] ?? '',
    text: r[col('exact text')] ?? '',
    note: r[col('pronunciation note')] ?? '',
    status: (r[col('status')] ?? 'new').trim() || 'new',
  }));
}

export function writeNarration(path, rows) {
  const lines = [HEADER, ...rows.map((r) => [r.file, r.language, r.speaker, r.text, r.note, r.status])];
  // ﻿ lets Excel show Filipino letters correctly.
  writeFileSync(path, '﻿' + lines.map((l) => l.map((v) => escape(String(v ?? ''))).join(',')).join('\r\n') + '\r\n');
}
