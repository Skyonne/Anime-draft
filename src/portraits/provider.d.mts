import type { PrivatePortrait } from './private';
import type { NarutoCharacter } from '../types';
export function validPrivateImage(value: unknown): value is string;
export function matchPrivatePortraits(payloads: unknown[], catalog: readonly NarutoCharacter[]): PrivatePortrait[];
