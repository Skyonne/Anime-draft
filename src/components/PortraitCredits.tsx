import { characters } from '../data/catalog';
import { licensedPortrait } from '../portraits/resolve';
import { usePrivatePortraits } from '../hooks/usePrivatePortraits';
import { loadPrivatePortraits, PRIVATE_PORTRAITS_ENABLED } from '../portraits/private';
import sources from '../portraits/sources.json';

export function PortraitCredits() {
  const privateState = usePrivatePortraits();
  const count = characters.filter(c => licensedPortrait(c) || privateState.portraits.some(p => p.characterId === c.id)).length;
  return <div className="portrait-source-panel"><aside className="portrait-credits"><span>{count} portrait{count !== 1 ? 's' : ''} trouvé{count !== 1 ? 's' : ''} · {characters.length - count} avatars</span><a href={`${import.meta.env.BASE_URL}portrait-credits.html`} target="_blank" rel="noopener noreferrer">Sources et crédits des visuels<span className="sr-only"> (nouvel onglet)</span></a></aside>
    {PRIVATE_PORTRAITS_ENABLED && <><div className="private-portrait-status"><p role="status">{privateState.message || 'Portraits des personnages activés.'}</p><button className="secondary" disabled={privateState.status === 'loading'} onClick={() => void loadPrivatePortraits(true)}>{privateState.status === 'loading' ? 'Chargement…' : 'Actualiser les portraits'}</button></div>{privateState.portraits.length > 0 && <details className="private-portrait-sources"><summary>Provenance des {privateState.portraits.length} portraits distants</summary><p>Images MyAnimeList, références obtenues via {sources.provider}. Droits réservés aux ayants droit ; aucune licence libre revendiquée.</p><ul>{privateState.portraits.map(p => <li key={p.characterId}><a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">{p.characterName} — MyAnimeList</a></li>)}</ul></details>}</>}
  </div>;
}
