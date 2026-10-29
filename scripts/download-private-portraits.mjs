import { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { matchPrivatePortraits, validPrivateImage } from '../src/portraits/provider.mjs';
import sources from '../src/portraits/sources.json' with { type: 'json' };

const ROOT = resolve(import.meta.dirname, '..');
const TARGET = join(ROOT, 'public/private-portraits');
const INDEX = join(TARGET, 'index.json');
const catalog = JSON.parse(readFileSync(join(ROOT, 'src/data/characters.json'), 'utf8'));
const SOURCES = sources.endpoints;

export function imageExtension(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (bytes.length >= 12 && bytes.toString('ascii', 4, 8) === 'ftyp' && ['avif', 'avis'].includes(bytes.toString('ascii', 8, 12))) return 'avif';
  throw new Error('La source a renvoyé autre chose qu’une image JPEG, PNG, WebP ou AVIF.');
}
export function readLocalIndex(directory = TARGET) {
  try {
    const data = JSON.parse(readFileSync(join(directory, 'index.json'), 'utf8'));
    if (data.version !== 1 || !Array.isArray(data.portraits)) return [];
    const ids = new Set();
    return data.portraits.filter(p => {
      if (!p || !catalog.some(c => c.id === p.characterId && c.name === p.characterName) || ids.has(p.characterId) || p.imageUrl !== `private-portraits/${p.characterId}.${p.extension}` || !['jpg', 'png', 'webp', 'avif'].includes(p.extension)) return false;
      const file = join(directory, `${p.characterId}.${p.extension}`);
      if (!existsSync(file) || !statSync(file).isFile() || statSync(file).size > 2_000_000) return false;
      try { if (imageExtension(readFileSync(file)) !== p.extension) return false; } catch { return false; }
      ids.add(p.characterId); return true;
    });
  } catch { return []; }
}
function describe(error) {
  const code = error?.cause?.code || error?.code;
  return ['EACCES', 'EPERM'].includes(code) ? `Accès réseau interdit par l’environnement (${code}).` : error?.name === 'TimeoutError' ? 'Délai réseau dépassé.' : `${error?.message || error}${code ? ` (${code})` : ''}`;
}
async function request(url, asImage = false) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000), headers: { 'User-Agent': 'NarutoStatDraft-LocalPortraitCache/1.0', Accept: asImage ? 'image/*' : 'application/json' } });
    if (response.status === 429 && attempt < 2) { await new Promise(r => setTimeout(r, 1500 * (attempt + 1))); continue; }
    if (!response.ok) throw new Error(`HTTP ${response.status} : ${new URL(url).hostname}`);
    if (asImage && !validPrivateImage(response.url || url)) throw new Error('Redirection d’image vers une source inattendue.');
    const limit = asImage ? 2_000_000 : 4_000_000;
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Réponse vide.');
    const chunks = []; let size = 0;
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw new Error('Réponse trop volumineuse.'); }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  }
  throw new Error('Source temporairement indisponible.');
}
export async function downloadPrivatePortraits({ onlyMissing = false, fetcher = request, directory = TARGET } = {}) {
  const existing = readLocalIndex(directory);
  if (onlyMissing && existing.length) { console.log(`Portraits locaux déjà présents : ${existing.length}/${catalog.length}.`); return { downloaded: existing.length, errors: [] }; }
  const payloads = [], errors = [];
  console.log(`Récupération des références Naruto / Shippuden via ${sources.provider}…`);
  for (const url of SOURCES) {
    try { const bytes = await fetcher(url); payloads.push(JSON.parse(bytes.toString('utf8'))); }
    catch (error) { const message = describe(error); errors.push({ source: url, message }); console.error(`Source indisponible : ${message}`); }
  }
  const candidates = matchPrivatePortraits(payloads, catalog);
  const saved = new Map(existing.map(p => [p.characterId, p]));
  mkdirSync(directory, { recursive: true });
  // At most three simultaneous image downloads; matching never depends on the draft.
  let next = 0;
  async function worker() {
    while (next < candidates.length) {
      const candidate = candidates[next++];
      if (saved.has(candidate.characterId)) continue;
      try {
        const bytes = await fetcher(candidate.imageUrl, true), extension = imageExtension(bytes);
        const file = join(directory, `${candidate.characterId}.${extension}`);
        writeFileSync(`${file}.download`, bytes); renameSync(`${file}.download`, file);
        saved.set(candidate.characterId, { ...candidate, remoteUrl: candidate.imageUrl, imageUrl: `private-portraits/${candidate.characterId}.${extension}`, extension, bytes: bytes.length });
        console.log(`  ${saved.size}/${catalog.length} — ${candidate.characterName}`);
      } catch (error) { errors.push({ characterId: candidate.characterId, message: describe(error) }); }
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  const index = { version: 1, savedAt: Date.now(), portraits: [...saved.values()], errors };
  const indexPath = join(directory, 'index.json');
  writeFileSync(`${indexPath}.tmp`, JSON.stringify(index, null, 2) + '\n'); renameSync(`${indexPath}.tmp`, indexPath);
  console.log(`Résultat réel : ${saved.size} fichiers image locaux, ${catalog.length - saved.size} avatars de secours.`);
  if (errors.length) console.error(`${errors.length} erreur(s) détaillée(s) dans public/private-portraits/index.json.`);
  if (!saved.size) console.error('Aucun portrait téléchargé : le jeu reste jouable avec ses avatars. Publier sur GitHub ne résout pas ce téléchargement.');
  return { downloaded: saved.size, errors };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const env = join(ROOT, '.env.local');
    if (process.argv.includes('--if-enabled') && (!existsSync(env) || !/^VITE_PRIVATE_PORTRAITS\s*=\s*true\s*$/m.test(readFileSync(env, 'utf8')))) console.log('Portraits privés désactivés.');
    else { const result = await downloadPrivatePortraits({ onlyMissing: process.argv.includes('--if-missing') }); if (!result.downloaded) process.exitCode = 1; }
  } catch (error) { console.error(describe(error)); process.exitCode = 1; }
}
