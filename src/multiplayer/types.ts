import type { Draft, StatKey } from '../types';

export type RoomMode = 'fair' | 'random';
export type RoomPhase = 'lobby' | 'draft' | 'results' | 'closed';
export interface PlayerView { id: string; name: string; host: boolean; ready: boolean; connected: boolean; progress: number; abandoned: boolean }
export interface Standing { playerId: string; score: number | null; position: number | null; draft: Draft | null }
export interface RoomView { code: string; mode: RoomMode; phase: RoomPhase; gameId: string | null; players: PlayerView[]; results: Standing[] }
interface Header { v: 1; seq: number; gameId: string | null }
export type ClientMessage = Header & (
  { type: 'hello'; name: string; token: string; catalog: string } |
  { type: 'ready'; ready: boolean } |
  { type: 'pick'; key: StatKey; expected: string } |
  { type: 'rematch' } | { type: 'leave' } | { type: 'pong' }
);
export type Refusal = 'full' | 'started' | 'closed' | 'catalog' | 'invalid' | 'token';
export type ServerMessage = Header & (
  { type: 'snapshot'; room: RoomView; selfId: string; draft: Draft | null } |
  { type: 'reject'; reason: Refusal } | { type: 'closed' } |
  { type: 'error'; message: string } | { type: 'ping' }
);
export interface SessionView { status: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed'; room: RoomView | null; selfId: string | null; draft: Draft | null; error: string; notice: string }
