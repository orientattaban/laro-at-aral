import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getActivity } from '../../src/content';
import type { CountActivity, ItemActivity, SingActivity } from '../../src/content/types';
import type { TrialReport } from '../../src/core/progress';
import { Count, buildCountRounds, countChoiceCount, countRange } from '../../src/engines/Count';
import { HIDE_TIMING, HideAndFind, buildHideRounds, hideSpotCount } from '../../src/engines/HideAndFind';
import { Puzzle, puzzleShape, trayOrder } from '../../src/engines/Puzzle';
import { SING_TIMING, SingAndMove } from '../../src/engines/SingAndMove';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function harness() {
  const reports: TrialReport[] = [];
  const spoken: string[] = [];
  const finish = vi.fn();
  const props = {
    lang: 'fil' as const,
    captions: true,
    reviewExtras: [] as string[],
    speak: async (key: string) => { spoken.push(key); },
    report: (r: TrialReport) => { reports.push(r); },
    finish,
  };
  return { reports, spoken, finish, props };
}

const countActivity = getActivity('l1.cdc.bilang.count') as CountActivity;
const hideActivity = getActivity('l1.bukid.hanap.hide') as ItemActivity;
const puzzleActivity = getActivity('l1.cdc.puzzle') as ItemActivity;
const singActivity = getActivity('l1.cdc.galaw.sing') as SingActivity;

describe('Count to 5', () => {
  it('starts with 1 to 3 and two choices, then up to 5 with three choices', () => {
    expect(countRange(0, 5)).toBe(3);
    expect(countRange(1, 5)).toBe(5);
    expect(countChoiceCount(0, 4)).toBe(2);
    expect(countChoiceCount(1, 4)).toBe(3);
  });

  it('every question has the right answer among its choices, in order, never more than four', () => {
    for (let k = 0; k < 50; k++) {
      for (const step of [0, 1]) {
        const rounds = buildCountRounds(countActivity.items, step, 5, 4);
        rounds.forEach((r, i) => {
          expect(r.choices).toContain(r.amount);
          expect(r.choices.length).toBeLessThanOrEqual(4);
          expect([...r.choices].sort((a, b) => a - b)).toEqual(r.choices);
          expect(r.amount).toBeGreaterThanOrEqual(1);
          expect(r.amount).toBeLessThanOrEqual(step ? 5 : 3);
          if (i > 0) expect(r.amount).not.toBe(rounds[i - 1].amount);
        });
      }
    }
  });

  it('the child counts by tapping, then the numbers appear; the right one scores', async () => {
    const h = harness();
    render(<Count {...h.props} activity={countActivity} stage="B" step={1} maxChoices={4} itemOrder={[]} />);
    const amount = Number(screen.getByTestId('count').dataset.amount);
    const choices = () => screen.getAllByTestId('count-choice') as HTMLButtonElement[];
    expect(choices().every((b) => b.disabled)).toBe(true);
    for (const obj of screen.getAllByTestId('count-object')) fireEvent.click(obj);
    await waitFor(() => expect(h.spoken).toContain(`num.${amount}`));
    expect(h.spoken).toContain('num.1');
    await waitFor(() => expect(choices().every((b) => !b.disabled)).toBe(true));
    fireEvent.click(choices().find((b) => Number(b.dataset.value) === amount)!);
    await waitFor(() => expect(h.reports.length).toBe(1));
    expect(h.reports[0]).toMatchObject({ firstTry: true, scored: true, competencies: ['l1.kasanayan.bilang'] });
  });

  it('a wrong number only asks to try again', async () => {
    const h = harness();
    render(<Count {...h.props} activity={countActivity} stage="B" step={1} maxChoices={4} itemOrder={[]} />);
    const amount = Number(screen.getByTestId('count').dataset.amount);
    for (const obj of screen.getAllByTestId('count-object')) fireEvent.click(obj);
    const wrong = () => (screen.getAllByTestId('count-choice') as HTMLButtonElement[]).find((b) => Number(b.dataset.value) !== amount)!;
    await waitFor(() => expect(wrong().disabled).toBe(false));
    fireEvent.click(wrong());
    await waitFor(() => expect(h.spoken).toContain('fb.try-again'));
    expect(h.reports.length).toBe(0);
  });
});

