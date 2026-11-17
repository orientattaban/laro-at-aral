// Second half of the parent gate: a simple sum.
// (The first half is HoldButton: hold for three seconds.)
import { useState } from 'react';
import type { Lang } from '../content/types';
import { t } from '../core/i18n';

export interface Sum {
  a: number;
  b: number;
  answer: number;
}

/** A sum a grown-up finds easy and a small child cannot guess: two numbers from 4 to 9. */
export function makeSum(rng: () => number = Math.random): Sum {
  const a = 4 + Math.floor(rng() * 6);
  const b = 4 + Math.floor(rng() * 6);
  return { a, b, answer: a + b };
}

export function ParentGate({ lang, onPass, onCancel }: { lang: Lang; onPass: () => void; onCancel: () => void }) {
  const [sum, setSum] = useState<Sum>(() => makeSum());
  const [typed, setTyped] = useState('');
  const [wrong, setWrong] = useState(false);

  const press = (digit: string) => {
    setWrong(false);
    setTyped((v) => (v.length >= 2 ? v : v + digit));
  };

  const submit = () => {
    if (Number(typed) === sum.answer && typed !== '') {
      onPass();
    } else {
      setWrong(true);
      setTyped('');
      setSum(makeSum());
    }
  };

  return (
    <div className="overlay gate" role="dialog" aria-modal="true" aria-label={t(lang, 'gate.title')}>
      <div className="gate-card">
        <div className="gate-info">
          <h2>{t(lang, 'gate.title')}</h2>
          <p className="gate-question">{t(lang, 'gate.sum')}</p>
          <p className="gate-sum" data-testid="gate-sum" data-a={sum.a} data-b={sum.b}>
            {sum.a} + {sum.b} = <span className="gate-typed">{typed || '?'}</span>
          </p>
          <p className="gate-wrong" role="status">{wrong ? t(lang, 'gate.wrong') : ' '}</p>
          <button type="button" className="text-button" data-testid="gate-cancel" onClick={onCancel}>
            {t(lang, 'gate.cancel')}
          </button>
        </div>
        <div className="gate-keys">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button type="button" key={d} onClick={() => press(d)}>{d}</button>
          ))}
          <button type="button" className="gate-key-wide" onClick={() => { setTyped(''); setWrong(false); }}>
            {t(lang, 'gate.clear')}
          </button>
          <button type="button" onClick={() => press('0')}>0</button>
          <button type="button" className="gate-key-ok" data-testid="gate-ok" onClick={submit}>{t(lang, 'gate.ok')}</button>
        </div>
      </div>
    </div>
  );
}
