// A place on the map. It offers at most four games at a time.
import { useEffect, useMemo } from 'react';
import { content, getItem, getPlace } from '../content';
import { Bubble, GuideButil } from '../components/Guide';
import { Picture } from '../components/Picture';
import { sfx } from '../core/audio';
import { dayKey } from '../core/dates';
import { useNarrator } from '../core/hooks';
import { t } from '../core/i18n';
import { eligibleActivities, pickTiles } from '../core/scheduler';
import { store, useSave } from '../core/store';
import { Arrow, Drawn, Star } from '../draw/Drawn';

export function PlaceScreen({
  placeId, onPlay, onBack,
}: {
  placeId: string;
  onPlay: (activityId: string) => void;
  onBack: () => void;
}) {
  const place = getPlace(placeId);
  const settings = useSave((d) => d.settings);
  const lang = settings.language;
  const { line, speak, replay } = useNarrator(lang);
  const background = content.assets.images[place.image];

  // Chosen when the place opens, from what has been played least recently.
  const tiles = useMemo(
    () => pickTiles(eligibleActivities(content.activities, settings, placeId), store.get().progress.activities, undefined, settings.stage),
    [settings, placeId],
  );
  const played = store.get().progress.activities;
  const today = dayKey();

  useEffect(() => {
    void speak('instr.place', { pose: 'wave' });
  }, [speak]);

  return (
    <div className={`screen place place-${placeId}`} data-testid="place" data-place={placeId}>
      {background && <img className="place-art" src={background} alt="" draggable={false} />}
      <aside className="guide">
        <button type="button" className="round-button" aria-label={t(lang, 'ui.back')} data-testid="back" onClick={() => { sfx.tap(); onBack(); }}>
          <Arrow direction="left" />
        </button>
        <GuideButil line={line} lang={lang} onReplay={replay} />
      </aside>
      <section className="play">
        <Bubble line={line} lang={lang} captions={settings.captions} />
        <div className="play-area">
          <div className={`tile-row count-${tiles.length}`}>
            {tiles.map((activity) => {
              // A tile is an item's picture, or a picture drawn in code ("draw:...").
              const drawn = activity.tile.startsWith('draw:');
              const name = drawn ? t(lang, `engine.${activity.engine}`) : t(lang, getItem(activity.tile).text);
              const image = drawn ? activity.tile : getItem(activity.tile).image;
              const doneToday = played[activity.id]?.last === today;
              return (
                <button
                  key={activity.id}
                  type="button"
                  className="tile"
                  aria-label={`${name}${doneToday ? `: ${t(lang, 'ui.played')}` : ''}`}
                  data-testid="tile"
                  data-activity={activity.id}
                  data-engine={activity.engine}
                  onClick={() => { sfx.tap(); onPlay(activity.id); }}
                >
                  <Picture image={image} label={name} />
                  <span className="tile-badge"><Drawn image={`draw:engine:${activity.engine}`} /></span>
                  {doneToday && <span className="tile-star"><Star /></span>}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
