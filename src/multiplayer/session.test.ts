import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DataPort, PeerConstructor, PeerPort } from './peer';
import { RoomSession } from './session';
import { STAT_KEYS } from '../types';

type Listener = (value?: unknown) => void;
class Events {
  private handlers = new Map<string, Listener[]>();
  on(event: string, callback: Listener) { this.handlers.set(event, [...this.handlers.get(event) || [], callback]); return this; }
  emit(event: string, data?: unknown) { this.handlers.get(event)?.forEach(fn => fn(data)); }
}
class MockChannel extends Events implements DataPort {
  open = true;
  remote!: MockChannel;
  frames: string[] = [];
  constructor(public peer: string) { super(); }
  send(data: string) { this.frames.push(data); queueMicrotask(() => { if (this.remote.open) this.remote.emit('data', data); }); }
  close() { if (!this.open) return; this.open = false; this.emit('close'); if (this.remote.open) { this.remote.open = false; this.remote.emit('close'); } }
}
function mockNetwork() {
  const registry = new Map<string, FakePeer>();
  const channels: MockChannel[] = [];
  class FakePeer extends Events implements PeerPort {
    id: string; destroyed = false; disconnected = false;
    constructor(id?: string) { super(); this.id = id || crypto.randomUUID(); registry.set(this.id, this); queueMicrotask(() => this.emit('open', this.id)); }
    connect(id: string) {
      const host = registry.get(id); const local = new MockChannel(id); const remote = new MockChannel(this.id); local.remote = remote; remote.remote = local; channels.push(local, remote);
      queueMicrotask(() => {
        if (!host) { this.emit('error', { type: 'peer-unavailable' }); return; }
        host.emit('connection', remote); local.emit('open'); remote.emit('open');
      });
      return local;
    }
    destroy() { this.destroyed = true; registry.delete(this.id); for (const channel of channels) if (channel.peer === this.id) channel.close(); this.emit('close'); }
    reconnect() { this.disconnected = false; this.emit('open', this.id); }
  }
  return { Peer: FakePeer as unknown as PeerConstructor, registry, channels };
}
const sessions: RoomSession[] = [];
const settle = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
afterEach(() => { for (const session of sessions.splice(0)) session.dispose(); vi.useRealTimers(); });

