import { cleanName } from './codes';
import type { RoomMode } from './types';
const KEY = 'naruto-stat-draft:preferences:v1';
export interface Preferences { name: string; mode: RoomMode }
export function readPreferences(): Preferences {
  try { const p = JSON.parse(localStorage.getItem(KEY) || '{}'); if (!p || p.version !== 1) return { name: '', mode: 'fair' }; return { name: typeof p.name === 'string' ? cleanName(p.name) : '', mode: p.mode === 'random' ? 'random' : 'fair' }; } catch { return { name: '', mode: 'fair' }; }
}
export function writePreferences(preferences: Preferences) { try { localStorage.setItem(KEY, JSON.stringify({ version: 1, name: cleanName(preferences.name), mode: preferences.mode })); } catch { /* Session remains fully usable without persistence. */ } }
export function resumeToken(code: string) {
  const key = `naruto-stat-draft:resume:${code}`;
  try { const value = sessionStorage.getItem(key); if (value && /^[a-f0-9]{32}$/.test(value)) return value; } catch { /* Memory fallback below. */ }
  const token = crypto.randomUUID().replaceAll('-', '');
  try { sessionStorage.setItem(key, token); } catch { /* Memory-only reconnection still works. */ }
  return token;
}
