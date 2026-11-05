import type { LuckMetrics } from '@/utils/luck';
import { BroadcastIcon } from './BroadcastIcon';
export function LuckIcon({ rating }: { rating: LuckMetrics['luckRating'] }) {
  if (rating !== 'very_lucky' && rating !== 'very_unlucky') return null;
  return <span role="img" aria-label={rating === 'very_lucky' ? 'very lucky' : 'very unlucky'}><BroadcastIcon kind={rating === 'very_lucky' ? 'award' : 'alert'} /></span>;
}
