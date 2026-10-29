import { describe, expect, it } from 'vitest';
import { characters } from '../data/catalog';
import { STAT_KEYS, type Draft, type NarutoCharacter } from '../types';
import { drawSix, randomInt } from './random';
import { isComplete, newDraft, place, placeLast } from './engine';
import { scoreDraft, tierFor } from './scoring';
import { emptySave, finish, restore, validDraft } from '../utils/storage';
import { shareText } from '../utils/share';

const ids = characters.map(c => c.id);
function sixPicks(draft = newDraft(ids)): Draft {
  for (const key of STAT_KEYS.slice(0, 5)) draft = place(draft, key, draft.deck[Object.keys(draft.picks).length]);
  return placeLast(draft);
}

describe('Tirage uniforme et indépendant', () => {
  it('tire six personnages distincts du catalogue, sur 1000 parties', () => {
    for (let i = 0; i < 1000; i++) {
      const deck = drawSix(ids);
      expect(deck).toHaveLength(6);
      expect(new Set(deck).size).toBe(6);
      expect(deck.every(id => ids.includes(id))).toBe(true);
    }
  });
  it('fonctionne avec exactement six personnages', () => {
    const draft = sixPicks(newDraft(ids.slice(0, 6)));
    expect(new Set(Object.values(draft.picks))).toEqual(new Set(ids.slice(0, 6)));
    expect(isComplete(draft)).toBe(true);
  });
  it('rejette un catalogue trop court ou dupliqué', () => {
    expect(() => drawSix(ids.slice(0, 5))).toThrow();
    expect(() => drawSix(Array(6).fill('naruto'))).toThrow();
  });
  it('rejette les valeurs hors plage pour supprimer le biais modulo', () => {
    const values = [0xffffffff, 7];
    expect(randomInt(6, () => values.shift()!)).toBe(1);
    expect(values).toHaveLength(0);
    expect(randomInt(1, () => 123)).toBe(0);
    expect(() => randomInt(0)).toThrow();
    expect(() => randomInt(1.5)).toThrow();
  });
  it('ne dépend pas des catégories sélectionnées et ne mute pas le catalogue', () => {
    const original = [...ids];
    const deck = drawSix(ids, () => 0);
    let first: Draft = { id: 'first', deck, picks: {} };
    let second: Draft = { id: 'second', deck: [...deck], picks: {} };
    first = place(first, 'strength', deck[0]); second = place(second, 'speed', deck[0]);
    expect(first.deck).toEqual(second.deck);
    expect(ids).toEqual(original);
  });
});

describe('Verrouillage du draft', () => {
  it('interdit une statistique occupée et conserve le choix initial', () => {
    const initial = newDraft(ids);
    const next = place(initial, 'strength', initial.deck[0]);
    expect(initial.picks).toEqual({});
    expect(() => place(next, 'strength', next.deck[1])).toThrow();
    expect(next.picks.strength).toBe(initial.deck[0]);
  });
  it('rejette une seconde validation provenant de la carte précédente', () => {
    const draft = newDraft(ids);
    const next = place(draft, 'strength', draft.deck[0]);
    expect(() => place(next, 'speed', draft.deck[0])).toThrow();
  });
  it('affecte automatiquement le sixième ninja à la dernière catégorie', () => {
    let draft = newDraft(ids);
    for (const key of STAT_KEYS.filter(key => key !== 'ninjutsu')) draft = place(draft, key, draft.deck[Object.keys(draft.picks).length]);
    const final = placeLast(draft);
    expect(final.picks.ninjutsu).toBe(draft.deck[5]);
    expect(isComplete(final)).toBe(true);
    expect(() => placeLast(final)).toThrow();
    expect(() => place(final, 'strength', final.deck[5])).toThrow();
  });
  it('interdit l’affectation automatique prématurée', () => expect(() => placeLast(newDraft(ids))).toThrow());
});

