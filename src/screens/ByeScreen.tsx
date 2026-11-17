// Shown when play time is up. Butil waves goodbye and a "Gawin natin" card
// suggests something to do together away from the screen.
// Only a parent (hold three seconds, then a sum) can go on from here.
import { useEffect, useMemo } from 'react';
import { content, getItem } from '../content';
import { Butil } from '../components/Butil';
import { HoldButton, ParentIcon } from '../components/HoldButton';
import { Picture } from '../components/Picture';
import { playClip } from '../core/audio';
import { t } from '../core/i18n';
import { store, useSave } from '../core/store';

export function pickCard(level: number, faith: boolean, counter: number) {
  const cards = content.cards.filter((c) => c.level <= level && (faith || !c.faith));
  if (cards.length === 0) return null;
  return cards[counter % cards.length];
}

export function ByeScreen({ kind, onParent }: { kind: 'session-over' | 'daily-over'; onParent: () => void }) {
  const settings = useSave((d) => d.settings);
  const lang = settings.language;
  const textKey = kind === 'daily-over' ? 'bye.daily' : 'bye.session';
  const card = useMemo(
    () => pickCard(settings.level, settings.faith, store.get().progress.playCounter),
    [settings.level, settings.faith],
  );

  useEffect(() => {
    void playClip(lang, textKey);
  }, [lang, textKey]);

  return (
    <div className="screen bye" data-testid="bye" data-kind={kind}>
      <div className="bye-butil">
        <Butil pose="wave" />
        <p className="bye-text">{t(lang, textKey)}</p>
      </div>
      {card && (
        <div className="bye-card" data-testid="gawin-natin" data-card={card.id}>
          <h2>{t(lang, 'bye.card-title')}</h2>
          <div className="bye-card-body">
            <span className="bye-card-picture">
              <Picture image={getItem(card.tile).image} label={t(lang, getItem(card.tile).text)} />
            </span>
            <p>{t(lang, card.text)}</p>
          </div>
        </div>
      )}
      <HoldButton label={t(lang, 'gate.hold')} className="parent-button" onComplete={onParent}>
        <ParentIcon />
      </HoldButton>
    </div>
  );
}
