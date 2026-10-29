import { STAT_KEYS, type Draft, type NarutoCharacter } from '../types';
import { isComplete } from './engine';

export const TIERS = [
  { min: 0, label: 'Genin', text: 'Chaque légende commence quelque part.' },
  { min: 300, label: 'Chūnin', text: 'De bons réflexes. Le potentiel est là.' },
  { min: 390, label: 'Jōnin', text: 'Une équipe sur laquelle on peut compter.' },
  { min: 450, label: 'ANBU', text: 'Précision, instinct et sang-froid.' },
  { min: 510, label: 'Kage', text: 'Un draft digne de protéger tout un village.' },
  { min: 560, label: 'Légende Shinobi', text: 'Ton nom résonnera à travers les villages.' },
];
export const tierFor = (score: number) => [...TIERS].reverse().find(tier => score >= tier.min) || TIERS[0];
export function scoreDraft(draft: Draft, catalog: readonly NarutoCharacter[]) {
  if (!isComplete(draft)) throw new Error('Partie incomplète');
  const rows = STAT_KEYS.map(key => {
    const character = catalog.find(c => c.id === draft.picks[key]);
    if (!character) throw new Error('Personnage inconnu');
    const value = character.stats[key];
    if (!Number.isInteger(value) || value < 0 || value > 100) throw new Error('Note invalide');
    return { key, character, value };
  });
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return { rows, total, average: total / 6, best: rows.reduce((a, b) => a.value >= b.value ? a : b), worst: rows.reduce((a, b) => a.value <= b.value ? a : b) };
}
