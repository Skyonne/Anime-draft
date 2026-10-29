import { ArrowRight, CircleHelp, Trophy, Users, Crosshair, LockKeyhole, Check, UsersRound } from 'lucide-react';
import { STATS } from '../data/stats';
import { characters, characterById } from '../data/catalog';
import { StatIcon } from '../components/StatIcon';
import { Portrait } from '../components/Portrait';
import type { SaveData } from '../types';

export function Home({ save, onPlay, onResume, onHelp, onCatalog, onMultiplayer }: { save: SaveData; onPlay: () => void; onResume: () => void; onHelp: () => void; onCatalog: () => void; onMultiplayer: () => void }) {
  const resume = save.draft && Object.keys(save.draft.picks).length < 6;
  return <main id="main" className="home-main">
    <section className="hero">
      <div className="hero-copy enter"><span className="eyebrow"><span className="live-dot" /> LE DRAFT DES SHINOBI</span><h1>Six ninjas.<br />Six choix.<br /><em>Ta légende.</em></h1>
        <p className="hero-description">Le bon ninja, à la bonne place. Compose ton équipe idéale sans connaître ses notes. Ton instinct fera la différence.</p>
        <div className="hero-actions"><button className="primary" onClick={resume ? onResume : onPlay}>{resume ? 'Reprendre le draft' : 'Jouer'}<ArrowRight size={19} /></button><button className="secondary" onClick={onHelp}><CircleHelp size={17} /> Comment jouer</button></div>
        <button className="multiplayer-home" onClick={onMultiplayer}><UsersRound size={18} /><span>Multijoueur<strong>Salons privés · 2 à 4 joueurs</strong></span><ArrowRight size={17} /></button>
        {resume && <button className="text-button" onClick={onPlay}>Commencer une nouvelle partie</button>}
        <div className="hero-metrics"><div><Trophy size={18} /><span><strong>{save.best || '—'}<small>{save.best ? ' / 600' : ''}</small></strong><span>RECORD PERSONNEL</span></span></div><button onClick={onCatalog}><Users size={18} /><span><strong>{characters.length}</strong><span>SHINOBI À DÉCOUVRIR <ArrowRight size={11} /></span></span></button></div>
      </div>
      <div className="hero-visual" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><span className="hero-kanji">忍</span><span className="visual-label">LA FORCE SEULE<br />NE SUFFIT PAS.</span>
        <div className="showcase-card back-card"><Portrait character={characterById.get('sasuke-uchiha')!} /><div><small>LE STRATÈGE</small><strong>Sasuke Uchiha</strong></div></div>
        <div className="showcase-card front-card"><Portrait character={characterById.get('naruto-uzumaki')!} /><div><small>KONOHA · SHINOBI</small><strong>Naruto Uzumaki</strong><span><LockKeyhole size={12} /> POTENTIEL À RÉVÉLER</span></div></div>
        <span className="floating-chip"><Crosshair size={18} /><span>UN CHOIX.<strong>Aucun retour en arrière.</strong></span><Check size={16} /></span>
        <span className="visual-coordinate">35° 41′ N / VILLAGE CACHÉ</span>
      </div>
    </section>
    <section className="stat-intro" aria-labelledby="stat-title"><div className="section-heading"><div><span className="eyebrow muted">L’ÉQUILIBRE FAIT LA DIFFÉRENCE</span><h2 id="stat-title">Six voies vers la victoire.</h2></div><span className="section-side">6 STATISTIQUES <span>/</span> 600 POINTS</span></div><div className="stat-preview-grid">{STATS.map((stat, index) => <div className="stat-preview" key={stat.key}><span className="stat-number">0{index + 1}</span><StatIcon stat={stat.key} size={25} /><h3>{stat.label}</h3><p>{stat.description}</p><span className="stat-kanji" aria-hidden="true">{stat.kanji}</span></div>)}</div></section>
    <div className="home-note"><span><LockKeyhole size={14} /> Pas de notes avant le verdict.</span><span>Sans compte. Sans API. Juste ton instinct.</span></div>
  </main>;
}
