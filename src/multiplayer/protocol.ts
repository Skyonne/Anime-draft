import { characters } from '../data/catalog';
import { STAT_KEYS } from '../types';
import { scoreDraft } from '../game/scoring';
import { validDraft } from '../utils/storage';
import { cleanName, validCode } from './codes';
import { rankStandings } from './room';
import type { ClientMessage, RoomView, ServerMessage, Standing } from './types';

export const PROTOCOL_VERSION = 1;
export const MAX_MESSAGE_BYTES = 24_576;
// A compatibility fingerprint, not a signature or anti-cheat guarantee.
export const CATALOG_ID = (() => { let hash = 2166136261; for (const char of JSON.stringify(characters.map(c => [c.id, ...STAT_KEYS.map(k => c.stats[k])]))) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619); return `catalog-${characters.length}-${(hash >>> 0).toString(16)}`; })();
const ids = new Set(characters.map(c => c.id));
export const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const identifier = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9-]{1,64}$/.test(v);
function decode(raw: unknown): Record<string, unknown> | null {
  // Only strings are accepted at the boundary; never stringify a potentially cyclic object.
  if (typeof raw !== 'string' || raw.length > MAX_MESSAGE_BYTES || new TextEncoder().encode(raw).length > MAX_MESSAGE_BYTES) return null;
  try { const m: unknown = JSON.parse(raw); return isObject(m) && m.v === PROTOCOL_VERSION && Number.isSafeInteger(m.seq) && (m.seq as number) >= 0 && (m.gameId === null || identifier(m.gameId)) ? m : null; } catch { return null; }
}
export function parseClient(raw: unknown): ClientMessage | null {
  const m = decode(raw); if (!m) return null;
  switch (m.type) {
    case 'hello': return typeof m.name === 'string' && m.name.length <= 24 && cleanName(m.name) === m.name && !!m.name && typeof m.token === 'string' && /^[a-f0-9]{32}$/.test(m.token) && typeof m.catalog === 'string' && m.catalog.length <= 64 && m.gameId === null ? m as unknown as ClientMessage : null;
    case 'ready': return typeof m.ready === 'boolean' ? m as unknown as ClientMessage : null;
    case 'pick': return STAT_KEYS.includes(m.key as typeof STAT_KEYS[number]) && typeof m.expected === 'string' && ids.has(m.expected) && identifier(m.gameId) ? m as unknown as ClientMessage : null;
    case 'rematch': case 'leave': case 'pong': return m as unknown as ClientMessage;
    default: return null;
  }
}
function validRoom(v: unknown): v is RoomView {
  if (!isObject(v) || typeof v.code !== 'string' || !validCode(v.code) || !['fair', 'random'].includes(v.mode as string) || !['lobby', 'draft', 'results', 'closed'].includes(v.phase as string) || !(v.gameId === null || identifier(v.gameId)) || !Array.isArray(v.players) || v.players.length < 1 || v.players.length > 4 || !Array.isArray(v.results) || v.results.length > 4) return false;
  if (v.players.some(p => !isObject(p) || !identifier(p.id) || typeof p.name !== 'string' || !p.name || p.name.length > 24 || cleanName(p.name) !== p.name || typeof p.host !== 'boolean' || typeof p.ready !== 'boolean' || typeof p.connected !== 'boolean' || typeof p.abandoned !== 'boolean' || typeof p.progress !== 'number' || !Number.isInteger(p.progress) || p.progress < 0 || p.progress > 6)) return false;
  const playerIds = new Set(v.players.map(p => p.id));
  if (playerIds.size !== v.players.length || v.players.filter(p => p.host).length !== 1) return false;
  if ((v.phase === 'draft' || v.phase === 'results') && !identifier(v.gameId)) return false;
  if (v.phase === 'lobby' && (v.gameId !== null || v.players.some(p => p.progress !== 0 || p.abandoned))) return false;
  if (v.phase !== 'results') return v.results.length === 0;
  if (v.results.length !== v.players.length || new Set(v.results.map(r => isObject(r) ? r.playerId : null)).size !== v.results.length) return false;
  for (const row of v.results) {
    if (!isObject(row) || !playerIds.has(row.playerId) || !(row.position === null || Number.isInteger(row.position) && (row.position as number) >= 1 && (row.position as number) <= 4)) return false;
    if (row.score === null) { if (row.draft !== null || row.position !== null) return false; }
    else {
      if (!validDraft(row.draft, characters) || row.draft.id !== v.gameId || Object.keys(row.draft.picks).length !== 6 || !Number.isInteger(row.score) || row.score !== scoreDraft(row.draft, characters).total) return false;
    }
  }
  const ranked = rankStandings(v.results as Standing[]);
  const rows = v.results as Standing[];
  return ranked.every((r, i) => r.playerId === rows[i].playerId && r.position === rows[i].position);
}
export function parseServer(raw: unknown): ServerMessage | null {
  const m = decode(raw); if (!m) return null;
  switch (m.type) {
    case 'snapshot': {
      if (!validRoom(m.room) || !identifier(m.selfId) || m.room.gameId !== m.gameId || !m.room.players.some(p => p.id === m.selfId) || !(m.draft === null || validDraft(m.draft, characters))) return null;
      const me = m.room.players.find(p => p.id === m.selfId)!;
      if (m.room.phase === 'lobby' && m.draft !== null) return null;
      if (m.room.phase === 'draft' && (!m.draft || (m.draft as { id: string }).id !== m.gameId || Object.keys((m.draft as { picks: object }).picks).length !== me.progress)) return null;
      return m as unknown as ServerMessage;
    }
    case 'reject': return ['full', 'started', 'closed', 'catalog', 'invalid', 'token'].includes(m.reason as string) ? m as unknown as ServerMessage : null;
    case 'error': return typeof m.message === 'string' && m.message.length <= 160 ? m as unknown as ServerMessage : null;
    case 'closed': case 'ping': return m as unknown as ServerMessage;
    default: return null;
  }
}
export function encode(message: ClientMessage | ServerMessage) {
  const text = JSON.stringify(message);
  if (new TextEncoder().encode(text).length > MAX_MESSAGE_BYTES) throw new Error('Message réseau trop grand');
  return text;
}
