// Makes the app icons (public/icons/*.png).
// Phase 1: a simple drawing of Butil, WITH his leaf, on a corn-yellow background.
// Phase 2 replaces this with an icon built from the real character pictures.
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const outDir = new URL('../public/icons/', import.meta.url);
mkdirSync(outDir, { recursive: true });

// scale < 1 leaves a safe margin, needed for "maskable" icons that phones crop to a circle.
function iconSvg(scale) {
  const size = 512;
  const butil = 2.9 * scale;
  const x = (size - 120 * butil) / 2;
  const y = (size - 150 * butil) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#fdf3d7"/>
  <circle cx="256" cy="256" r="${236}" fill="#bfe6f2"/>
  <path d="M0 360 Q256 280 512 360 V512 H0 Z" fill="#8cc084"/>
  <g transform="translate(${x} ${y}) scale(${butil})">
    <rect x="40" y="122" width="14" height="22" rx="7" fill="#f6b73c" stroke="#b9772a" stroke-width="4"/>
    <rect x="66" y="122" width="14" height="22" rx="7" fill="#f6b73c" stroke="#b9772a" stroke-width="4"/>
    <path d="M22 84 Q10 94 12 106" fill="none" stroke="#b9772a" stroke-width="9" stroke-linecap="round"/>
    <path d="M98 78 Q114 64 108 46" fill="none" stroke="#b9772a" stroke-width="9" stroke-linecap="round"/>
    <path d="M60 36 Q40 30 38 10 Q56 14 60 34 Z" fill="#5a9e4b" stroke="#356b2d" stroke-width="3" stroke-linejoin="round"/>
    <path d="M60 36 Q80 30 82 10 Q64 14 60 34 Z" fill="#5a9e4b" stroke="#356b2d" stroke-width="3" stroke-linejoin="round"/>
    <path d="M60 38 Q50 18 60 4 Q70 18 60 38 Z" fill="#5a9e4b" stroke="#356b2d" stroke-width="3" stroke-linejoin="round"/>
    <path d="M60 34 C90 34 102 48 102 78 C102 110 86 130 60 130 C34 130 18 110 18 78 C18 48 30 34 60 34 Z" fill="#f6b73c" stroke="#b9772a" stroke-width="4"/>
    <circle cx="45" cy="72" r="8" fill="#fff" stroke="#5b3a22" stroke-width="2"/>
    <circle cx="75" cy="72" r="8" fill="#fff" stroke="#5b3a22" stroke-width="2"/>
    <circle cx="45" cy="72" r="4.5" fill="#5b3a22"/>
    <circle cx="75" cy="72" r="4.5" fill="#5b3a22"/>
    <path d="M50 88 Q60 97 70 88" fill="none" stroke="#5b3a22" stroke-width="3.5" stroke-linecap="round"/>
  </g>
</svg>`;
}

async function write(name, size, scale) {
  const file = new URL(name, outDir);
  await sharp(Buffer.from(iconSvg(scale))).resize(size, size).png({ compressionLevel: 9 }).toFile(file.pathname.replace(/^\/([A-Za-z]:)/, '$1').replaceAll('%20', ' '));
  console.log(`made public/icons/${name}`);
}

await write('icon-192.png', 192, 1);
await write('icon-512.png', 512, 1);
await write('icon-maskable-512.png', 512, 0.72);
