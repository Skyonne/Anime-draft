import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, LockKeyhole, RotateCcw } from 'lucide-react';
import type { Draft, StatKey } from '../types';
import { STATS } from '../data/stats';
import { characterById } from '../data/catalog';
import { turn } from '../game/engine';
import { StatIcon } from '../components/StatIcon';
import { CharacterCard } from '../components/CharacterCard';

export function Game({ draft, onPlace, onAuto, onRestart, reduceMotion, multiplayer = false, paused = false }: { draft: Draft; onPlace: (key: StatKey, expected: string) => void; onAuto: (expected: string) => void; onRestart: () => void; reduceMotion: boolean; multiplayer?: boolean; paused?: boolean }) {
  const count = turn(draft);
  const current = characterById.get(draft.deck[count])!;
  const [selected, setSelected] = useState<StatKey | null>(null);
  const [locking, setLocking] = useState(false);
  const guard = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    setSelected(null); setLocking(false); guard.current = false;
    heading.current?.focus();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [current.id, paused]);
  useEffect(() => {
    if (count !== 5 || paused) return;
    const id = setTimeout(() => onAuto(current.id), reduceMotion ? 150 : 1700);
    return () => clearTimeout(id);
  }, [count, current.id, onAuto, reduceMotion, paused]);
  function confirm() {
    if (!selected || guard.current || paused) return;
    guard.current = true; setLocking(true);
    const key = selected;
    timer.current = setTimeout(() => onPlace(key, current.id), reduceMotion ? 0 : 440);
  }
  return <main id="main" className="game-main">
    <div className="draft-top"><div><span className="eyebrow">{multiplayer ? 'DRAFT MULTIJOUEUR' : 'TON ÉQUIPE PREND FORME'}</span><h1 ref={heading} tabIndex={-1}>À chaque ninja, sa voie.</h1></div><button className="secondary compact" aria-label={multiplayer ? 'Quitter le salon' : 'Recommencer'} onClick={onRestart}><RotateCcw size={16} /><span>{multiplayer ? 'Quitter le salon' : 'Recommencer'}</span></button></div>
    <div className="progress-head"><span>DRAFT EN COURS <span className="live-dot" /></span><span>TOUR <strong>{count + 1}</strong> / 6</span></div><div className="progress-track" role="progressbar" aria-label="Statistiques affectées" aria-valuenow={count} aria-valuemin={0} aria-valuemax={6}>{Array.from({ length: 6 }, (_, index) => <span className={index < count ? 'done' : index === count ? 'current' : ''} key={index} />)}</div>
    <div className="draft-layout"><section className="draft-character"><CharacterCard character={current} automatic={count === 5} /><div className="character-footnote"><span>0{count + 1} <span>/ 06</span></span><p>Fais confiance à tes connaissances.<br />Les notes seront révélées à la fin.</p></div></section>
      <section className="draft-choices" aria-label="Affectation du personnage"><div className="choice-heading"><span className="eyebrow">{count === 5 ? 'LE DERNIER CHOIX S’IMPOSE' : 'CHOISIS SA MEILLEURE STATISTIQUE'}</span><p>{count === 5 ? 'Le sixième ninja rejoint automatiquement la dernière voie.' : <>Où placer <strong>{current.name}</strong> ?</>}</p></div>
        <div className="choices-grid">{STATS.map((stat, index) => {
          const occupied = draft.picks[stat.key]; const chosen = selected === stat.key || (count === 5 && !occupied);
          return <button key={stat.key} className={`choice-card ${occupied ? 'occupied' : ''} ${chosen ? 'selected' : ''} ${chosen && locking ? 'locking' : ''}`} disabled={!!occupied || locking || count === 5 || paused} aria-pressed={chosen} onClick={() => setSelected(stat.key)}><span className="choice-top"><span className="stat-icon"><StatIcon stat={stat.key} /></span><span className="choice-status">{occupied ? <LockKeyhole size={14} /> : chosen ? <Check size={16} /> : `0${index + 1}`}</span></span><strong>{stat.label}</strong><span className="choice-description">{occupied ? characterById.get(occupied)!.name : chosen ? 'Prêt à verrouiller' : stat.description}</span><span className="choice-bottom">{occupied ? 'VERROUILLÉ' : chosen ? 'SÉLECTIONNÉ' : 'DISPONIBLE'}{!occupied && <ArrowRight size={13} />}</span></button>;
        })}</div>
        <div className="confirmation" aria-live="polite">{paused ? <p>Reconnexion en cours, choix en pause…</p> : count === 5 ? <div className="auto-message"><span className="spinner" /> Affectation automatique…</div> : <><p><LockKeyhole size={15} /> {selected ? 'Ce choix sera définitif.' : 'Sélectionne une statistique disponible.'}</p><button className="primary" disabled={!selected || locking} onClick={confirm}>{locking ? 'Choix verrouillé' : 'Verrouiller mon choix'}{locking ? <Check size={18} /> : <ArrowRight size={18} />}</button></>}</div>
      </section></div>
  </main>;
}
