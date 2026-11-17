// Parent Corner. Reached only through the parent gate.
// This is the one part of the app that needs reading; it is for grown-ups.
import { useRef, useState } from 'react';
import { content, getCompetency, getStage, languageReady } from '../content';
import type { Activity, AreaId, Lang, StageId } from '../content/types';
import { missingClips } from '../core/audio';
import { dayKey } from '../core/dates';
import { t } from '../core/i18n';
import { masteryLabel } from '../core/mastery';
import type { MasteryLabel } from '../core/mastery';
import type { SaveData, Settings } from '../core/save';
import { emptyProgress } from '../core/save';
import { eligibleActivities } from '../core/scheduler';
import { allowAnotherSession, clampMinutes, newDayUsage, timeState } from '../core/session';
import { makeExport, parseImport } from '../core/storage';
import { store, useSave } from '../core/store';

declare const __APP_VERSION__: string;

type Tab = 'settings' | 'progress' | 'sources' | 'data';
const TABS: Tab[] = ['settings', 'progress', 'sources', 'data'];
const AREAS: AreaId[] = ['language', 'social-emotional', 'cognitive', 'physical', 'character', 'creative'];
const MASTERY_DOTS: Record<MasteryLabel, number> = { new: 0, starting: 1, growing: 2, can: 3 };

export function sessionLimitSeconds(settings: Settings): number {
  const stage = getStage(settings.level, settings.stage);
  const minutes = settings.sessionMinutes ?? stage?.sessionMinutes ?? 10;
  return minutes * 60;
}

function update(change: Partial<Settings>) {
  store.set((d) => ({ ...d, settings: { ...d.settings, ...change } }), true);
}

function activityLabel(activity: Activity, lang: Lang): string {
  const topics = activity.competencies
    .map((id) => getCompetency(id))
    .filter((c) => c !== undefined)
    .map((c) => t(lang, c.title));
  return `${t(lang, `engine.${activity.engine}`)}: ${topics.join(', ')}`;
}

