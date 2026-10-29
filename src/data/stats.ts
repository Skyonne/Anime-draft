import type { StatKey } from '../types';

export const STATS: { key: StatKey; label: string; description: string; kanji: string }[] = [
  { key: 'strength', label: 'Force', description: 'Puissance physique', kanji: '力' },
  { key: 'speed', label: 'Vitesse', description: 'Réflexes & mobilité', kanji: '速' },
  { key: 'ninjutsu', label: 'Ninjutsu', description: 'Maîtrise des techniques', kanji: '忍' },
  { key: 'taijutsu', label: 'Taijutsu', description: 'L’art du combat', kanji: '体' },
  { key: 'intelligence', label: 'Intelligence', description: 'Stratégie & analyse', kanji: '知' },
  { key: 'endurance', label: 'Endurance', description: 'Chakra & résistance', kanji: '耐' },
];
