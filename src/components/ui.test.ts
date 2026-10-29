import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { characters } from '../data/catalog';
import { STAT_KEYS } from '../types';
import { place } from '../game/engine';
import { scoreDraft } from '../game/scoring';
import { Game } from '../pages/Game';
import { Results } from '../pages/Results';
import { Home } from '../pages/Home';
import { Portrait } from './Portrait';
import { emptySave } from '../utils/storage';

const noop = () => {};
describe('Contrats de rendu du jeu', () => {
  it('ne rend aucune note numérique du personnage pendant le draft', () => {
    const draft = { id: 'test', deck: characters.slice(0, 6).map(c => c.id), picks: {} };
    const markup = renderToStaticMarkup(createElement(Game, { draft, onPlace: noop, onAuto: noop, onRestart: noop, reduceMotion: true }));
    expect(markup).toContain('Ses statistiques restent secrètes');
    for (const value of Object.values(characters[0].stats)) expect(markup).not.toContain(`>${value}<`);
    expect(markup.match(/class="choice-card/g)).toHaveLength(6);
  });
  it('rend six notes et rangs, le score exact et un radar seulement après la fin', () => {
    let draft = { id: 'test', deck: characters.slice(0, 6).map(c => c.id), picks: {} };
    for (const [index, key] of STAT_KEYS.entries()) draft = place(draft, key, draft.deck[index]);
    const result = scoreDraft(draft, characters);
    const markup = renderToStaticMarkup(createElement(Results, { draft, best: result.total, onPlay: noop, reduceMotion: true }));
    expect(markup).toContain(`>${result.total}</strong>`);
    expect(markup.match(/class="letter-rank"/g)).toHaveLength(6);
    expect(markup).toContain('Radar des six statistiques sélectionnées');
    expect(markup).toContain('Partager mon score');
  });
  it('conserve les accès solo et multijoueur sur l’accueil', () => {
    const markup = renderToStaticMarkup(createElement(Home, { save: emptySave(), onPlay: noop, onResume: noop, onHelp: noop, onCatalog: noop, onMultiplayer: noop }));
    expect(markup).toContain('>Jouer<'); expect(markup).toContain('>Multijoueur<'); expect(markup).toContain('>120</strong>');
  });
  it('rend les dimensions 400 × 500, le cadrage individuel et échappe les noms', () => {
    const character = { ...characters[0], name: '<script>alert(1)</script>', imagePosition: '50% 25%' };
    const markup = renderToStaticMarkup(createElement(Portrait, { character }));
    expect(markup).toContain('width="400" height="500"'); expect(markup).toContain('object-position:50% 25%');
    expect(markup).not.toContain('<script>'); expect(markup).toContain('&lt;script&gt;');
  });
});
