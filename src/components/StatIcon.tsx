import { BicepsFlexed, Zap, Flame, Swords, Brain, Shield } from 'lucide-react';
import type { StatKey } from '../types';
const icons = { strength: BicepsFlexed, speed: Zap, ninjutsu: Flame, taijutsu: Swords, intelligence: Brain, endurance: Shield };
export function StatIcon({ stat, size = 22 }: { stat: StatKey; size?: number }) {
  const Icon = icons[stat]; return <Icon size={size} strokeWidth={1.6} aria-hidden="true" />;
}
