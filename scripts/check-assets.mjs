// Lists every picture and narration clip the content needs but the app does not have yet.
// Run: npm run check:assets
// Add --strict to make it fail when anything is missing (useful before a release).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const readAll = (dir, key) => {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(join(root, d), { withFileTypes: true })) {
      if (name.isDirectory()) walk(join(d, name.name));
      else if (name.name.endsWith('.json')) out.push(...read(join(d, name.name))[key]);
    }
  };
  walk(dir);
  return out;
};

const manifest = read('content/asset-manifest.json');
const items = readAll('content/items', 'items');
const activities = readAll('content/activities', 'activities');
const places = read('content/places.json');
const fil = read('content/lang/fil.json');
const en = read('content/lang/en.json');

// ---- Pictures ----
const neededImages = new Set();
const usedItems = new Set();
for (const a of activities) {
  usedItems.add(a.tile);
  for (const id of a.items ?? []) usedItems.add(id);
  for (const round of a.rounds ?? []) {
    for (const entry of round.entries) usedItems.add(entry.item);
    for (const basket of round.baskets) if (basket.cue.kind === 'item') usedItems.add(basket.cue.item);
  }
}
for (const item of items) {
  if (usedItems.has(item.id) && !item.image.startsWith('draw:')) neededImages.add(item.image);
}
neededImages.add(places.mapImage);
for (const place of places.places) neededImages.add(place.image);
for (const name of ['char-butil-stand', 'char-butil-cheer', 'char-butil-think', 'char-butil-wave']) neededImages.add(name);

const missingImages = [...neededImages].filter((name) => {
  const path = manifest.images[name];
  return !path || !existsSync(join(root, 'public', path));
}).sort();

// ---- Narration ----
// These kinds of text are spoken. Parent Corner text and Gawin natin cards are read by the adult.
const SPOKEN_PREFIXES = ['instr.', 'fb.', 'sort.', 'num.', 'hide.', 'chant.', 'sing.'];
const SPOKEN_KEYS = ['bye.session', 'bye.daily'];
const neededClips = new Set();
for (const key of Object.keys(fil)) {
  if (SPOKEN_PREFIXES.some((p) => key.startsWith(p)) || SPOKEN_KEYS.includes(key)) neededClips.add(key);
}
for (const item of items) {
  if (!usedItems.has(item.id)) continue;
  neededClips.add(item.text);
  neededClips.add(`${item.text}.find`);
}
const missingClips = [];
for (const [lang, strings] of [['fil', fil], ['en', en]]) {
  for (const key of [...neededClips].sort()) {
    if (!(key in strings)) continue;
    const id = `${lang}/${key}`;
    const path = manifest.audio[id];
    if (!path || !existsSync(join(root, 'public', path))) missingClips.push(id);
  }
}

console.log(`\nPICTURES: ${neededImages.size} needed, ${missingImages.length} missing (drawn as placeholders for now)`);
for (const name of missingImages) console.log(`  - ${name}`);
console.log(`\nNARRATION CLIPS: ${neededClips.size * 2} needed (Filipino and English), ${missingClips.length} missing (shown silently for now)`);
for (const id of missingClips) console.log(`  - ${id}`);
console.log('\nIlokano narration is not listed: nothing is generated until an Ilokano speaker has written the text.\n');

if (process.argv.includes('--strict') && (missingImages.length > 0 || missingClips.length > 0)) process.exit(1);
