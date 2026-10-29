import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, Crown, Link, LogOut, Radio, ShieldCheck, Users, Wifi, WifiOff } from 'lucide-react';
import { RoomSession } from '../multiplayer/session';
import { cleanName, displayCode, invitationLink, normalizeCode, validCode } from '../multiplayer/codes';
import { readPreferences, writePreferences } from '../multiplayer/preferences';
import type { PlayerView, RoomMode, RoomView, SessionView } from '../multiplayer/types';
import type { StatKey } from '../types';
import { copyText } from '../utils/share';
import { scoreDraft } from '../game/scoring';
import { characters } from '../data/catalog';
import { Game } from './Game';
import { Results } from './Results';
import { Modal } from '../components/Modal';

function PlayerList({ room, selfId, compact = false }: { room: RoomView; selfId: string | null; compact?: boolean }) {
  return <ul className={`room-players ${compact ? 'compact-players' : ''}`} aria-label="Joueurs du salon">{room.players.map(player => <li key={player.id}><span className={`connection-dot ${player.connected ? 'online' : ''}`} aria-label={player.connected ? 'Connecté' : 'Déconnecté'} /><span className="player-name">{player.name}{player.id === selfId && <small>TOI</small>}{player.host && <Crown size={14} aria-label="Hôte" />}</span><span className={`player-status ${player.ready || player.progress === 6 ? 'is-ready' : ''}`}>{player.abandoned ? 'Abandon' : !player.connected ? 'Reconnexion…' : room.phase === 'lobby' ? player.ready ? 'Prêt' : 'Pas prêt' : player.progress === 6 ? 'Terminé' : `${player.progress}/6`}</span></li>)}</ul>;
}

function Standings({ room, selected, compare, onSelected, onCompare }: { room: RoomView; selected: string; compare: string; onSelected: (id: string) => void; onCompare: (id: string) => void }) {
  const leaders = room.results.filter(row => row.position === 1).map(row => room.players.find(p => p.id === row.playerId)!.name);
  return <section className="standings" aria-label="Classement multijoueur"><div className="victory-banner"><Crown size={24} /><div><span className="eyebrow">{leaders.length > 1 ? 'VICTOIRE PARTAGÉE' : 'VICTOIRE SHINOBI'}</span><h2>{leaders.join(' & ') || 'Partie terminée'}</h2></div></div><div className="standings-table" role="table" aria-label="Classement final"><div className="standings-row standings-labels" role="row"><span role="columnheader">RANG</span><span role="columnheader">JOUEUR</span><span role="columnheader">SCORE</span><span role="columnheader">VERDICT</span></div>{room.results.map(row => <div className={`standings-row ${row.position === 1 ? 'winner' : ''}`} role="row" key={row.playerId}><strong role="cell">{row.position === null ? '—' : `#${row.position}`}</strong><span role="cell">{room.players.find(p => p.id === row.playerId)!.name}</span><strong role="cell">{row.score === null ? '—' : row.score}<small>{row.score !== null && ' / 600'}</small></strong><span role="cell">{row.position === null ? 'Abandon' : row.position === 1 ? 'Gagnant' : 'Défaite'}</span></div>)}</div><div className="comparison-controls"><label>Afficher le draft<select value={selected} onChange={e => onSelected(e.target.value)}>{room.results.filter(r => r.draft).map(row => <option value={row.playerId} key={row.playerId}>{room.players.find(p => p.id === row.playerId)!.name}</option>)}</select></label><label>Comparer le radar avec<select value={compare} onChange={e => onCompare(e.target.value)}><option value="">Aucune comparaison</option>{room.results.filter(r => r.draft && r.playerId !== selected).map(row => <option value={row.playerId} key={row.playerId}>{room.players.find(p => p.id === row.playerId)!.name}</option>)}</select></label></div><p className="subtle">{room.mode === 'fair' ? 'Duel équitable : les mêmes six personnages, dans le même ordre.' : 'Tirages indépendants : le hasard influence davantage ce classement.'} Les égalités partagent la même position.</p></section>;
}

