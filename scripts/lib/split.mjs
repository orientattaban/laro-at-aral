// Cutting one recording of several lines into one clip per line.
// The lines are spoken with long pauses between them. We find the quiet parts,
// take the longest ones as the cuts, and check that every piece has a sensible
// length for its text. If anything looks wrong, nothing is saved and the
// caller makes those lines again in smaller groups.
import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

/** Quiet stretches in a sound file: [{ start, end }] in seconds, plus the total length. */
export function findSilences(path, { noiseDb = -40, minSeconds = 0.3 } = {}) {
  const result = spawnSync(ffmpegPath, [
    '-hide_banner', '-nostats', '-i', path, '-af', `silencedetect=noise=${noiseDb}dB:d=${minSeconds}`, '-f', 'null', '-',
  ], { encoding: 'utf8' });
  const log = result.stderr ?? '';
  const silences = [];
  let start = null;
  for (const line of log.split(/\r?\n/)) {
    const s = /silence_start: (-?[\d.]+)/.exec(line);
    const e = /silence_end: ([\d.]+)/.exec(line);
    if (s) start = Math.max(0, Number(s[1]));
    if (e && start !== null) { silences.push({ start, end: Number(e[1]) }); start = null; }
  }
  const d = /Duration: (\d+):(\d+):([\d.]+)/.exec(log);
  const total = d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : 0;
  if (start !== null) silences.push({ start, end: total });
  // A tiny click inside a pause splits it in two: join pauses that touch.
  const joined = [];
  for (const s of silences) {
    const last = joined[joined.length - 1];
    if (last && s.start - last.end < 0.08) last.end = s.end;
    else joined.push({ ...s });
  }
  return { silences: joined, total };
}

const speechLength = (text) => text.replace(/[^\p{L}\p{N}]/gu, '').length;

/**
 * Decide where to cut. Returns [{ from, to }] per line, or { error } if the
 * recording does not split cleanly into exactly `texts.length` pieces.
 */
export function chooseCuts(silences, total, texts) {
  const n = texts.length;
  if (n === 1) return { pieces: [{ from: 0, to: total }] };
  // Ignore silence at the very start and end.
  const inner = silences.filter((s) => s.start > 0.05 && s.end < total - 0.05);
  if (inner.length < n - 1) return { error: `found ${inner.length + 1} parts, expected ${n}` };
  const longest = [...inner].sort((a, b) => (b.end - b.start) - (a.end - a.start)).slice(0, n - 1)
    .sort((a, b) => a.start - b.start);
  // A real gap between lines must be clearly longer than the pauses inside a line.
  const shortestCut = Math.min(...longest.map((s) => s.end - s.start));
  const nextBest = [...inner].sort((a, b) => (b.end - b.start) - (a.end - a.start))[n - 1];
  if (shortestCut < 0.45) return { error: `a gap between lines is only ${shortestCut.toFixed(2)} s` };
  if (nextBest && (nextBest.end - nextBest.start) > shortestCut * 0.8) {
    return { error: 'pauses inside a line are almost as long as the gaps between lines' };
  }
  const bounds = [0, ...longest.map((s) => (s.start + s.end) / 2), total];
  const pieces = texts.map((_, i) => ({ from: bounds[i], to: bounds[i + 1] }));

  // Every piece must have speech, and its length must fit its text.
  const spoken = pieces.map((p, i) => {
    const before = longest[i - 1];
    const after = longest[i];
    const start = before ? before.end : 0;
    const end = after ? after.start : total;
    return Math.max(0, end - start);
  });
  const perChar = spoken.map((sec, i) => sec / Math.max(1, speechLength(texts[i])));
  const sorted = [...perChar].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  for (let i = 0; i < n; i++) {
    if (spoken[i] < 0.2) return { error: `line ${i + 1} is almost silent` };
    // Short words are slower per letter, so allow a wide range before refusing.
    const ratio = perChar[i] / median;
    if (ratio > 4 || ratio < 0.22) {
      return { error: `line ${i + 1} ("${texts[i]}") is ${spoken[i].toFixed(1)} s, which does not fit its text` };
    }
  }
  return { pieces };
}
