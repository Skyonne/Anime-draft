import data from './characters.json';
import type { NarutoCharacter } from '../types';
export const characters: NarutoCharacter[] = data;
export const characterById = new Map(characters.map(c => [c.id, c]));
