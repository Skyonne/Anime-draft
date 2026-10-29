import { useId } from 'react';
import { STATS } from '../data/stats';
import { letterRank, radarPoint, radarPolygon } from '../game/radar';

export interface RadarSeries { name: string; values: number[]; color?: string }
export function Radar({ series, revealed = 6 }: { series: RadarSeries[]; revealed?: number }) {
  const id = useId();
  const colors = ['#ff934f', '#68d5e8'];
  return <figure className="radar-panel"><div className="radar-heading"><span className="eyebrow">POTENTIEL SHINOBI</span><span>HEXAGRAMME / 100</span></div>
    <svg className="radar" viewBox="0 0 400 400" role="img" aria-labelledby={`${id}-title ${id}-desc`}><title id={`${id}-title`}>Radar des six statistiques sélectionnées</title><desc id={`${id}-desc`}>{series.map(s => `${s.name} : ${STATS.map((stat, i) => `${stat.label} ${i < revealed ? `${s.values[i]}, rang ${letterRank(s.values[i])}` : 'en attente'}`).join(', ')}`).join('. ')}</desc>
      <defs><filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2" /></filter></defs>
      {[20, 40, 60, 80, 100].map(value => <g key={value}><polygon points={radarPolygon(Array(6).fill(value))} className="radar-ring" /><text x="205" y={200 - 115 * value / 100 + 10} className="radar-scale">{value}</text></g>)}
      {STATS.map((stat, index) => { const p = radarPoint(index, 100); return <line x1="200" y1="200" x2={p.x} y2={p.y} className="radar-axis" key={stat.key} />; })}
      {series.map((s, i) => { const points = radarPolygon(s.values.map((v, index) => index < revealed ? v : 0)); const color = s.color || colors[i % colors.length]; return <g key={`${s.name}-${i}`}><polygon points={points} fill="none" stroke={color} strokeWidth="5" opacity=".3" filter={`url(#${id}-glow)`} /><polygon className="radar-shape" points={points} fill={color} fillOpacity=".15" stroke={color} strokeWidth="2" strokeDasharray={i ? '5 3' : undefined} />{s.values.map((v, index) => { const p = radarPoint(index, index < revealed ? v : 0); return <circle cx={p.x} cy={p.y} r="3" fill={color} key={index} />; })}</g>; })}
      {STATS.map((stat, index) => { const p = radarPoint(index, 100, 153); const anchor = index === 0 || index === 3 ? 'middle' : index < 3 ? 'start' : 'end'; return <g key={stat.key}><text x={p.x} y={p.y - 2} textAnchor={anchor} className="radar-label">{stat.label}</text><text x={p.x} y={p.y + 15} textAnchor={anchor} className="radar-value">{index < revealed ? `${series[0].values[index]} · ${letterRank(series[0].values[index])}` : '…'}</text></g>; })}
    </svg><figcaption className="radar-legend">{series.map((s, i) => <span key={`${s.name}-${i}`}><i style={{ background: s.color || colors[i % colors.length] }} />{s.name}{i > 0 && <small>pointillés</small>}</span>)}</figcaption><p className="rank-note">S ≥ 95 · A ≥ 85 · B ≥ 70 · C ≥ 50 · D ≥ 30 · E &lt; 30<br />Rangs ludiques, non officiels.</p>
  </figure>;
}
