// Turns the raw pictures in /raw-assets into the pictures the game uses.
//   - cuts each sheet into separate pictures by finding the white gaps around them
//     (the sheets are not even grids), and checks the count against the list below
//   - removes the white background, trims, resizes and compresses
//   - crops white or cream borders off the backgrounds and fits them to the screen
//   - writes content/asset-manifest.json, ASSETS.md and a contact sheet for checking
// The files in /raw-assets are never changed.
// Run: npm run assets
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const RAW = join(root, 'raw-assets');
const OUT_GAME = join(root, 'public', 'assets', 'img'); // bundled with the game
const OUT_LATER = join(root, 'assets-later', 'img'); // processed now, used by later levels
const USED_UP_TO_LEVEL = 1;
const HI_RES = join(root, 'resources', 'cutouts');

// Names follow raw-assets/README.md: left to right, top to bottom.
const SHEETS = [
  { file: 'objects/sheet-obj-family.jpg', prefix: 'obj-family', level: 1, rows: 3, cols: 3, names: ['lola', 'lolo', 'nanay', 'tatay', 'yakap', 'baby', 'kuya', 'kainan', 'ate'] },
  { file: 'objects/sheet-obj-feelings.jpg', prefix: 'obj-feelings', level: 1, rows: 3, cols: 3, names: ['masaya', 'malungkot', 'galit', 'takot', 'gulat', 'inaantok', 'nahihiya', 'proud', 'kalmado'] },
  { file: 'objects/sheet-obj-body.jpg', prefix: 'obj-body', level: 1, rows: 3, cols: 3, names: ['mata', 'tainga', 'ilong', 'bibig', 'kamay', 'paa', 'buhok', 'ngipin', 'tiyan'] },
  { file: 'objects/sheet-obj-things.jpg', prefix: 'obj-things', level: 1, rows: 3, cols: 3, names: ['sipilyo', 'sabon', 'tuwalya', 'suklay', 'plato', 'baso', 'banig', 'tsinelas', 'payong'] },
  { file: 'objects/sheet-obj-food1.jpg', prefix: 'obj-food1', level: 1, rows: 3, cols: 3, names: ['kanin', 'mais', 'saging', 'mangga', 'papaya', 'niyog', 'kamatis', 'talong', 'kalabasa'] },
  { file: 'objects/sheet-obj-animals1.jpg', prefix: 'obj-animals1', level: 1, rows: 3, cols: 3, names: ['aso', 'pusa', 'manok', 'bibe', 'baboy', 'kambing', 'baka', 'kalabaw', 'kabayo'] },
  { file: 'objects/sheet-obj-weather.jpg', prefix: 'obj-weather', level: 1, rows: 3, cols: 3, names: ['maaraw', 'maulan', 'maulap', 'mabagyo', 'bahaghari', 'buwan', 'bituin', 'pagsikat-ng-araw', 'kidlat'] },
  { file: 'objects/sheet-obj-clothes-school.jpg', prefix: 'obj-clothes-school', level: 2, rows: 3, cols: 3, names: ['kamiseta', 'shorts', 'bestida', 'sombrero', 'bag', 'lapis', 'krayola', 'aklat', 'bola'] },
  { file: 'objects/sheet-obj-food2.jpg', prefix: 'obj-food2', level: 2, rows: 3, cols: 3, names: ['munggo', 'sitaw', 'okra', 'itlog', 'pritong-isda', 'gatas', 'tubig', 'pandesal', 'mani'] },
  { file: 'objects/sheet-obj-animals2.jpg', prefix: 'obj-animals2', level: 2, rows: 3, cols: 3, names: ['isda', 'palaka', 'paruparo', 'bubuyog', 'langgam', 'ibon', 'tagak', 'butiki', 'suso'] },
  { file: 'objects/sheet-obj-plants.jpg', prefix: 'obj-plants', level: 2, rows: 3, cols: 3, names: ['palay', 'mais', 'saging', 'niyog', 'kawayan', 'puno-ng-mangga', 'sampaguita', 'narra', 'punla'] },
  { file: 'objects/sheet-obj-land-water.jpg', prefix: 'obj-land-water', level: 2, rows: 3, cols: 3, names: ['bundok', 'burol', 'kapatagan', 'ilog', 'talon', 'lawa', 'dagat', 'pulo', 'bulkan'] },
  { file: 'objects/sheet-obj-helpers.jpg', prefix: 'obj-helpers', level: 3, rows: 3, cols: 3, names: ['guro', 'doktor', 'nars', 'magsasaka', 'mangingisda', 'bumbero', 'pulis', 'tindero', 'tricycle-driver'] },
  { file: 'objects/sheet-obj-rides.jpg', prefix: 'obj-rides', level: 3, rows: 3, cols: 3, names: ['traysikel', 'dyip', 'bus', 'bisikleta', 'motorsiklo', 'bangka', 'traktora', 'kuliglig', 'eroplano'] },
  { file: 'objects/sheet-obj-science.jpg', prefix: 'obj-science', level: 6, rows: 3, cols: 3, names: ['magnet', 'termometro', 'magnifying-glass', 'bumbilya', 'baterya', 'bato', 'baso-ng-yelo', 'takure', 'binhi'] },
  { file: 'ui/sheet-stickers.jpg', prefix: 'ui-sticker', level: 1, rows: 3, cols: 3, names: ['bituin', 'araw', 'mais', 'palay', 'sampaguita', 'saranggola', 'parol', 'bangkang-dahon', 'bahaghari'] },
  { file: 'ui/sheet-badges.jpg', prefix: 'ui-badge', level: 1, rows: 1, cols: 6, names: ['binhi', 'usbong', 'dahon', 'bulaklak', 'bunga', 'puno'] },
  { file: 'characters/char-butil-poses.jpg', prefix: 'char-butil', level: 1, rows: 1, cols: 3, names: ['cheer', 'think', 'wave'], size: 640 },
  { file: 'characters/char-ading-age3-poses.jpg', prefix: 'char-ading-age3', level: 1, rows: 1, cols: 3, names: ['cheer', 'think', 'wave'], size: 640 },
  { file: 'characters/char-lola-poses.jpg', prefix: 'char-lola', level: 1, rows: 1, cols: 3, names: ['cheer', 'think', 'wave'], size: 640 },
  { file: 'characters/char-kiko-poses.jpg', prefix: 'char-kiko', level: 1, rows: 1, cols: 3, names: ['cheer', 'think', 'wave'], size: 640 },
  { file: 'characters/char-liza-poses.jpg', prefix: 'char-liza', level: 1, rows: 1, cols: 3, names: ['cheer', 'think', 'wave'], size: 640 },
  { file: 'characters/char-ila-poses.jpg', prefix: 'char-ila', level: 3, rows: 1, cols: 3, names: ['cheer', 'think', 'wave'], size: 640 },
  { file: 'characters/char-butil-stand.jpg', prefix: 'char-butil', level: 1, rows: 1, cols: 1, names: ['stand'], size: 640, hiRes: true },
  { file: 'characters/char-ading-age3-stand.jpg', prefix: 'char-ading-age3', level: 1, rows: 1, cols: 1, names: ['stand'], size: 640, hiRes: true },
  { file: 'characters/char-ading-age5-stand.jpg', prefix: 'char-ading-age5', level: 3, rows: 1, cols: 1, names: ['stand'], size: 640 },
  { file: 'characters/char-ading-age8-stand.jpg', prefix: 'char-ading-age8', level: 5, rows: 1, cols: 1, names: ['stand'], size: 640 },
  { file: 'characters/char-lola-stand.jpg', prefix: 'char-lola', level: 1, rows: 1, cols: 1, names: ['stand'], size: 640 },
  { file: 'characters/char-kiko-stand.jpg', prefix: 'char-kiko', level: 1, rows: 1, cols: 1, names: ['stand'], size: 640 },
  { file: 'characters/char-liza-stand.jpg', prefix: 'char-liza', level: 1, rows: 1, cols: 1, names: ['stand'], size: 640 },
  { file: 'characters/char-ila-stand.jpg', prefix: 'char-ila', level: 3, rows: 1, cols: 1, names: ['stand'], size: 640 },
];

