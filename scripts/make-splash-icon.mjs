// Builds the splash screen and the app icons from the real pictures:
// Ading (age 3) and Butil, standing in front of the Bukid background.
// (ui/splash.jpg and ui/icon.jpg are not used: the splash shows a boy and
// Butil has no leaf in either.)
//
// Run after `npm run assets`:  npm run icons
//
// Makes:
//   public/assets/splash.webp          the game's start screen (bundled)
//   public/icons/icon-192.png, icon-512.png, icon-maskable-512.png   (bundled)
//   resources/app-icon-1024.png, resources/splash-2732.png   for the Android app (Phase 3)
//   resources/preview.png              everything side by side, to check by eye
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const ADING = join(root, 'resources', 'cutouts', 'char-ading-age3-stand.png');
const BUTIL = join(root, 'resources', 'cutouts', 'char-butil-stand.png');
const BUKID = join(root, 'raw-assets', 'places', 'place-bukid.jpg');
for (const f of [ADING, BUTIL, BUKID]) {
  if (!existsSync(f)) throw new Error(`Missing ${f}. Run: npm run assets`);
}
mkdirSync(join(root, 'public', 'icons'), { recursive: true });
mkdirSync(join(root, 'resources'), { recursive: true });

/** A soft shadow under the feet so the characters stand on the ground. */
function shadow(width, height) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><radialGradient id="g"><stop offset="0" stop-color="#3b2614" stop-opacity="0.38"/><stop offset="1" stop-color="#3b2614" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2}" ry="${height / 2}" fill="url(#g)"/></svg>`);
}

/**
 * Ading and Butil side by side, bottom-aligned, Butil a little in front.
 * Returns a transparent PNG `groupHeight` pixels tall.
 */
async function pair(groupHeight) {
  const adingH = Math.round(groupHeight * 0.97);
  const butilH = Math.round(groupHeight * 0.74);
  const ading = await sharp(ADING).resize({ height: adingH }).png().toBuffer();
  const butil = await sharp(BUTIL).resize({ height: butilH }).png().toBuffer();
  const aw = (await sharp(ading).metadata()).width;
  const bw = (await sharp(butil).metadata()).width;
  const overlap = Math.round(bw * 0.12);
  const width = aw + bw - overlap;
  const pad = Math.round(groupHeight * 0.04);
  const shadowH = Math.round(groupHeight * 0.07);
  const height = groupHeight + pad;
  return sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: shadow(Math.round(width * 0.92), shadowH), left: Math.round(width * 0.04), top: height - shadowH },
      { input: ading, left: 0, top: height - adingH - Math.round(pad * 0.6) },
      { input: butil, left: aw - overlap, top: height - butilH - Math.round(pad * 0.3) },
    ])
    .png()
    .toBuffer();
}

/** The Bukid background, softened a little so the characters stand out. */
async function background(width, height, { focusTop = false, soft = 1 } = {}) {
  return sharp(BUKID)
    .resize(width, height, { fit: 'cover', position: focusTop ? 'north' : 'centre' })
    .blur(Math.max(0.8, (width / 900) * soft))
    .modulate({ brightness: 1.06, saturation: 0.92 })
    .png()
    .toBuffer();
}

/** Put the group on the background; any part that falls outside is cut off (e.g. legs below a close-up). */
async function place(bg, width, height, group, centreX, bottomY) {
  const g = await sharp(group).metadata();
  const left = Math.round(centreX * width - g.width / 2);
  const top = Math.round(bottomY * height - g.height);
  const x0 = Math.max(0, -left);
  const y0 = Math.max(0, -top);
  const w = Math.min(g.width - x0, width - Math.max(0, left));
  const h = Math.min(g.height - y0, height - Math.max(0, top));
  const visible = await sharp(group).extract({ left: x0, top: y0, width: w, height: h }).png().toBuffer();
  return sharp(bg).composite([{ input: visible, left: Math.max(0, left), top: Math.max(0, top) }]);
}

// ---- Splash: wide, for the game's start screen ----
async function splash(width, height) {
  const bg = await background(width, height);
  const group = await pair(Math.round(height * 0.68));
  return place(bg, width, height, group, 0.5, 0.97);
}

// ---- Icon: square, close up (head to knees) so the faces read at small sizes.
//      `scale` < 1 keeps the faces inside the circle that phones may cut a
//      "maskable" icon to. ----
async function icon(size, scale) {
  const bg = await background(size, size, { focusTop: true, soft: 6 });
  // Size the pair by width so both faces are fully inside, then let the feet run off the bottom.
  let group = await pair(size);
  group = await sharp(group).resize({ width: Math.round(size * 0.96 * scale) }).png().toBuffer();
  const h = (await sharp(group).metadata()).height;
  return place(bg, size, size, group, 0.5, (size * (0.5 + 0.5 * scale) + h * 0.14) / size);
}

const out = (...p) => join(root, ...p);
// Icons are bundled with the game, so keep them small: a 256-colour palette looks the same at icon size.
const ICON_PNG = { palette: true, quality: 90, effort: 10, compressionLevel: 9 };
await (await splash(1280, 720)).webp({ quality: 82, effort: 5 }).toFile(out('public', 'assets', 'splash.webp'));
{
  const manifestPath = out('content', 'asset-manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.images.splash = 'assets/splash.webp';
  manifest.images = Object.fromEntries(Object.entries(manifest.images).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
await (await icon(512, 1)).png(ICON_PNG).toFile(out('public', 'icons', 'icon-512.png'));
await (await icon(512, 0.76)).png(ICON_PNG).toFile(out('public', 'icons', 'icon-maskable-512.png'));
await sharp(await (await icon(512, 1)).png().toBuffer()).resize(192, 192).png(ICON_PNG).toFile(out('public', 'icons', 'icon-192.png'));
await (await icon(1024, 0.76)).png({ compressionLevel: 9 }).toFile(out('resources', 'app-icon-1024.png'));
// A square splash keeps the characters in the middle whatever the phone's shape.
{
  const size = 2732;
  const bg = await background(size, size);
  const group = await pair(Math.round(size * 0.36));
  await (await place(bg, size, size, group, 0.5, 0.68)).png({ compressionLevel: 9 }).toFile(out('resources', 'splash-2732.png'));
}

// ---- Preview sheet: the icon at the sizes a phone shows it, round and square ----
const circle = (s) => Buffer.from(`<svg width="${s}" height="${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${s / 2}"/></svg>`);
const tiles = [];
let x = 20;
for (const s of [48, 72, 96, 144]) {
  const sq = await sharp(out('public', 'icons', 'icon-512.png')).resize(s, s).png().toBuffer();
  const round = await sharp(out('public', 'icons', 'icon-maskable-512.png')).resize(s, s)
    .composite([{ input: circle(s), blend: 'dest-in' }]).png().toBuffer();
  tiles.push({ input: sq, left: x, top: 20 }, { input: round, left: x, top: 40 + 144 });
  x += s + 24;
}
const splashSmall = await sharp(out('public', 'assets', 'splash.webp')).resize(640, 360).png().toBuffer();
tiles.push({ input: splashSmall, left: x + 10, top: 20 });
await sharp({ create: { width: x + 670, height: 400, channels: 3, background: '#2d2d2d' } })
  .composite(tiles).png().toFile(out('resources', 'preview.png'));

console.log('Made: public/assets/splash.webp, public/icons/*.png, resources/app-icon-1024.png, resources/splash-2732.png');
console.log('Check them in resources/preview.png');
