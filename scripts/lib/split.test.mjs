import { describe, expect, it } from 'vitest';
import { chooseCuts } from './split.mjs';

const s = (start, end) => ({ start, end });

describe('cutting a group recording into one clip per line', () => {
  it('cuts at the long gaps between lines', () => {
    const result = chooseCuts([s(1.2, 2.2), s(3.2, 4.1)], 5.2, ['Nanay.', 'saging.', 'masaya.']);
    expect(result.error).toBeUndefined();
    expect(result.pieces.map((p) => +p.from.toFixed(2))).toEqual([0, 1.7, 3.65]);
  });

  it('ignores short pauses inside a sentence', () => {
    const silences = [s(0.9, 1.15), s(2.4, 3.6), s(4.3, 4.5)];
    const result = chooseCuts(silences, 6, ['Ilagay ang malaki, at ang maliit.', 'Magaling!']);
    expect(result.error).toBeUndefined();
    expect(result.pieces[1].from).toBeCloseTo(3.0);
  });

  it('a comma pause almost as long as the real gaps is not mistaken for a gap', () => {
    const texts = [
      'Ilagay ang malaki sa malaking basket, at ang maliit sa maliit na basket.',
      'Magaling!',
      'Pumili ng laro.',
    ];
    const silences = [s(2.2, 2.9), s(5.0, 5.9), s(6.7, 7.55)];
    const result = chooseCuts(silences, 9.0, texts);
    expect(result.error).toBeUndefined();
    expect(result.pieces.map((p) => +p.to.toFixed(2))).toEqual([5.45, 7.13, 9]);
  });

  it('refuses when there are fewer gaps than lines', () => {
    expect(chooseCuts([s(1.2, 2.2)], 5, ['a.', 'b.', 'c.']).error).toMatch(/expected 3/);
  });

  it('refuses when the gaps are too short to be sure', () => {
    expect(chooseCuts([s(1.1, 1.75), s(3.9, 4.2)], 5.3, ['Nanay.', 'saging.', 'masaya.']).error).toMatch(/only/);
  });

  it('refuses when a piece is far too long for its text (an extra word was spoken)', () => {
    const result = chooseCuts([s(1.0, 2.0), s(8.0, 9.0)], 10, ['Ate.', 'Kuya.', 'Lola.']);
    expect(result.error).toMatch(/does not fit/);
  });

  it('one line needs no cutting', () => {
    expect(chooseCuts([], 2, ['Nanay.']).pieces).toEqual([{ from: 0, to: 2 }]);
  });
});
