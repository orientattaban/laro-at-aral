import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HoldButton } from '../../src/components/HoldButton';
import { ParentGate, makeSum } from '../../src/components/ParentGate';
import { content, getActivity } from '../../src/content';
import type { ItemActivity, SortActivity } from '../../src/content/types';
import type { TrialReport } from '../../src/core/progress';
import { FindIt, buildFindItTrials, findItChoiceCount } from '../../src/engines/FindIt';
import { MatchPairs, buildMatchRounds } from '../../src/engines/MatchPairs';
import { Sort, entriesForStep } from '../../src/engines/Sort';
import { TapAndHear, cardsPerPage } from '../../src/engines/TapAndHear';
import { ENGINES } from '../../src/engines/registry';

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

const findActivity = getActivity('l1.bahay.pamilya.kasapi.find') as ItemActivity;
const tapActivity = getActivity('l1.bahay.pamilya.kasapi.tap') as ItemActivity;
const matchActivity = getActivity('l1.bahay.pamilya.kasapi.match') as ItemActivity;
const sortActivity = getActivity('l1.bahay.ako.laki-kulay.sort') as SortActivity;

describe('rules for a very young player', () => {
  it('never more than four choices at Levels 1 and 2, whatever the settings say', () => {
    for (const step of [0, 1, 2, 5, 9]) {
      expect(findItChoiceCount(1, 9, step, 20)).toBeLessThanOrEqual(4);
      expect(findItChoiceCount(2, 9, step, 20)).toBeLessThanOrEqual(4);
    }
    expect(cardsPerPage('B', 9)).toBeLessThanOrEqual(4);
  });

  it('Stage A (age 2) always has exactly two pictures in Find it', () => {
    for (const step of [0, 1, 2]) expect(findItChoiceCount(1, 2, step, 7)).toBe(2);
    expect(cardsPerPage('A', 2)).toBe(2);
  });

  it('Stage B grows from two to three to four pictures', () => {
    expect([0, 1, 2].map((s) => findItChoiceCount(1, 4, s, 7))).toEqual([2, 3, 4]);
  });

  it('every Find-it question includes the right answer once, with no repeats', () => {
    const trials = buildFindItTrials(findActivity.items, findActivity.items, 4, 4);
    expect(trials.length).toBe(4);
    for (const trial of trials) {
      expect(trial.choices).toContain(trial.target);
      expect(new Set(trial.choices).size).toBe(4);
    }
  });

  it('Match pairs shows four cards: two pairs', () => {
    const rounds = buildMatchRounds(matchActivity.items, 2);
    expect(rounds.length).toBe(2);
    for (const cards of rounds) {
      expect(cards.length).toBe(4);
      expect(new Set(cards.map((c) => c.itemId)).size).toBe(2);
    }
  });

  it('Sort uses two or three baskets and gives fewer things at the easy step', () => {
    for (const activity of content.activities) {
      if (activity.engine !== 'sort') continue;
      for (const round of activity.rounds) {
        expect(round.baskets.length).toBeGreaterThanOrEqual(2);
        expect(round.baskets.length).toBeLessThanOrEqual(3);
        expect(entriesForStep(round, 0).length).toBeLessThanOrEqual(4);
        expect(entriesForStep(round, 1)).toEqual(round.entries);
      }
    }
  });

  it('every engine used by the content exists', () => {
    for (const activity of content.activities) expect(ENGINES[activity.engine]).toBeDefined();
  });
});

describe('Tap and hear', () => {
  it('says each name, and the arrow only works after every card was heard', async () => {
    const h = harness();
    render(<TapAndHear {...h.props} activity={tapActivity} stage="A" step={0} maxChoices={2} itemOrder={tapActivity.items} />);
    const cards = screen.getAllByTestId('tap-card');
    expect(cards.length).toBe(2);
    const next = screen.getByTestId('next') as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    fireEvent.click(cards[0]);
    expect(next.disabled).toBe(true);
    fireEvent.click(cards[1]);
    await waitFor(() => expect(next.disabled).toBe(false));
    expect(h.spoken).toContain('item.pamilya.nanay');
    expect(h.reports.every((r) => r.scored === false)).toBe(true);
  });
});

