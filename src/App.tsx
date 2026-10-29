import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowRight, CircleHelp, Flame, History, Settings2, ShieldCheck, Trophy } from 'lucide-react';
import { useGame } from './hooks/useGame';
import { Home } from './pages/Home';
import { Game } from './pages/Game';
import { Results } from './pages/Results';
import { Catalog } from './pages/Catalog';
import { Modal } from './components/Modal';
import { isComplete } from './game/engine';
import { TIERS } from './game/scoring';

const Multiplayer = lazy(() => import('./pages/Multiplayer').then(module => ({ default: module.Multiplayer })));
type Screen = 'home' | 'game' | 'catalog' | 'multi';
type Dialog = 'help' | 'restart' | 'history' | 'settings' | 'about' | null;
export default function App() {
  const { save, storageOk, start, commit, auto, toggleMotion } = useGame();
  const [screen, setScreen] = useState<Screen>(() => new URLSearchParams(location.search).has('room') ? 'multi' : save.draft ? 'game' : 'home');
  const [multiplayerActive, setMultiplayerActive] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [systemMotion, setSystemMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const shell = useRef<HTMLDivElement>(null);
  const reduceMotion = save.settings.reduceMotion || systemMotion;
  useEffect(() => { const media = matchMedia('(prefers-reduced-motion: reduce)'); const listener = () => setSystemMotion(media.matches); media.addEventListener('change', listener); return () => media.removeEventListener('change', listener); }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); const heading = shell.current?.querySelector('main h1') as HTMLElement | null; heading?.setAttribute('tabindex', '-1'); heading?.focus(); }, [screen]);
  function navigate(target: Screen) {
    if (screen === 'multi' && target !== 'multi') {
      if (multiplayerActive && !window.confirm('Quitter le salon ? Si tu es hôte, le salon sera fermé pour tous.')) return;
      const url = new URL(location.href); url.searchParams.delete('room'); history.replaceState(null, '', url);
    }
    setScreen(target);
  }
  function launch() {
    if (save.draft && !isComplete(save.draft)) { setDialog('restart'); return; }
    start(); setScreen('game');
  }
  function restart() { start(); setScreen('game'); setDialog(null); }
  return <div ref={shell} className={`app-shell ${reduceMotion ? 'reduce-motion' : ''}`}><a className="skip-link" href="#main">Aller au contenu</a><header className="site-header"><button className="brand" onClick={() => navigate('home')} aria-label="Naruto Stat Draft, accueil"><span className="brand-symbol"><Flame size={25} strokeWidth={1.8} /></span><span>NARUTO<span className="brand-subtitle">STAT DRAFT<span className="brand-period">.</span></span></span></button><nav aria-label="Navigation principale"><button className={screen === 'home' || screen === 'game' ? 'nav-link active' : 'nav-link'} onClick={() => navigate(save.draft ? 'game' : 'home')}>Le draft</button><button className={screen === 'catalog' ? 'nav-link active' : 'nav-link'} onClick={() => navigate('catalog')}>Les ninjas</button><button className={screen === 'multi' ? 'nav-link active' : 'nav-link'} onClick={() => navigate('multi')}>Multi</button></nav><div className="header-actions"><span className="header-record"><Trophy size={15} /><strong>{save.best || '—'}</strong><span>PB</span></span><button className="icon-button" aria-label="Historique des parties" onClick={() => setDialog('history')}><History size={19} /></button><button className="icon-button" aria-label="Paramètres" onClick={() => setDialog('settings')}><Settings2 size={19} /></button></div></header>
    {!storageOk && <div className="storage-warning" role="status">Le stockage local est indisponible. Ta partie reste jouable, mais ne sera pas conservée après fermeture.</div>}
    {screen === 'home' && <Home save={save} onPlay={launch} onResume={() => setScreen('game')} onHelp={() => setDialog('help')} onCatalog={() => navigate('catalog')} onMultiplayer={() => navigate('multi')} />}
    {screen === 'multi' && <Suspense fallback={<main id="main" className="waiting-main" role="status">Chargement du multijoueur…</main>}><Multiplayer best={save.best} reduceMotion={reduceMotion} onBack={() => navigate('home')} onActiveChange={setMultiplayerActive} /></Suspense>}
    {screen === 'catalog' && <Catalog onBack={() => setScreen(save.draft ? 'game' : 'home')} />}
    {screen === 'game' && save.draft && (isComplete(save.draft) ? <Results key={save.draft.id} draft={save.draft} best={save.best} onPlay={launch} reduceMotion={reduceMotion} /> : <Game key={save.draft.id} draft={save.draft} onPlace={commit} onAuto={auto} onRestart={() => setDialog('restart')} reduceMotion={reduceMotion} />)}
    <footer className="site-footer"><span><span className="footer-mark" aria-hidden="true">忍</span> FAIT POUR LES FANS. PAR PASSION.</span><span>Projet non officiel · Naruto © ses ayants droit</span><button onClick={() => setDialog('about')}>À propos du projet <ArrowRight size={13} /></button></footer>
    {dialog === 'help' && <Modal title="Ton instinct. Ta stratégie." onClose={() => setDialog(null)}><p className="modal-intro">Le meilleur combattant n’est pas toujours le meilleur choix. Trouve sa place.</p><ol className="rules"><li><strong>Découvre un ninja.</strong><p>Six personnages différents, tirés avec la même probabilité dans tout le catalogue.</p></li><li><strong>Choisis une voie.</strong><p>Sélectionne l’une des six statistiques libres, puis verrouille ton choix. Aucune note n’est visible.</p></li><li><strong>Assume ton draft.</strong><p>Chaque choix est définitif. Le sixième ninja rejoint automatiquement la dernière catégorie.</p></li><li><strong>Découvre ton score.</strong><p>Les six notes sélectionnées s’additionnent. Maximum : 600, sans bonus.</p></li></ol><p className="subtle">Chaque nouvelle partie effectue un nouveau tirage indépendant ; des ninjas d’une partie précédente peuvent réapparaître.</p><button className="primary full" onClick={() => setDialog(null)}>Compris <ArrowRight size={18} /></button></Modal>}
    {dialog === 'restart' && <Modal title="Un nouveau départ ?" onClose={() => setDialog(null)}><p>Ta partie en cours sera remplacée. Tes records et ton historique seront conservés.</p><div className="modal-actions"><button className="secondary" onClick={() => setDialog(null)}>Continuer le draft</button><button className="primary" onClick={restart}>Nouvelle partie<ArrowRight size={17} /></button></div></Modal>}
    {dialog === 'history' && <Modal title="Tes derniers drafts" onClose={() => setDialog(null)}><div className="history-stats"><span><strong>{save.completed}</strong> parties terminées</span><span><strong>{save.last ?? '—'}</strong> dernier score</span></div>{save.history.length ? <ol className="history-list">{save.history.map((game, index) => <li key={game.id}><span>#{save.completed - index}<small>{new Date(game.date).toLocaleDateString('fr-FR')}</small></span><strong>{game.score}<small> / 600</small></strong></li>)}</ol> : <p>Aucune partie terminée. Ta première légende reste à écrire.</p>}<p className="subtle">Les dix dernières parties sont conservées sur ce navigateur uniquement.</p></Modal>}
    {dialog === 'settings' && <Modal title="À ton rythme" onClose={() => setDialog(null)}><label className="setting-toggle"><span><strong>Réduire les animations</strong><small>Révélations immédiates et transitions courtes.</small></span><input type="checkbox" checked={save.settings.reduceMotion} onChange={toggleMotion} /></label>{systemMotion && <p className="subtle">La préférence de réduction des animations de ton système est également respectée.</p>}<p className="privacy-note"><ShieldCheck size={20} /> Le solo fonctionne sans API. Le multijoueur utilise PeerJS et WebRTC ; les pseudos sont transmis aux participants. Les records solo restent sur ton navigateur.</p></Modal>}
    {dialog === 'about' && <Modal title="Un terrain de jeu de fans" onClose={() => setDialog(null)}><p>Naruto Stat Draft est un projet indépendant, sans affiliation avec les créateurs ou éditeurs de Naruto. Les avatars abstraits sont des créations originales, pas des portraits officiels.</p><p>Les notes sont des évaluations subjectives fondées sur les capacités montrées dans Naruto et Shippuden. Elles ne sont ni officielles ni aléatoires. Les pics temporaires sont précisés dans les résultats ; l’immortalité d’une réanimation ne donne pas une endurance infinie.</p><h3>Des rangs pour le plaisir</h3><div className="tier-list">{TIERS.map(tier => <span key={tier.label}>{tier.label}<strong>{tier.min}+</strong></span>)}</div><p className="subtle">Le catalogue est une sélection initiale. Certaines capacités peu montrées restent difficiles à comparer. Boruto est exclu.</p><button className="secondary full" onClick={() => setDialog('help')}><CircleHelp size={17} /> Revoir les règles</button></Modal>}
  </div>;
}
