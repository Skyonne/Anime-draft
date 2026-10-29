export interface DataPort {
  peer: string;
  open: boolean;
  send(data: string): void;
  close(): void;
  on(event: string, listener: (value?: unknown) => void): unknown;
}
export interface PeerPort {
  destroyed: boolean;
  disconnected: boolean;
  connect(id: string, options: { reliable: boolean; serialization: string }): DataPort;
  on(event: string, listener: (value?: unknown) => void): unknown;
  reconnect(): void;
  destroy(): void;
}
export type PeerConstructor = new (id?: string, options?: Record<string, unknown>) => PeerPort;
declare global { interface Window { Peer?: PeerConstructor } }
let pending: Promise<PeerConstructor> | null = null;

/** The pinned MIT-licensed PeerJS client loads only when multiplayer is opened. */
export function loadPeer(): Promise<PeerConstructor> {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (pending) return pending;
  pending = (async () => {
    const sources = [
      `${import.meta.env.BASE_URL}vendor/peerjs.min.js`,
      'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js',
      'https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js',
    ];
    // A local, authorized copy can be supplied with VITE_PEERJS_LOCAL=true at build time.
    if (import.meta.env.VITE_PEERJS_LOCAL !== 'true') sources.shift();
    for (const src of sources) {
      try {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script'); script.src = src; script.async = true; script.crossOrigin = 'anonymous'; script.referrerPolicy = 'no-referrer';
          const timer = setTimeout(() => { script.remove(); reject(new Error('Délai de chargement PeerJS dépassé')); }, 12_000);
          script.onload = () => { clearTimeout(timer); if (window.Peer) resolve(); else { script.remove(); reject(new Error('Client PeerJS absent')); } };
          script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('Chargement PeerJS impossible')); };
          document.head.append(script);
        });
        return window.Peer!;
      } catch { /* Try the next distribution mirror. No effect on solo. */ }
    }
    throw new Error('Impossible de charger PeerJS. Vérifie ta connexion ou le blocage des CDN.');
  })().catch(error => { pending = null; throw error; });
  return pending;
}
export const peerOptions = {
  debug: 0,
  config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] },
};
