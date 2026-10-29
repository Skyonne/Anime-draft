import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { characters } from '../data/catalog';
import { portraitCandidates, licensedPortrait, portraitCount } from './resolve';
import { Portrait } from '../components/Portrait';
import { PortraitCredits } from '../components/PortraitCredits';
import type { LicensedPortrait } from './types';

// Metadata-only fixture, never registered, downloaded or shipped as an approved image.
const fixture: LicensedPortrait = {
  characterId: characters[0].id, characterName: characters[0].name, file: 'characters/portraits/naruto-uzumaki.webp', position: '50% 30%',
  title: 'Test fixture', author: 'Test', sourceUrl: 'https://example.invalid/test', license: 'CC-BY-4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', rightsEvidenceUrl: 'https://example.invalid/permission', reviewedAt: '2026-10-29', changes: 'Test only', rights: { publicDisplay: true, redistribution: true, adaptations: true, underlyingRightsCleared: true }, width: 400, height: 500, bytes: 1, sha256: '0'.repeat(64),
};
describe('Sélection et fallback des portraits', () => {
  it('conserve exactement les 120 avatars faute de source approuvée', () => {
    expect(characters).toHaveLength(120); expect(portraitCount).toBe(0);
    for (const character of characters) expect(portraitCandidates(character, '/game/')).toEqual([{ src: `/game/${character.image}`, position: character.imagePosition || '50% 40%', kind: 'avatar' }]);
  });
  it('associe un portrait uniquement quand identifiant et nom canonique concordent', () => {
    expect(licensedPortrait(characters[0], [fixture])).toEqual(fixture);
    expect(licensedPortrait(characters[0], [{ ...fixture, characterName: 'Autre ninja' }])).toBeUndefined();
    expect(licensedPortrait(characters[1], [fixture])).toBeUndefined();
  });
  it('essaie le portrait puis l’avatar local, avec le cadrage et le sous-chemin corrects', () => {
    expect(portraitCandidates(characters[0], '/naruto-stat-draft/', [fixture])).toEqual([
      { src: '/naruto-stat-draft/characters/portraits/naruto-uzumaki.webp', position: '50% 30%', kind: 'portrait' },
      { src: `/naruto-stat-draft/${characters[0].image}`, position: '50% 40%', kind: 'avatar' },
    ]);
  });
  it('ne qualifie pas les avatars de portraits officiels et conserve le ratio et le lazy loading', () => {
    const markup = renderToStaticMarkup(createElement(Portrait, { character: characters[0], lazy: true }));
    expect(markup).toContain('Avatar graphique de Naruto Uzumaki'); expect(markup).toContain('width="400" height="500"'); expect(markup).toContain('loading="lazy"'); expect(markup).toContain('decoding="async"');
  });
  it('publie un lien de crédits compatible avec un site statique', () => {
    const markup = renderToStaticMarkup(createElement(PortraitCredits));
    expect(markup).toContain('portrait-credits.html'); expect(markup).toContain('120 avatars'); expect(markup).toContain('nouvel onglet');
  });
});
