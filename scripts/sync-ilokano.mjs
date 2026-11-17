// Keeps content/lang/ilo.json in step with fil.json.
// It adds any new key with an EMPTY value and never touches text your family has typed.
// Ilokano is never machine-translated: an Ilokano speaker fills in the empty values.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const filPath = new URL('../content/lang/fil.json', import.meta.url);
const iloPath = new URL('../content/lang/ilo.json', import.meta.url);

const fil = JSON.parse(readFileSync(filPath, 'utf8'));
const ilo = existsSync(iloPath) ? JSON.parse(readFileSync(iloPath, 'utf8')) : {};

const out = {};
let added = 0;
for (const key of Object.keys(fil)) {
  if (typeof ilo[key] === 'string') {
    out[key] = ilo[key];
  } else {
    out[key] = '';
    added += 1;
  }
}
const removed = Object.keys(ilo).filter((k) => !(k in fil));

writeFileSync(iloPath, JSON.stringify(out, null, 2) + '\n');
const filled = Object.values(out).filter((v) => v.trim() !== '').length;
console.log(`ilo.json: ${Object.keys(out).length} keys, ${filled} filled, ${added} added, ${removed.length} removed.`);
