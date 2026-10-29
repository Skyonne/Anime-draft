import { characters } from '../data/catalog';
import { STAT_KEYS, type StatKey } from '../types';
import { turn } from '../game/engine';
import { CATALOG_ID, encode, parseClient, parseServer } from './protocol';
import { cleanName, normalizeCode, peerIdForCode, validCode } from './codes';
import { HostRoom, RECONNECT_MS, RoomError } from './room';
import { loadPeer, peerOptions, type DataPort, type PeerConstructor, type PeerPort } from './peer';
import { resumeToken } from './preferences';
import type { ClientMessage, Refusal, RoomMode, ServerMessage, SessionView } from './types';

const REFUSALS: Record<Refusal, string> = {
  full: 'Le salon est complet : quatre places maximum.', started: 'La partie a déjà commencé ou le délai de retour a expiré.', closed: 'Le salon a été fermé par l’hôte.', catalog: 'Vos catalogues diffèrent. Actualisez les deux sites sur la même version.', invalid: 'La demande de connexion est invalide.', token: 'Ce joueur est déjà connecté dans une autre fenêtre.',
};
interface Link { connection: DataPort; playerId: string | null; lastSeq: number; lastSeen: number; openedAt: number; windowAt: number; messages: number }
const empty = (): SessionView => ({ status: 'idle', room: null, selfId: null, draft: null, error: '', notice: '' });

