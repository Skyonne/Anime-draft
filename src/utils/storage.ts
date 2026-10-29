import { STAT_KEYS, type Draft, type NarutoCharacter, type SaveData } from '../types';
import { isComplete } from '../game/engine';
import { scoreDraft } from '../game/scoring';

export const SAVE_KEY = 'naruto-stat-draft:v1';
export const emptySave = (): SaveData => ({ version: 1, best: 0, completed: 0, last: null, history: [], settings: { reduceMotion: false }, draft: null });
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const score = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 600;
export function validDraft(value: unknown, catalog: readonly NarutoCharacter[]): value is Draft {
  if (!object(value) || typeof value.id !== 'string' || !value.id || !Array.isArray(value.deck) || value.deck.length !== 6 || !object(value.picks)) return false;
  const ids = new Set(catalog.map(c => c.id));
  if (!value.deck.every(id => typeof id === 'string' && ids.has(id)) || new Set(value.deck).size !== 6) return false;
  const entries = Object.entries(value.picks);
  if (entries.length > 6 || entries.some(([key, id]) => !STAT_KEYS.includes(key as typeof STAT_KEYS[number]) || typeof id !== 'string')) return false;
  // Object insertion order is the committed turn order; reject swaps and skipped draws.
  return entries.every(([, id], index) => id === (value.deck as string[])[index]);
}
export function restore(raw: string | null, catalog: readonly NarutoCharacter[]): SaveData {
  if (!raw) return emptySave();
  try {
    const data: unknown = JSON.parse(raw);
    if (!object(data) || data.version !== 1 || !score(data.best) || !Number.isSafeInteger(data.completed) || (data.completed as number) < 0 || !(data.last === null || score(data.last)) || !Array.isArray(data.history) || data.history.length > 10 || !object(data.settings) || typeof data.settings.reduceMotion !== 'boolean') return emptySave();
    if (data.history.some(r => !object(r) || typeof r.id !== 'string' || !r.id || typeof r.date !== 'string' || !Number.isFinite(Date.parse(r.date)) || !score(r.score))) return emptySave();
    const history = data.history as SaveData['history'];
    if (new Set(history.map(r => r.id)).size !== history.length || history.length !== Math.min(data.completed as number, 10) || history.some(r => r.score > (data.best as number)) || (data.last !== null && (data.last as number) > data.best)) return emptySave();
    if (data.completed === 0 ? data.best !== 0 || data.last !== null : data.last !== history[0]?.score) return emptySave();
    if ((data.completed as number) <= 10 && data.best !== Math.max(0, ...history.map(r => r.score))) return emptySave();
    if (data.draft !== null && !validDraft(data.draft, catalog)) return emptySave();
    return { version: 1, best: data.best, completed: data.completed as number, last: data.last, history, settings: { reduceMotion: data.settings.reduceMotion }, draft: data.draft as Draft | null };
  } catch { return emptySave(); }
}
export function finish(save: SaveData, draft: Draft, catalog: readonly NarutoCharacter[], date = new Date().toISOString()): SaveData {
  if (!isComplete(draft)) return { ...save, draft };
  // Finishing is idempotent, including refreshes and React StrictMode effects.
  if (save.history.some(r => r.id === draft.id)) return { ...save, draft };
  const result = scoreDraft(draft, catalog);
  return { ...save, draft, best: Math.max(save.best, result.total), last: result.total, completed: save.completed + 1, history: [{ id: draft.id, date, score: result.total }, ...save.history].slice(0, 10) };
}
export function readSave(catalog: readonly NarutoCharacter[]): SaveData {
  try { return restore(localStorage.getItem(SAVE_KEY), catalog); } catch { return emptySave(); }
}
export function writeSave(save: SaveData): boolean {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch { return false; }
}
