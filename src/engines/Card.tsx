// A big picture card that can be tapped. Used by several engines.
import { getItem } from '../content';
import type { Lang } from '../content/types';
import { Picture } from '../components/Picture';
import { t } from '../core/i18n';
import { Arrow, Check } from '../draw/Drawn';

export type CardState = 'idle' | 'wobble' | 'correct' | 'hint' | 'selected' | 'bounce' | 'done';

export function Card({
  itemId, lang, state = 'idle', caption = false, faceDown = false, onTap, testId,
}: {
  itemId: string;
  lang: Lang;
  state?: CardState;
  caption?: boolean;
  faceDown?: boolean;
  onTap: () => void;
  testId?: string;
}) {
  const item = getItem(itemId);
  const name = t(lang, item.text);
  return (
    <button
      type="button"
      className={`card card-${state}${faceDown ? ' card-down' : ''}`}
      aria-label={faceDown ? '?' : name}
      data-testid={testId}
      data-item={faceDown ? undefined : itemId}
      onClick={onTap}
    >
      {faceDown ? (
        <span className="card-back" aria-hidden="true" />
      ) : (
        <>
          <Picture image={item.image} label={name} />
          {caption && <span className="card-caption">{name}</span>}
        </>
      )}
      {state === 'correct' || state === 'done' ? <span className="card-badge"><Check /></span> : null}
      {state === 'hint' ? <span className="card-pointer"><Arrow direction="down" /></span> : null}
    </button>
  );
}

export { useAlive } from '../core/hooks';
