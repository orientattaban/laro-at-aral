// Shows a picture by name.
// 1. Names starting with "draw:" are drawn in code.
// 2. Names listed in content/asset-manifest.json are real processed pictures.
// 3. Anything else is a labelled placeholder, so the game is playable before
//    the real pictures are processed (Phase 2).
import type { CSSProperties } from 'react';
import { content, getItem } from '../content';
import type { Lang } from '../content/types';
import { t } from '../core/i18n';
import { hashHue } from '../core/util';
import { Drawn } from '../draw/Drawn';

export function hasRealImage(image: string): boolean {
  return image.startsWith('draw:') || image in content.assets.images;
}

export function Picture({ image, label }: { image: string; label: string }) {
  if (image.startsWith('draw:')) {
    return <span className="pic pic-drawn"><Drawn image={image} /></span>;
  }
  const path = content.assets.images[image];
  if (path) {
    return <img className="pic pic-img" src={path} alt="" draggable={false} />;
  }
  const style = { '--hue': String(hashHue(image)) } as CSSProperties;
  return (
    <span className="pic pic-placeholder" style={style} data-placeholder={image}>
      <svg viewBox="0 0 40 24" aria-hidden="true" focusable="false">
        <circle cx="9" cy="8" r="4" />
        <path d="M2 22 L14 10 L22 18 L28 13 L38 22 Z" />
      </svg>
      <span className="ph-label">{label}</span>
    </span>
  );
}

export function ItemPicture({ itemId, lang }: { itemId: string; lang: Lang }) {
  const item = getItem(itemId);
  return <Picture image={item.image} label={t(lang, item.text)} />;
}
