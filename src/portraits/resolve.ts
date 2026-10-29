import manifest from '../data/portraits.json';
import type { NarutoCharacter } from '../types';
import type { LicensedPortrait, PortraitManifest } from './types';
import type { PrivatePortrait } from './private';

const portraits = (manifest as PortraitManifest).portraits;
export function licensedPortrait(character: NarutoCharacter, records: readonly LicensedPortrait[] = portraits) {
  return records.find(p => p.characterId === character.id && p.characterName === character.name);
}
/** Licensed assets first, optional private remote portraits second, original avatar last. */
export function portraitCandidates(character: NarutoCharacter, base: string, records: readonly LicensedPortrait[] = portraits, privateRecords: readonly PrivatePortrait[] = []) {
  const portrait = licensedPortrait(character, records);
  const privatePortrait = privateRecords.find(p => p.characterId === character.id && p.characterName === character.name);
  const candidates = [
    ...(portrait ? [{ src: `${base}${portrait.file}`, position: portrait.position, kind: 'portrait' as const }] : []),
    ...(privatePortrait ? [{ src: privatePortrait.imageUrl.startsWith('private-portraits/') ? `${base}${privatePortrait.imageUrl}` : privatePortrait.imageUrl, position: '50% 35%', kind: 'portrait' as const }] : []),
    { src: `${base}${character.image}`, position: character.imagePosition || '50% 40%', kind: 'avatar' as const },
  ];
  return candidates.filter((candidate, index) => candidates.findIndex(other => other.src === candidate.src) === index);
}
export const portraitCount = portraits.length;
