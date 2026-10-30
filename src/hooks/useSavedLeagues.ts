import { useEffect, useState } from 'react';
import { loadSavedLeagues, SAVED_LEAGUES_CHANGED } from '@/utils/savedLeagues';

export function useSavedLeagues() {
  const [leagues, setLeagues] = useState(loadSavedLeagues);
  useEffect(() => {
    const update = () => setLeagues(loadSavedLeagues());
    update();
    window.addEventListener('storage', update);
    window.addEventListener(SAVED_LEAGUES_CHANGED, update);
    return () => { window.removeEventListener('storage', update); window.removeEventListener(SAVED_LEAGUES_CHANGED, update); };
  }, []);
  return leagues;
}
