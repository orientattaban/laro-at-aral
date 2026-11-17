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

  // Choose the n-1 pauses that (1) are long and (2) split the speech into pieces
  // whose lengths match the lengths of the texts. Pauses after commas inside a
  // sentence lose on (2), because cutting there makes pieces of the wrong length.
  const leadIn = silences.find((s) => s.start <= 0.05)?.end ?? 0;
  const tail = silences.find((s) => s.end >= total - 0.05)?.start ?? total;
  const chars = texts.map((t) => Math.max(1, speechLength(t)));
  const totalChars = chars.reduce((a, b) => a + b, 0);
  const m = inner.length;
  const len = (s) => s.end - s.start;
  // Fixed cost per letter would favour long sentences; allow a base time per line.
  const base = 0.35;
  const secondsPerChar = Math.max(0.01, (tail - leadIn - inner.reduce((a, s) => a + len(s), 0) * 0.5 - base * n) / totalChars);
  const expected = chars.map((c) => base + c * secondsPerChar);
  const segCost = (from, to, i) => {
    const d = Math.max(0.05, to - from);
    return Math.log(d / expected[i]) ** 2;
  };
  const gapBonus = (s) => 0.6 * Math.log(Math.max(0.05, len(s)));
  // best[k][j]: lowest cost with the k-th cut placed at pause j.
  const best = Array.from({ length: n - 1 }, () => new Array(m).fill(Infinity));
  const from = Array.from({ length: n - 1 }, () => new Array(m).fill(-1));
  for (let j = 0; j < m; j++) best[0][j] = segCost(leadIn, inner[j].start, 0) - gapBonus(inner[j]);
  for (let k = 1; k < n - 1; k++) {
    for (let j = k; j < m; j++) {
      for (let p = k - 1; p < j; p++) {
        const c = best[k - 1][p] + segCost(inner[p].end, inner[j].start, k) - gapBonus(inner[j]);
        if (c < best[k][j]) { best[k][j] = c; from[k][j] = p; }
      }
    }
  }
  let end = -1;
  let endCost = Infinity;
  for (let j = n - 2; j < m; j++) {
    const c = best[n - 2][j] + segCost(inner[j].end, tail, n - 1);
    if (c < endCost) { endCost = c; end = j; }
  }
  if (end < 0) return { error: 'could not find a sensible way to cut' };
  const picks = [end];
  for (let k = n - 2; k > 0; k--) picks.unshift(from[k][picks[0]]);
  const longest = picks.map((j) => inner[j]);

  const shortestCut = Math.min(...longest.map(len));
  if (shortestCut < 0.35) return { error: `a gap between lines is only ${shortestCut.toFixed(2)} s` };
  // A pause left inside a piece must not be much longer than the gaps we cut at.
  const leftover = inner.filter((s) => !longest.includes(s)).reduce((a, s) => Math.max(a, len(s)), 0);
  if (leftover > shortestCut * 1.6) return { error: 'a pause inside a line is longer than the gaps between lines' };
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
