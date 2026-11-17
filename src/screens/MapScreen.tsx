// Home screen: a picture map of the town. Tapping a place opens its games.
import { useEffect } from 'react';
import { content } from '../content';
import { Bubble, GuideButil } from '../components/Guide';
import { HoldButton, ParentIcon } from '../components/HoldButton';
import { Picture } from '../components/Picture';
import { sfx } from '../core/audio';
import { useNarrator } from '../core/hooks';
import { t } from '../core/i18n';
import { eligibleActivities } from '../core/scheduler';
import { useSave } from '../core/store';

function DrawnMap() {
  // A simple town drawn in code. Replaced by place-map once the real picture is processed.
  return (
    <svg className="map-art" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="160" height="90" fill="#bfe6f2" />
      <path d="M0 34 Q30 14 60 30 Q90 10 120 26 Q140 16 160 28 V90 H0 Z" fill="#8cc084" />
      <path d="M0 44 Q40 30 80 40 Q120 32 160 42 V90 H0 Z" fill="#e9d88a" />
      <path d="M-5 70 Q30 52 70 62 Q110 72 165 50" fill="none" stroke="#c98d5a" strokeWidth="7" strokeLinecap="round" />
      <path d="M40 90 Q52 70 70 62" fill="none" stroke="#c98d5a" strokeWidth="6" strokeLinecap="round" />
      <path d="M100 0 Q108 18 100 30 Q94 40 104 52" fill="none" stroke="#8fd0ee" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
      <g fill="#7fb36a">
        <rect x="118" y="68" width="16" height="9" rx="2" /><rect x="136" y="66" width="16" height="9" rx="2" />
        <rect x="120" y="79" width="16" height="8" rx="2" /><rect x="6" y="76" width="16" height="8" rx="2" />
      </g>
      <g fill="#fffdf6" opacity="0.9">
        <ellipse cx="24" cy="10" rx="12" ry="4" /><ellipse cx="132" cy="8" rx="14" ry="4" />
      </g>
    </svg>
  );
}

export function MapScreen({ onOpenPlace, onParent }: { onOpenPlace: (placeId: string) => void; onParent: () => void }) {
  const settings = useSave((d) => d.settings);
  const lang = settings.language;
  const { line, speak, replay } = useNarrator(lang);
  const mapImage = content.assets.images[content.mapImage];

  useEffect(() => {
    void speak('instr.map', { pose: 'wave' });
  }, [speak]);

  const places = content.places.filter((p) => p.level <= settings.level);

  return (
    <div className="screen map" data-testid="map" aria-label={t(lang, 'ui.map')}>
      {mapImage ? <img className="map-art" src={mapImage} alt="" draggable={false} /> : <DrawnMap />}

      {places.map((place) => {
        const open = eligibleActivities(content.activities, settings, place.id).length > 0;
        const name = t(lang, place.name);
        return (
          <button
            key={place.id}
            type="button"
            className={`map-place${open ? '' : ' closed'}`}
            style={{ left: `${place.mapSpot.x}%`, top: `${place.mapSpot.y}%` }}
            aria-label={open ? name : `${name}: ${t(lang, 'place.soon')}`}
            aria-disabled={!open}
            data-testid={`place-${place.id}`}
            onClick={() => {
              if (!open) return;
              sfx.tap();
              onOpenPlace(place.id);
            }}
          >
            <span className="map-place-art"><Picture image={place.icon} label={name} /></span>
            {settings.captions && <span className="map-place-name">{open ? name : t(lang, 'place.soon')}</span>}
          </button>
        );
      })}

      <div className="map-guide">
        <GuideButil line={line} lang={lang} onReplay={replay} />
        <Bubble line={line} lang={lang} captions={settings.captions} />
      </div>

      {settings.childName.trim() !== '' && (
        <p className="map-hello">{t(lang, 'ui.hello', { name: settings.childName.trim() })}</p>
      )}

      <HoldButton label={t(lang, 'gate.hold')} className="parent-button" onComplete={onParent}>
        <ParentIcon />
      </HoldButton>
    </div>
  );
}
