import { STAT_KEYS, type Draft, type StatKey } from '../types';
import { drawSix } from './random';

export const turn = (draft: Draft) => Object.keys(draft.picks).length;
export const isComplete = (draft: Draft) => turn(draft) === 6;
export function newDraft(ids: readonly string[]): Draft {
  return { id: crypto.randomUUID(), deck: drawSix(ids), picks: {} };
}
export function place(draft: Draft, key: StatKey, expectedCharacter: string): Draft {
  const current = draft.deck[turn(draft)];
  if (!STAT_KEYS.includes(key) || draft.picks[key] || isComplete(draft) || expectedCharacter !== current) {
    throw new Error('Choix invalide ou déjà verrouillé');
  }
  return { ...draft, picks: { ...draft.picks, [key]: current } };
}
export function placeLast(draft: Draft): Draft {
  if (turn(draft) !== 5) throw new Error('Le placement automatique nécessite cinq choix');
  const key = STAT_KEYS.find(key => !draft.picks[key])!;
  return place(draft, key, draft.deck[5]);
}
