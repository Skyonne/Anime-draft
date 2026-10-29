import { MapPin, LockKeyhole } from 'lucide-react';
import type { NarutoCharacter } from '../types';
import { Portrait } from './Portrait';
export function CharacterCard({ character, automatic }: { character: NarutoCharacter; automatic: boolean }) {
  return <article className="character-card enter" key={character.id} aria-label={`Personnage actuel : ${character.name}`}>
    <div className="character-art"><Portrait character={character} />
      <span className="card-index">DOSSIER SHINOBI</span><span className="card-seal" aria-hidden="true">忍</span>
      <div className="character-name"><span className="affiliation"><MapPin size={13} /> {character.affiliation}</span><h2>{character.name}</h2><span className="portrait-caption">VISUEL SHINOBI · SOURCES DANS LE CATALOGUE</span></div>
    </div>
    <div className="card-bottom"><LockKeyhole size={14} /><span>{automatic ? 'Dernière affectation en cours…' : 'Ses statistiques restent secrètes.'}</span><span className="live-dot" /></div>
  </article>;
}