function SettingsTab({ lang }: { lang: Lang }) {
  const settings = useSave((d) => d.settings);
  const today = dayKey();
  const usage = useSave((d) => d.usage[today]) ?? newDayUsage();
  const [allowed, setAllowed] = useState(false);
  const stage = getStage(settings.level, settings.stage);
  const sessionMinutes = settings.sessionMinutes ?? stage?.sessionMinutes ?? 10;
  const state = timeState(usage, sessionLimitSeconds(settings), settings.dailyCapMinutes * 60);
  const iloReady = languageReady('ilo');

  return (
    <div className="parent-section">
      <label className="field">
        <span>{t(lang, 'parent.name.label')}</span>
        <input
          type="text" maxLength={40} autoComplete="off" value={settings.childName}
          data-testid="child-name"
          onChange={(e) => update({ childName: e.target.value })}
        />
        <small>{t(lang, 'parent.name.help')}</small>
      </label>

      <fieldset className="field">
        <legend>{t(lang, 'parent.level')}</legend>
        <div className="choice-row">
          {content.levels.map((level) => (
            <label key={level.id} className={`choice${level.built ? '' : ' disabled'}`}>
              <input
                type="radio" name="level" disabled={!level.built}
                checked={settings.level === level.id}
                onChange={() => update({ level: level.id })}
              />
              <span>{level.id}. {t(lang, level.name)}{level.built ? '' : ` (${t(lang, 'parent.level.not-built')})`}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend>{t(lang, 'parent.stage')}</legend>
        <div className="choice-column">
          {(['A', 'B'] as StageId[]).map((id) => (
            <label key={id} className="choice">
              <input
                type="radio" name="stage" checked={settings.stage === id}
                data-testid={`stage-${id}`}
                onChange={() => update({ stage: id, sessionMinutes: null })}
              />
              <span>{t(lang, `stage.${id}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend>{t(lang, 'parent.language')}</legend>
        <div className="choice-row">
          {(['fil', 'en', 'ilo'] as Lang[]).map((id) => {
            const disabled = id === 'ilo' && !iloReady;
            return (
              <label key={id} className={`choice${disabled ? ' disabled' : ''}`}>
                <input
                  type="radio" name="language" disabled={disabled}
                  checked={settings.language === id}
                  data-testid={`lang-${id}`}
                  onChange={() => update({ language: id })}
                />
                <span>{disabled ? t(lang, 'lang.ilo.empty') : t(lang, `lang.${id}`)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="field-pair">
        <label className="field">
          <span>{t(lang, 'parent.session')}</span>
          <input
            type="number" inputMode="numeric" min={1} max={30} value={sessionMinutes}
            data-testid="session-minutes"
            onChange={(e) => update({ sessionMinutes: clampMinutes(Number(e.target.value), 1, 30) })}
          />
        </label>
        <label className="field">
          <span>{t(lang, 'parent.daily')}</span>
          <input
            type="number" inputMode="numeric" min={5} max={60} value={settings.dailyCapMinutes}
            data-testid="daily-minutes"
            onChange={(e) => update({ dailyCapMinutes: clampMinutes(Number(e.target.value), 5, 60) })}
          />
        </label>
      </div>
      <p className="note">{t(lang, 'parent.time.why')}</p>

      <div className="field">
        <p data-testid="played-today">{t(lang, 'parent.today', { min: Math.floor(usage.seconds / 60) })}</p>
        {state !== 'ok' && (
          <button
            type="button" className="parent-action" data-testid="allow-more"
            onClick={() => {
              store.set((d) => ({
                ...d,
                usage: {
                  ...d.usage,
                  [today]: allowAnotherSession(
                    d.usage[today] ?? newDayUsage(), sessionLimitSeconds(d.settings), d.settings.dailyCapMinutes * 60,
                  ),
                },
              }), true);
              setAllowed(true);
            }}
          >
            {t(lang, 'parent.allow-more')}
          </button>
        )}
        {allowed && <p className="note" role="status">{t(lang, 'parent.allow-more.done')}</p>}
      </div>

      <label className="toggle">
        <input type="checkbox" checked={settings.faith} data-testid="faith" onChange={(e) => update({ faith: e.target.checked })} />
        <span>{t(lang, 'parent.faith')}: {t(lang, settings.faith ? 'parent.on' : 'parent.off')}</span>
      </label>
      <label className="toggle">
        <input type="checkbox" checked={settings.captions} data-testid="captions" onChange={(e) => update({ captions: e.target.checked })} />
        <span>{t(lang, 'parent.captions')}: {t(lang, settings.captions ? 'parent.on' : 'parent.off')}</span>
      </label>
    </div>
  );
}

function ProgressTab({ lang }: { lang: Lang }) {
  const progress = useSave((d) => d.progress);
  const settings = useSave((d) => d.settings);
  const competencies = content.competencies.filter((c) => c.level <= settings.level);
  const needsPractice = new Set(
    competencies.filter((c) => masteryLabel(progress.competencies[c.id]) !== 'can').map((c) => c.theme),
  );
  const cards = content.cards
    .filter((c) => c.level <= settings.level && (settings.faith || !c.faith) && needsPractice.has(c.theme))
    .slice(0, 4);

  return (
    <div className="parent-section">
      <p className="note">{t(lang, 'parent.progress.help')}</p>
      {AREAS.map((area) => {
        const list = competencies.filter((c) => c.area === area);
        if (list.length === 0) return null;
        return (
          <div key={area} className="progress-area">
            <h3>{t(lang, `area.${area}`)}</h3>
            <ul className="progress-list">
              {list.map((c) => {
                const label = masteryLabel(progress.competencies[c.id]);
                return (
                  <li key={c.id} data-testid="competency" data-competency={c.id} data-mastery={label}>
                    <span className="progress-name">{t(lang, c.title)}</span>
                    <span className="progress-dots" aria-hidden="true">
                      {[1, 2, 3].map((n) => <i key={n} className={n <= MASTERY_DOTS[label] ? 'on' : ''} />)}
                    </span>
                    <span className="progress-label">{t(lang, `mastery.${label}`)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <h3>{t(lang, 'parent.practice')}</h3>
      <ul className="practice-list">
        {cards.map((card) => <li key={card.id}>{t(lang, card.text)}</li>)}
      </ul>
    </div>
  );
}

function StatusMark({ status, lang }: { status: string; lang: Lang }) {
  const verified = status === 'verified';
  return (
    <span className={`status ${verified ? 'status-ok' : 'status-review'}`}>
      <b aria-hidden="true">{verified ? '✓' : '?'}</b> {t(lang, verified ? 'sources.verified' : 'sources.review')}
    </span>
  );
}

function SourcesTab({ lang }: { lang: Lang }) {
  const settings = useSave((d) => d.settings);
  const activities = eligibleActivities(content.activities, { ...settings, stage: 'B', faith: true });
  return (
    <div className="parent-section">
      <p className="note">{t(lang, 'sources.help')}</p>
      <h3>{t(lang, 'sources.documents')}</h3>
      <ul className="source-docs">
        {Object.entries(content.sources).map(([id, doc]) => (
          <li key={id}><b>{doc.title}</b><br />{doc.publisher}</li>
        ))}
      </ul>
      <h3>{t(lang, 'sources.lessons')}</h3>
      <ul className="source-list">
        {activities.map((activity) => {
          const doc = content.sources[activity.source.doc];
          return (
            <li key={activity.id} data-testid="source-row" data-status={activity.status}>
              <div className="source-title">{activityLabel(activity, lang)}</div>
              <div className="source-ref">
                {doc?.publisher}
                {activity.source.page !== null ? `, ${t(lang, 'sources.page')} ${activity.source.page}` : ''}
                : {activity.source.ref}
              </div>
              <StatusMark status={activity.status} lang={lang} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DataTab({ lang }: { lang: Lang }) {
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const missing = missingClips().length;

  const exportFile = () => {
    const text = makeExport(store.get(), __APP_VERSION__);
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `laro-at-aral-progreso-${dayKey()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    const data: SaveData | null = parseImport(await file.text(), content.dailyCapMinutes);
    if (!data) {
      setMessage(t(lang, 'parent.import.fail'));
      return;
    }
    await store.replace(data);
    setMessage(t(lang, 'parent.import.ok'));
  };

  const reset = async () => {
    // Erases progress and play-time records. Settings (name, language, limits) are kept.
    store.set((d) => ({ ...d, progress: emptyProgress(), usage: {} }), true);
    setConfirming(false);
    setMessage(t(lang, 'parent.reset.done'));
  };

  return (
    <div className="parent-section">
      <button type="button" className="parent-action" data-testid="export" onClick={exportFile}>
        {t(lang, 'parent.export')}
      </button>
      <button type="button" className="parent-action" data-testid="import" onClick={() => fileInput.current?.click()}>
        {t(lang, 'parent.import')}
      </button>
      <input
        ref={fileInput} type="file" accept="application/json,.json" hidden data-testid="import-file"
        onChange={(e) => { void importFile(e.target.files?.[0]); e.target.value = ''; }}
      />
      {!confirming ? (
        <button type="button" className="parent-action danger" data-testid="reset" onClick={() => setConfirming(true)}>
          {t(lang, 'parent.reset')}
        </button>
      ) : (
        <div className="confirm" role="alertdialog" aria-label={t(lang, 'parent.reset.confirm')}>
          <p>{t(lang, 'parent.reset.confirm')}</p>
          <button type="button" className="parent-action danger" data-testid="reset-yes" onClick={() => void reset()}>
            {t(lang, 'parent.reset.yes')}
          </button>
          <button type="button" className="parent-action" onClick={() => setConfirming(false)}>
            {t(lang, 'parent.reset.no')}
          </button>
        </div>
      )}
      <p className="note" role="status" data-testid="data-message">{message}</p>
      <p className="note">{t(lang, 'parent.version')}: {__APP_VERSION__}</p>
      {missing > 0 && <p className="note">{t(lang, 'parent.missing-audio', { count: missing })}</p>}
    </div>
  );
}

export function ParentCorner({ onBack }: { onBack: () => void }) {
  const lang = useSave((d) => d.settings.language);
  const [tab, setTab] = useState<Tab>('settings');

  return (
    <div className="screen parent" data-testid="parent">
      <header className="parent-header">
        <h1>{t(lang, 'parent.title')}</h1>
        <button type="button" className="parent-action" data-testid="parent-back" onClick={onBack}>
          {t(lang, 'parent.back')}
        </button>
      </header>
      <nav className="parent-tabs">
        {TABS.map((id) => (
          <button
            key={id} type="button" className={tab === id ? 'active' : ''}
            aria-pressed={tab === id} data-testid={`tab-${id}`}
            onClick={() => setTab(id)}
          >
            {t(lang, `parent.tab.${id}`)}
          </button>
        ))}
      </nav>
      <div className="parent-body">
        {tab === 'settings' && <SettingsTab lang={lang} />}
        {tab === 'progress' && <ProgressTab lang={lang} />}
        {tab === 'sources' && <SourcesTab lang={lang} />}
        {tab === 'data' && <DataTab lang={lang} />}
      </div>
    </div>
  );
}
