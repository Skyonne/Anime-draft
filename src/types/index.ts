export const STAT_KEYS = ['strength', 'speed', 'ninjutsu', 'taijutsu', 'intelligence', 'endurance'] as const;
export type StatKey = typeof STAT_KEYS[number];
export interface NarutoCharacter {
  id: string;
  name: string;
  image: string;
  imagePosition?: string;
  affiliation: string;
  rank?: string;
  version: string;
  evidence: string;
  stats: Record<StatKey, number>;
}
export interface Draft {
  id: string;
  deck: string[];
  picks: Partial<Record<StatKey, string>>;
}
export interface GameRecord { id: string; date: string; score: number }
export interface SaveData {
  version: 1;
  best: number;
  completed: number;
  last: number | null;
  history: GameRecord[];
  settings: { reduceMotion: boolean };
  draft: Draft | null;
}
