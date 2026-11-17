// The app shell: decides which screen is showing and keeps the play-time clock.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ParentGate } from './components/ParentGate';
import { Butil } from './components/Butil';
import { unlockAudio } from './core/audio';
import { dayKey } from './core/dates';
import { t } from './core/i18n';
import { addPlayTime, endSession, newDayUsage, pastGrace, timeState } from './core/session';
import type { TimeState } from './core/session';
import { store, useSave } from './core/store';
import { ActivityScreen } from './screens/ActivityScreen';
import type { ExitReason } from './screens/ActivityScreen';
import { ByeScreen } from './screens/ByeScreen';
import { MapScreen } from './screens/MapScreen';
import { ParentCorner, sessionLimitSeconds } from './screens/ParentCorner';
import { PlaceScreen } from './screens/PlaceScreen';

type Screen =
  | { name: 'map' }
  | { name: 'place'; placeId: string }
  | { name: 'activity'; placeId: string; activityId: string; run: number }
  | { name: 'bye' }
  | { name: 'parent' };

function currentTimeState(): TimeState {
  const data = store.get();
  const usage = data.usage[dayKey()] ?? newDayUsage();
  return timeState(usage, sessionLimitSeconds(data.settings), data.settings.dailyCapMinutes * 60);
}

function RotateHint({ text }: { text: string }) {
  return (
    <div className="rotate-hint" aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <rect x="34" y="14" width="32" height="56" rx="6" fill="none" stroke="#5b3a22" strokeWidth="5" />
        <path d="M20 78 Q50 98 80 78" fill="none" stroke="#5a9e4b" strokeWidth="6" strokeLinecap="round" />
        <path d="M80 78 L68 76 L76 88 Z" fill="#5a9e4b" />
      </svg>
      <p>{text}</p>
    </div>
  );
}

export function App() {
  const [ready, setReady] = useState(store.ready);
  const [screen, setScreen] = useState<Screen>({ name: 'map' });
  const [gateOpen, setGateOpen] = useState(false);
  const settings = useSave((d) => d.settings);
  const today = dayKey();
  const usage = useSave((d) => d.usage[today]);
  const lang = settings.language;
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const gateRef = useRef(gateOpen);
  gateRef.current = gateOpen;
  const runCounter = useRef(0);

  const limit = sessionLimitSeconds(settings);
  const cap = settings.dailyCapMinutes * 60;
  const state = timeState(usage ?? newDayUsage(), limit, cap);
  const overGrace = pastGrace(usage ?? newDayUsage(), limit, cap);

  // Load saved data once.
  useEffect(() => {
    let cancelled = false;
    void store.init().then(() => {
      if (cancelled) return;
      if (currentTimeState() !== 'ok') setScreen({ name: 'bye' });
      setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  // House-keeping for a child's device.
  useEffect(() => {
    const unlock = () => unlockAudio();
    const noMenu = (e: Event) => e.preventDefault();
    const flush = () => { if (document.visibilityState === 'hidden') void store.flush(); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('contextmenu', noMenu);
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('contextmenu', noMenu);
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'fil' ? 'fil' : lang;
  }, [lang]);

  // The play-time clock. It only runs while the child can actually play.
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const name = screenRef.current.name;
      const playing = name === 'map' || name === 'place' || name === 'activity';
      if (!playing || gateRef.current || document.visibilityState !== 'visible') return;
      store.set((d) => {
        const key = dayKey();
        return { ...d, usage: { ...d.usage, [key]: addPlayTime(d.usage[key] ?? newDayUsage(), 1) } };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [ready]);

  const sayGoodbye = useCallback(() => {
    store.set((d) => {
      const key = dayKey();
      return { ...d, usage: { ...d.usage, [key]: endSession(d.usage[key] ?? newDayUsage()) } };
    }, true);
    setScreen({ name: 'bye' });
  }, []);

  // When time is up: on the map or in a place, say goodbye straight away.
  // In the middle of a game, the game ends itself after the current question,
  // or here if that takes longer than the grace period.
  useEffect(() => {
    if (!ready || state === 'ok') return;
    if (screen.name === 'map' || screen.name === 'place') sayGoodbye();
    else if (screen.name === 'activity' && overGrace) sayGoodbye();
  }, [ready, state, overGrace, screen.name, sayGoodbye]);

  const exitActivity = useCallback((placeId: string, reason: ExitReason) => {
    if (reason === 'time' || currentTimeState() !== 'ok') sayGoodbye();
    else setScreen({ name: 'place', placeId });
  }, [sayGoodbye]);

  if (!ready) {
    return (
      <div className="screen loading" data-testid="loading">
        <Butil pose="idle" />
      </div>
    );
  }

  return (
    <>
      {screen.name === 'map' && (
        <MapScreen
          onOpenPlace={(placeId) => setScreen({ name: 'place', placeId })}
          onParent={() => setGateOpen(true)}
        />
      )}
      {screen.name === 'place' && (
        <PlaceScreen
          placeId={screen.placeId}
          onBack={() => setScreen({ name: 'map' })}
          onPlay={(activityId) => {
            runCounter.current += 1;
            setScreen({ name: 'activity', placeId: screen.placeId, activityId, run: runCounter.current });
          }}
        />
      )}
      {screen.name === 'activity' && (
        <ActivityScreen
          key={screen.run}
          activityId={screen.activityId}
          timeUp={state !== 'ok'}
          onExit={(reason) => exitActivity(screen.placeId, reason)}
        />
      )}
      {screen.name === 'bye' && (
        <ByeScreen
          kind={state === 'daily-over' ? 'daily-over' : 'session-over'}
          onParent={() => setGateOpen(true)}
        />
      )}
      {screen.name === 'parent' && (
        <ParentCorner onBack={() => setScreen(currentTimeState() === 'ok' ? { name: 'map' } : { name: 'bye' })} />
      )}
      {gateOpen && (
        <ParentGate
          lang={lang}
          onCancel={() => setGateOpen(false)}
          onPass={() => { setGateOpen(false); setScreen({ name: 'parent' }); }}
        />
      )}
      <RotateHint text={t(lang, 'ui.rotate')} />
    </>
  );
}