export function Multiplayer({ best, reduceMotion, onBack, onActiveChange }: { best: number; reduceMotion: boolean; onBack: () => void; onActiveChange: (active: boolean) => void }) {
  const [session] = useState(() => new RoomSession());
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [form, setForm] = useState<'menu' | 'create' | 'join'>(() => new URLSearchParams(location.search).has('room') ? 'join' : 'menu');
  const [name, setName] = useState(() => readPreferences().name);
  const [mode, setMode] = useState<RoomMode>(() => readPreferences().mode);
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('room') || '');
  const [localNotice, setLocalNotice] = useState('');
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [comparePlayer, setComparePlayer] = useState('');
  const { room } = state;
  const active = !!room && (state.status === 'connected' || state.status === 'reconnecting');
  useEffect(() => { onActiveChange(active); return () => onActiveChange(false); }, [active, onActiveChange]);
  useEffect(() => () => session.dispose(), [session]);
  useEffect(() => {
    if (room && active) { const url = new URL(location.href); url.searchParams.set('room', room.code); history.replaceState(null, '', url); writePreferences({ name, mode: room.mode }); }
  }, [room?.code, room?.mode, active, name]);
  useEffect(() => {
    if (!active) return;
    const listener = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', listener); return () => window.removeEventListener('beforeunload', listener);
  }, [active]);
  const place = useCallback((key: StatKey, expected: string) => session.pick(key, expected), [session]);
  const auto = useCallback((expected: string) => session.auto(expected), [session]);
  const quit = useCallback(() => setLeaveConfirm(true), []);
  async function copy(value: string, label: string) { try { await copyText(value); setLocalNotice(`${label} copié !`); } catch { setLocalNotice('Copie bloquée. Sélectionne le champ ci-dessous et copie-le manuellement.'); } }
  function leave() { session.leave(); setLeaveConfirm(false); clearInvite(); setForm('menu'); }
  function connect() { setLocalNotice(''); writePreferences({ name, mode }); if (form === 'create') void session.create(name, mode); else void session.join(name, code); }
  const me = room?.players.find(p => p.id === state.selfId);
  const banner = <NetworkBanner state={state} />;
  const leaveDialog = leaveConfirm && <Modal title={me?.host ? 'Fermer le salon ?' : 'Quitter le salon ?'} onClose={() => setLeaveConfirm(false)}><p>{me?.host ? 'Tous les invités seront déconnectés. Le salon disparaît quand son hôte le ferme.' : 'Ta place sera libérée. Un départ pendant le draft compte comme un abandon.'}</p><div className="modal-actions"><button className="secondary" onClick={() => setLeaveConfirm(false)}>Rester</button><button className="primary" onClick={leave}>Quitter le salon<LogOut size={17} /></button></div></Modal>;
  if (active && room && me) {
    if (room.phase === 'draft' && state.draft) {
      const finished = room.players.filter(p => p.progress === 6).length;
      const strip = <section className="multiplayer-strip" aria-label="Avancement du salon"><div><Radio size={17} /><span>{room.mode === 'fair' ? 'Duel équitable' : 'Tirages indépendants'}<strong>{finished}/{room.players.length} drafts terminés</strong></span></div><PlayerList room={room} selfId={me.id} compact /></section>;
      return <>{banner}{strip}{me.progress === 6 ? <main id="main" className="waiting-main"><span className="waiting-seal" aria-hidden="true">忍</span><span className="eyebrow">TON ÉQUIPE EST VERROUILLÉE</span><h1>Draft terminé.</h1><p>En attente des autres joueurs.</p><p className="subtle">Les notes et les choix adverses restent secrets jusqu’à la révélation commune. Un joueur déconnecté dispose de 30 secondes pour revenir.</p><button className="secondary" onClick={quit}><LogOut size={16} /> Quitter le salon</button></main> : <Game key={`${room.gameId}:${state.error}`} draft={state.draft} onPlace={place} onAuto={auto} onRestart={quit} multiplayer paused={state.status !== 'connected'} reduceMotion={reduceMotion} />}{leaveDialog}</>;
    }
    if (room.phase === 'results') {
      const available = room.results.filter(r => r.draft);
      const selected = available.find(r => r.playerId === selectedPlayer) || available.find(r => r.playerId === me.id) || available[0];
      const compared = available.find(r => r.playerId === comparePlayer && r.playerId !== selected?.playerId);
      const player = selected && room.players.find(p => p.id === selected.playerId)!;
      if (selected?.draft && player) return <>{banner}<Results key={`${room.gameId}:${selected.playerId}`} draft={selected.draft} best={best} playerName={player.name} reduceMotion={reduceMotion} playLabel="Rejouer ensemble" onPlay={() => { setSelectedPlayer(''); setComparePlayer(''); session.rematch(); }} comparison={compared?.draft ? { name: room.players.find(p => p.id === compared.playerId)!.name, values: scoreDraft(compared.draft, characters).rows.map(row => row.value), color: '#68d5e8' } : undefined} beforeResults={<><Standings room={room} selected={selected.playerId} compare={compared?.playerId || ''} onSelected={id => { setSelectedPlayer(id); if (id === comparePlayer) setComparePlayer(''); }} onCompare={setComparePlayer} /><button className="text-button" onClick={quit}><LogOut size={15} /> Quitter le salon</button></>} />{leaveDialog}</>;
    }
    return <>{banner}<main id="main" className="multiplayer-main"><div className="room-top"><div><span className="eyebrow">SALON PRIVÉ · 2 À 4 JOUEURS</span><h1>L’équipe se rassemble.</h1></div><button className="secondary" onClick={quit}><LogOut size={16} />{me.host ? 'Fermer' : 'Quitter'}</button></div><div className="lobby-layout"><section className="lobby-panel"><span className="eyebrow muted">INVITE TES AMIS</span><label className="room-code-label">CODE DU SALON<input className="room-code" readOnly value={displayCode(room.code)} onFocus={e => e.target.select()} /></label><div className="invite-actions"><button className="secondary" onClick={() => void copy(displayCode(room.code), 'Code')}><Copy size={15} /> Copier le code</button><button className="secondary" onClick={() => void copy(invitationLink(room.code), 'Lien')}><Link size={15} /> Copier le lien</button></div><label className="invite-field">Lien d’invitation<input readOnly value={invitationLink(room.code)} onFocus={e => e.target.select()} /></label><p className="subtle">Sur deux appareils, utilisez l’adresse GitHub Pages du jeu. Une adresse 127.0.0.1 désigne uniquement l’ordinateur qui l’ouvre.</p><p className="share-notice" role="status">{localNotice}</p><div className="room-roster-heading"><h2>Joueurs</h2><span>{room.players.length}/4 · {4 - room.players.length} place(s) libre(s)</span></div><PlayerList room={room} selfId={me.id} /><button className={me.ready ? 'secondary ready-button' : 'primary ready-button'} onClick={() => session.ready(!me.ready)} disabled={state.status !== 'connected'}><Check size={17} /> {me.ready ? 'Prêt — annuler' : 'Je suis prêt'}</button></section><section className="lobby-panel"><span className="eyebrow muted">RÈGLES DU SALON</span><h2>Deux façons de rivaliser.</h2><ModeCards mode={room.mode} disabled={!me.host || state.status !== 'connected'} onChange={value => { session.setMode(value); setMode(value); }} /><p className="subtle">{me.host ? 'Changer de mode remet tous les joueurs en « Pas prêt ».' : 'L’hôte choisit le mode et lance la partie.'}</p>{me.host ? <button className="primary full" disabled={room.players.length < 2 || !room.players.every(p => p.ready && p.connected) || state.status !== 'connected'} onClick={() => session.start()}>Démarrer le draft<ArrowRight size={18} /></button> : <p className="host-wait"><span className="spinner" /> En attente du lancement par l’hôte</p>}<p className="privacy-note"><ShieldCheck size={18} /> P2P temporaire : gardez cette page ouverte. Aucun compte, aucune base de données. La connexion n’est pas garantie sur tous les réseaux.</p></section></div></main>{leaveDialog}</>;
  }
  return <main id="main" className="multiplayer-main"><button className="text-button back" onClick={() => { if (form === 'menu') { clearInvite(); onBack(); } else { if (state.status === 'connecting') session.leave(); setForm('menu'); } }}><ArrowLeft size={16} /> {form === 'menu' ? 'Retour à l’accueil' : 'Retour'}</button><span className="eyebrow">LE DRAFT SE JOUE AUSSI ENTRE AMIS</span><h1>Vos ninjas. Votre rivalité.</h1><p className="multiplayer-intro">Deux à quatre joueurs, un salon privé, six choix pour faire la différence.</p>{banner}
    {form === 'menu' ? <div className="multiplayer-menu"><button className="multiplayer-option" onClick={() => { setForm('create'); setLocalNotice(''); }}><Crown size={28} /><h2>Créer un salon</h2><p>Deviens l’hôte et invite tes amis.</p><ArrowRight size={19} /></button><button className="multiplayer-option" onClick={() => { setForm('join'); setLocalNotice(''); }}><Users size={28} /><h2>Rejoindre un salon</h2><p>Un code suffit pour entrer dans le draft.</p><ArrowRight size={19} /></button></div> : <form className="connection-form lobby-panel" onSubmit={event => { event.preventDefault(); connect(); }}><h2>{form === 'create' ? 'Ton salon commence ici.' : 'Retrouve ton équipe.'}</h2><label>Ton pseudo<input required autoComplete="nickname" maxLength={24} value={name} onChange={e => setName(e.target.value)} placeholder="Ex. Baptiste" disabled={state.status === 'connecting'} /></label>{form === 'join' ? <label>Code du salon<input required maxLength={18} autoCapitalize="characters" autoComplete="off" spellCheck={false} value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX" disabled={state.status === 'connecting'} /><small>12 caractères, avec ou sans tirets.</small></label> : <ModeCards mode={mode} disabled={state.status === 'connecting'} onChange={setMode} />}<button className="primary full" type="submit" disabled={!cleanName(name) || form === 'join' && !validCode(code) || state.status === 'connecting'}>{state.status === 'connecting' ? <><span className="spinner" /> Connexion…</> : <>{form === 'create' ? 'Créer mon salon' : 'Rejoindre le salon'}<ArrowRight size={18} /></>}</button>{state.status === 'connecting' && <button type="button" className="text-button" onClick={() => session.leave()}>Annuler la connexion</button>}</form>}
    <p className="network-explanation"><Wifi size={19} /> Le multijoueur charge PeerJS puis contacte sa signalisation gratuite. Les échanges du jeu passent par WebRTC entre navigateurs. Certains NAT ou pare-feu empêchent la connexion ; aucun relais TURN payant n’est utilisé.</p>
  </main>;
}
function ModeCards({ mode, onChange, disabled }: { mode: RoomMode; onChange: (mode: RoomMode) => void; disabled?: boolean }) {
  return <div className="mode-cards" role="group" aria-label="Mode multijoueur">{([{ id: 'fair', title: 'Duel équitable', description: 'Les mêmes six personnages, dans le même ordre. Seule votre répartition fait la différence.' }, { id: 'random', title: 'Tirages indépendants', description: 'Un tirage personnel pour chacun. Ce mode est davantage influencé par la chance.' }] as const).map(item => <button key={item.id} type="button" className={`mode-card ${mode === item.id ? 'selected' : ''}`} aria-pressed={mode === item.id} disabled={disabled} onClick={() => onChange(item.id)}><span className="mode-radio">{mode === item.id && <Check size={12} />}</span><span><strong>{item.title}</strong><small>{item.description}</small></span></button>)}</div>;
}
function NetworkBanner({ state }: { state: SessionView }) {
  if (!state.error && !state.notice) return null;
  return <div className={`network-banner ${state.error ? 'network-error' : ''}`} role={state.error ? 'alert' : 'status'}>{state.error ? <WifiOff size={18} /> : <Radio size={18} />}<span>{state.error || state.notice}</span></div>;
}
function clearInvite() { const url = new URL(location.href); url.searchParams.delete('room'); history.replaceState(null, '', url); }
