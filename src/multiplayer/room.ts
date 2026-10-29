import type { Draft, NarutoCharacter, StatKey } from '../types';
import { drawSix } from '../game/random';
import { isComplete, place, turn } from '../game/engine';
import { scoreDraft } from '../game/scoring';
import { cleanName, createCode, validCode, normalizeCode } from './codes';
import type { PlayerView, Refusal, RoomMode, RoomView, Standing } from './types';

interface Player extends PlayerView { token: string; lostAt: number | null }
export const RECONNECT_MS = 30_000;
export function rankStandings(rows: Omit<Standing, 'position'>[]): Standing[] {
  const sorted = [...rows].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  return sorted.map((row, index) => ({ ...row, position: row.score === null ? null : sorted.findIndex(other => other.score === row.score) + 1 }));
}
export class RoomError extends Error { constructor(public reason: Refusal, message: string) { super(message); } }

/** Host-authoritative domain model. It never accepts a client-calculated score. */
export class HostRoom {
  readonly code: string;
  readonly hostId: string;
  mode: RoomMode = 'fair';
  phase: RoomView['phase'] = 'lobby';
  gameId: string | null = null;
  private players: Player[];
  private drafts = new Map<string, Draft>();
  private results: Standing[] = [];
  constructor(name: string, private catalog: readonly NarutoCharacter[], code = createCode(), private draw: (ids: readonly string[]) => string[] = drawSix) {
    if (!validCode(code) || !cleanName(name) || catalog.length < 6 || new Set(catalog.map(c => c.id)).size !== catalog.length) throw new RoomError('invalid', 'Salon invalide');
    this.code = normalizeCode(code); this.hostId = crypto.randomUUID();
    this.players = [{ id: this.hostId, name: cleanName(name), host: true, ready: false, connected: true, progress: 0, abandoned: false, token: '', lostAt: null }];
  }
  join(name: string, token: string): string {
    if (this.phase === 'closed') throw new RoomError('closed', 'Le salon est fermé.');
    if (!cleanName(name) || !/^[a-f0-9]{32}$/.test(token)) throw new RoomError('invalid', 'Identité invalide.');
    const existing = this.players.find(p => p.token === token);
    if (existing) {
      if (existing.connected) throw new RoomError('token', 'Ce joueur est déjà connecté dans une autre fenêtre.');
      if (existing.abandoned) throw new RoomError('started', 'Le délai de reconnexion est dépassé.');
      existing.connected = true; existing.lostAt = null; return existing.id;
    }
    if (this.phase !== 'lobby') throw new RoomError('started', 'La partie a déjà commencé.');
    if (this.players.length >= 4) throw new RoomError('full', 'Le salon est complet (4 joueurs).');
    const id = crypto.randomUUID();
    this.players.push({ id, name: cleanName(name), host: false, ready: false, connected: true, progress: 0, abandoned: false, token, lostAt: null });
    return id;
  }
  ready(id: string, ready: boolean) {
    const player = this.player(id);
    if (this.phase !== 'lobby' || !player.connected) throw new RoomError('invalid', 'Impossible de modifier ce statut.');
    player.ready = ready;
  }
  setMode(mode: RoomMode) {
    if (this.phase !== 'lobby' || !['fair', 'random'].includes(mode)) throw new RoomError('invalid', 'Mode indisponible.');
    this.mode = mode;
    // A mode change requires explicit agreement from everyone again.
    this.players.forEach(p => { p.ready = false; });
  }
  canStart() { return this.phase === 'lobby' && this.players.length >= 2 && this.players.every(p => p.connected && p.ready); }
  start() {
    if (!this.canStart()) throw new RoomError('invalid', 'Au moins deux joueurs connectés et tous prêts sont requis.');
    this.gameId = crypto.randomUUID(); this.phase = 'draft'; this.results = [];
    const ids = this.catalog.map(c => c.id); const shared = this.mode === 'fair' ? this.draw(ids) : [];
    this.players.forEach(p => { p.progress = 0; p.abandoned = false; this.drafts.set(p.id, { id: this.gameId!, deck: this.mode === 'fair' ? [...shared] : this.draw(ids), picks: {} }); });
  }
  pick(id: string, gameId: string, key: StatKey, expected: string) {
    const player = this.player(id); const draft = this.drafts.get(id);
    if (this.phase !== 'draft' || gameId !== this.gameId || !player.connected || player.abandoned || !draft) throw new RoomError('invalid', 'Partie ou joueur indisponible.');
    const next = place(draft, key, expected);
    this.drafts.set(id, next); player.progress = turn(next); this.revealIfReady();
  }
  disconnect(id: string, now: number) {
    const player = this.player(id);
    if (player.host || !player.connected) return;
    player.connected = false; player.ready = false; player.lostAt = now;
  }
  leave(id: string) {
    const player = this.player(id);
    if (player.host) { this.close(); return; }
    if (this.phase === 'lobby') this.players = this.players.filter(p => p.id !== id);
    else { player.connected = false; player.ready = false; player.lostAt = null; player.abandoned = player.progress !== 6; this.revealIfReady(); }
  }
  expire(now: number) {
    let changed = false;
    for (const player of [...this.players]) if (!player.connected && player.lostAt !== null && now - player.lostAt >= RECONNECT_MS) { this.leave(player.id); changed = true; }
    return changed;
  }
  rematch() {
    if (this.phase !== 'results') throw new RoomError('invalid', 'La partie n’est pas terminée.');
    this.players = this.players.filter(p => p.connected);
    this.players.forEach(p => { p.ready = false; p.progress = 0; p.abandoned = false; });
    this.phase = 'lobby'; this.gameId = null; this.drafts.clear(); this.results = [];
  }
  close() { this.phase = 'closed'; this.drafts.clear(); this.results = []; }
  view(): RoomView {
    return { code: this.code, phase: this.phase, mode: this.mode, gameId: this.gameId, players: this.players.map(({ token: _token, lostAt: _lostAt, ...p }) => ({ ...p })), results: this.phase === 'results' ? this.results.map(r => ({ ...r, draft: r.draft ? structuredClone(r.draft) : null })) : [] };
  }
  ownDraft(id: string) { const draft = this.drafts.get(id); return draft ? structuredClone(draft) : null; }
  private player(id: string) { const p = this.players.find(p => p.id === id); if (!p) throw new RoomError('invalid', 'Joueur inconnu.'); return p; }
  private revealIfReady() {
    if (this.phase !== 'draft' || !this.players.every(p => p.progress === 6 || p.abandoned)) return;
    this.phase = 'results';
    this.results = rankStandings(this.players.map(p => { const draft = this.drafts.get(p.id); return { playerId: p.id, score: draft && isComplete(draft) && !p.abandoned ? scoreDraft(draft, this.catalog).total : null, draft: draft && isComplete(draft) && !p.abandoned ? structuredClone(draft) : null }; }));
  }
}
