import { readFileSync, writeFileSync, existsSync, realpathSync, statSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const catalogPath = resolve(root, 'src/data/characters.json');
const manifestPath = resolve(root, 'src/data/portraits.json');
export const LICENSES = {
  'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  'CC-BY-2.0': 'https://creativecommons.org/licenses/by/2.0/',
  'CC-BY-3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC-BY-SA-2.0': 'https://creativecommons.org/licenses/by-sa/2.0/',
  'CC-BY-SA-3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'CC-BY-SA-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CUSTOM-PERMISSION': null,
};
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && !!value.trim() && value.length <= 2000;
const https = value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; } };
export function metadataErrors(portrait, catalog) {
  if (!object(portrait)) return ['Entrée de portrait invalide'];
  const errors = [], character = catalog.find(c => c.id === portrait.characterId);
  if (!character || character.name !== portrait.characterName) errors.push('Identifiant et nom canonique du personnage non concordants');
  for (const key of ['title', 'author', 'changes']) if (!text(portrait[key])) errors.push(`${key} manquant`);
  if (portrait.copyrightNotice !== undefined && !text(portrait.copyrightNotice)) errors.push('Notice de copyright invalide');
  for (const key of ['sourceUrl', 'licenseUrl', 'rightsEvidenceUrl']) if (!https(portrait[key])) errors.push(`${key} HTTPS manquant ou invalide`);
  if (!Object.hasOwn(LICENSES, portrait.license)) errors.push('Licence non prise en charge : revue requise, ni fair use ni API ne sont une licence');
  else if (LICENSES[portrait.license] && portrait.licenseUrl !== LICENSES[portrait.license]) errors.push('URL de licence incohérente');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(portrait.reviewedAt || '') || !Number.isFinite(Date.parse(portrait.reviewedAt))) errors.push('Date de revue invalide');
  for (const key of ['publicDisplay', 'redistribution', 'adaptations', 'underlyingRightsCleared']) if (portrait.rights?.[key] !== true) errors.push(`Droit non validé : ${key}`);
  if (typeof portrait.position !== 'string' || !/^(100|[0-9]{1,2})(\.\d+)?% (100|[0-9]{1,2})(\.\d+)?%$/.test(portrait.position) || portrait.position.split(' ').some(n => parseFloat(n) > 100)) errors.push('Cadrage attendu : deux pourcentages entre 0 et 100');
  return errors;
}
export function webpDimensions(bytes) {
  if (bytes.length < 30 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' || bytes.readUInt32LE(4) + 8 !== bytes.length) throw new Error('Fichier WebP invalide');
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.toString('ascii', offset, offset + 4), size = bytes.readUInt32LE(offset + 4), start = offset + 8;
    if (start + size > bytes.length) throw new Error('WebP tronqué');
    if (type === 'VP8X' && size >= 10) {
      if (bytes[start] & 2) throw new Error('Portrait animé non autorisé');
      return { width: 1 + bytes.readUIntLE(start + 4, 3), height: 1 + bytes.readUIntLE(start + 7, 3) };
    }
    if (type === 'VP8 ' && size >= 10 && bytes.toString('hex', start + 3, start + 6) === '9d012a') return { width: bytes.readUInt16LE(start + 6) & 0x3fff, height: bytes.readUInt16LE(start + 8) & 0x3fff };
    if (type === 'VP8L' && size >= 5 && bytes[start] === 0x2f) { const bits = bytes.readUInt32LE(start + 1); return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }; }
    offset = start + size + (size % 2);
  }
  throw new Error('Dimensions WebP introuvables');
}
export function validateManifest(manifest, catalog, publicDir = resolve(root, 'public')) {
  if (!object(manifest) || manifest.schemaVersion !== 1 || !Array.isArray(manifest.portraits)) return ['Format de manifeste inconnu'];
  const errors = [], ids = new Set(), files = new Set();
  for (const p of manifest.portraits) {
    errors.push(...metadataErrors(p, catalog).map(error => `${p?.characterId || '?'} : ${error}`));
    if (!object(p)) continue;
    if (ids.has(p.characterId)) errors.push(`${p.characterId} : portrait dupliqué`); ids.add(p.characterId);
    const expected = `characters/portraits/${p.characterId}.webp`;
    if (p.file !== expected || !/^[a-z0-9-]+$/.test(p.characterId || '') || files.has(p.file)) { errors.push(`${p.characterId} : chemin de portrait invalide ou dupliqué`); continue; }
    files.add(p.file);
    const file = resolve(publicDir, p.file);
    if (!existsSync(file) || !statSync(file).isFile()) { errors.push(`${p.characterId} : image absente`); continue; }
    const inside = relative(realpathSync(publicDir), realpathSync(file));
    if (inside.startsWith('..') || isAbsolute(inside)) { errors.push(`${p.characterId} : image hors du dossier public`); continue; }
    const bytes = readFileSync(file);
    if (bytes.length > 120000 || bytes.length !== p.bytes || createHash('sha256').update(bytes).digest('hex') !== p.sha256) errors.push(`${p.characterId} : taille ou empreinte de fichier incohérente (120 Ko maximum)`);
    try { const dimensions = webpDimensions(bytes); if (dimensions.width !== 400 || dimensions.height !== 500 || p.width !== 400 || p.height !== 500) errors.push(`${p.characterId} : dimensions 400 × 500 requises`); } catch (error) { errors.push(`${p.characterId} : ${error.message}`); }
  }
  return errors;
}
const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function renderCredits(manifest, catalog) {
  const entries = manifest.portraits.map(p => `<article><h2>${escape(p.characterName)}</h2><p>« ${escape(p.title)} » — ${escape(p.author)}.</p><p><a href="${escape(p.sourceUrl)}">Source originale</a> · <a href="${escape(p.licenseUrl)}">${escape(p.license)}</a> · <a href="${escape(p.rightsEvidenceUrl)}">Preuve des droits</a>.</p><p>Modifications : ${escape(p.changes)}.</p>${p.copyrightNotice ? `<p>${escape(p.copyrightNotice)}</p>` : ''}<p>Revue : ${escape(p.reviewedAt)}. Fichier : ${escape(p.file)}.</p></article>`).join('\n');
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Portraits et crédits — Naruto Stat Draft</title><style>body{font:16px/1.8 system-ui,sans-serif;margin:0;background:#111316;color:#e8dfd7}main{max-width:800px;margin:auto;padding:35px 24px}h1,h2{line-height:1.3}h1{color:#ffae78}h2{font-size:20px}a{color:#ffc29a;text-underline-offset:4px}a:focus-visible{outline:2px solid #ffb078;outline-offset:4px}article{border-top:1px solid #fff2;margin-top:26px;padding-top:18px}small{color:#aaa}code{overflow-wrap:anywhere}</style></head><body><main><a href="./">← Retour au jeu</a><h1>Portraits et crédits des visuels</h1><p><strong>${manifest.portraits.length} portrait(s) tiers à licence vérifiée · ${catalog.length - manifest.portraits.length} avatar(s) de secours.</strong></p><p>Une installation privée peut également afficher des images distantes MyAnimeList via Tenrai. Elles ne sont pas incluses dans ce registre de licences vérifiées ; leur provenance est affichée dans le catalogue. Aucune licence libre sur ces images n’est revendiquée.</p>${entries || '<p>Aucun portrait tiers n’a été retenu à l’issue de la revue des sources. Les avatars originaux sont conservés. Cela ne signifie pas qu’aucun portrait autorisé n’existe ailleurs.</p>'}<article><h2>Avatars originaux</h2><p>Créations graphiques du projet Naruto Stat Draft, produites par son générateur SVG : initiales, silhouettes abstraites et motifs géométriques. Ces avatars ne sont pas des portraits officiels ni des captures de Naruto.</p><p>Crédit : projet Naruto Stat Draft. Source locale : <code>scripts/generate-avatars.py</code>. Créations réalisées pour ce projet ; aucune licence Creative Commons de tiers n’est revendiquée.</p></article><p><small>Les noms et personnages Naruto appartiennent à leurs ayants droit. Projet de fans indépendant. Les illustrations non disponibles sont remplacées par les avatars originaux.</small></p></main></body></html>
`;
}
function coverage(manifest, catalog) {
  const portraits = new Map(manifest.portraits.map(p => [p.characterId, p]));
  return `# Couverture des portraits\n\nInventaire complet du catalogue ; recherche par familles de sources et vérification de candidats identifiés, pas recherche exhaustive sur le Web pour chacun des 120 noms. Voir [la revue des sources](PORTRAITS.md).\n\n${portraits.size} portraits retenus ; ${catalog.length - portraits.size} avatars conservés.\n\n| Identifiant | Nom canonique | Visuel retenu | Motif |\n|---|---|---|---|\n${catalog.map(c => `| ${c.id} | ${c.name} | ${portraits.get(c.id)?.file || c.image} | ${portraits.has(c.id) ? 'Source et droits documentés dans les crédits' : 'Pas de portrait dont les droits soient suffisamment établis dans les sources consultées'} |`).join('\n')}\n`;
}
export function checkPortraits(sync = false) {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')), manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const errors = validateManifest(manifest, catalog);
  if (errors.length) throw new Error(errors.join('\n'));
  const outputs = [[resolve(root, 'public/portrait-credits.html'), renderCredits(manifest, catalog)], [resolve(root, 'docs/PORTRAIT-COVERAGE.md'), coverage(manifest, catalog)]];
  for (const [file, content] of outputs) {
    if (sync) writeFileSync(file, content, 'utf8');
    else if (!existsSync(file) || readFileSync(file, 'utf8') !== content) throw new Error(`Crédits ou inventaire périmés : npm run portraits:sync (${relative(root, file)})`);
  }
  return { portraits: manifest.portraits.length, avatars: catalog.length - manifest.portraits.length };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv[2] === '--check-approval') {
      const approval = JSON.parse(readFileSync(resolve(process.argv[3]), 'utf8'));
      const errors = metadataErrors(approval, JSON.parse(readFileSync(catalogPath, 'utf8')));
      if (errors.length) throw new Error(errors.join('\n'));
      console.log('Métadonnées complètes. Leur véracité doit être vérifiée manuellement ; ce contrôle ne prouve pas les droits.');
    } else { const counts = checkPortraits(process.argv.includes('--sync')); console.log(`Portraits : ${counts.portraits} autorisés intégrés, ${counts.avatars} avatars conservés ; crédits et fichiers validés.`); }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