describe('Hide and find', () => {
  it('Stage A always has exactly two places to look; Stage B three', () => {
    expect(hideSpotCount(0, 2)).toBe(2);
    expect(hideSpotCount(5, 2)).toBe(2);
    expect(hideSpotCount(1, 4)).toBe(3);
    for (const r of buildHideRounds(hideActivity.items, 2)) {
      expect(r.spots.length).toBe(2);
      expect(r.hiddenAt).toBeGreaterThanOrEqual(0);
      expect(r.hiddenAt).toBeLessThan(2);
    }
  });

  it('Butil hides; a wrong place says "not here"; after two misses his leaf peeks out; the right place finds him', async () => {
    HIDE_TIMING.walkMs = 10;
    HIDE_TIMING.pauseMs = 10;
    const h = harness();
    render(<HideAndFind {...h.props} activity={hideActivity} stage="A" step={0} maxChoices={2} itemOrder={[]} />);
    await waitFor(() => expect(screen.getByTestId('hide').dataset.phase).toBe('seek'));
    expect(h.spoken[0]).toBe('instr.hide');
    const where = Number(screen.getByTestId('hide').dataset.hidden);
    const spots = () => screen.getAllByTestId('hide-spot');
    expect(spots().length).toBe(2);
    const wrong = () => spots().find((s) => Number(s.dataset.spot) !== where)!;

    fireEvent.click(wrong());
    await waitFor(() => expect(h.spoken).toContain('hide.not-here'));
    await waitFor(() => expect(wrong().className).not.toContain('card-wobble'));
    fireEvent.click(wrong());
    await waitFor(() => expect(document.querySelector('.hide-leaf')).not.toBeNull());

    await waitFor(() => expect(wrong().className).not.toContain('card-wobble'));
    fireEvent.click(spots().find((s) => Number(s.dataset.spot) === where)!);
    await waitFor(() => expect(h.spoken).toContain('hide.found'));
    expect(h.reports[0]).toMatchObject({ firstTry: false, scored: true, competencies: ['l1.kasanayan.hanap'] });
  });

  it('taps while Butil is still walking do nothing', async () => {
    HIDE_TIMING.walkMs = 5000;
    HIDE_TIMING.pauseMs = 10;
    const h = harness();
    render(<HideAndFind {...h.props} activity={hideActivity} stage="A" step={0} maxChoices={2} itemOrder={[]} />);
    await waitFor(() => expect(screen.getByTestId('hide').dataset.phase).toBe('hiding'));
    for (const s of screen.getAllByTestId('hide-spot')) fireEvent.click(s);
    expect(h.reports.length).toBe(0);
    expect(h.spoken).not.toContain('hide.not-here');
  });
});

describe('Puzzle', () => {
  it('2, 3 and then 4 pieces', () => {
    expect(puzzleShape(0)).toEqual({ cols: 2, rows: 1 });
    expect(puzzleShape(1)).toEqual({ cols: 3, rows: 1 });
    expect(puzzleShape(2)).toEqual({ cols: 2, rows: 2 });
  });

  it('pieces never start in the solved order', () => {
    for (let k = 0; k < 100; k++) {
      for (const n of [2, 3, 4]) expect(trayOrder(n)).not.toEqual(Array.from({ length: n }, (_, i) => i));
    }
  });

  it('tapping a piece then its place puts it there; the wrong place wobbles', async () => {
    const h = harness();
    render(<Puzzle {...h.props} activity={puzzleActivity} stage="B" step={0} maxChoices={4} itemOrder={puzzleActivity.items} />);
    const piece = (n: number) => screen.getAllByTestId('puzzle-piece').find((p) => Number(p.dataset.piece) === n)!;
    const slot = (n: number) => screen.getAllByTestId('puzzle-slot').find((s) => Number(s.dataset.slot) === n)!;
    const tapPiece = (n: number) => { fireEvent.pointerDown(piece(n), { clientX: 5, clientY: 5 }); fireEvent.pointerUp(piece(n), { clientX: 5, clientY: 5 }); };

    tapPiece(0);
    fireEvent.click(slot(1));
    await waitFor(() => expect(h.spoken).toContain('fb.try-again'));
    expect(screen.getAllByTestId('puzzle-piece').length).toBe(2);

    await waitFor(() => expect(piece(0).className).not.toContain('card-wobble'));
    tapPiece(0);
    fireEvent.click(slot(0));
    await waitFor(() => expect(screen.getAllByTestId('puzzle-piece').length).toBe(1));
    tapPiece(1);
    fireEvent.click(slot(1));
    await waitFor(() => expect(h.reports.length).toBe(1));
    expect(h.reports[0]).toMatchObject({ firstTry: false, scored: true, competencies: ['l1.kasanayan.puzzle'] });
    expect(h.spoken).toContain('item.komunidad.aso');
  });
});

describe('Sing and move', () => {
  it('chants every verse over the beat, freezes twice, and is never scored', async () => {
    SING_TIMING.beatsAfterLine = 0;
    SING_TIMING.minBeatsPerVerse = 0;
    SING_TIMING.freezeMs = 20;
    const h = harness();
    const fast = { ...singActivity, bpm: 140 };
    await act(async () => {
      render(<SingAndMove {...h.props} activity={fast} stage="A" step={0} maxChoices={2} itemOrder={[]} />);
    });
    await waitFor(() => expect(h.finish).toHaveBeenCalledTimes(1), { timeout: 15_000 });
    expect(h.spoken.filter((k) => k.startsWith('chant.'))).toEqual(['chant.palakpak', 'chant.padyak', 'chant.tapik', 'chant.ikot']);
    expect(h.spoken.filter((k) => k === 'sing.freeze').length).toBe(2);
    expect(h.spoken.filter((k) => k === 'sing.resume').length).toBe(2);
    expect(h.reports.length).toBe(4);
    expect(h.reports.every((r) => r.scored === false)).toBe(true);
  }, 20_000);
});