describe('Score et partage', () => {
  it('additionne exclusivement les six notes associées', () => {
    const draft = sixPicks();
    const expected = STAT_KEYS.reduce((sum, key) => sum + characters.find(c => c.id === draft.picks[key])!.stats[key], 0);
    const result = scoreDraft(draft, characters);
    expect(result.total).toBe(expected); expect(result.average).toBe(expected / 6);
    expect(result.total).toBeLessThanOrEqual(600);
    expect(shareText(draft, characters)).toContain(`Score : ${expected}/600`);
    expect(shareText(draft, characters).split('\n').filter(line => line.includes(' — '))).toHaveLength(6);
  });
  it('plafonne à 600 avec six notes de 100 et refuse les notes hors plage', () => {
    const perfect: NarutoCharacter[] = characters.slice(0, 6).map(c => ({ ...c, stats: Object.fromEntries(STAT_KEYS.map(k => [k, 100])) as NarutoCharacter['stats'] }));
    const draft = sixPicks(newDraft(perfect.map(c => c.id)));
    expect(scoreDraft(draft, perfect).total).toBe(600);
    const altered = perfect.map(c => ({ ...c, stats: { ...c.stats, strength: 101 } }));
    expect(() => scoreDraft(draft, altered)).toThrow();
  });
  it('refuse le score d’une partie incomplète', () => expect(() => scoreDraft(newDraft(ids), characters)).toThrow());
  it('applique les seuils ludiques configurés', () => {
    expect(tierFor(0).label).toBe('Genin'); expect(tierFor(450).label).toBe('ANBU');
    expect(tierFor(559).label).toBe('Kage'); expect(tierFor(600).label).toBe('Légende Shinobi');
  });
});

describe('Sauvegarde versionnée', () => {
  it('restaure exactement une partie en cours, son ordre et les paramètres', () => {
    const initial = newDraft(ids);
    const draft = place(initial, 'intelligence', initial.deck[0]);
    const save = { ...emptySave(), draft, settings: { reduceMotion: true } };
    expect(restore(JSON.stringify(save), characters)).toEqual(save);
  });
  it('reprend un cinquième choix en attente du placement automatique', () => {
    let draft = newDraft(ids);
    for (const key of STAT_KEYS.slice(0, 5)) draft = place(draft, key, draft.deck[Object.keys(draft.picks).length]);
    const restored = restore(JSON.stringify({ ...emptySave(), draft }), characters);
    expect(isComplete(placeLast(restored.draft!))).toBe(true);
  });
  it('gère JSON cassé, ancienne version, scores invalides et inconnus', () => {
    const save = emptySave();
    for (const raw of ['{', 'null', '{}', JSON.stringify({ ...save, version: 2 }), JSON.stringify({ ...save, best: 601 }), JSON.stringify({ ...save, settings: null }), JSON.stringify({ ...save, history: [{ score: 10 }] })]) expect(restore(raw, characters)).toEqual(save);
    expect(restore(null, characters)).toEqual(save);
  });
  it('refuse les doublons, catégories inconnues, tirages sautés et picks permutés', () => {
    const draft = newDraft(ids);
    expect(validDraft({ ...draft, deck: Array(6).fill(ids[0]) }, characters)).toBe(false);
    expect(validDraft({ ...draft, picks: { magic: draft.deck[0] } }, characters)).toBe(false);
    expect(validDraft({ ...draft, picks: { strength: draft.deck[1] } }, characters)).toBe(false);
    expect(validDraft({ ...draft, picks: { strength: draft.deck[1], speed: draft.deck[0] } }, characters)).toBe(false);
    expect(validDraft({ ...draft, deck: ['unknown', ...draft.deck.slice(1)] }, characters)).toBe(false);
  });
  it('rejette les historiques incohérents avec les compteurs', () => {
    const save = emptySave();
    expect(restore(JSON.stringify({ ...save, completed: 1, last: 20 }), characters)).toEqual(save);
    expect(restore(JSON.stringify({ ...save, best: 300 }), characters)).toEqual(save);
    const complete = finish(save, sixPicks(), characters);
    expect(restore(JSON.stringify({ ...complete, last: 0 }), characters)).toEqual(save);
  });
  it('enregistre une fin une seule fois, même après reprise', () => {
    const draft = sixPicks();
    const completed = finish(emptySave(), draft, characters);
    const repeated = finish(restore(JSON.stringify(completed), characters), draft, characters);
    expect(repeated.completed).toBe(1); expect(repeated.history).toHaveLength(1);
    expect(repeated.best).toBe(scoreDraft(draft, characters).total);
    expect(repeated.last).toBe(repeated.best);
  });
  it('conserve seulement les dix derniers résultats et le record', () => {
    let save = emptySave();
    for (let i = 0; i < 12; i++) save = finish(save, sixPicks(), characters);
    expect(save.completed).toBe(12); expect(save.history).toHaveLength(10);
    expect(save.best).toBeGreaterThanOrEqual(Math.max(...save.history.map(r => r.score)));
    expect(restore(JSON.stringify(save), characters)).toEqual(save);
  });
});