const PLACES = [
  { file: 'places/place-map.jpg', id: 'place-map', level: 1, cutout: true },
  { file: 'places/place-bahay.jpg', id: 'place-bahay', level: 1 },
  { file: 'places/place-cdc.jpg', id: 'place-cdc', level: 1 },
  { file: 'places/place-bukid.jpg', id: 'place-bukid', level: 1 },
  { file: 'places/place-palengke.jpg', id: 'place-palengke', level: 2 },
  { file: 'places/place-plaza.jpg', id: 'place-plaza', level: 3 },
  { file: 'places/place-ilog.jpg', id: 'place-ilog', level: 3 },
  { file: 'places/place-paaralan.jpg', id: 'place-paaralan', level: 4 },
  { file: 'places/place-sierra-madre.jpg', id: 'place-sierra-madre', level: 5 },
  { file: 'places/place-dam.jpg', id: 'place-dam', level: 6 },
  { file: 'places/place-mapa-pilipinas.jpg', id: 'place-mapa-pilipinas', level: 6 },
];

// Not processed, on purpose: ui/icon.jpg and ui/splash.jpg (Butil has no leaf; the splash shows a boy).

const SCALE = 4; // pieces are found on a quarter-size copy, which is fast and ignores specks
const DILATE = 5; // joins parts of one picture that are up to ~40 px apart (soap and its bubbles)