/** Real PeerJS transport. Tests inject event-driven network ports, never a localStorage bus. */
export class RoomSession {
  private state = empty();
  private listeners = new Set<() => void>();
  private peer: PeerPort | null = null;
  private room: HostRoom | null = null;
  private links = new Map<DataPort, Link>();
  private hostConnection: DataPort | null = null;
  private tick: ReturnType<typeof setInterval> | null = null;
  private seq = 0;
  private lastServerSeq = -1;
  private lastHostSeen = 0;
  private heartbeatAt = 0;
  private reconnectUntil = 0;
  private retryAt = 0;
  private generation = 0;
  private code = '';
  private name = '';
  private token = '';
  private stopped = true;
  constructor(private peerLoader: () => Promise<PeerConstructor> = loadPeer, private now = () => Date.now(), private getToken = resumeToken) {}
  subscribe = (callback: () => void) => { this.listeners.add(callback); return () => { this.listeners.delete(callback); }; };
  getSnapshot = () => this.state;
  private update(patch: Partial<SessionView>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()); }
  async create(name: string, mode: RoomMode = 'fair') {
    this.reset(); this.stopped = false; this.name = cleanName(name);
    if (!this.name) { this.fail('Choisis un pseudo (24 caractères maximum).'); return; }
    this.update({ ...empty(), status: 'connecting', notice: 'Création du salon sur PeerJS…' });
    const generation = this.generation;
    try {
      const Peer = await this.peerLoader(); if (generation !== this.generation) return;
      this.room = new HostRoom(this.name, characters); this.room.setMode(mode); this.code = this.room.code;
      this.peer = new Peer(peerIdForCode(this.code), peerOptions);
      this.bindPeer(generation, () => { this.update({ status: 'connected', error: '', notice: '' }); this.broadcast(); });
      this.peer.on('connection', raw => { if (!this.stopped && generation === this.generation) this.acceptConnection(raw as DataPort); });
      this.startClock();
    } catch (error) { if (generation === this.generation) this.fail((error as Error).message); }
  }
  async join(name: string, rawCode: string) {
    this.reset(); this.stopped = false; this.name = cleanName(name); this.code = normalizeCode(rawCode);
    if (!this.name || !validCode(this.code)) { this.fail('Entre un pseudo et un code valide de 12 caractères.'); return; }
    this.token = this.getToken(this.code);
    this.update({ ...empty(), status: 'connecting', notice: 'Connexion au salon privé…' });
    const generation = this.generation;
    try {
      const Peer = await this.peerLoader(); if (generation !== this.generation) return;
      this.peer = new Peer(undefined, peerOptions);
      this.bindPeer(generation, () => { if (this.state.status !== 'connected') this.connectHost(); });
      this.startClock();
    } catch (error) { if (generation === this.generation) this.fail((error as Error).message); }
  }
  ready(value: boolean) {
    if (this.room) this.hostAction(() => this.room!.ready(this.room!.hostId, value));
    else this.sendClient({ type: 'ready', ready: value });
  }
  setMode(mode: RoomMode) { if (this.room) this.hostAction(() => this.room!.setMode(mode)); }
  start() { if (this.room) this.hostAction(() => this.room!.start()); }
  pick(key: StatKey, expected: string) {
    if (this.state.status !== 'connected' || !this.state.room?.gameId) return;
    if (this.room) this.hostAction(() => this.room!.pick(this.room!.hostId, this.room!.gameId!, key, expected));
    else this.sendClient({ type: 'pick', key, expected });
  }
  auto(expected: string) {
    const draft = this.state.draft;
    if (!draft || turn(draft) !== 5 || draft.deck[5] !== expected) return;
    this.pick(STAT_KEYS.find(k => !draft.picks[k])!, expected);
  }
  rematch() {
    if (this.room) this.hostAction(() => this.room!.rematch());
    else this.sendClient({ type: 'rematch' });
  }
  leave() {
    if (this.room) {
      this.room.close();
      for (const link of this.links.values()) this.sendServer(link.connection, { type: 'closed' });
    } else this.sendClient({ type: 'leave' });
    this.reset(100); this.update({ ...empty(), status: 'closed', notice: 'Tu as quitté le salon.' });
  }
  dispose() {
    if (this.room) { this.room.close(); for (const link of this.links.values()) this.sendServer(link.connection, { type: 'closed' }); }
    else this.sendClient({ type: 'leave' });
    this.reset(100); this.state = empty(); this.listeners.clear();
  }
  private bindPeer(generation: number, opened: () => void) {
    const peer = this.peer!;
    peer.on('open', () => { if (generation === this.generation && !this.stopped) { this.update({ notice: '' }); opened(); } });
    peer.on('disconnected', () => {
      if (this.stopped) return;
      this.update({ notice: 'Signalisation interrompue. Les connexions P2P existantes peuvent continuer ; reconnexion en cours…' });
    });
    peer.on('error', raw => {
      if (generation !== this.generation || this.stopped) return;
      const error = raw as { type?: string };
      if (error.type === 'unavailable-id') { this.fail('Cet identifiant de salon est indisponible. Crée un nouveau salon.'); return; }
      if (!this.room && this.state.room) { this.lostHost(); return; }
      if (error.type === 'peer-unavailable') { this.fail('Salon introuvable ou hôte hors ligne. Vérifie le code et que son navigateur reste ouvert.'); return; }
      if (this.state.status === 'connecting') this.fail('Connexion PeerJS/WebRTC impossible. Vérifie le réseau, le pare-feu ou réessaie avec un autre réseau.');
      else this.update({ notice: 'Le service de signalisation rencontre un problème. Les connexions P2P peuvent continuer.' });
    });
    peer.on('close', () => { if (!this.stopped && generation === this.generation) this.fail(this.room ? 'La connexion PeerJS de l’hôte est fermée.' : 'L’hôte est déconnecté. Le salon n’est plus disponible.'); });
  }
  private acceptConnection(connection: DataPort) {
    // Bound unauthenticated channels as well as room seats.
    if (this.links.size >= 8) { connection.close(); return; }
    const link: Link = { connection, playerId: null, lastSeq: -1, lastSeen: this.now(), openedAt: this.now(), windowAt: this.now(), messages: 0 };
    this.links.set(connection, link);
    connection.on('data', raw => {
      if (this.stopped || !this.room || this.links.get(connection) !== link) return;
      const now = this.now();
      if (now - link.windowAt >= 1000) { link.windowAt = now; link.messages = 0; }
      if (++link.messages > 30) { this.dropLink(link); return; }
      const message = parseClient(raw);
      if (!message) { this.sendServer(connection, { type: 'reject', reason: 'invalid' }); this.linkClosed(link); setTimeout(() => connection.close(), 100); return; }
      if (message.seq <= link.lastSeq) return;
      link.lastSeq = message.seq; link.lastSeen = now;
      try {
        if (message.type === 'hello') {
          if (link.playerId) return;
          if (message.catalog !== CATALOG_ID) throw new RoomError('catalog', REFUSALS.catalog);
          link.playerId = this.room.join(message.name, message.token); this.broadcast(); return;
        }
        if (!link.playerId) throw new RoomError('invalid', 'Connexion non acceptée.');
        if (message.type === 'pong') return;
        // A late command from another round cannot mutate this lobby or match.
        if (message.gameId !== this.room.gameId) return;
        if (message.type === 'ready') this.room.ready(link.playerId, message.ready);
        if (message.type === 'pick') this.room.pick(link.playerId, message.gameId!, message.key, message.expected);
        if (message.type === 'rematch') this.room.rematch();
        if (message.type === 'leave') { this.room.leave(link.playerId); link.playerId = null; this.links.delete(connection); connection.close(); }
        this.broadcast();
      } catch (error) {
        if (!link.playerId) { this.sendServer(connection, { type: 'reject', reason: error instanceof RoomError ? error.reason : 'invalid' }); this.links.delete(connection); setTimeout(() => connection.close(), 100); }
        else { this.sendServer(connection, { type: 'error', message: ((error as Error).message || 'Choix refusé.').slice(0, 160) }); this.broadcast(); }
      }
    });
    connection.on('close', () => this.linkClosed(link));
    connection.on('error', () => { this.linkClosed(link); connection.close(); });
  }
  private linkClosed(link: Link) {
    if (this.stopped || !this.links.delete(link.connection) || !this.room) return;
    if (link.playerId) this.room.disconnect(link.playerId, this.now());
    this.broadcast();
  }
  private dropLink(link: Link) { this.linkClosed(link); link.connection.close(); }
  private connectHost() {
    if (this.stopped || !this.peer || this.peer.destroyed || this.peer.disconnected || this.hostConnection) return;
    const connection = this.peer.connect(peerIdForCode(this.code), { reliable: true, serialization: 'json' });
    this.hostConnection = connection; this.lastServerSeq = -1;
    const generation = this.generation;
    connection.on('open', () => {
      if (generation !== this.generation || connection !== this.hostConnection) { connection.close(); return; }
      this.lastHostSeen = this.now();
      this.sendClient({ type: 'hello', name: this.name, token: this.token, catalog: CATALOG_ID });
    });
    connection.on('data', raw => {
      if (this.stopped || generation !== this.generation || connection !== this.hostConnection) return;
      const message = parseServer(raw);
      if (!message) { this.fail('L’hôte a envoyé un message invalide ou incompatible.'); return; }
      if (message.seq <= this.lastServerSeq) return;
      this.lastServerSeq = message.seq; this.lastHostSeen = this.now();
      if (message.type === 'ping') { this.sendClient({ type: 'pong' }); return; }
      if (message.type === 'reject') { this.fail(REFUSALS[message.reason]); return; }
      if (message.type === 'closed') { this.fail(REFUSALS.closed); return; }
      if (message.type === 'error') { this.update({ error: message.message }); return; }
      if (message.room.code !== this.code) { this.fail('L’identifiant du salon reçu ne correspond pas.'); return; }
      this.reconnectUntil = 0;
      this.update({ status: 'connected', room: message.room, selfId: message.selfId, draft: message.draft, error: '', notice: '' });
    });
    const lost = () => { if (generation !== this.generation || connection !== this.hostConnection) return; this.hostConnection = null; if (!this.stopped) this.lostHost(); };
    connection.on('close', lost); connection.on('error', () => { lost(); connection.close(); });
  }
  private lostHost() {
    if (this.stopped) return;
    if (!this.state.room) { this.fail('Connexion au salon impossible. Le code peut être inexistant, le salon fermé ou le réseau incompatible avec WebRTC.'); return; }
    if (!this.reconnectUntil) this.reconnectUntil = this.now() + RECONNECT_MS;
    this.retryAt = this.now() + 1500;
    this.update({ status: 'reconnecting', notice: 'Connexion à l’hôte perdue. Tentative de retour pendant 30 secondes…' });
  }
  private startClock() {
    const startedAt = this.now();
    this.tick = setInterval(() => {
      if (this.stopped) return;
      const now = this.now();
      if (this.state.status === 'connecting' && now - startedAt > 20_000) { this.fail('Délai de connexion dépassé. Le salon ou le service PeerJS est indisponible.'); return; }
      if (this.peer?.disconnected && !this.peer.destroyed && now >= this.retryAt) { this.retryAt = now + 3000; try { this.peer.reconnect(); } catch { /* Retry while the session exists. */ } }
      if (this.room) {
        for (const link of [...this.links.values()]) if (!link.playerId ? now - link.openedAt > 8000 : now - link.lastSeen > 15_000) this.dropLink(link);
        if (this.room.expire(now)) this.broadcast();
        if (now - this.heartbeatAt >= 4000) { this.heartbeatAt = now; for (const link of this.links.values()) if (link.playerId) this.sendServer(link.connection, { type: 'ping' }); }
      } else {
        if (this.state.status === 'connected' && now - this.lastHostSeen > 15_000) { const old = this.hostConnection; this.hostConnection = null; old?.close(); this.lostHost(); }
        if (this.state.status === 'reconnecting') {
          if (now >= this.reconnectUntil) { this.fail('L’hôte est déconnecté ou injoignable. Le salon ne persiste pas après sa fermeture.'); return; }
          if (now >= this.retryAt) { this.retryAt = now + 3000; if (this.hostConnection && now - this.lastHostSeen > 6000) { const old = this.hostConnection; this.hostConnection = null; old.close(); } this.connectHost(); }
        }
      }
    }, 1000);
  }
  private hostAction(action: () => void) { try { action(); this.update({ error: '' }); this.broadcast(); } catch (error) { this.update({ error: (error as Error).message }); } }
  private broadcast() {
    if (!this.room || this.stopped) return;
    const room = this.room.view();
    this.update({ room, selfId: this.room.hostId, draft: this.room.ownDraft(this.room.hostId) });
    for (const link of this.links.values()) if (link.playerId && room.players.some(p => p.id === link.playerId)) this.sendServer(link.connection, { type: 'snapshot', room, selfId: link.playerId, draft: this.room.ownDraft(link.playerId) });
  }
  private sendServer(connection: DataPort, body: ServerBody) { if (connection.open) { try { connection.send(encode({ ...body, v: 1, seq: this.seq++, gameId: this.room?.gameId ?? null } as ServerMessage)); } catch { connection.close(); } } }
  private sendClient(body: ClientBody) {
    if (!this.hostConnection?.open) return;
    try { this.hostConnection.send(encode({ ...body, v: 1, seq: this.seq++, gameId: body.type === 'hello' ? null : this.state.room?.gameId ?? null } as ClientMessage)); } catch { this.hostConnection.close(); }
  }
  private fail(error: string) { this.reset(); this.update({ status: 'closed', error, notice: '' }); }
  private reset(flushDelay = 0) {
    this.stopped = true; this.generation++;
    if (this.tick) clearInterval(this.tick); this.tick = null;
    const connections = [this.hostConnection, ...[...this.links.values()].map(link => link.connection)];
    const peer = this.peer;
    this.hostConnection = null; this.links.clear(); this.peer = null; this.room = null;
    const cleanup = () => { connections.forEach(connection => connection?.close()); peer?.destroy(); };
    if (flushDelay) setTimeout(cleanup, flushDelay); else cleanup();
    this.seq = 0; this.lastServerSeq = -1; this.reconnectUntil = 0; this.retryAt = 0;
  }
}
type WithoutHeader<T> = T extends unknown ? Omit<T, 'v' | 'seq' | 'gameId'> : never;
type ClientBody = WithoutHeader<ClientMessage>;
type ServerBody = WithoutHeader<ServerMessage>;
