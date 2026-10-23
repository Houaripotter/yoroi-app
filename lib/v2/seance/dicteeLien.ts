/**
 * Dictee et Apple Sante (nuit du 14 octobre) : « j'ai couru 5 km » alors que la montre a deja ecrit
 * la course dans Sante. Meme regle de meme seance que lib/v2/seances/dedupe.ts (meme jour, meme sport
 * ou meme famille de sport, heure proche quand elle est connue) : on propose de relier la phrase a la
 * seance importee plutot que d'en creer une seconde. Code pur, teste dans __tests__/unit/dictee.test.ts.
 */
import type { Training } from '@/lib/database';
import { getSportCategory } from '@/lib/sports';

const dayOf = (t: Training) => String(t.date ?? '').slice(0, 10);

function minutesOf(t: Training): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t.start_time ?? ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

const sameSport = (a: string, b: string) => a === b || (getSportCategory(a) !== 'autre' && getSportCategory(a) === getSportCategory(b));

/** seance importee de Sante (pas une copie de YOROI relue) le meme jour, du meme sport ; la plus proche en heure */
export function findHealthTwin(list: Training[], sport: string, date: string, startMin: number | null, distance?: number | null): Training | null {
  const cands = list.filter((t) => !!t.healthkit_uuid && !/yoroi/i.test(String(t.source ?? '')) && dayOf(t) === date && sameSport(sport, t.sport));
  if (!cands.length) return null;
  const score = (t: Training) => {
    const m = minutesOf(t);
    const dt = startMin !== null && m !== null ? Math.abs(m - startMin) : 60;
    const dd = distance && t.distance ? Math.abs(t.distance - distance) * 20 : 0;
    return dt + dd;
  };
  const sorted = [...cands].sort((x, y) => score(x) - score(y));
  const best = sorted[0];
  // une heure dite tres loin de la seance de la montre : ce n'est pas la meme
  const m = minutesOf(best);
  if (startMin !== null && m !== null && Math.abs(m - startMin) > 180) return null;
  return best;
}
