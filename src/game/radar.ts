export const letterRank = (value: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'E' => {
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error('Note hors plage');
  return value >= 95 ? 'S' : value >= 85 ? 'A' : value >= 70 ? 'B' : value >= 50 ? 'C' : value >= 30 ? 'D' : 'E';
};
export function radarPoint(index: number, value: number, radius = 115, center = 200) {
  if (!Number.isInteger(index) || index < 0 || index >= 6 || !Number.isFinite(value) || value < 0 || value > 100) throw new Error('Axe ou valeur invalide');
  const angle = Math.PI * index / 3 - Math.PI / 2;
  return { x: center + Math.cos(angle) * radius * value / 100, y: center + Math.sin(angle) * radius * value / 100 };
}
export function radarPolygon(values: readonly number[]) {
  if (values.length !== 6) throw new Error('Le radar nécessite six valeurs');
  return values.map((value, index) => { const p = radarPoint(index, value); return `${p.x.toFixed(2)},${p.y.toFixed(2)}`; }).join(' ');
}
