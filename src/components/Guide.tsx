// Butil with his speech bubble and the replay button. Every child screen has one,
// because every screen speaks its instruction and lets the child hear it again.
import { content } from '../content';
import type { Lang } from '../content/types';
import type { Line } from '../core/hooks';
import { t } from '../core/i18n';
import { Speaker } from '../draw/Drawn';
import { Butil } from './Butil';
import { Picture } from './Picture';

export function Bubble({ line, lang, captions }: { line: Line | null; lang: Lang; captions: boolean }) {
  if (!line) return <div className="bubble bubble-empty" />;
  const text = t(lang, line.key);
  // The label only matters while a picture is still a placeholder.
  const pictured = line.picture ? content.items.find((i) => i.image === line.picture) : undefined;
  const pictureLabel = pictured ? t(lang, pictured.text) : '';
  return (
    <div className="bubble" data-testid="bubble" data-key={line.key}>
      {line.picture ? (
        <span className="bubble-picture"><Picture image={line.picture} label={pictureLabel} /></span>
      ) : (
        <span className="bubble-sound"><Speaker /></span>
      )}
      {captions && <p className="bubble-text">{text}</p>}
    </div>
  );
}

export function GuideButil({ line, lang, onReplay }: { line: Line | null; lang: Lang; onReplay: () => void }) {
  return (
    <div className="guide-butil">
      <Butil pose={line?.pose ?? 'idle'} />
      <button type="button" className="round-button replay" aria-label={t(lang, 'ui.replay')} data-testid="replay" onClick={onReplay}>
        <Speaker />
      </button>
    </div>
  );
}
