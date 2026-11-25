// The start screen: Ading and Butil in the Bukid, with one big "play" button.
// It is also the first tap, which phones require before any sound can play,
// so Butil's first instruction on the map is heard. No reading is needed.
import { content } from '../content';
import type { Lang } from '../content/types';
import { unlockAudio } from '../core/audio';
import { t } from '../core/i18n';

export function SplashScreen({ lang, onStart }: { lang: Lang; onStart: () => void }) {
  const picture = content.assets.images.splash;
  const start = () => {
    unlockAudio();
    onStart();
  };
  return (
    <div className="screen splash" data-testid="splash">
      {picture && <img className="splash-art" src={picture} alt="" draggable={false} />}
      <h1 className="splash-title">{t(lang, 'app.title')}</h1>
      <button
        type="button"
        className="splash-start"
        aria-label={t(lang, 'ui.start')}
        data-testid="splash-start"
        onClick={start}
      >
        <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <circle cx="50" cy="50" r="46" fill="#5a9e4b" stroke="#356b2d" strokeWidth="6" />
          <path d="M40 30 L72 50 L40 70 Z" fill="#fffdf6" stroke="#fffdf6" strokeWidth="6" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