describe('Find it', { timeout: 30_000 }, () => {
  it('speaks the instruction, then asks for a picture', async () => {
    const h = harness();
    render(<FindIt {...h.props} activity={findActivity} stage="A" step={0} maxChoices={2} itemOrder={findActivity.items} />);
    await waitFor(() => expect(h.spoken.some((k) => k.endsWith('.find'))).toBe(true));
    expect(h.spoken[0]).toBe('instr.find-it');
    expect(screen.getAllByTestId('choice').length).toBe(2);
  });

  it('wrong answer: gentle wobble and "try again"; after two tries the answer is pointed out', async () => {
    const h = harness();
    render(<FindIt {...h.props} activity={findActivity} stage="A" step={0} maxChoices={2} itemOrder={findActivity.items} />);
    await waitFor(() => expect(h.spoken.some((k) => k.endsWith('.find'))).toBe(true));
    const target = screen.getByTestId('choices').dataset.target!;
    const wrong = () => screen.getAllByTestId('choice').find((b) => b.dataset.item !== target)!;
    const right = () => screen.getAllByTestId('choice').find((b) => b.dataset.item === target)!;

    fireEvent.click(wrong());
    await waitFor(() => expect(h.spoken).toContain('fb.try-again'));
    expect(right().className).not.toContain('card-hint');

    await waitFor(() => expect(wrong().className).not.toContain('card-wobble'));
    fireEvent.click(wrong());
    await waitFor(() => expect(right().className).toContain('card-hint'));
    expect(h.spoken).toContain('fb.look-here');

    await waitFor(() => expect(wrong().className).not.toContain('card-wobble'));
    fireEvent.click(right());
    await waitFor(() => expect(h.reports.length).toBe(1));
    expect(h.reports[0]).toMatchObject({ itemId: target, firstTry: false, scored: true });
    // Effort is praised, not just success (LRP 1, page 14).
    expect(h.spoken).toContain('fb.effort');
  });

  it('finishes after its questions, with no failure screen', async () => {
    const h = harness();
    render(<FindIt {...h.props} activity={findActivity} stage="A" step={0} maxChoices={2} itemOrder={findActivity.items} />);
    for (let i = 0; i < 4; i++) {
      await waitFor(() => expect(h.reports.length).toBe(i));
      await waitFor(() => {
        const row = screen.getByTestId('choices');
        const card = screen.getAllByTestId('choice').find((b) => b.dataset.item === row.dataset.target)!;
        expect(card.className).toContain('card-idle');
        fireEvent.click(card);
        expect(h.reports.length).toBe(i + 1);
      }, { timeout: 8000 });
    }
    await waitFor(() => expect(h.finish).toHaveBeenCalledTimes(1), { timeout: 8000 });
    expect(h.reports.every((r) => r.firstTry)).toBe(true);
  });
});

describe('Match pairs', () => {
  it('two cards that are the same stay matched', async () => {
    const h = harness();
    render(<MatchPairs {...h.props} activity={matchActivity} stage="B" step={0} maxChoices={4} itemOrder={matchActivity.items} />);
    const cards = screen.getAllByTestId('match-card');
    expect(cards.length).toBe(4);
    const first = cards[0];
    const partner = cards.slice(1).find((c) => c.dataset.item === first.dataset.item)!;
    fireEvent.click(first);
    fireEvent.click(partner);
    await waitFor(() => expect(h.reports.length).toBe(1));
    expect(h.reports[0]).toMatchObject({ firstTry: true, scored: true });
    expect(h.reports[0].competencies).toContain('l1.kasanayan.pagpapares');
  });

  it('two different cards wobble and can be tried again', async () => {
    const h = harness();
    render(<MatchPairs {...h.props} activity={matchActivity} stage="B" step={0} maxChoices={4} itemOrder={matchActivity.items} />);
    const cards = screen.getAllByTestId('match-card');
    const other = cards.slice(1).find((c) => c.dataset.item !== cards[0].dataset.item)!;
    fireEvent.click(cards[0]);
    fireEvent.click(other);
    await waitFor(() => expect(h.spoken).toContain('fb.try-again'));
    expect(h.reports.length).toBe(0);
  });

  it('at the harder step the cards start face down', () => {
    const h = harness();
    render(<MatchPairs {...h.props} activity={matchActivity} stage="B" step={1} maxChoices={4} itemOrder={matchActivity.items} />);
    expect(screen.getAllByTestId('match-card').every((c) => c.className.includes('card-down'))).toBe(true);
  });
});

