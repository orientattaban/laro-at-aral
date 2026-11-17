// Makes the narration clips listed in narration.csv, on this laptop.
// Only rows with status "new" or "redo" are made, so running it again costs little.
// Requests are spaced out to stay inside the Gemini free tier. If the daily limit
// is reached, it stops, keeps everything made so far, and continues next time.
//
//   npm run narration                      make all new and redo rows
//   npm run narration -- --dry-run         list what would be made, contact nothing
//   npm run narration -- --only fil/item.pamilya.nanay.mp3   make one row
//   npm run narration -- --single          one line per request (no grouping)
//   npm run narration -- --redo-speaker "Butil"   mark one character's rows to be made again
//
// A redo note can contain a respelling. Write it as:  say: sang-gol
// The respelling is spoken instead of the text, but the game still shows the real text.
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readNarration, writeNarration } from './lib/csv.mjs';
import { QuotaError, durationSeconds, makeClient, readApiKey, pieceToMp3, speakPatiently, wavToMp3 } from './lib/tts.mjs';
import { chooseCuts, findSilences } from './lib/split.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const CSV = join(root, 'narration.csv');
const AUDIO_DIR = join(root, 'public', 'assets', 'audio');
const config = JSON.parse(readFileSync(join(root, 'narration-voices.json'), 'utf8'));
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const log = (...m) => console.log(...m);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Puts every finished clip into the list the game reads. */
export function syncAudioManifest() {
  const manifestPath = join(root, 'content', 'asset-manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const audio = {};
  for (const lang of existsSync(AUDIO_DIR) ? readdirSync(AUDIO_DIR) : []) {
    for (const file of readdirSync(join(AUDIO_DIR, lang))) {
      if (file.endsWith('.mp3')) audio[`${lang}/${file.slice(0, -4)}`] = `assets/audio/${lang}/${file}`;
    }
  }
  manifest.audio = Object.fromEntries(Object.entries(audio).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return Object.keys(audio).length;
}

function spokenText(row) {
  const respelling = /(?:^|\s)say:\s*(.+)$/i.exec(row.note ?? '');
  return respelling ? respelling[1].trim() : row.text;
}

function styleFor(row) {
  const speaker = config.speakers[row.speaker];
  if (!speaker) throw new Error(`No voice set for speaker "${row.speaker}" in narration-voices.json`);
  const note = (row.note ?? '').replace(/(?:^|\s)say:\s*.+$/i, '').trim();
  const lang = row.language === 'Filipino' ? 'in Filipino (Tagalog), with natural Filipino pronunciation' : 'in English';
  return [speaker.style, lang, note].filter(Boolean).join('. ');
}

// ---- Several lines in one request ----
// The free tier allows only a few requests a day, so lines by the same speaker in
// the same language are sent together, with long pauses between them, and the
// recording is cut apart afterwards. Rows marked "redo" or with a "say:" respelling
// are always made on their own, because their note applies to them alone.
const MAX_GROUP_CHARS = 380;

function makeGroups(todo, size) {
  const groups = [];
  const open = new Map();
  for (const row of todo) {
    const alone = size <= 1 || row.status === 'redo' || /(?:^|\s)say:/i.test(row.note ?? '');
    if (alone) { groups.push([row]); continue; }
    const key = `${row.language}|${row.speaker}`;
    let group = open.get(key);
    const chars = (g) => g.reduce((n, r) => n + spokenText(r).length, 0);
    if (!group || group.length >= size || chars(group) + spokenText(row).length > MAX_GROUP_CHARS) {
      group = [];
      groups.push(group);
      open.set(key, group);
    }
    group.push(row);
  }
  return groups;
}

function groupText(group) {
  return group
    .map((r) => { const t = spokenText(r).trim(); return /[.!?]$/.test(t) ? t : `${t}.`; })
    .join(' <long pause> ');
}

function groupStyle(group) {
  const speaker = config.speakers[group[0].speaker];
  const lang = group[0].language === 'Filipino' ? 'in Filipino (Tagalog), with natural Filipino pronunciation' : 'in English';
  const stress = [...new Set(group.flatMap((r) => {
    const m = /Stress: (.+?)\.?$/.exec(r.note ?? '');
    return m ? m[1].split(';').map((s) => s.trim()) : [];
  }))];
  return [
    speaker.style,
    lang,
    'Each sentence is separate: say each one completely with its own natural ending, then pause for a long moment before the next',
    stress.length ? `Stress: ${stress.join('; ')}` : '',
  ].filter(Boolean).join('. ');
}

async function main() {
  const rows = readNarration(CSV);
  if (rows.length === 0) throw new Error('narration.csv is empty. Run: npm run narration:csv');

  const redoSpeaker = option('--redo-speaker');
  if (redoSpeaker) {
    let n = 0;
    for (const row of rows) if (row.speaker === redoSpeaker && row.status !== 'new') { row.status = 'redo'; n++; }
    writeNarration(CSV, rows);
    log(`Marked ${n} rows of ${redoSpeaker} as "redo". Run npm run narration to make them.`);
    return;
  }

  const only = option('--only');
  const todo = rows.filter((r) =>
    (only ? r.file === only : (r.status === 'new' || r.status === 'redo')) &&
    (r.language === 'Filipino' || r.language === 'English'));
  log(`${todo.length} clips to make (${rows.length} lines in narration.csv).`);
  if (todo.length === 0) { log(`The game has ${syncAudioManifest()} clips.`); return; }
  if (flag('--dry-run')) {
    const groups = makeGroups(todo, flag('--single') ? 1 : (config.pacing.linesPerRequest ?? 10));
    log(`${groups.length} requests would be needed.`);
    for (const g of groups.slice(0, 400)) log(`  [${g[0].language} / ${g[0].speaker}, ${g.length} lines]  ${g.length === 1 ? spokenText(g[0]) : groupText(g)}`);
    return;
  }

  const client = makeClient(readApiKey(root));
  const max = Number(option('--max') ?? config.pacing.maxRequestsPerRun);
  const gap = config.pacing.secondsBetweenRequests * 1000;
  let made = 0;
  let stoppedForToday = false;
  let requests = 0;
  let failures = 0;
  const queue = makeGroups(todo, flag('--single') ? 1 : (config.pacing.linesPerRequest ?? 10));
  log(`${queue.length} requests planned${queue.some((g) => g.length > 1) ? ' (several lines per request, cut apart afterwards)' : ''}.`);

  const save = (row, out) => {
    const seconds = durationSeconds(out);
    row.status = 'generated';
    made++;
    log(`ok ${String(made).padStart(3)}  ${row.file}  ${seconds.toFixed(1)} s${seconds > 9 ? '  (long: please listen)' : ''}`);
  };

  while (queue.length > 0 && requests < max) {
    const group = queue.shift();
    const started = Date.now();
    const speaker = config.speakers[group[0].speaker];
    requests++;
    try {
      const wav = await speakPatiently(client, {
        model: config.model,
        voice: speaker.voice,
        language: config.languageCodes[group[0].language],
        style: group.length === 1 ? styleFor(group[0]) : groupStyle(group),
        text: group.length === 1 ? spokenText(group[0]) : groupText(group),
      }, log);
      if (group.length === 1) {
        const out = join(AUDIO_DIR, group[0].file);
        wavToMp3(wav, out);
        save(group[0], out);
      } else {
        const work = join(tmpdir(), `laro-group-${process.pid}-${requests}.wav`);
        writeFileSync(work, wav);
        try {
          const { silences, total } = findSilences(work);
          const result = chooseCuts(silences, total, group.map((r) => spokenText(r)));
          if (result.error) {
            // Not saved. Make these lines again in two smaller groups.
            const half = Math.ceil(group.length / 2);
            queue.unshift(group.slice(0, half), group.slice(half));
            log(`   could not cut a group of ${group.length} cleanly (${result.error}); trying again in smaller groups`);
          } else {
            result.pieces.forEach((piece, i) => {
              const out = join(AUDIO_DIR, group[i].file);
              pieceToMp3(work, piece, out);
              save(group[i], out);
            });
          }
        } finally {
          rmSync(work, { force: true });
        }
      }
      writeNarration(CSV, rows); // save after every request, so nothing is lost if it stops
    } catch (error) {
      if (error instanceof QuotaError) {
        stoppedForToday = true;
        log('\nThe free limit for today has been reached. Everything made so far is kept.');
        log('Run the same command again tomorrow to continue where it stopped.');
        break;
      }
      failures++;
      log(`FAILED ${group.map((r) => r.file).join(', ')}: ${String(error.message ?? error).slice(0, 300)}`);
      if (made === 0 && failures >= 2) throw new Error('The first requests failed, so I stopped. Nothing was changed.');
    }
    const elapsed = Date.now() - started;
    if (queue.length > 0 && elapsed < gap) await wait(gap - elapsed);
  }
  log(`\nRequests used: ${requests}.`);

  const total = syncAudioManifest();
  const left = readNarration(CSV).filter((r) => r.status === 'new' || r.status === 'redo').length;
  log(`\nMade ${made} clips. The game now has ${total} clips. Still to make: ${left}.`);
  if (left > 0 && !stoppedForToday) log('Run the same command again to make the rest.');
  log('Listen to them with: npm run narration:review');
}

main().catch((error) => {
  console.error(`\n${error.message ?? error}`);
  process.exit(1);
});
