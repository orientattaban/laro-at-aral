// Engine 14: Sing and move. Speech services cannot sing, so Butil says a
// short rhyme over a soft drum beat made in code, and shows the action
// (clap, stomp, pat, turn) while he does it himself. Twice, the beat stops:
// "Tigil!" and everyone freezes, then "Sige, galaw ulit!" and it goes on.
// Nothing is scored: this is about moving, away from the screen as much as on it.
import { useEffect, useRef, useState } from 'react';
import type { MoveAction, SingActivity } from '../content/types';
import { sfx, startBeat } from '../core/audio';
import { t } from '../core/i18n';
import { wait } from '../core/util';
import { Butil } from '../components/Butil';
import { useAlive } from './Card';
import type { EngineProps } from './types';

/** Tests may shorten these. */
export const SING_TIMING = { beatsAfterLine: 4, minBeatsPerVerse: 8, freezeMs: 3000 };

function ActionPicture({ action }: { action: MoveAction }) {
  const ink = '#5b3a22';
  const skin = '#c98a5a';
  switch (action) {
    case 'clap':
      return (
        <svg viewBox="0 0 120 100" aria-hidden="true">
          {/* Two open hands facing each other, with "clap" sparkles between them */}
          <g transform="rotate(-12 34 62)">
            <path d="M22 94 V46 Q22 30 34 30 Q46 30 46 46 V62 L53 55 Q59 50 62 57 L50 78 Q45 94 34 94 Z"
              fill={skin} stroke={ink} strokeWidth="5" strokeLinejoin="round" />
          </g>
          <g transform="translate(120 0) scale(-1 1) rotate(-12 34 62)">
            <path d="M22 94 V46 Q22 30 34 30 Q46 30 46 46 V62 L53 55 Q59 50 62 57 L50 78 Q45 94 34 94 Z"
              fill={skin} stroke={ink} strokeWidth="5" strokeLinejoin="round" />
          </g>
          <path d="M60 8 V26 M46 12 L52 26 M74 12 L68 26" stroke="#f2b63c" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );
    case 'stomp':
      return (
        <svg viewBox="0 0 120 100" aria-hidden="true">
          <path d="M50 10 V58 Q50 66 58 66 H88 Q98 66 98 76 V78 H40 Q34 78 34 70 V10 Z" fill={skin} stroke={ink} strokeWidth="5" strokeLinejoin="round" />
          <path d="M20 90 H104" stroke={ink} strokeWidth="6" strokeLinecap="round" />
          <path d="M14 70 L24 80 M106 70 L96 80 M60 86 V94" stroke="#f2b63c" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );
    case 'pat':
      return (
        <svg viewBox="0 0 120 100" aria-hidden="true">
          <path d="M20 70 Q60 40 100 70 L100 92 H20 Z" fill="#3f82d6" stroke={ink} strokeWidth="5" strokeLinejoin="round" />
          <path d="M44 56 L46 24 Q47 16 54 17 L56 42 L58 12 Q59 5 66 6 L66 42 L70 16 Q72 9 78 11 L76 46 L84 30 Q88 24 93 28 L82 60 Z" fill={skin} stroke={ink} strokeWidth="5" strokeLinejoin="round" />
        </svg>
      );
    case 'turn':
      return (
        <svg viewBox="0 0 120 100" aria-hidden="true">
          <path d="M60 14 A36 36 0 1 1 26 62" fill="none" stroke="#5a9e4b" strokeWidth="10" strokeLinecap="round" />
          <path d="M8 56 L28 50 L34 72 Z" fill="#5a9e4b" stroke="#356b2d" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      );
  }
}

export function SingAndMove({ activity, lang, speak, report, finish }: EngineProps<SingActivity>) {
  const [verse, setVerse] = useState(-1);
  const [frozen, setFrozen] = useState(false);
  const [hop, setHop] = useState(0);
  const stopBeat = useRef<() => void>(() => {});
  const alive = useAlive();
  const beatMs = 60_000 / activity.bpm;

  useEffect(() => {
    let cancelled = false;
    const live = () => !cancelled && alive.current;
    (async () => {
      await speak(activity.instruction, { pose: 'wave' });
      if (!live()) return;
      stopBeat.current = startBeat(activity.bpm);
      await wait(beatMs * 4); // one bar of beat before the first line
      for (let i = 0; i < activity.verses.length; i++) {
        if (!live()) return;
        setVerse(i);
        const started = Date.now();
        await speak(activity.verses[i].line, { pose: 'cheer' });
        if (!live()) return;
        // Keep moving for a while after the line, and long enough even without a voice clip.
        const minimum = beatMs * SING_TIMING.minBeatsPerVerse - (Date.now() - started);
        await wait(Math.max(beatMs * SING_TIMING.beatsAfterLine, minimum));
        if (!live()) return;
        report({ competencies: activity.competencies, firstTry: true, scored: false });
        if (activity.freezeAfter.includes(i)) {
          stopBeat.current();
          setFrozen(true);
          await speak('sing.freeze', { pose: 'idle' });
          await wait(SING_TIMING.freezeMs);
          if (!live()) return;
          setFrozen(false);
          await speak('sing.resume', { pose: 'cheer' });
          if (!live()) return;
          stopBeat.current = startBeat(activity.bpm);
        }
      }
      stopBeat.current();
      if (live()) finish();
    })();
    return () => {
      cancelled = true;
      stopBeat.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = verse >= 0 ? activity.verses[verse] : null;
  const actionName = current ? t(lang, current.line) : t(lang, activity.instruction);

  return (
    <div
      className={`engine sing${frozen ? ' frozen' : ''}`}
      data-testid="sing"
      data-verse={verse}
      data-frozen={frozen}
      style={{ ['--beat' as string]: `${beatMs}ms` }}
    >
      <div className="sing-stage">
        <div className={`sing-butil${current && !frozen ? ` move-${current.action}` : ''}`} key={hop}>
          <Butil pose={frozen ? 'idle' : 'cheer'} />
        </div>
        <button
          type="button"
          className="sing-action"
          aria-label={actionName}
          data-testid="sing-action"
          onClick={() => {
            // Tapping along makes a clap and makes Butil hop: fun, never scored.
            sfx.clap();
            setHop((n) => n + 1);
          }}
        >
          {frozen ? (
            <svg viewBox="0 0 120 100" aria-hidden="true" className="sing-stop">
              <path d="M38 6 H82 L114 38 V62 L82 94 H38 L6 62 V38 Z" fill="#d9483b" stroke="#9c2a21" strokeWidth="6" strokeLinejoin="round" />
              <path d="M44 74 L46 36 Q47 30 52 31 L54 54 L56 26 Q57 20 62 21 L63 54 L66 30 Q68 24 72 26 L71 58 L78 46 Q82 42 85 46 L74 78 Z" fill="#fffdf6" stroke="#9c2a21" strokeWidth="3" strokeLinejoin="round" />
            </svg>
          ) : current ? (
            <ActionPicture action={current.action} />
          ) : (
            <ActionPicture action="clap" />
          )}
        </button>
      </div>
    </div>
  );
}
