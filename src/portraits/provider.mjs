import PORTRAIT_ALIASES from '../data/portrait-aliases.json' with { type: 'json' };
const normalize = (s) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const object = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
export function validPrivateImage(value) {
  if (typeof value !== 'string' || value.length > 600) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'cdn.myanimelist.net' && !url.username && !url.password && !url.port && /^\/images\/characters\/[0-9]+\/[0-9]+\.(jpg|jpeg|webp|png|avif)$/.test(url.pathname); } catch { return false; }
}
/** Exact canonical/alias matching only. Comma-separated Japanese names are reordered. */
export function matchPrivatePortraits(payloads, catalog) {
  const aliases = new Map();
  for (const c of catalog) for (const name of [c.name, ...PORTRAIT_ALIASES[c.id] || []]) { const key = normalize(name); if (!aliases.has(key)) aliases.set(key, new Set()); aliases.get(key).add(c.id); }
  const matched = new Map();
  for (const payload of payloads) {
    if (!object(payload) || !Array.isArray(payload.data) || payload.data.length > 2000) continue;
    for (const row of payload.data) {
      const c = object(row) && object(row.character) ? row.character : null;
      if (!c || typeof c.name !== 'string' || c.name.length > 120 || !Number.isSafeInteger(c.mal_id) || c.mal_id <= 0) continue;
      const images = object(c.images) ? c.images : null;
      const jpg = images && object(images.jpg) ? images.jpg : null;
      if (!validPrivateImage(jpg?.image_url)) continue;
      const spellings = [c.name, c.name.split(',').reverse().join(' ')];
      const ids = new Set(spellings.flatMap(name => [...aliases.get(normalize(name)) || []]));
      if (ids.size !== 1) continue;
      const id = [...ids][0], character = catalog.find(c => c.id === id);
      if (!matched.has(id)) matched.set(id, new Map());
      matched.get(id).set(c.mal_id, { characterId: id, characterName: character.name, imageUrl: jpg.image_url, sourceUrl: `https://myanimelist.net/character/${c.mal_id}`, sourceName: c.name });
    }
  }
  // Two different identities with the same name are not guessed or silently merged.
  return [...matched.values()].filter(candidates => candidates.size === 1).map(candidates => [...candidates.values()][0]);
}
