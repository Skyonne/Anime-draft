import { randomInt } from '../game/random';
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export function createCode() { return Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(''); }
export const normalizeCode = (raw: string) => raw.toUpperCase().replace(/[\s-]/g, '');
export const validCode = (raw: string) => /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{12}$/.test(normalizeCode(raw));
export const displayCode = (raw: string) => normalizeCode(raw).match(/.{1,4}/g)?.join('-') || '';
export const peerIdForCode = (code: string) => `naruto-stat-draft-v2-${normalizeCode(code)}`;
export function invitationLink(code: string, locationHref = window.location.href) {
  const url = new URL(locationHref); url.search = ''; url.hash = ''; url.searchParams.set('room', normalizeCode(code)); return url.href;
}
export function cleanName(name: string) { return name.trim().replace(/[\u0000-\u001f\u007f-\u009f]/g, '').slice(0, 24); }
