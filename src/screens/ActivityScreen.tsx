// Runs one game: picks the engine, gives it today's items and difficulty,
// saves what happens, and shows a short, calm reward at the end.
import { useCallback, useEffect, useRef, useState } from 'react';
import { content, getActivity, getLevel, getStage } from '../content';
import { Butil } from '../components/Butil';
import { Bubble, GuideButil } from '../components/Guide';
import { sfx } from '../core/audio';
import { dayKey } from '../core/dates';
import { useNarrator } from '../core/hooks';
import { t } from '../core/i18n';
import { currentStep, recordActivityPlayed, recordTrial } from '../core/progress';
import type { TrialReport } from '../core/progress';
import { orderForPlay, pickReviewExtras } from '../core/review';
import { eligibleActivities } from '../core/scheduler';
import { store, useSave } from '../core/store';
import { Arrow, Star } from '../draw/Drawn';
import { engineFor, reviewExtrasAllowed } from '../engines/registry';

export type ExitReason = 'done' | 'back' | 'time';

/** A reward lasts under two seconds and does not flash. */
export const REWARD_MS = 1800;

export function ActivityScreen({
  activityId, timeUp, onExit,
}: {
  activityId: string;
  timeUp: boolean;
  onExit: (reason: ExitReason) => void;
}) {
  const activity = getActivity(activityId);
  const settings = useSave((d) => d.settings);
  const lang = settings.language;
  const { line, speak, replay } = useNarrator(lang);
  const [rewarding, setRewarding] = useState(false);
  const timeUpRef = useRef(timeUp);
  timeUpRef.current = timeUp;
  const leaving = useRef(false);

  // Decided once when the game opens, so nothing jumps around mid-game.
  const [setup] = useState(() => {
    const data = store.get();
    const today = dayKey();
    const engine = engineFor(activity);
    const level = getLevel(activity.level);
    const stage =
      (activity.level === data.settings.level ? getStage(activity.level, data.settings.stage) : undefined) ??
      level.stages[level.stages.length - 1];
    const maxStep = engine.maxStep(stage.maxChoices);
    const primary = activity.competencies[0];
    const items = 'items' in activity ? activity.items : [];
    let reviewExtras: string[] = [];
    if (engine.mixesReview) {
      const others = eligibleActivities(content.activities, data.settings)
        .flatMap((a) => ('items' in a ? a.items : []));
      reviewExtras = pickReviewExtras(
        [...new Set(others)], items, data.progress.items, today, reviewExtrasAllowed(stage.id),
      );
    }
    return {
      Engine: engine.component,
      stage,
      maxStep,
      primary,
      step: currentStep(data, activity.engine, primary, maxStep),
      itemOrder: orderForPlay(items, data.progress.items, today),
      reviewExtras,
    };
  });

  const leave = useCallback((reason: ExitReason, delay: number) => {
    if (leaving.current) return;
    leaving.current = true;
    setTimeout(() => onExit(reason), delay);
  }, [onExit]);

  const report = useCallback((r: TrialReport) => {
    store.set((d) => recordTrial(d, activity.engine, setup.primary, r, dayKey(), setup.maxStep));
    // Play time is over: let this question finish, then say goodbye.
    if (timeUpRef.current) {
      store.set((d) => recordActivityPlayed(d, activity.id, dayKey()), true);
      leave('time', 1600);
    }
  }, [activity, setup, leave]);

  const finish = useCallback(() => {
    if (leaving.current) return;
    store.set((d) => recordActivityPlayed(d, activity.id, dayKey()), true);
    setRewarding(true);
    sfx.reward();
    void speak('fb.done', { transient: true, pose: 'cheer' });
    leave('done', REWARD_MS);
  }, [activity, leave, speak]);

  useEffect(() => () => { void store.flush(); }, []);

  const { Engine } = setup;

  return (
    <div className={`screen activity place-${activity.place}`} data-testid="activity" data-activity={activity.id} data-engine={activity.engine}>
      <aside className="guide">
        <button type="button" className="round-button" aria-label={t(lang, 'ui.back')} data-testid="back" onClick={() => leave('back', 0)}>
          <Arrow direction="left" />
        </button>
        <GuideButil line={line} lang={lang} onReplay={replay} />
      </aside>
      <section className="play">
        <Bubble line={line} lang={lang} captions={settings.captions} />
        <div className="play-area">
          {!rewarding && (
            <Engine
              activity={activity}
              lang={lang}
              stage={setup.stage.id}
              step={setup.step}
              maxChoices={setup.stage.maxChoices}
              captions={settings.captions}
              itemOrder={setup.itemOrder}
              reviewExtras={setup.reviewExtras}
              speak={speak}
              report={report}
              finish={finish}
            />
          )}
          {rewarding && (
            <div className="reward" data-testid="reward">
              <span className="reward-star"><Star /></span>
              <Butil pose="cheer" />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