/** White or near-white paper. */
const isWhite = (r, g, b) => Math.min(r, g, b) > 226 && Math.max(r, g, b) - Math.min(r, g, b) < 24;
/** White or cream border paper (not sky blue). */
const isPaper = (r, g, b) => Math.min(r, g, b) > 200 && Math.max(r, g, b) > 236 && r >= b - 6;

function dilate(mask, w, h, radius) {
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let on = 0;
      for (let k = Math.max(0, x - radius); k <= Math.min(w - 1, x + radius) && !on; k++) on = mask[y * w + k];
      tmp[y * w + x] = on;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let on = 0;
      for (let k = Math.max(0, y - radius); k <= Math.min(h - 1, y + radius) && !on; k++) on = tmp[k * w + x];
      out[y * w + x] = on;
    }
  }
  return out;
}

/** Find the separate pictures on a sheet. Returns one group per picture, in reading order. */
async function findPieces(path, sheet) {
  const meta = await sharp(path).metadata();
  const w = Math.round(meta.width / SCALE);
  const h = Math.round(meta.height / SCALE);
  const { data } = await sharp(path).resize(w, h, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const ink = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) ink[i] = isWhite(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]) ? 0 : 1;
  const expected = sheet.names.length;
  const gap = (a, b) => {
    const dx = Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1));
    const dy = Math.max(0, Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1));
    return Math.hypot(dx, dy);
  };

  const label = (radius) => {
    const grown = radius > 0 ? dilate(ink, w, h, radius) : ink;
    const labels = new Int32Array(w * h).fill(0);
    const blobs = [];
    const stack = [];
    for (let start = 0; start < w * h; start++) {
      if (!grown[start] || labels[start]) continue;
      const id = blobs.length + 1;
      const blob = { ids: [id], area: 0, x0: w, y0: h, x1: 0, y1: 0 };
      labels[start] = id;
      stack.push(start);
      while (stack.length) {
        const p = stack.pop();
        const x = p % w;
        const y = (p - x) / w;
        blob.area += 1;
        if (x < blob.x0) blob.x0 = x;
        if (x > blob.x1) blob.x1 = x;
        if (y < blob.y0) blob.y0 = y;
        if (y > blob.y1) blob.y1 = y;
        if (x > 0 && grown[p - 1] && !labels[p - 1]) { labels[p - 1] = id; stack.push(p - 1); }
        if (x < w - 1 && grown[p + 1] && !labels[p + 1]) { labels[p + 1] = id; stack.push(p + 1); }
        if (y > 0 && grown[p - w] && !labels[p - w]) { labels[p - w] = id; stack.push(p - w); }
        if (y < h - 1 && grown[p + w] && !labels[p + w]) { labels[p + w] = id; stack.push(p + w); }
      }
      blobs.push(blob);
    }
    return { labels, blobs };
  };

  // Pictures that stand close together need a smaller joining distance.
  // Start generous (keeps soap with its bubbles) and tighten until enough pictures appear.
  let labels = null;
  let pieces = [];
  let found = 0;
  let radius = DILATE;
  let method = 'gaps';
  for (const r of [DILATE, 3, 2, 1, 0]) {
    const result = label(r);
    const big = result.blobs.filter((blob) => blob.area >= w * h * 0.0025);
    if (big.length >= expected || r === 0) {
      labels = result.labels;
      radius = r;
      found = big.length;
      // Join every small part (a sparkle, a bubble) to its nearest big picture.
      pieces = big;
      const small = result.blobs.filter((blob) => !big.includes(blob) && blob.area >= w * h * 0.00005);
      while (pieces.length > expected) {
        pieces.sort((x, y) => x.area - y.area);
        small.push(pieces.shift());
      }
      for (const part of small) {
        let best = pieces[0];
        for (const piece of pieces) if (gap(part, piece) < gap(part, best)) best = piece;
        if (!best || gap(part, best) > Math.max(w, h) * 0.06) continue; // a stray mark far from everything
        best.ids.push(...part.ids);
        best.x0 = Math.min(best.x0, part.x0);
        best.y0 = Math.min(best.y0, part.y0);
        best.x1 = Math.max(best.x1, part.x1);
        best.y1 = Math.max(best.y1, part.y1);
      }
      break;
    }
  }

  if (pieces.length !== expected) {
    // The pictures touch each other. Cut the sheet at the emptiest columns and rows instead.
    method = 'emptiest lines';
    radius = 0;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (ink[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const colInk = (x) => { let n = 0; for (let y = y0; y <= y1; y++) n += ink[y * w + x]; return n; };
    const rowInk = (y) => { let n = 0; for (let x = x0; x <= x1; x++) n += ink[y * w + x]; return n; };
    const cuts = (from, to, count, inkAt) => {
      const out = [from];
      const size = (to - from) / count;
      for (let k = 1; k < count; k++) {
        const centre = from + k * size;
        let best = Math.round(centre);
        for (let c = Math.round(centre - size * 0.3); c <= Math.round(centre + size * 0.3); c++) if (inkAt(c) < inkAt(best)) best = c;
        out.push(best);
      }
      out.push(to + 1);
      return out;
    };
    const xs = cuts(x0, x1, sheet.cols, colInk);
    const ys = cuts(y0, y1, sheet.rows, rowInk);
    pieces = [];
    for (let r = 0; r < sheet.rows; r++) {
      for (let c = 0; c < sheet.cols; c++) {
        pieces.push({ ids: [], area: 1, x0: xs[c], x1: xs[c + 1] - 1, y0: ys[r], y1: ys[r + 1] - 1, rect: true });
      }
    }
    found = pieces.length;
  }

  // Reading order: rows top to bottom, then left to right inside each row.
  pieces.sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
  const ordered = [];
  for (let r = 0; r < sheet.rows; r++) {
    ordered.push(...pieces.slice(r * sheet.cols, (r + 1) * sheet.cols).sort((a, b) => (a.x0 + a.x1) - (b.x0 + b.x1)));
  }
  return { pieces: ordered, labels, w, h, found, radius, method, width: meta.width, height: meta.height };
}

/** Cut one picture out of its sheet with a transparent background. */
async function cutPiece(path, piece, info, size, format = 'webp') {
  const pad = 6;
  const grow = piece.rect ? 0 : info.radius;
  const left = Math.max(0, (piece.x0 - grow) * SCALE - pad);
  const top = Math.max(0, (piece.y0 - grow) * SCALE - pad);
  const right = Math.min(info.width, (piece.x1 + 1 + grow) * SCALE + pad);
  const bottom = Math.min(info.height, (piece.y1 + 1 + grow) * SCALE + pad);
  const cw = right - left;
  const ch = bottom - top;
  const { data } = await sharp(path).extract({ left, top, width: cw, height: ch }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const mine = new Set(piece.ids);
  const belongs = (x, y) => {
    const sx = Math.min(info.w - 1, Math.floor((x + left) / SCALE));
    const sy = Math.min(info.h - 1, Math.floor((y + top) / SCALE));
    if (piece.rect) return sx >= piece.x0 && sx <= piece.x1 && sy >= piece.y0 && sy <= piece.y1;
    const id = info.labels[sy * info.w + sx];
    // 0 = empty paper between parts of the same picture: let the white test decide.
    return id === 0 || mine.has(id);
  };

  // Remove the white that is connected to the outside. White INSIDE the picture
  // (eyes, a plate, rice) is kept, because it is not reachable from the edge.
  const outside = new Uint8Array(cw * ch);
  const stack = [];
  const tryPush = (x, y) => {
    const p = y * cw + x;
    if (outside[p]) return;
    const o = p * 4;
    if (isWhite(data[o], data[o + 1], data[o + 2]) || !belongs(x, y)) {
      outside[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < cw; x++) { tryPush(x, 0); tryPush(x, ch - 1); }
  for (let y = 0; y < ch; y++) { tryPush(0, y); tryPush(cw - 1, y); }
  while (stack.length) {
    const p = stack.pop();
    const x = p % cw;
    const y = (p - x) / cw;
    if (x > 0) tryPush(x - 1, y);
    if (x < cw - 1) tryPush(x + 1, y);
    if (y > 0) tryPush(x, y - 1);
    if (y < ch - 1) tryPush(x, y + 1);
  }
  for (let p = 0; p < cw * ch; p++) {
    const o = p * 4;
    if (outside[p]) {
      data[o + 3] = 0;
      continue;
    }
    // Soften the pale fringe right at the edge so no white halo shows.
    const x = p % cw;
    const y = (p - x) / cw;
    const edge = (x > 0 && outside[p - 1]) || (x < cw - 1 && outside[p + 1]) || (y > 0 && outside[p - cw]) || (y < ch - 1 && outside[p + cw]);
    if (edge) {
      const lightness = Math.min(data[o], data[o + 1], data[o + 2]);
      if (lightness > 170) data[o + 3] = Math.round(255 * Math.max(0.15, (255 - lightness) / 85));
    }
  }

  return sharp(data, { raw: { width: cw, height: ch, channels: 4 } })
    .trim({ threshold: 1 })
    .resize(size, size, { fit: 'inside', withoutEnlargement: true })
    [format](format === 'png' ? { compressionLevel: 9 } : { quality: 84, alphaQuality: 90, effort: 5 })
    .toBuffer();
}

/** Crop a white or cream border off a background and fit it to a 16:9 screen. */
async function processPlace(path, place) {
  const meta = await sharp(path).metadata();
  const { data } = await sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = meta.width;
  const H = meta.height;
  const paperAt = (x, y) => { const o = (y * W + x) * 3; return isPaper(data[o], data[o + 1], data[o + 2]); };
  const rowIsBorder = (y) => { let n = 0; for (let x = 0; x < W; x++) if (paperAt(x, y)) n++; return n / W > 0.97; };
  const colIsBorder = (x) => { let n = 0; for (let y = 0; y < H; y++) if (paperAt(x, y)) n++; return n / H > 0.97; };
  let top = 0; while (top < H / 3 && rowIsBorder(top)) top++;
  let bottom = H; while (bottom > (2 * H) / 3 && rowIsBorder(bottom - 1)) bottom--;
  let left = 0; while (left < W / 3 && colIsBorder(left)) left++;
  let right = W; while (right > (2 * W) / 3 && colIsBorder(right - 1)) right--;
  const cropped = top + (H - bottom) + left + (W - right) > 0;
  // A few extra pixels remove the soft edge of a border.
  const inset = cropped ? 3 : 0;
  let image = sharp(path).extract({
    left: left + inset, top: top + inset,
    width: right - left - 2 * inset, height: bottom - top - 2 * inset,
  });
  if (place.cutout) {
    // The town map is an island on white paper: put it on sky blue instead.
    image = sharp(await image.png().toBuffer()).flatten({ background: '#bfe6f2' });
    const buf = await image.raw().toBuffer({ resolveWithObject: true });
    const d = buf.data; const cw = buf.info.width; const ch = buf.info.height;
    const seen = new Uint8Array(cw * ch); const stack = [];
    const push = (x, y) => { const p = y * cw + x; if (seen[p]) return; const o = p * 3; if (isWhite(d[o], d[o + 1], d[o + 2])) { seen[p] = 1; stack.push(p); } };
    for (let x = 0; x < cw; x++) { push(x, 0); push(x, ch - 1); }
    for (let y = 0; y < ch; y++) { push(0, y); push(cw - 1, y); }
    while (stack.length) { const p = stack.pop(); const x = p % cw; const y = (p - x) / cw; if (x > 0) push(x - 1, y); if (x < cw - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < ch - 1) push(x, y + 1); }
    for (let p = 0; p < cw * ch; p++) if (seen[p]) { d[p * 3] = 0xbf; d[p * 3 + 1] = 0xe6; d[p * 3 + 2] = 0xf2; }
    image = sharp(d, { raw: { width: cw, height: ch, channels: 3 } });
  }
  const buffer = await image.resize(1280, 720, { fit: 'cover', position: 'centre' }).webp({ quality: 80, effort: 5 }).toBuffer();
  return { buffer, cropped: cropped ? `${left},${top},${W - right},${H - bottom}` : 'none' };
}

// ---------------------------------------------------------------------------

for (const dir of [OUT_GAME, OUT_LATER]) {
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(dir, { recursive: true });
}

const made = []; // { id, level, file, bytes, source }
const problems = [];
const report = [];

for (const sheet of SHEETS) {
  const path = join(RAW, sheet.file);
  if (!existsSync(path)) { problems.push(`missing raw file: ${sheet.file}`); continue; }
  try {
    const info = await findPieces(path, sheet);
    for (let i = 0; i < info.pieces.length; i++) {
      const id = `${sheet.prefix}-${sheet.names[i]}`;
      const buffer = await cutPiece(path, info.pieces[i], info, sheet.size ?? 512);
      const dir = sheet.level <= USED_UP_TO_LEVEL ? OUT_GAME : OUT_LATER;
      writeFileSync(join(dir, `${id}.webp`), buffer);
      made.push({ id, level: sheet.level, bytes: buffer.length, source: sheet.file, dir });
      if (sheet.hiRes) {
        // Full-size copy for the splash screen and app icon (scripts/make-splash-icon.mjs). Not bundled.
        mkdirSync(HI_RES, { recursive: true });
        writeFileSync(join(HI_RES, `${id}.png`), await cutPiece(path, info.pieces[i], info, 2048, 'png'));
      }
    }
    report.push({ file: sheet.file, level: sheet.level, expected: sheet.names.length, found: info.found, names: sheet.names.map((n) => `${sheet.prefix}-${n}`) });
    console.log(`ok  ${sheet.file}: ${sheet.names.length} pictures (found by ${info.method}, joining distance ${info.radius})`);
  } catch (error) {
    problems.push(error.message);
    console.log(`BAD ${error.message}`);
  }
}

for (const place of PLACES) {
  const path = join(RAW, place.file);
  if (!existsSync(path)) { problems.push(`missing raw file: ${place.file}`); continue; }
  const { buffer, cropped } = await processPlace(path, place);
  const dir = place.level <= USED_UP_TO_LEVEL ? OUT_GAME : OUT_LATER;
  writeFileSync(join(dir, `${place.id}.webp`), buffer);
  made.push({ id: place.id, level: place.level, bytes: buffer.length, source: place.file, dir, wide: true });
  report.push({ file: place.file, level: place.level, expected: 1, found: 1, names: [place.id], note: `border cropped (left,top,right,bottom px): ${cropped}` });
  console.log(`ok  ${place.file}: border ${cropped}`);
}

// ---- The list the game reads ----
const manifestPath = join(root, 'content', 'asset-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
// Pictures made by other scripts (the splash, by npm run icons) are kept.
const others = Object.entries(manifest.images ?? {}).filter(([, path]) => !path.startsWith('assets/img/'));
manifest.images = Object.fromEntries([
  ...made.filter((m) => m.dir === OUT_GAME).map((m) => [m.id, `assets/img/${m.id}.webp`]),
  ...others,
].sort(([x], [y]) => x.localeCompare(y)));
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

// ---- ASSETS.md ----
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
const totalGame = made.filter((m) => m.dir === OUT_GAME).reduce((a, m) => a + m.bytes, 0);
const totalLater = made.filter((m) => m.dir === OUT_LATER).reduce((a, m) => a + m.bytes, 0);
let md = `# ASSETS: every picture, where it comes from and where it goes

Written by \`npm run assets\` from the lists in \`raw-assets/README.md\`. Do not edit by hand.

- Pictures used by the game now (Level ${USED_UP_TO_LEVEL}): \`public/assets/img/\`, ${made.filter((m) => m.dir === OUT_GAME).length} files, ${kb(totalGame)}
- Pictures processed for later levels, not bundled: \`assets-later/img/\`, ${made.filter((m) => m.dir === OUT_LATER).length} files, ${kb(totalLater)}
- Not processed on purpose: \`ui/icon.jpg\`, \`ui/splash.jpg\` (to be rebuilt from the character pictures)
- There are no scarecrows. The unused festival picture is never read.

| Raw file | Used from level | Pictures | Processed names |
| --- | --- | --- | --- |
`;
for (const r of report) md += `| \`${r.file}\` | ${r.level} | ${r.expected} | ${r.names.map((n) => `\`${n}\``).join(', ')}${r.note ? `. ${r.note}` : ''} |\n`;
md += `\n## Still missing\n\n- A background for Pista ng Bayan (Level 4). It must not show scarecrows.\n- An accurate map of the Philippines for Level 6 (\`place-mapa-pilipinas\` is a rough sketch only).\n`;
if (problems.length) md += `\n## Problems found\n\n${problems.map((p) => `- ${p}`).join('\n')}\n`;
writeFileSync(join(root, 'ASSETS.md'), md);

// ---- Contact sheet: every processed picture on a coloured background, to spot bad crops ----
const cell = 150;
const labelH = 22;
const perRow = 9;
const rowsN = Math.ceil(made.length / perRow);
const composites = [];
for (let i = 0; i < made.length; i++) {
  const m = made[i];
  const x = (i % perRow) * cell;
  const y = Math.floor(i / perRow) * (cell + labelH);
  const thumb = await sharp(join(m.dir, `${m.id}.webp`)).resize(cell - 12, cell - 12, { fit: 'inside' }).png().toBuffer();
  const meta = await sharp(thumb).metadata();
  composites.push({ input: thumb, left: x + Math.round((cell - meta.width) / 2), top: y + Math.round((cell - meta.height) / 2) });
  const label = `<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="${labelH}"><rect width="${cell}" height="${labelH}" fill="#33261a"/><text x="${cell / 2}" y="15" font-family="Arial" font-size="11" fill="#fff" text-anchor="middle">${m.id.replace(/^(obj|ui|char|place)-/, '')}</text></svg>`;
  composites.push({ input: Buffer.from(label), left: x, top: y + cell });
}
await sharp({ create: { width: perRow * cell, height: rowsN * (cell + labelH), channels: 3, background: '#7fb0c9' } })
  .composite(composites).png().toFile(join(root, 'assets-contact-sheet.png'));

console.log(`\n${made.length} pictures made. Game: ${kb(totalGame)}. Later levels: ${kb(totalLater)}.`);
console.log('Look at assets-contact-sheet.png to spot bad crops.');
if (problems.length) {
  console.log(`\nPROBLEMS:\n${problems.map((p) => ` - ${p}`).join('\n')}`);
  process.exit(1);
}
