// Writes narration.csv: one row for every line the game speaks, in Filipino and English.
// Columns: file name, language, speaker, exact text, pronunciation note, status.
//
// Safe to run again at any time:
//   - rows you have already edited keep your pronunciation note and status
//   - if the text in content/lang changes, that row goes back to "new"
//     so only it is generated again
//   - nothing is ever sent to a speech service by this script
// Ilokano has no rows until an Ilokano speaker has written the text.
// Run: npm run narration:csv
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const CSV = join(root, 'narration.csv');
const read = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const readAll = (dir, key) => {
  const out = [];
  const walk = (d) => {
    for (const entry of readdirSync(join(root, d), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory()) walk(join(d, entry.name));
      else if (entry.name.endsWith('.json')) out.push(...read(join(d, entry.name))[key]);
    }
  };
  walk(dir);
  return out;
};

const lang = { fil: read('content/lang/fil.json'), en: read('content/lang/en.json'), ilo: read('content/lang/ilo.json') };
const items = readAll('content/items', 'items');
const activities = readAll('content/activities', 'activities');

// ---- Which lines are spoken, and by whom ----
// Butil: instructions, questions, praise and goodbye (warm, cheerful).
// Teacher Liza: the names of things, said clearly, one word at a time.
// Lola Auring: stories (none yet at this stage).
const used = new Set();
for (const a of activities) {
  used.add(a.tile);
  for (const id of a.items ?? []) used.add(id);
  for (const round of a.rounds ?? []) {
    for (const entry of round.entries) used.add(entry.item);
    for (const basket of round.baskets) if (basket.cue.kind === 'item') used.add(basket.cue.item);
  }
}

const lines = []; // { key, speaker, group }
const add = (key, speaker, group) => { if (!lines.some((l) => l.key === key)) lines.push({ key, speaker, group }); };

for (const key of Object.keys(lang.fil)) if (key.startsWith('instr.')) add(key, 'Butil', 'instruction');
for (const item of items.filter((i) => used.has(i.id))) {
  add(item.text, 'Teacher Liza', 'word');
  add(`${item.text}.find`, 'Butil', 'question');
}
for (const key of Object.keys(lang.fil)) if (key.startsWith('sort.')) add(key, 'Teacher Liza', 'word');
for (const key of Object.keys(lang.fil)) if (key.startsWith('fb.')) add(key, 'Butil', 'feedback');
for (const key of ['bye.session', 'bye.daily']) add(key, 'Butil', 'goodbye');

// ---- Pronunciation notes I am fairly sure of (stressed syllable in capitals). Please check. ----
// The speech service reads these notes as guidance, never aloud.
const STRESS = {
  Nanay: 'NA-nay', Tatay: 'TA-tay', Ate: 'A-te', Kuya: 'KU-ya', Lola: 'LO-la', Lolo: 'LO-lo',
  pamilya: 'pa-MIL-ya', masaya: 'ma-sa-YA', malungkot: 'ma-lung-KOT', galit: 'ga-LIT',
  takot: 'ta-KOT', gulat: 'gu-LAT', inaantok: 'i-na-an-TOK', nahihiya: 'na-hi-HI-ya',
  sipilyo: 'si-PIL-yo', sabon: 'SA-bon', tuwalya: 'tu-WAL-ya', suklay: 'SUK-lay',
  baso: 'BA-so', banig: 'BA-nig', unan: 'U-nan', tsinelas: 'tsi-NE-las',
  kanin: 'KA-nin', mais: 'ma-IS', saging: 'SA-ging', mangga: 'MANG-ga', papaya: 'pa-PA-ya',
  niyog: 'ni-YOG', kamatis: 'ka-MA-tis', talong: 'ta-LONG', kalabasa: 'ka-la-BA-sa',
  malaki: 'ma-la-KI', maliit: 'ma-li-IT', pula: 'pu-LA', kamiseta: 'ka-mi-SE-ta',
  kumakain: 'ku-MA-ka-in', basket: 'BAS-ket', magaling: 'ma-ga-LING',
};

function noteFor(code, text, group) {
  if (code !== 'fil') return group === 'word' ? 'Say the word once, clearly.' : '';
  const found = [];
  for (const word of text.replace(/[.,!?]/g, '').split(/\s+/)) {
    const bare = word.replace(/^(ang|si|ng|na)$/i, '');
    const key = Object.keys(STRESS).find((k) => k.toLowerCase() === bare.toLowerCase() || bare.toLowerCase() === `${k.toLowerCase()}ng`);
    if (key && !found.includes(`${key}: ${STRESS[key]}`)) found.push(`${key}: ${STRESS[key]}`);
  }
  const parts = [];
  if (group === 'word') parts.push('Say the word once, clearly.');
  if (found.length) parts.push(`Stress: ${found.join('; ')}.`);
  return parts.join(' ');
}

// ---- CSV helpers (Excel-friendly) ----
const HEADER = ['file name', 'language', 'speaker', 'exact text', 'pronunciation note', 'status'];
const LANG_NAME = { fil: 'Filipino', en: 'English', ilo: 'Ilokano' };
const escape = (v) => (/[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);

function parseCsv(text) {
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

// Rows already in the file, by file name.
const previous = new Map();
if (existsSync(CSV)) {
  const [head, ...rest] = parseCsv(readFileSync(CSV, 'utf8'));
  const col = (name) => head.indexOf(name);
  for (const r of rest) {
    previous.set(r[col('file name')], {
      text: r[col('exact text')], note: r[col('pronunciation note')], status: r[col('status')],
    });
  }
}

const out = [HEADER];
const counts = { new: 0, changed: 0, kept: 0 };
for (const code of ['fil', 'en', 'ilo']) {
  for (const line of lines) {
    const text = (lang[code][line.key] ?? '').trim();
    if (!text) continue; // Ilokano: nothing until the family writes it
    const file = `${code}/${line.key}.mp3`;
    const before = previous.get(file);
    let note = noteFor(code, text, line.group);
    let status = 'new';
    if (before) {
      note = before.note;
      if (before.text === text) { status = before.status || 'new'; counts.kept++; }
      else { status = 'new'; counts.changed++; }
    } else counts.new++;
    out.push([file, LANG_NAME[code], line.speaker, text, note, status]);
  }
}

// ﻿ lets Excel show ñ and other letters correctly.
writeFileSync(CSV, '﻿' + out.map((r) => r.map(escape).join(',')).join('\r\n') + '\r\n');
const rows = out.length - 1;
const bySpeaker = {};
for (const r of out.slice(1)) bySpeaker[`${r[1]} / ${r[2]}`] = (bySpeaker[`${r[1]} / ${r[2]}`] ?? 0) + 1;
console.log(`narration.csv: ${rows} lines (${counts.new} new, ${counts.changed} changed text, ${counts.kept} unchanged).`);
for (const [k, v] of Object.entries(bySpeaker)) console.log(`  ${k}: ${v}`);
console.log('Ilokano: no lines until an Ilokano speaker has written the text.');
