import { describe, expect, it, vi } from 'vitest';
import { characters } from '../data/catalog';
import { STAT_KEYS } from '../types';
import { HostRoom, RECONNECT_MS, rankStandings } from './room';
import { createCode, displayCode, invitationLink, normalizeCode, peerIdForCode, validCode } from './codes';
import { CATALOG_ID, MAX_MESSAGE_BYTES, encode, parseClient, parseServer } from './protocol';

const token = () => crypto.randomUUID().replaceAll('-', '');
function setup(count = 2) {
  const room = new HostRoom('Hôte', characters);
  const players = [room.hostId]; for (let i = 1; i < count; i++) players.push(room.join(`Joueur ${i}`, token()));
  return { room, players };
}
function start(room: HostRoom, players: string[]) { players.forEach(id => room.ready(id, true)); room.start(); }
function finishPlayer(room: HostRoom, id: string) { for (const key of STAT_KEYS) { const draft = room.ownDraft(id)!; room.pick(id, room.gameId!, key, draft.deck[Object.keys(draft.picks).length]); } }
describe('Codes de salons privés', () => {
  it('génère des codes réels de 12 caractères avec une grande entropie', () => {
    const codes = Array.from({ length: 200 }, createCode);
    expect(new Set(codes).size).toBe(200); expect(codes.every(validCode)).toBe(true);
    const code = codes[0]; expect(normalizeCode(displayCode(code))).toBe(code);
    expect(peerIdForCode(displayCode(code))).toContain(code);
  });
  it('refuse les caractères ambigus et les codes incorrects', () => {
    for (const code of ['', 'ABC123', '000000000000', 'IIIIIIIIIIII', '<script>', 'A'.repeat(13)]) expect(validCode(code)).toBe(false);
    expect(validCode('abcd-efgh-jkmn')).toBe(true);
  });
  it('préserve le sous-chemin GitHub Pages sans route serveur', () => {
    expect(invitationLink('ABCDEFGHJKMN', 'https://example.github.io/naruto-stat-draft/?old=x#foo')).toBe('https://example.github.io/naruto-stat-draft/?room=ABCDEFGHJKMN');
  });
});
describe('Salons coordonnés par l’hôte', () => {
  it('crée un hôte, synchronise les participants et leurs statuts', () => {
    const { room, players } = setup(4);
    expect(room.view().players).toHaveLength(4); expect(room.view().players[0].host).toBe(true);
    room.ready(players[1], true); expect(room.view().players[1].ready).toBe(true);
    const view = room.view(); view.players[0].name = 'modifié'; expect(room.view().players[0].name).toBe('Hôte');
    expect(JSON.stringify(view)).not.toContain('token');
  });
  it('refuse un salon complet, commencé, fermé ou un pseudo invalide', () => {
    const { room, players } = setup(4);
    expect(() => room.join('Cinquième', token())).toThrow('complet');
    expect(() => room.join('', token())).toThrow(); start(room, players);
    expect(() => room.join('Retard', token())).toThrow('commencé'); room.close();
    expect(() => room.join('Retard', token())).toThrow('fermé');
  });
  it('exige deux joueurs connectés et tous prêts', () => {
    const alone = setup(1); alone.room.ready(alone.players[0], true); expect(() => alone.room.start()).toThrow();
    const { room, players } = setup(); expect(() => room.start()).toThrow(); room.ready(players[0], true); expect(() => room.start()).toThrow();
    room.ready(players[1], true); room.disconnect(players[1], 0); expect(() => room.start()).toThrow();
  });
  it.each([2, 3, 4])('distribue un duel équitable à %s joueurs', count => {
    const { room, players } = setup(count); start(room, players);
    const deck = room.ownDraft(players[0])!.deck;
    expect(new Set(deck).size).toBe(6); players.forEach(id => expect(room.ownDraft(id)!.deck).toEqual(deck));
    expect(room.view().results).toEqual([]); expect(JSON.stringify(room.view())).not.toContain('deck');
  });
  it('effectue des tirages indépendants et réinitialise l’accord après changement de mode', () => {
    const { room, players } = setup(4); players.forEach(id => room.ready(id, true));
    room.setMode('random'); expect(room.view().players.every(p => !p.ready)).toBe(true);
    start(room, players); players.forEach(id => expect(new Set(room.ownDraft(id)!.deck).size).toBe(6));
    expect(room.view().mode).toBe('random');
  });
  it('appelle le générateur une fois par joueur en mode indépendant', () => {
    let offset = 0;
    const draw = vi.fn((ids: readonly string[]) => ids.slice(offset++, offset + 5));
    const room = new HostRoom('Hôte', characters, createCode(), draw);
    const players = [room.hostId, room.join('Ami', token()), room.join('Autre ami', token())];
    room.setMode('random'); start(room, players);
    expect(draw).toHaveBeenCalledTimes(3);
    expect(room.ownDraft(players[0])!.deck).not.toEqual(room.ownDraft(players[1])!.deck);
  });
  it('refuse les choix illégaux, occupés et les identifiants de partie périmés', () => {
    const { room, players } = setup(); start(room, players); const id = players[0], deck = room.ownDraft(id)!.deck;
    expect(() => room.pick(id, 'old-round', 'strength', deck[0])).toThrow();
    expect(() => room.pick(id, room.gameId!, 'strength', deck[1])).toThrow();
    room.pick(id, room.gameId!, 'strength', deck[0]);
    expect(() => room.pick(id, room.gameId!, 'strength', deck[1])).toThrow();
    expect(() => room.pick(id, room.gameId!, 'speed', deck[0])).toThrow();
  });
  it('attend tout le monde puis recalcule et révèle les scores', () => {
    const { room, players } = setup(); start(room, players);
    finishPlayer(room, players[0]); expect(room.phase).toBe('draft'); expect(room.view().results).toEqual([]);
    finishPlayer(room, players[1]); expect(room.phase).toBe('results');
    const results = room.view().results; expect(results).toHaveLength(2); expect(results[0].score).toBe(results[1].score);
    expect(results.map(r => r.position)).toEqual([1, 1]);
    expect(() => room.pick(players[0], room.gameId!, 'strength', 'naruto-uzumaki')).toThrow();
  });
  it('gère les égalités avec les positions 1, 1, 3 et place les abandons après', () => {
    const rows = rankStandings([{ playerId: 'a', score: 450, draft: null }, { playerId: 'b', score: null, draft: null }, { playerId: 'c', score: 400, draft: null }, { playerId: 'd', score: 450, draft: null }]);
    expect(rows.map(r => r.position)).toEqual([1, 1, 3, null]);
  });
  it('permet une vraie reprise avec le jeton, puis abandonne après le délai', () => {
    const room = new HostRoom('Hôte', characters); const secret = token(); const id = room.join('Invité', secret);
    start(room, [room.hostId, id]); const draft = room.ownDraft(id)!;
    room.pick(id, room.gameId!, 'speed', draft.deck[0]); room.disconnect(id, 100);
    expect(room.join('Invité', secret)).toBe(id); expect(room.ownDraft(id)!.picks.speed).toBe(draft.deck[0]);
    expect(() => room.join('Usurpation', secret)).toThrow('déjà connecté');
    room.disconnect(id, 200); room.expire(200 + RECONNECT_MS - 1); expect(room.view().players[1].abandoned).toBe(false);
    room.expire(200 + RECONNECT_MS); expect(room.view().players[1].abandoned).toBe(true);
    expect(() => room.join('Invité', secret)).toThrow('dépassé'); finishPlayer(room, room.hostId);
    expect(room.phase).toBe('results'); expect(room.view().results[1].score).toBeNull();
  });
  it('libère une place au lobby, ferme le salon et revient au lobby après les résultats', () => {
    const { room, players } = setup(3); room.leave(players[2]); expect(room.view().players).toHaveLength(2);
    start(room, players.slice(0, 2)); players.slice(0, 2).forEach(id => finishPlayer(room, id));
    const gameId = room.gameId; room.rematch(); expect(room.phase).toBe('lobby'); expect(room.gameId).toBeNull();
    expect(room.view().players.every(p => !p.ready && p.progress === 0)).toBe(true);
    start(room, players.slice(0, 2)); expect(room.gameId).not.toBe(gameId);
    room.leave(room.hostId); expect(room.phase).toBe('closed');
  });
});
describe('Protocole réseau borné et versionné', () => {
  const hello = { v: 1 as const, seq: 0, gameId: null, type: 'hello' as const, name: 'Naruto', token: 'a'.repeat(32), catalog: CATALOG_ID };
  it('valide les messages et refuse versions, types, séquences et champs invalides', () => {
    expect(parseClient(encode(hello))).toEqual(hello);
    for (const m of [{ ...hello, v: 2 }, { ...hello, seq: -1 }, { ...hello, seq: 1.1 }, { ...hello, name: 'x'.repeat(25) }, { ...hello, token: 'secret' }, { ...hello, type: 'score', score: 600 }, { ...hello, gameId: 'game' }]) expect(parseClient(JSON.stringify(m))).toBeNull();
    expect(parseClient('x'.repeat(MAX_MESSAGE_BYTES + 1))).toBeNull(); expect(parseClient({ type: 'hello' })).toBeNull(); expect(parseClient('{')).toBeNull();
  });
  it('valide les snapshots et refuse les scores et classements falsifiés', () => {
    const { room, players } = setup(); start(room, players); players.forEach(id => finishPlayer(room, id));
    const snapshot = { v: 1 as const, seq: 3, gameId: room.gameId, type: 'snapshot' as const, room: room.view(), selfId: room.hostId, draft: room.ownDraft(room.hostId) };
    expect(parseServer(encode(snapshot))).not.toBeNull();
    const wrong = structuredClone(snapshot); wrong.room.results[0].score = 600;
    expect(parseServer(JSON.stringify(wrong))).toBeNull();
    const wrongRank = structuredClone(snapshot); wrongRank.room.results[0].position = 4;
    expect(parseServer(JSON.stringify(wrongRank))).toBeNull();
    const wrongVersion = { ...snapshot, v: 9 }; expect(parseServer(JSON.stringify(wrongVersion))).toBeNull();
  });
  it('rejette les decks inconnus, joueurs dupliqués et choix divulgués avant la fin', () => {
    const { room, players } = setup(); start(room, players);
    const snapshot = { v: 1 as const, seq: 1, gameId: room.gameId, type: 'snapshot' as const, room: room.view(), selfId: room.hostId, draft: room.ownDraft(room.hostId) };
    snapshot.room.players.push(snapshot.room.players[0]); expect(parseServer(JSON.stringify(snapshot))).toBeNull();
    snapshot.room.players.pop(); snapshot.draft!.deck[0] = 'unknown'; expect(parseServer(JSON.stringify(snapshot))).toBeNull();
    expect(parseClient(JSON.stringify({ v: 1, seq: 0, gameId: room.gameId, type: 'pick', key: 'magic', expected: 'naruto-uzumaki' }))).toBeNull();
  });
});
