import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { Radar } from '../components/Radar';
import { letterRank, radarPoint, radarPolygon } from './radar';

describe('Radar hexagonal et rangs', () => {
  it.each([[0, 'E'], [29, 'E'], [30, 'D'], [49, 'D'], [50, 'C'], [69, 'C'], [70, 'B'], [84, 'B'], [85, 'A'], [94, 'A'], [95, 'S'], [100, 'S']] as const)('attribue %s au rang %s', (value, rank) => expect(letterRank(value)).toBe(rank));
  it('rejette les valeurs invalides', () => {
    for (const value of [-1, 101, NaN, Infinity]) expect(() => letterRank(value)).toThrow();
    expect(() => radarPolygon([100])).toThrow(); expect(() => radarPoint(6, 100)).toThrow();
  });
  it('place exactement les axes et le centre', () => {
    expect(radarPoint(0, 100)).toEqual({ x: 200, y: 85 });
    expect(radarPoint(3, 100).y).toBe(315);
    for (let i = 0; i < 6; i++) expect(radarPoint(i, 0)).toEqual({ x: 200, y: 200 });
    expect(radarPolygon([100, 80, 60, 40, 20, 0]).split(' ')).toHaveLength(6);
  });
  it('rend les valeurs exactes, les noms et deux séries accessibles', () => {
    const markup = renderToStaticMarkup(createElement(Radar, { series: [{ name: 'Joueur 1', values: [100, 90, 80, 70, 60, 50] }, { name: 'Joueur 2', values: [50, 60, 70, 80, 90, 100] }] }));
    expect(markup).toContain('Force 100, rang S'); expect(markup).toContain('Intelligence 60, rang C');
    expect(markup).toContain('Joueur 2'); expect(markup).toContain('stroke-dasharray="5 3"');
  });
  it('ne révèle pas les valeurs avant leur étape', () => {
    const markup = renderToStaticMarkup(createElement(Radar, { revealed: 0, series: [{ name: 'Équipe', values: [96, 97, 98, 99, 95, 94] }] }));
    expect(markup).not.toContain('96'); expect(markup).toContain('Force en attente');
  });
});
