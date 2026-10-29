import { STATS } from '../data/stats';
import { scoreDraft } from '../game/scoring';
import type { Draft, NarutoCharacter } from '../types';

export function shareText(draft: Draft, catalog: readonly NarutoCharacter[]) {
  const result = scoreDraft(draft, catalog);
  return `NARUTO STAT DRAFT\n\nScore : ${result.total}/600\n\n${result.rows.map(row => `${STATS.find(stat => stat.key === row.key)!.label} : ${row.character.name} — ${row.value}`).join('\n')}\n\nÉvaluations de fans, non officielles.`;
}
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return; } catch { /* Use selected textarea on restricted browsers. */ }
  }
  const field = document.createElement('textarea');
  field.value = text;
  field.style.position = 'fixed'; field.style.top = '0'; field.style.left = '0';
  document.body.append(field); field.select();
  const copied = document.execCommand('copy'); field.remove();
  if (!copied) throw new Error('Copie indisponible. Sélectionnez le résumé pour le copier.');
}