describe('Sort', { timeout: 30_000 }, () => {
  it('the rule changes mid-game: big and small first, then colour', async () => {
    const h = harness();
    render(<Sort {...h.props} activity={sortActivity} stage="B" step={0} maxChoices={4} itemOrder={[]} />);
    const rules: string[] = [];
    for (let i = 0; i < 8; i++) {
      await waitFor(() => {
        const sort = screen.getByTestId('sort');
        const basket = screen.getAllByTestId('basket').find((b) => b.dataset.basket === sort.dataset.answer)!;
        const before = h.reports.length;
        fireEvent.click(basket);
        expect(h.reports.length).toBe(before + 1);
        rules.push(sort.dataset.rule!);
      }, { timeout: 8000 });
    }
    await waitFor(() => expect(h.finish).toHaveBeenCalledTimes(1), { timeout: 8000 });
    expect(rules).toEqual(['laki', 'laki', 'laki', 'laki', 'kulay', 'kulay', 'kulay', 'kulay']);
    expect(h.spoken).toContain('instr.sort.laki');
    expect(h.spoken).toContain('instr.sort.kulay');
    expect(h.reports[0].competencies).toEqual(['l1.kasanayan.laki']);
    expect(h.reports[7].competencies).toEqual(['l1.kasanayan.kulay']);
  });

  it('a wrong basket only asks to try again', async () => {
    const h = harness();
    render(<Sort {...h.props} activity={sortActivity} stage="B" step={0} maxChoices={4} itemOrder={[]} />);
    const sort = screen.getByTestId('sort');
    const wrong = screen.getAllByTestId('basket').find((b) => b.dataset.basket !== sort.dataset.answer)!;
    fireEvent.click(wrong);
    await waitFor(() => expect(h.spoken).toContain('fb.try-again'));
    expect(h.reports.length).toBe(0);
    expect(h.finish).not.toHaveBeenCalled();
  });
});

describe('parent gate', () => {
  it('the sum uses two numbers from 4 to 9', () => {
    for (let i = 0; i < 200; i++) {
      const sum = makeSum();
      expect(sum.a).toBeGreaterThanOrEqual(4);
      expect(sum.a).toBeLessThanOrEqual(9);
      expect(sum.b).toBeGreaterThanOrEqual(4);
      expect(sum.b).toBeLessThanOrEqual(9);
      expect(sum.answer).toBe(sum.a + sum.b);
    }
  });

  it('a quick tap does nothing; holding for three seconds works', () => {
    vi.useFakeTimers();
    const done = vi.fn();
    render(<HoldButton label="hold" onComplete={done}><span>x</span></HoldButton>);
    const button = screen.getByRole('button');

    fireEvent.pointerDown(button);
    act(() => { vi.advanceTimersByTime(2900); });
    fireEvent.pointerUp(button);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(done).not.toHaveBeenCalled();

    fireEvent.pointerDown(button);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('a wrong answer does not open the Parent Corner; the right answer does', () => {
    const pass = vi.fn();
    render(<ParentGate lang="fil" onPass={pass} onCancel={() => {}} />);
    const press = (digits: string) => {
      for (const d of digits) fireEvent.click(screen.getByRole('button', { name: d }));
    };
    press('1');
    fireEvent.click(screen.getByTestId('gate-ok'));
    expect(pass).not.toHaveBeenCalled();

    const sum = screen.getByTestId('gate-sum');
    press(String(Number(sum.dataset.a) + Number(sum.dataset.b)));
    fireEvent.click(screen.getByTestId('gate-ok'));
    expect(pass).toHaveBeenCalledTimes(1);
  });
});
