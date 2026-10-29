import { describe, expect, it } from 'vitest';
import { metadataErrors, validateManifest, webpDimensions, renderCredits } from './portrait-tools.mjs';

const catalog = [{ id: 'naruto-uzumaki', name: 'Naruto Uzumaki' }];
const fixture = {
  characterId: 'naruto-uzumaki', characterName: 'Naruto Uzumaki', file: 'characters/portraits/naruto-uzumaki.webp', position: '50% 50%', title: 'Test only', author: 'Fixture author', sourceUrl: 'https://example.invalid/source', license: 'CC-BY-SA-4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', rightsEvidenceUrl: 'https://example.invalid/permission', reviewedAt: '2026-10-29', changes: 'Fixture only', rights: { publicDisplay: true, redistribution: true, adaptations: true, underlyingRightsCleared: true }, width: 400, height: 500, bytes: 1, sha256: '0'.repeat(64),
};
describe('Métadonnées et droits des images — validation structurelle, pas juridique', () => {
  it('accepte le registre vide avec fallback local', () => expect(validateManifest({ schemaVersion: 1, portraits: [] }, catalog)).toEqual([]));
  it('exige les noms et identifiants concordants ainsi que les crédits', () => {
    expect(metadataErrors(fixture, catalog)).toEqual([]);
    for (const key of ['title', 'author', 'sourceUrl', 'licenseUrl', 'rightsEvidenceUrl', 'changes']) expect(metadataErrors({ ...fixture, [key]: '' }, catalog).length).toBeGreaterThan(0);
    expect(metadataErrors({ ...fixture, characterName: 'Sasuke Uchiha' }, catalog).length).toBeGreaterThan(0);
  });
  it('rejette une API, une simple mention fair use ou une autorisation incomplète', () => {
    for (const license of ['fair-use', 'API', 'publicly-accessible', 'CC-BY-ND-4.0', 'unknown']) expect(metadataErrors({ ...fixture, license }, catalog).length).toBeGreaterThan(0);
    expect(metadataErrors({ ...fixture, rights: { ...fixture.rights, underlyingRightsCleared: false } }, catalog).length).toBeGreaterThan(0);
    expect(metadataErrors({ ...fixture, licenseUrl: 'https://example.invalid/license' }, catalog).length).toBeGreaterThan(0);
  });
  it('refuse les liens exécutables, les cadrages invalides et les doubles associations', () => {
    for (const position of ['101% 50%', '-2% 50%', '50%;background:url(x)', '50%']) expect(metadataErrors({ ...fixture, position }, catalog).length).toBeGreaterThan(0);
    expect(metadataErrors({ ...fixture, sourceUrl: 'javascript:alert(1)' }, catalog).length).toBeGreaterThan(0);
    expect(validateManifest({ schemaVersion: 1, portraits: [fixture, fixture] }, catalog).join(' ')).toContain('dupliqué');
    expect(validateManifest({ schemaVersion: 1, portraits: [{ ...fixture, file: '../secret.webp' }] }, catalog).join(' ')).toContain('chemin');
  });
  it('refuse les faux fichiers WebP et reconnaît les dimensions de l’en-tête', () => {
    expect(() => webpDimensions(Buffer.from('<svg>fake</svg>'))).toThrow();
    const bytes = Buffer.alloc(30); bytes.write('RIFF'); bytes.writeUInt32LE(22, 4); bytes.write('WEBP', 8); bytes.write('VP8X', 12); bytes.writeUInt32LE(10, 16); bytes.writeUIntLE(399, 24, 3); bytes.writeUIntLE(499, 27, 3);
    expect(webpDimensions(bytes)).toEqual({ width: 400, height: 500 });
    bytes[20] = 2; expect(() => webpDimensions(bytes)).toThrow('animé');
  });
  it('échappe les crédits et conserve auteur, source, licence et modifications', () => {
    const markup = renderCredits({ schemaVersion: 1, portraits: [{ ...fixture, author: '<script>alert(1)</script>', copyrightNotice: '© Test only' }] }, catalog);
    expect(markup).not.toContain('<script>'); expect(markup).toContain('&lt;script&gt;'); expect(markup).toContain(fixture.sourceUrl); expect(markup).toContain(fixture.licenseUrl); expect(markup).toContain(fixture.changes); expect(markup).toContain('© Test only');
  });
});
