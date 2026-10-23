/**
 * Ce que tu pratiques (vague 16) : sert a n'afficher dans le carnet que ce qui te concerne.
 * Combat seulement si tu pratiques un sport de combat (sport principal, sports favoris, seances,
 * techniques de combat ou combats enregistres). Course, cross-training, musculation, escalade de meme.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { getTrainings } from '@/lib/database';
import { getCombats } from '@/lib/fighterModeService';
import { getSportCategory } from '@/lib/sports';
import { SPORT_TO_PACK } from '@/lib/sportPacks';
import { getEspace } from '@/lib/v2/espace';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';

export type Pratique = {
  combat: boolean;
  musculation: boolean;
  course: boolean;
  cross: boolean;
  escalade: boolean;
  /** sport de combat principal pour lancer une seance (jjb par defaut) */
  combatSport: string;
  /** vrai une fois la lecture faite */
  loaded?: boolean;
};

const VIDE: Pratique = { combat: false, musculation: false, course: false, cross: false, escalade: false, combatSport: 'jjb' };

function isCombatSport(id: string): boolean {
  const k = id.toLowerCase();
  if (SPORT_TO_PACK[k] === 'combat') return true;
  const cat = getSportCategory(k);
  return cat === 'combat_striking' || cat === 'combat_grappling';
}

export async function readPratique(skillCats: string[] = []): Promise<Pratique> {
  const p: Pratique = { ...VIDE };
  const sports: string[] = [];
  try {
    const main = await AsyncStorage.getItem('@yoroi_user_sport');
    if (main) sports.push(main);
  } catch {
    // sans importance
  }
  try {
    const e = await getEspace();
    sports.push(...(e.sportsFavoris ?? []));
  } catch {
    // sans importance
  }
  try {
    const t = await getTrainings(365);
    t.forEach((x) => x.sport && sports.push(x.sport));
  } catch {
    // sans importance
  }
  for (const s of sports) {
    const k = String(s).toLowerCase();
    const pack = SPORT_TO_PACK[k];
    if (isCombatSport(k)) {
      if (!p.combat) p.combatSport = k;
      p.combat = true;
    }
    if (pack === 'musculation' || pack === 'force' || getSportCategory(k) === 'fitness') p.musculation = true;
    if (pack === 'endurance' || k === 'running' || k === 'course') p.course = true;
    if (pack === 'force' || k === 'crossfit' || k === 'hyrox' || k === 'crosstraining') p.cross = true;
    if (k === 'escalade' || k === 'climbing') p.escalade = true;
  }
  if (skillCats.some((c) => c.startsWith('jjb_') || c === 'lutte' || c === 'striking')) p.combat = true;
  if (!p.combat) {
    try {
      const c = await getCombats();
      if (c && c.length > 0) p.combat = true;
    } catch {
      // sans importance
    }
  }
  p.loaded = true;
  return p;
}

export function usePratique(skillCats: string[]): Pratique {
  const [p, setP] = useState<Pratique>(VIDE);
  const key = skillCats.join(',');
  const load = useCallback(() => {
    readPratique(key ? key.split(',') : []).then(setP).catch(() => {});
  }, [key]);
  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
    return () => sub.remove();
  }, [load]);
  return p;
}
