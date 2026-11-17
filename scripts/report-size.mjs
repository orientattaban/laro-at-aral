// Reports the size of the built app (the dist folder) after every build.
// Requirement: the installed app must stay under 150 MB.
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const LIMIT_MB = 150;
const dist = fileURLToPath(new URL('../dist/', import.meta.url));

if (!existsSync(dist)) {
  console.log('No dist folder yet. Run: npm run build');
  process.exit(0);
}

const groups = { 'Code (js, css, html)': 0, Pictures: 0, Sound: 0, Fonts: 0, Other: 0 };
let total = 0;
let files = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) {
      walk(path);
      continue;
    }
    files += 1;
    total += info.size;
    const ext = extname(name).toLowerCase();
    if (['.js', '.css', '.html'].includes(ext)) groups['Code (js, css, html)'] += info.size;
    else if (['.png', '.webp', '.jpg', '.jpeg', '.svg', '.ico'].includes(ext)) groups.Pictures += info.size;
    else if (['.mp3', '.m4a', '.ogg', '.wav'].includes(ext)) groups.Sound += info.size;
    else if (['.woff2', '.woff', '.ttf'].includes(ext)) groups.Fonts += info.size;
    else groups.Other += info.size;
  }
}
walk(dist);

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2);
console.log('');
console.log('APP SIZE REPORT');
for (const [name, bytes] of Object.entries(groups)) {
  console.log(`  ${name.padEnd(22)} ${mb(bytes).padStart(8)} MB`);
}
console.log(`  ${'TOTAL'.padEnd(22)} ${mb(total).padStart(8)} MB in ${files} files`);
console.log(`  Limit: ${LIMIT_MB} MB. Used: ${((total / 1024 / 1024 / LIMIT_MB) * 100).toFixed(1)}%`);
if (total / 1024 / 1024 > LIMIT_MB) {
  console.error('  OVER THE LIMIT');
  process.exit(1);
}
