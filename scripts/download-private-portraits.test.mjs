import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, unlinkSync, rmdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { downloadPrivatePortraits, imageExtension, readLocalIndex } from './download-private-portraits.mjs';

const directories = [];
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/u0QAAAAASUVORK5CYII=', 'base64');
function temp() { const directory = mkdtempSync(resolve('.runtime/portrait-download-test-')); directories.push(directory); return directory; }
afterEach(() => { for (const dir of directories.splice(0)) { for (const name of readdirSync(dir)) unlinkSync(join(dir, name)); rmdirSync(dir); } vi.restoreAllMocks(); });
const metadata = Buffer.from(JSON.stringify({ data: [{ character: { name: 'Uzumaki, Naruto', mal_id: 17, images: { jpg: { image_url: 'https://cdn.myanimelist.net/images/characters/1/100.png' } } } }] }));
describe('Téléchargement réel des fichiers privés — réseau injecté dans les tests', () => {
  it('enregistre une image et un index utilisable depuis le serveur local', async () => {
    const dir = temp(); const fetcher = vi.fn(async (_url, image) => image ? PNG : metadata);
    const result = await downloadPrivatePortraits({ directory: dir, fetcher });
    expect(result.downloaded).toBe(1); expect(readFileSync(join(dir, 'naruto-uzumaki.png'))).toEqual(PNG);
    const rows = readLocalIndex(dir); expect(rows).toHaveLength(1); expect(rows[0].imageUrl).toBe('private-portraits/naruto-uzumaki.png');
    const calls = fetcher.mock.calls.length;
    await downloadPrivatePortraits({ directory: dir, fetcher, onlyMissing: true }); expect(fetcher).toHaveBeenCalledTimes(calls);
  });
  it('n’annonce jamais un téléchargement réussi lorsque le réseau refuse l’accès', async () => {
    const dir = temp();
    const result = await downloadPrivatePortraits({ directory: dir, fetcher: async () => { throw Object.assign(new Error('fetch failed'), { cause: { code: 'EACCES' } }); } });
    expect(result.downloaded).toBe(0); expect(result.errors).toHaveLength(2);
    expect(JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')).portraits).toEqual([]);
    expect(result.errors[0].message).toContain('EACCES');
  });
  it('refuse une page HTML renvoyée à la place d’un portrait', async () => {
    const dir = temp();
    const result = await downloadPrivatePortraits({ directory: dir, fetcher: async (_url, image) => image ? Buffer.from('<html>Access denied</html>') : metadata });
    expect(result.downloaded).toBe(0); expect(result.errors).toHaveLength(1);
    expect(readdirSync(dir)).toEqual(['index.json']);
  });
  it('reconnaît le format du contenu plutôt que de se fier au nom du fichier', () => {
    expect(imageExtension(PNG)).toBe('png'); expect(imageExtension(Buffer.from([255, 216, 255, 0]))).toBe('jpg');
    expect(() => imageExtension(Buffer.from('not an image'))).toThrow();
  });
});
