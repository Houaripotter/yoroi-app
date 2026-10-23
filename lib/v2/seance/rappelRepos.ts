/**
 * Fin du repos de musculation quand l'app est en arrière plan (18 octobre 2026).
 * Le compte à rebours du repos (app/seance/muscu.tsx, RestBar) ne tourne qu'à l'écran : téléphone rangé dans la poche,
 * rien ne prévenait de la fin du repos. Ici :
 * 1. l'app passe en arrière plan pendant un repos : une notification locale est programmée pour la fin du repos ;
 * 2. annulée si l'app revient au premier plan (le compte à rebours reprend à l'écran), si le repos est sauté ou
 *    changé, ou si l'écran de séance se ferme (séance terminée) ;
 * 3. rien sans le réglage général des notifications, ni avec « Repos terminé » coupé (Pendant la séance),
 *    ni sans autorisation déjà donnée (aucune demande surprise ici).
 * La logique est pure et testée (__tests__/unit/rappelRepos.test.ts) ; useRappelFinRepos la branche sur l'app.
 */
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

export const TYPE_FIN_REPOS = 'rest_finished';

/** Délai en secondes jusqu'à la fin du repos, ou null s'il reste moins de 2 s (rien à programmer) */
export function delaiFinRepos(finMs: number | null | undefined, maintenant: number): number | null {
  if (typeof finMs !== 'number' || !Number.isFinite(finMs)) return null;
  const reste = finMs - maintenant;
  if (reste < 2000) return null;
  return Math.ceil(reste / 1000);
}

export type DepsRappelRepos = {
  maintenant: () => number;
  autorise: () => Promise<boolean>;
  /** programme la notification dans `secondes`, renvoie son identifiant */
  planifier: (secondes: number) => Promise<string | null>;
  annuler: (id: string) => Promise<void>;
};

export function creerRappelRepos(deps: DepsRappelRepos) {
  let id: string | null = null;
  let fin: number | null = null;
  let enArriere = false;
  // chaque changement invalide une programmation encore en cours (retour au premier plan pendant l'attente)
  let generation = 0;

  const annulerEnCours = async (): Promise<void> => {
    generation++;
    const ancien = id;
    id = null;
    if (ancien) await deps.annuler(ancien).catch(() => {});
  };

  const programmer = async (): Promise<void> => {
    await annulerEnCours();
    const ma = generation;
    const secondes = delaiFinRepos(fin, deps.maintenant());
    if (!enArriere || secondes === null) return;
    let ok = false;
    try {
      ok = await deps.autorise();
    } catch {
      ok = false;
    }
    if (!ok || ma !== generation) return;
    const nouveau = await deps.planifier(secondes).catch(() => null);
    if (!nouveau) return;
    if (ma !== generation) {
      await deps.annuler(nouveau).catch(() => {});
      return;
    }
    id = nouveau;
  };

  return {
    /** fin du repos (ms) ou null : repos sauté, terminé ou absent */
    changerFin(nouvelle: number | null | undefined): Promise<void> {
      fin = typeof nouvelle === 'number' ? nouvelle : null;
      return enArriere ? programmer() : annulerEnCours();
    },
    arrierePlan(): Promise<void> {
      enArriere = true;
      return programmer();
    },
    premierPlan(): Promise<void> {
      enArriere = false;
      return annulerEnCours();
    },
    /** écran de séance fermé */
    terminer(): Promise<void> {
      enArriere = false;
      fin = null;
      return annulerEnCours();
    },
    /** pour les tests */
    idProgramme: () => id,
  };
}

/* eslint-disable @typescript-eslint/no-require-imports */
function depsApp(titre: () => string): DepsRappelRepos {
  return {
    maintenant: () => Date.now(),
    autorise: async () => {
      const Notif = require('expo-notifications');
      const perm = await Notif.getPermissionsAsync();
      if (perm?.status !== 'granted') return false;
      const { notificationService } = require('@/lib/notificationService');
      const reglages = await notificationService.loadSettings();
      if (reglages?.enabled === false) return false;
      const { timerNotifications } = require('@/lib/timerNotifications');
      const minuteur = await timerNotifications.loadSettings();
      return minuteur?.restFinished !== false;
    },
    planifier: async (secondes) => {
      const Notif = require('expo-notifications');
      return Notif.scheduleNotificationAsync({
        content: { title: titre(), body: '', sound: 'default', data: { type: TYPE_FIN_REPOS } },
        trigger: { type: Notif.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondes },
      });
    },
    annuler: async (id) => {
      const Notif = require('expo-notifications');
      await Notif.cancelScheduledNotificationAsync(id);
    },
  };
}
/* eslint-enable @typescript-eslint/no-require-imports */

/** Branche le rappel de fin de repos sur l'écran de séance : `finMs` est la fin du repos en cours (ou null) */
export function useRappelFinRepos(finMs: number | null | undefined, titre: string): void {
  const rappel = useRef<ReturnType<typeof creerRappelRepos> | null>(null);
  const titreRef = useRef(titre);
  titreRef.current = titre;
  if (!rappel.current) rappel.current = creerRappelRepos(depsApp(() => titreRef.current));

  useEffect(() => {
    const r = rappel.current!;
    const sub = AppState.addEventListener('change', (etat) => {
      if (etat === 'background') void r.arrierePlan();
      else if (etat === 'active') void r.premierPlan();
    });
    return () => {
      sub.remove();
      void r.terminer();
    };
  }, []);

  useEffect(() => {
    void rappel.current!.changerFin(finMs ?? null);
  }, [finMs]);
}
