/**
 * Actions recues de l'Apple Watch (contrat v1) : poids, seance faite, eau.
 * Dedoublonnees par id (garde dans le telephone, idsRecus.ts), appliquees une par une avec les fonctions v2
 * existantes : saveWeighIn (lib/v2/pesee/save.ts), saveSeance (lib/v2/seance/save.ts), saveHydrationAmount.
 * dansSante = true : la montre a deja ecrit dans Apple Sante, le telephone ne le recopie pas
 * (poids, seance et eau ; l'eau sans dansSante est ecrite par le telephone avec l'id de l'action, voir lib/v2/sante/eauSante.ts).
 */
import { DeviceEventEmitter } from 'react-native';
import { getWeights } from '@/lib/database';
import type { Training } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { getSportName } from '@/lib/sports';
import { saveWeighIn } from '@/lib/v2/pesee/save';
import { saveSeance } from '@/lib/v2/seance/save';
import { loadHydration, localISO, saveHydrationAmount } from '@/lib/v2/accueil/hydration';
import { ecrireDeltaEauSante, type EauVersSante } from '@/lib/v2/sante/eauSante';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { getEspace } from '@/lib/v2/espace';
import { chargerIdsMontre, idMontreDejaRecu, retenirIdMontre } from './idsRecus';
import { demanderBilan } from '@/lib/v2/bilan/reglage';
import { fini, lireAction } from './contrat';
import type { ActionMontre } from './contrat';
import { traduire } from '@/lib/i18n/tr';

/** source rangee en base pour ce qui vient de la montre YOROI (une seance YOROI, pas un import) */
export const SOURCE_MONTRE = 'yoroi_montre';

export type { ActionMontre } from './contrat';
export { lireAction } from './contrat';

const r1 = (v: number) => Math.round(v * 10) / 10;
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const entier = (v: unknown, min: number, max: number) => (fini(v) && v >= min && v <= max ? Math.round(v) : undefined);

async function appliquerPoids(a: ActionMontre): Promise<string> {
  const jour = localISO(new Date(a.at));
  const kg = r1(a.kg as number);
  const history = await getWeights();
  // avec dansSante, la pesee est rangee comme une pesee deja dans Apple Sante : pas de recopie
  await saveWeighIn(
    { date: jour, weight: kg, compo: {}, health: a.dansSante ? { date: jour, weight: kg, sourceKey: SOURCE_MONTRE, sourceLabel: 'Apple Watch' } : null },
    history ?? [],
  );
  DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
  return jour;
}

async function appliquerSeance(a: ActionMontre): Promise<number | null> {
  const fin = new Date(a.at);
  const duree = a.dureeS as number;
  const debut = new Date(fin.getTime() - duree * 1000);
  let sport = typeof a.sportId === 'string' && a.sportId ? a.sportId : '';
  if (!sport) {
    const e = await getEspace().catch(() => null);
    sport = e?.sportsFavoris?.[0] || 'autre';
  }
  const t: Training = {
    sport,
    date: localISO(debut),
    start_time: hhmm(debut),
    duration_minutes: Math.max(1, Math.round(duree / 60)),
    intensity: entier(a.rpe, 1, 10),
    heart_rate: entier(a.fcMoy, 30, 250),
    max_heart_rate: entier(a.fcMax, 30, 250),
    calories: entier(a.kcal, 1, 5000),
    rounds: entier(a.rounds, 1, 100),
    source: SOURCE_MONTRE,
  };
  const r = await saveSeance(t, { title: getSportName(sport) || traduire('Séance'), skipHealth: a.dansSante === true });
  return r?.id ?? null;
}

/**
 * Verre de la montre ou d'un widget. dansSante : la montre l'a deja ecrit (ou retire) dans Apple Sante,
 * le telephone n'y touche pas ; sinon il l'ecrit avec l'id de l'action (HKMetadataKeyExternalUUID).
 * Verre d'un jour passe (livre en retard) : le total du jour n'est pas touche, Apple Sante le recoit a sa date.
 */
async function appliquerEau(a: ActionMontre): Promise<void> {
  const quand = new Date(a.at);
  const vers: EauVersSante = a.dansSante === true ? false : { id: a.id, date: quand };
  if (localISO(quand) !== localISO()) {
    if (vers) await ecrireDeltaEauSante(a.deltaMl as number, vers);
    return;
  }
  const h = await loadHydration();
  const litres = Math.max(0, Math.round((h.amount * 1000 + (a.deltaMl as number))) / 1000);
  await saveHydrationAmount(litres, h.goal, undefined, vers);
}

let file: Promise<unknown> = Promise.resolve();

/**
 * Applique des charges de la montre, dans l'ordre, une seule fois chacune.
 * traitees : charges du debut de la liste reglees (appliquees, deja recues ou illisibles), a retirer de la file native ;
 * on s'arrete a la premiere qui echoue, elle sera reessayee au prochain passage.
 */
export function appliquerCharges(charges: unknown[]): Promise<{ appliquees: number; traitees: number }> {
  const run = async () => {
    await chargerIdsMontre();
    let appliquees = 0;
    let traitees = 0;
    for (const c of charges) {
      const a = lireAction(c);
      if (a && !idMontreDejaRecu(a.id)) {
        try {
          // 16 octobre : la page de bilan s'ouvre apres une pesee ou une seance de la montre
          // (plusieurs d'un coup : un seul bilan, components/yoroi/v2/bilan/BilanAuto.tsx)
          if (a.type === 'poids') demanderBilan({ type: 'corps', date: await appliquerPoids(a), origine: 'montre' });
          else if (a.type === 'seance') {
            const sid = await appliquerSeance(a);
            if (sid) demanderBilan({ type: 'seance', id: sid });
          } else await appliquerEau(a);
          await retenirIdMontre(a.id);
          appliquees++;
        } catch (e) {
          logger.warn('[Montre] action non appliquee', e);
          break;
        }
      }
      traitees++;
    }
    return { appliquees, traitees };
  };
  const p = file.then(run, run);
  file = p.catch(() => undefined);
  return p;
}
