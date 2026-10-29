import { afterEach, describe, expect, it, vi } from 'vitest';
import { matchPrivatePortraits, validPrivateImage } from './private';
import { portraitCandidates } from './resolve';
import { characters } from '../data/catalog';
import sources from './sources.json';

const row = (name: string, id = 17, image = 'https://cdn.myanimelist.net/images/characters/1/100.jpg') => ({ character: { mal_id: id, name, images: { jpg: { image_url: image } } } });
const payload = (...rows: ReturnType<typeof row>[]) => ({ data: rows });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); vi.resetModules(); });
describe('Portraits distants pour installation privée', () => {
  it('utilise le successeur Tenrai sans dépendre de l’instance Jikan arrêtée', () => {
    expect(sources.provider).toBe('Tenrai');
    expect(sources.endpoints).toEqual(['https://api.tenrai.org/v1/anime/1735/characters', 'https://api.tenrai.org/v1/anime/20/characters']);
    expect(sources.endpoints.some(url => url.includes('jikan.moe'))).toBe(false);
  });
  it('associe un nom japonais inversé sans modifier le catalogue', () => {
    const before = JSON.stringify(characters);
    const result = matchPrivatePortraits([payload(row('Uzumaki, Naruto'), row('Uchiha, Sasuke', 13))]);
    expect(result.map(p => p.characterId)).toEqual(['naruto-uzumaki', 'sasuke-uchiha']);
    expect(result[0].sourceUrl).toBe('https://myanimelist.net/character/17');
    expect(JSON.stringify(characters)).toBe(before);
  });
  it('gère les translittérations explicites et ne remplace pas Nagato par Pain', () => {
    const result = matchPrivatePortraits([payload(row('Hyuuga, Hinata', 1), row('Akimichi, Chouji', 2), row('Might, Dai', 3), row('Pain', 4))]);
    expect(result.map(p => p.characterId)).toEqual(['hinata-hyuga', 'choji-akimichi', 'duy-le-pere-de-guy']);
  });
  it('déduplique la même identité et refuse les identités contradictoires', () => {
    expect(matchPrivatePortraits([payload(row('Uzumaki, Naruto')), payload(row('Uzumaki, Naruto'))])).toHaveLength(1);
    expect(matchPrivatePortraits([payload(row('Uzumaki, Naruto', 17), row('Uzumaki, Naruto', 99))])).toEqual([]);
    expect(matchPrivatePortraits([payload(row('A', 1), row('Un ninja inventé', 2))])).toEqual([]);
  });
  it('refuse les URLs arbitraires, les placeholders et les réponses mal formées', () => {
    for (const url of ['javascript:alert(1)', 'https://cdn.myanimelist.net.evil.example/images/characters/1/100.jpg', 'https://cdn.myanimelist.net/img/sp/icon/apple-touch-icon-256.png', 'http://cdn.myanimelist.net/images/characters/1/100.jpg']) expect(validPrivateImage(url)).toBe(false);
    expect(matchPrivatePortraits([null, {}, { data: 'invalid' }, payload(row('Uzumaki, Naruto', 17, 'https://evil.example/image.jpg'))])).toEqual([]);
  });
  it('utilise le portrait distant en gardant l’avatar local comme secours', () => {
    const result = matchPrivatePortraits([payload(row('Uzumaki, Naruto'))]);
    const candidates = portraitCandidates(characters[0], '/naruto-stat-draft/', [], result);
    expect(candidates[0].src).toBe(result[0].imageUrl); expect(candidates[0].kind).toBe('portrait');
    expect(candidates[1].src).toBe('/naruto-stat-draft/characters/naruto-uzumaki.svg');
  });
  it('charge une seule fois les deux listes et conserve leurs références en cache', async () => {
    vi.useFakeTimers(); vi.stubEnv('VITE_PRIVATE_PORTRAITS', 'true');
    vi.stubGlobal('window', {});
    const setItem = vi.fn(); vi.stubGlobal('localStorage', { getItem: () => null, setItem });
    const fetcher = vi.fn().mockImplementation(async (url: string) => url.endsWith('index.json') ? { ok: false, status: 404 } : { ok: true, status: 200, text: async () => JSON.stringify(payload(row('Uzumaki, Naruto'))) });
    vi.stubGlobal('fetch', fetcher); vi.resetModules();
    const module = await import('./private');
    const loading = module.loadPrivatePortraits(); await vi.runAllTimersAsync(); await loading;
    expect(fetcher).toHaveBeenCalledTimes(3); expect(module.getPrivatePortraits().portraits).toHaveLength(1);
    expect(module.getPrivatePortraits().status).toBe('ready'); expect(setItem).toHaveBeenCalledTimes(1);
    await module.loadPrivatePortraits(); expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('reste jouable avec avatars lors d’une panne et évite les relances à chaque carte', async () => {
    vi.useFakeTimers(); vi.stubEnv('VITE_PRIVATE_PORTRAITS', 'true'); vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', { getItem: () => 'invalid', setItem: vi.fn() });
    const fetcher = vi.fn().mockRejectedValue(new Error('offline')); vi.stubGlobal('fetch', fetcher); vi.resetModules();
    const module = await import('./private'); const loading = module.loadPrivatePortraits(); await vi.runAllTimersAsync(); await loading;
    expect(module.getPrivatePortraits().status).toBe('error'); expect(module.getPrivatePortraits().portraits).toEqual([]);
    await module.loadPrivatePortraits(); expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('préfère les vrais fichiers du site local sans contacter l’API ou le CDN', async () => {
    vi.stubEnv('VITE_PRIVATE_PORTRAITS', 'true'); vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
    const local = { characterId: 'naruto-uzumaki', characterName: 'Naruto Uzumaki', imageUrl: 'private-portraits/naruto-uzumaki.jpg', sourceUrl: 'https://myanimelist.net/character/17', sourceName: 'Uzumaki, Naruto' };
    const fetcher = vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify({ version: 1, portraits: [local] }) });
    vi.stubGlobal('fetch', fetcher); vi.resetModules();
    const module = await import('./private'); await module.loadPrivatePortraits();
    expect(fetcher).toHaveBeenCalledTimes(1); expect(module.getPrivatePortraits().portraits).toEqual([local]);
    expect(module.getPrivatePortraits().message).toContain('locaux');
    expect(portraitCandidates(characters[0], '/game/', [], [local])[0].src).toBe('/game/private-portraits/naruto-uzumaki.jpg');
  });
  it('ne contacte aucune API lorsque le mode privé est désactivé', async () => {
    vi.stubEnv('VITE_PRIVATE_PORTRAITS', 'false'); vi.stubEnv('VITE_REMOTE_PORTRAITS', 'false'); const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher); vi.resetModules();
    const module = await import('./private'); await module.loadPrivatePortraits();
    expect(fetcher).not.toHaveBeenCalled(); expect(module.getPrivatePortraits().portraits).toEqual([]);
  });
  it('active les portraits du site publié sans dépendre du fichier .env.local', async () => {
    vi.stubEnv('VITE_PRIVATE_PORTRAITS', 'false'); vi.stubEnv('VITE_REMOTE_PORTRAITS', 'true'); vi.resetModules();
    const module = await import('./private');
    expect(module.PRIVATE_PORTRAITS_ENABLED).toBe(true);
  });
});
