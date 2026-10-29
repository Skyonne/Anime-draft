import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, Copy, Share2, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { characters } from '../data/catalog';
import { STATS } from '../data/stats';
import { scoreDraft, tierFor } from '../game/scoring';
import { copyText, shareText } from '../utils/share';
import { StatIcon } from '../components/StatIcon';
import type { Draft } from '../types';
import { Radar, type RadarSeries } from '../components/Radar';
import { Portrait } from '../components/Portrait';
import { letterRank } from '../game/radar';

export function Results({ draft, best, onPlay, reduceMotion, beforeResults, playerName, comparison, playLabel = 'Un nouveau draft' }: { draft: Draft; best: number; onPlay: () => void; reduceMotion: boolean; beforeResults?: ReactNode; playerName?: string; comparison?: RadarSeries; playLabel?: string }) {
  const result = useMemo(() => scoreDraft(draft, characters), [draft]);
  const tier = tierFor(result.total);
  const [revealed, setRevealed] = useState(reduceMotion ? 6 : 0);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); window.scrollTo({ top: 0 }); }, []);
  const text = shareText(draft, characters);
  useEffect(() => {
    if (reduceMotion) { setRevealed(6); return; }
    const timer = setInterval(() => setRevealed(n => { if (n >= 5) clearInterval(timer); return Math.min(6, n + 1); }), 310);
    return () => clearInterval(timer);
  }, [reduceMotion]);
  useEffect(() => { if (revealed === 6) setNotice(`Résultat : ${result.total} points sur 600. Rang ludique : ${tier.label}.`); }, [revealed, result.total, tier.label]);
  async function copy() {
    try { await copyText(text); setCopied(true); setNotice('Résumé copié dans le presse-papiers.'); }
    catch (error) { setManual(true); setNotice((error as Error).message); }
  }
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: 'Naruto Stat Draft', text }); setNotice('Résumé partagé.'); return; }
      catch (error) { if ((error as Error).name === 'AbortError') return; }
    }
    await copy();
  }
  const all = revealed === 6;
  return <main id="main" className="results-main enter"><div className="results-title"><span className="eyebrow">LE VERDICT EST TOMBÉ</span><h1 ref={heading} tabIndex={-1}>{playerName ? `Le draft de ${playerName}` : 'Voici ta légende.'}</h1><p>Six choix. Une équipe. Tout se révèle.</p></div>{beforeResults}
    <section className="score-panel" aria-label="Résultat final"><span className="score-kanji" aria-hidden="true">影</span><div className="rank-medallion"><Trophy size={32} /><span>RANG DU DRAFT</span><strong>{all ? tier.label : 'Révélation…'}</strong></div><div className="score-total"><span>TON SCORE FINAL</span><div><strong>{all ? result.total : '•••'}</strong><span>/ 600</span></div><p>{all ? tier.text : 'Chaque voie dévoile son potentiel.'}</p></div><div className="score-secondary"><div><span>MOYENNE</span><strong>{all ? result.average.toFixed(1) : '—'}<small> / 100</small></strong></div><div><span>{playerName ? 'RECORD SOLO LOCAL' : 'RECORD PERSONNEL'}</span><strong>{all ? best : '—'}<small> / 600</small></strong></div></div></section>
    <Radar revealed={revealed} series={[{ name: playerName || "Ton équipe", values: result.rows.map(row => row.value) }, ...(comparison ? [comparison] : [])]} />
    <div className="results-heading"><h2>Ton équipe, en chiffres.</h2><span>ÉVALUATIONS DE FANS · NON OFFICIELLES</span></div><div className="result-grid">{result.rows.map((row, index) => <article className={`result-card ${revealed > index ? 'revealed' : ''}`} key={row.key}><div className="result-card-head"><StatIcon stat={row.key} size={19} /><span>{STATS[index].label}</span><strong>{revealed > index ? row.value : '?' } {revealed > index && <span className="letter-rank">{letterRank(row.value)}</span>}<small> /100</small></strong></div><div className="result-character"><Portrait key={row.character.id} character={row.character} lazy /><div><h3>{row.character.name}</h3><span>{row.character.affiliation}</span></div></div><div className="score-bar"><span style={{ width: `${revealed > index ? row.value : 0}%` }} /></div><details><summary>Comprendre cette note</summary><p>{row.character.version}. {row.character.evidence}</p></details></article>)}</div>
    {all && <div className="result-highlights"><span><TrendingUp size={17} /><span>POINT FORT <strong>{STATS.find(s => s.key === result.best.key)!.label} · {result.best.value}</strong></span></span><span><TrendingDown size={17} /><span>À OPTIMISER <strong>{STATS.find(s => s.key === result.worst.key)!.label} · {result.worst.value}</strong></span></span></div>}
    <div className="result-actions"><button className="primary" onClick={onPlay}>{playLabel}<ArrowRight size={18} /></button><button className="secondary" onClick={share} disabled={!all}><Share2 size={17} />Partager mon score</button><button className="secondary" onClick={copy} disabled={!all}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'Copié !' : 'Copier'}</button></div><p className="share-notice" role="status">{notice}</p>
    {manual && <textarea className="share-manual" aria-label="Résumé à copier manuellement" readOnly value={text} onFocus={e => e.target.select()} rows={11} />}
    <p className="rank-note">Les rangs sont des catégories ludiques propres au jeu, sans valeur officielle.</p>
  </main>;
}