async function group(count = 2) {
  const network = mockNetwork();
  const create = () => { const session = new RoomSession(async () => network.Peer, () => Date.now(), () => crypto.randomUUID().replaceAll('-', '')); sessions.push(session); return session; };
  const host = create(); await host.create('Hôte'); await settle();
  const guests: RoomSession[] = [];
  for (let i = 1; i < count; i++) { const guest = create(); guests.push(guest); await guest.join(`Invité ${i}`, host.getSnapshot().room!.code); await settle(); }
  return { host, guests, create, network };
}
async function finish(session: RoomSession) {
  for (const key of STAT_KEYS.slice(0, 5)) {
    const draft = session.getSnapshot().draft!;
    session.pick(key, draft.deck[Object.keys(draft.picks).length]); await settle();
  }
  session.auto(session.getSnapshot().draft!.deck[5]); await settle();
}
describe('Transport PeerJS avec connexions simulées injectées', () => {
  it('supporte le nettoyage puis remontage de React StrictMode sans faux départ de salon', async () => {
    const network = mockNetwork(); const session = new RoomSession(async () => network.Peer); sessions.push(session);
    session.dispose(); expect(session.getSnapshot().status).toBe('idle'); expect(session.getSnapshot().notice).toBe('');
    await session.create('Hôte'); await settle(); expect(session.getSnapshot().status).toBe('connected');
  });
  it('accepte les invités et synchronise la liste et le statut prêt', async () => {
    const { host, guests } = await group(3);
    expect(host.getSnapshot().room!.players).toHaveLength(3);
    expect(guests[1].getSnapshot().room!.players).toEqual(host.getSnapshot().room!.players);
    guests[0].ready(true); await settle();
    expect(host.getSnapshot().room!.players[1].ready).toBe(true);
    expect(guests[1].getSnapshot().room!.players[1].ready).toBe(true);
  });
  it('déroule le match commun, attend les autres, révèle puis réinitialise le salon', async () => {
    const { host, guests: [guest] } = await group();
    host.ready(true); guest.ready(true); await settle(); host.start(); await settle();
    expect(guest.getSnapshot().draft!.deck).toEqual(host.getSnapshot().draft!.deck);
    await finish(host); expect(host.getSnapshot().room!.phase).toBe('draft');
    expect(guest.getSnapshot().room!.results).toEqual([]);
    await finish(guest); expect(host.getSnapshot().room!.phase).toBe('results');
    expect(guest.getSnapshot().room!.results).toEqual(host.getSnapshot().room!.results);
    guest.rematch(); await settle(); expect(host.getSnapshot().room!.phase).toBe('lobby');
    expect(guest.getSnapshot().draft).toBeNull(); expect(host.getSnapshot().room!.players.every(p => !p.ready)).toBe(true);
  });
  it('refuse le cinquième joueur et les connexions après lancement', async () => {
    const { host, guests, create } = await group(4);
    const extra = create(); await extra.join('Cinquième', host.getSnapshot().room!.code); await settle();
    expect(extra.getSnapshot().error).toContain('complet');
    host.ready(true); guests.forEach(guest => guest.ready(true)); await settle(); host.start(); await settle();
    const late = create(); await late.join('Retardataire', host.getSnapshot().room!.code); await settle();
    expect(late.getSnapshot().error).toContain('commencé');
  });
  it('ignore les messages dupliqués ou obsolètes et ne compte pas deux choix', async () => {
    const { host, guests: [guest], network } = await group();
    host.ready(true); guest.ready(true); await settle(); host.start(); await settle();
    guest.pick('strength', guest.getSnapshot().draft!.deck[0]); await settle();
    const channel = network.channels[0];
    const pick = channel.frames.find(raw => JSON.parse(raw).type === 'pick')!;
    channel.send(pick); await settle(); expect(guest.getSnapshot().room!.players[1].progress).toBe(1);
    const stale = { ...JSON.parse(pick), seq: 500, gameId: 'old-game' }; channel.send(JSON.stringify(stale)); await settle();
    expect(host.getSnapshot().room!.players[1].progress).toBe(1);
  });
  it('rejette un client au protocole incompatible sans modifier le salon', async () => {
    const { host, guests: [guest], network } = await group();
    network.channels[0].send(JSON.stringify({ v: 100, type: 'ready', seq: 99, gameId: null, ready: true })); await settle();
    expect(guest.getSnapshot().status).toBe('closed');
    expect(host.getSnapshot().room!.players[1].ready).toBe(false);
  });
  it('ferme proprement les invités quand l’hôte ferme le salon', async () => {
    const { host, guests: [guest] } = await group(); host.leave(); await settle();
    expect(guest.getSnapshot().status).toBe('closed'); expect(guest.getSnapshot().error).toContain('fermé');
  });
  it('signale la perte du canal puis rétablit une vraie nouvelle connexion simulée', async () => {
    vi.useFakeTimers();
    const { host, guests: [guest], network } = await group();
    network.channels[0].close(); await settle();
    expect(guest.getSnapshot().status).toBe('reconnecting');
    expect(host.getSnapshot().room!.players[1].connected).toBe(false);
    expect(network.channels).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(2100); await settle();
    expect(network.channels).toHaveLength(4);
    expect(guest.getSnapshot().status).toBe('connected');
    expect(host.getSnapshot().room!.players[1].connected).toBe(true);
  });
  it('termine les tentatives si le navigateur de l’hôte disparaît', async () => {
    vi.useFakeTimers();
    const { host, guests: [guest], network } = await group();
    network.registry.values().next().value!.destroy(); await settle();
    expect(guest.getSnapshot().status).toBe('reconnecting');
    await vi.advanceTimersByTimeAsync(31_000); await settle();
    expect(guest.getSnapshot().status).toBe('closed');
    expect(guest.getSnapshot().error).toContain('hôte');
    expect(host.getSnapshot().status).toBe('closed');
  });
});
