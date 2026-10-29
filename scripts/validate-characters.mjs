import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';

// Independent catalogue contract: intentionally check all six expected keys.
const STAT_KEYS = ['strength', 'speed', 'ninjutsu', 'taijutsu', 'intelligence', 'endurance'];
const data = JSON.parse(readFileSync(resolve('src/data/characters.json'), 'utf8'));
const errors = [];
const ids = new Set(); const names = new Set();
if (!Array.isArray(data) || data.length < 6) throw new Error('Six personnages minimum');
for (const [index, c] of data.entries()) {
  const tag = c.name || `Entrée ${index}`;
  if (typeof c.id !== 'string' || !/^[a-z0-9-]+$/.test(c.id) || ids.has(c.id)) errors.push(`${tag} : id invalide ou dupliqué`);
  ids.add(c.id);
  if (typeof c.name !== 'string' || !c.name.trim()) errors.push(`${tag} : nom manquant`);
  const normalized = String(c.name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (names.has(normalized)) errors.push(`${tag} : doublon de nom`);
  names.add(normalized);
  for (const key of STAT_KEYS) if (!Number.isInteger(c.stats?.[key]) || c.stats[key] < 0 || c.stats[key] > 100) errors.push(`${tag} : ${key} invalide`);
  if (!c.stats || Object.keys(c.stats).length !== 6) errors.push(`${tag} : exactement six statistiques requises`);
  const publicDir = resolve('public');
  const image = resolve(publicDir, String(c.image)); const local = relative(publicDir, image);
  if (typeof c.image !== 'string' || !c.image.startsWith('characters/') || local.startsWith('..') || !/\.(svg|webp|avif|png|jpe?g)$/i.test(image) || !existsSync(image) || !statSync(image).isFile()) errors.push(`${tag} : image locale invalide`);
  if (!c.version?.trim() || !c.evidence?.trim() || !c.affiliation?.trim()) errors.push(`${tag} : contexte de notation manquant`);
  if (c.imagePosition !== undefined && (typeof c.imagePosition !== 'string' || c.imagePosition.length > 50)) errors.push(`${tag} : cadrage invalide`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Catalogue valide : ${data.length} personnages, ${data.length} portraits locaux, six notes entières par personnage.`);
