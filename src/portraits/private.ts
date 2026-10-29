import { matchPrivatePortraits as matchProviderPortraits, validPrivateImage } from './provider.mjs';
import { characters } from '../data/catalog';
import sources from './sources.json';
import type { NarutoCharacter } from '../types';

export interface PrivatePortrait { characterId: string; characterName: string; imageUrl: string; sourceUrl: string; sourceName: string }
export interface PrivatePortraitState { status: 'idle' | 'loading' | 'ready' | 'error'; portraits: PrivatePortrait[]; message: string }
export const PRIVATE_PORTRAITS_ENABLED = import.meta.env.VITE_PRIVATE_PORTRAITS === 'true' || import.meta.env.VITE_REMOTE_PORTRAITS === 'true';
const CACHE_KEY = 'naruto-stat-draft:private-portraits:v1';
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const endpoints = sources.endpoints;
export { validPrivateImage };
export const matchPrivatePortraits = (payloads: unknown[], catalog: readonly NarutoCharacter[] = characters): PrivatePortrait[] => matchProviderPortraits(payloads, catalog);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function validLocalPrivateImage(value: unknown, id: unknown): value is string {
  return typeof id === 'string' && /^[a-z0-9-]+$/.test(id) && typeof value === 'string' && ['jpg', 'png', 'webp', 'avif'].some(extension => value === `private-portraits/${id}.${extension}`);
}
function validRecord(p: unknown): p is PrivatePortrait {
  return object(p) && (validPrivateImage(p.imageUrl) || validLocalPrivateImage(p.imageUrl, p.characterId)) && characters.some(c => c.id === p.characterId && c.name === p.characterName) && typeof p.sourceUrl === 'string' && /^https:\/\/myanimelist\.net\/character\/[0-9]+$/.test(p.sourceUrl) && typeof p.sourceName === 'string' && p.sourceName.length <= 120;
}

function readCache(): { portraits: PrivatePortrait[]; fresh: boolean } {
  if (typeof window === 'undefined') return { portraits: [], fresh: false };
  try {
    const cached: unknown = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (!object(cached) || cached.version !== 1 || !Array.isArray(cached.portraits) || cached.portraits.length > characters.length || typeof cached.savedAt !== 'number' || !Number.isFinite(cached.savedAt)) return { portraits: [], fresh: false };
    const seen = new Set();
    const portraits = cached.portraits.filter((p: unknown): p is PrivatePortrait => {
      if (!validRecord(p) || seen.has(p.characterId)) return false;
      seen.add(p.characterId); return true;
    });
    const age = Date.now() - cached.savedAt;
    return { portraits, fresh: portraits.length > 0 && age >= 0 && age < MAX_AGE };
  } catch { return { portraits: [], fresh: false }; }
}
const cache = PRIVATE_PORTRAITS_ENABLED ? readCache() : { portraits: [], fresh: false };
let state: PrivatePortraitState = { status: cache.fresh ? 'ready' : 'idle', portraits: cache.portraits, message: '' };
let running: Promise<void> | null = null;
let localChecked = false;
const listeners = new Set<() => void>();
export const subscribePrivatePortraits = (callback: () => void) => { listeners.add(callback); return () => { listeners.delete(callback); }; };
export const getPrivatePortraits = () => state;
const emptyServerState: PrivatePortraitState = { status: 'idle', portraits: [], message: '' };
export const getPrivateServerState = () => emptyServerState;
function update(patch: Partial<PrivatePortraitState>) { state = { ...state, ...patch }; listeners.forEach(fn => fn()); }
export async function loadPrivatePortraits(force = false): Promise<void> {
  if (!PRIVATE_PORTRAITS_ENABLED || running || !force && localChecked && (state.status === 'ready' || state.status === 'error')) return running || Promise.resolve();
  update({ status: 'loading', message: 'Chargement des portraits Naruto…' });
  running = (async () => {
    let localError = '';
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}private-portraits/index.json`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const text = await response.text();
        const index: unknown = text.length <= 300000 ? JSON.parse(text) : null;
        if (object(index) && index.version === 1 && Array.isArray(index.portraits) && index.portraits.length <= characters.length) {
          const ids = new Set();
          const localPortraits = index.portraits.filter((p: unknown): p is PrivatePortrait => { if (!validRecord(p) || !validLocalPrivateImage(p.imageUrl, p.characterId) || ids.has(p.characterId)) return false; ids.add(p.characterId); return true; });
          if (localPortraits.length) {
            localChecked = true;
            try { localStorage.setItem(CACHE_KEY, JSON.stringify({ version: 1, savedAt: Date.now(), portraits: localPortraits })); } catch { /* Files still load from the local site. */ }
            update({ status: 'ready', portraits: localPortraits, message: `${localPortraits.length} fichiers de portraits locaux chargés. Aucun téléchargement d’image externe pendant la partie.` });
            return;
          }
          localError = Array.isArray(index.errors) && object(index.errors[0]) && typeof index.errors[0].message === 'string' ? `Téléchargement local échoué : ${index.errors[0].message.slice(0, 220)} ` : '';
        }
      }
    } catch { /* Old installations may not have a local image cache yet. */ }
    localChecked = true;
    // A missing local manifest must not keep stale local file URLs alive indefinitely.
    update({ portraits: state.portraits.filter(p => !validLocalPrivateImage(p.imageUrl, p.characterId)) });
    const payloads: unknown[] = [];
    for (const endpoint of endpoints) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(endpoint, { signal: AbortSignal.timeout(12_000), referrerPolicy: 'no-referrer' });
          if (response.status === 429) { await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1))); continue; }
          if (!response.ok) break;
          const text = await response.text(); if (text.length > 4_000_000) break;
          payloads.push(JSON.parse(text)); break;
        } catch { break; }
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    const portraits = matchPrivatePortraits(payloads);
    if (!portraits.length) { update({ status: 'error', message: `${localError}Aucun nouveau portrait récupéré. Relance start.bat et consulte le résultat du téléchargement dans sa fenêtre.` }); return; }
    // Retain already-known entries when only one of the two anime endpoints answered.
    const combined = new Map(state.portraits.map(p => [p.characterId, p]));
    portraits.forEach(p => combined.set(p.characterId, p));
    const result = [...combined.values()];
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ version: 1, savedAt: Date.now(), portraits: result })); } catch { /* Images still work without persistent metadata. */ }
    update({ status: 'ready', portraits: result, message: '' });
  })().finally(() => { running = null; });
  return running;
}
