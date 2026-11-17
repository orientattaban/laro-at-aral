// The listening page for narration. Runs on this laptop only.
//   npm run narration:review     then open http://localhost:4300
// Every clip with its text, a play button, and "Approve" or "Redo with a note".
// Choices are written straight into narration.csv. The voice audition is at the top.
// The page and the clips never leave this laptop.
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readNarration, writeNarration } from './lib/csv.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const CSV = join(root, 'narration.csv');
const AUDIO = join(root, 'public', 'assets', 'audio');
const AUDITION = join(root, 'narration-audition');
const VOICES = join(root, 'narration-voices.json');
const PORT = Number(process.env.PORT ?? 4300);

const page = String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Narration review</title>
<style>
  :root { --ink:#3d2a1a; --line:#d8c8b0; --ok:#2f6d33; --redo:#9c2a21; --bg:#fdf8ee; }
  * { box-sizing:border-box; }
  body { margin:0; font:16px/1.4 system-ui, sans-serif; color:var(--ink); background:var(--bg); }
  header { position:sticky; top:0; z-index:2; background:#f2b63c; padding:10px 16px; display:flex; flex-wrap:wrap; gap:10px 18px; align-items:center; }
  header h1 { font-size:20px; margin:0; }
  header label { display:flex; gap:6px; align-items:center; }
  select, input[type=text] { font:inherit; padding:4px 8px; border:2px solid var(--ink); border-radius:8px; background:#fff; }
  main { max-width:1000px; margin:0 auto; padding:12px 16px 60px; }
  h2 { margin:22px 0 8px; font-size:18px; }
  .help { margin:6px 0 12px; }
  table { width:100%; border-collapse:collapse; background:#fff; }
  th, td { border-bottom:1px solid var(--line); padding:8px; text-align:left; vertical-align:top; }
  th { font-size:13px; text-transform:uppercase; letter-spacing:.03em; }
  td.text { font-size:18px; font-weight:600; }
  td.text small { display:block; font-weight:400; font-size:13px; opacity:.75; }
  button { font:inherit; padding:6px 12px; border-radius:8px; border:2px solid var(--ink); background:#fff; cursor:pointer; min-height:40px; }
  button.play { min-width:64px; }
  button.ok { border-color:var(--ok); color:var(--ok); }
  button.redo { border-color:var(--redo); color:var(--redo); }
  .status { font-weight:700; font-size:13px; padding:2px 8px; border-radius:99px; border:2px solid; display:inline-block; }
  .status.approved { color:var(--ok); }
  .status.redo { color:var(--redo); border-style:dashed; }
  .status.new { opacity:.6; }
  .actions { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
  .actions input { flex:1 1 180px; min-width:140px; }
  .voices { display:grid; grid-template-columns:repeat(auto-fill, minmax(230px, 1fr)); gap:10px; }
  .voice { background:#fff; border:2px solid var(--line); border-radius:12px; padding:10px; }
  .voice.chosen { border-color:var(--ok); }
  .muted { opacity:.6; }
  .counts { font-weight:600; }
</style></head>
<body>
<header>
  <h1>Narration review</h1>
  <label>Show <select id="filter">
    <option value="todo">Not yet approved</option><option value="all">All</option>
    <option value="redo">Redo</option><option value="approved">Approved</option></select></label>
  <label>Language <select id="lang"><option>All</option><option>Filipino</option><option>English</option></select></label>
  <span class="counts" id="counts"></span>
</header>
<main>
  <section id="audition"></section>
  <h2>Clips</h2>
  <p class="help">Press <b>Play</b>, then <b>Approve</b> if it sounds right. If not, write what is wrong in the box and press <b>Redo</b>.
  To fix how a word is said, write a respelling as <code>say: sang-gol</code>; it is spoken instead, while the game still shows the real word.
  Nothing on this page is sent anywhere.</p>
  <table><thead><tr><th>Play</th><th>Text</th><th>Speaker</th><th>Status</th><th>Your choice</th></tr></thead><tbody id="rows"></tbody></table>
</main>
<script>
let rows = [], voices = null, audition = [];
const player = new Audio();
const play = (src) => { player.pause(); player.src = src + '?t=' + Date.now(); player.play(); };
async function load() {
  const data = await (await fetch('/api/data')).json();
  rows = data.rows; voices = data.voices; audition = data.audition;
  render();
}
function el(tag, props = {}, ...kids) { const e = Object.assign(document.createElement(tag), props); for (const k of kids) e.append(k); return e; }
function render() {
  const f = document.getElementById('filter').value, l = document.getElementById('lang').value;
  const shown = rows.filter((r) => (l === 'All' || r.language === l) &&
    (f === 'all' || (f === 'todo' ? r.status !== 'approved' : r.status === f)));
  const n = (s) => rows.filter((r) => r.status === s).length;
  document.getElementById('counts').textContent =
    rows.length + ' clips: ' + n('approved') + ' approved, ' + n('generated') + ' to listen to, ' + n('redo') + ' redo, ' + n('new') + ' not made yet';
  const body = document.getElementById('rows'); body.replaceChildren();
  for (const r of shown) {
    const note = el('input', { type: 'text', value: r.note, placeholder: 'What should change?' });
    const tr = el('tr', {},
      el('td', {}, r.hasAudio ? el('button', { className: 'play', textContent: 'Play', onclick: () => play('/audio/' + r.file) }) : el('span', { className: 'muted', textContent: 'not made' })),
      el('td', { className: 'text' }, r.text, el('small', { textContent: r.file })),
      el('td', { textContent: r.speaker }),
      el('td', {}, el('span', { className: 'status ' + r.status, textContent: r.status })),
      el('td', {}, el('div', { className: 'actions' },
        el('button', { className: 'ok', textContent: 'Approve', disabled: !r.hasAudio, onclick: () => save(r, 'approved', note.value) }),
        note,
        el('button', { className: 'redo', textContent: 'Redo', onclick: () => save(r, 'redo', note.value) }))));
    body.append(tr);
  }
  const box = document.getElementById('audition'); box.replaceChildren();
  if (audition.length) {
    box.append(el('h2', { textContent: 'Choose the voices' }),
      el('p', { className: 'help', textContent: 'Each character says the same line in different voices. Press Choose under the one you like best.' }));
    for (const speaker of [...new Set(audition.map((a) => a.speaker))]) {
      const grid = el('div', { className: 'voices' });
      for (const a of audition.filter((x) => x.speaker === speaker)) {
        const chosen = voices.speakers[speaker]?.voice === a.voice;
        grid.append(el('div', { className: 'voice' + (chosen ? ' chosen' : '') },
          el('b', { textContent: a.voice + (chosen ? ' (chosen)' : '') }), el('br'),
          el('small', { textContent: a.text }), el('br'),
          el('button', { className: 'play', textContent: 'Play', onclick: () => play('/audition/' + a.file) }), ' ',
          el('button', { className: 'ok', textContent: 'Choose', disabled: chosen, onclick: () => choose(speaker, a.voice) })));
      }
      box.append(el('h3', { textContent: speaker }), grid);
    }
  }
}
async function save(r, status, note) {
  const res = await fetch('/api/row', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ file: r.file, status, note }) });
  if (res.ok) { r.status = status; r.note = note; render(); } else alert('Could not save: ' + await res.text());
}
async function choose(speaker, voice) {
  const res = await fetch('/api/voice', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ speaker, voice }) });
  if (res.ok) { voices.speakers[speaker].voice = voice; render(); } else alert('Could not save: ' + await res.text());
}
document.getElementById('filter').onchange = render;
document.getElementById('lang').onchange = render;
load();
</script></body></html>`;

function sendFile(res, base, rel, type) {
  const path = normalize(join(base, rel));
  if (!path.startsWith(base) || !existsSync(path)) { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
  createReadStream(path).pipe(res);
}

async function body(req) {
  let text = '';
  for await (const chunk of req) { text += chunk; if (text.length > 100_000) throw new Error('too large'); }
  return JSON.parse(text);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(page);
    } else if (req.method === 'GET' && url.pathname === '/api/data') {
      const rows = readNarration(CSV).map((r) => ({ ...r, hasAudio: existsSync(join(AUDIO, r.file)) }));
      const audition = existsSync(join(AUDITION, 'audition.json')) ? JSON.parse(readFileSync(join(AUDITION, 'audition.json'), 'utf8')) : [];
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ rows, audition, voices: JSON.parse(readFileSync(VOICES, 'utf8')) }));
    } else if (req.method === 'GET' && url.pathname.startsWith('/audio/')) {
      sendFile(res, AUDIO, decodeURIComponent(url.pathname.slice(7)), 'audio/mpeg');
    } else if (req.method === 'GET' && url.pathname.startsWith('/audition/')) {
      sendFile(res, AUDITION, decodeURIComponent(url.pathname.slice(10)), 'audio/mpeg');
    } else if (req.method === 'POST' && url.pathname === '/api/row') {
      const { file, status, note } = await body(req);
      if (!['approved', 'redo'].includes(status)) throw new Error('bad status');
      const rows = readNarration(CSV);
      const row = rows.find((r) => r.file === file);
      if (!row) throw new Error('unknown clip');
      row.status = status;
      row.note = String(note ?? '').replace(/[\r\n]+/g, ' ').slice(0, 300);
      writeNarration(CSV, rows);
      res.writeHead(200).end('ok');
    } else if (req.method === 'POST' && url.pathname === '/api/voice') {
      const { speaker, voice } = await body(req);
      const config = JSON.parse(readFileSync(VOICES, 'utf8'));
      if (!config.speakers[speaker] || !config.audition[speaker]?.includes(voice)) throw new Error('unknown voice');
      config.speakers[speaker].voice = voice;
      writeFileSync(VOICES, JSON.stringify(config, null, 2) + '\n');
      res.writeHead(200).end('ok');
    } else {
      res.writeHead(404).end('not found');
    }
  } catch (error) {
    res.writeHead(400).end(String(error.message ?? error));
  }
});

// Only this laptop can open it: the page is not visible to other devices on the Wi-Fi.
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Narration review is open at http://localhost:${PORT}`);
  console.log('Press Ctrl+C here to close it.');
});
