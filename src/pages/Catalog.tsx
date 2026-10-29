import { useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Portrait } from '../components/Portrait';
import { PortraitCredits } from '../components/PortraitCredits';
import { characters } from '../data/catalog';

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function Catalog({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState('');
  const filtered = characters.filter(c => normalize(`${c.name} ${c.affiliation}`).includes(normalize(query)));
  return <main id="main" className="catalog-main"><button className="text-button back" onClick={onBack}><ArrowLeft size={16} /> Retour</button><span className="eyebrow">LES ARCHIVES SHINOBI</span><h1>{characters.length} destins. Un même draft.</h1><p className="catalog-description">Un catalogue de combattants de Naruto et Shippuden. Chaque ninja a la même chance d’apparaître. Les notes restent secrètes pendant le jeu.</p><PortraitCredits /><label className="search"><Search size={19} /><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un ninja ou un village…" aria-label="Rechercher dans le catalogue" /></label><p className="catalog-count" role="status">{filtered.length} personnage{filtered.length !== 1 ? 's' : ''}</p><div className="catalog-grid">{filtered.map(c => <article className="catalog-card" key={c.id}><Portrait character={c} lazy /><div><h2>{c.name}</h2><span>{c.affiliation}</span><p>{c.version}</p></div></article>)}</div>{filtered.length === 0 && <p className="empty-message">Aucun ninja ne correspond à cette recherche.</p>}</main>;
}
