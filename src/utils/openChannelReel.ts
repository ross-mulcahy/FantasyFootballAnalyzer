import { nflMoments } from '@/components/nflMoments';
import type { ChannelMood } from './openChannelMood';

export function shuffledMomentIndexes(mood: ChannelMood, previousIndex?: number): number[] {
  const indexes = nflMoments.flatMap((moment, index) => mood === 'mixed' || mood === 'neutral' || moment.mood === mood || moment.mood === 'neutral' ? [index] : []);
  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [indexes[index], indexes[swapIndex]] = [indexes[swapIndex], indexes[index]];
  }
  if (indexes.length > 1 && indexes[0] === previousIndex) {
    const swapIndex = 1 + Math.floor(Math.random() * (indexes.length - 1));
    [indexes[0], indexes[swapIndex]] = [indexes[swapIndex], indexes[0]];
  }
  return indexes;
}
