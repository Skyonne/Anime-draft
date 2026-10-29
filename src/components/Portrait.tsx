import { useState } from 'react';
import type { NarutoCharacter } from '../types';
import { portraitCandidates } from '../portraits/resolve';
import { usePrivatePortraits } from '../hooks/usePrivatePortraits';

export function Portrait({ character, className = '', lazy = false }: { character: NarutoCharacter; className?: string; lazy?: boolean }) {
  const privatePortraits = usePrivatePortraits();
  const candidates = portraitCandidates(character, import.meta.env.BASE_URL, undefined, privatePortraits.portraits);
  // A keyed subtree resets failed-image state immediately when a different ninja is displayed.
  return <PortraitImage key={JSON.stringify([character.id, character.name, candidates])} character={character} className={className} lazy={lazy} candidates={candidates} />;
}
function PortraitImage({ character, className, lazy, candidates }: { character: NarutoCharacter; className: string; lazy: boolean; candidates: ReturnType<typeof portraitCandidates> }) {
  const [index, setIndex] = useState(0);
  const current = candidates[index];
  if (!current) return <span className={`portrait-fallback ${className}`} role="img" aria-label={`Portrait de remplacement de ${character.name}`}><span aria-hidden="true">忍</span><strong>{character.name.split(' ').slice(0, 2).map(s => s[0]).join('')}</strong></span>;
  return <img key={current.src} className={`portrait ${className}`} src={current.src} alt={`${current.kind === 'portrait' ? 'Portrait' : 'Avatar graphique'} de ${character.name}`} width="400" height="500" loading={lazy ? 'lazy' : 'eager'} decoding="async" referrerPolicy="no-referrer" style={{ objectPosition: current.position }} onError={() => setIndex(index + 1)} />;
}
