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
import { AppState, Platform } from 'react-native';
import { contenuNotificationSur } from '@/lib/v2/notifications/contenuSur';
import { annulerAlarmeRepos, delaiRetraitPremierPlan, estIdAlarme, programmerAlarmeRepos, chargerSonnerieRepos, retirerAlarmeRepos, retirerToutesAlarmesRepos } from '@/lib/v2/seances/alarmeRepos';

export const TYPE_FIN_REPOS = 'rest_finished';
const CLE_DEMANDE = 'yoroi_rappel_repos_demande_v1';

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
  /** programme la notification dans `secondes` (fin exacte en ms : finMs), renvoie son identifiant */
  planifier: (secondes: number, finMs?: number) => Promise<string | null>;
  annuler: (id: string) => Promise<void>;
};

/**
 * 26 octobre 2026 (retour d'un utilisateur : « en veille, ca ne sonne pas ») : la notification est programmee
 * DES LE DEBUT du repos, app ouverte. Avant, elle l'etait au passage en arriere plan : le travail (lire les
 * reglages, programmer) commencait au moment ou iOS endort l'app, et n'aboutissait pas toujours.
 * App ouverte a la fin du repos, la notification ne s'affiche pas (estRappelReposMasque, gestionnaire des
 * notifications) : le bip et la vibration de l'ecran suffisent.
 */
export function creerRappelRepos(deps: DepsRappelRepos) {
  let id: string | null = null;
  let fin: number | null = null;
  // chaque changement invalide une programmation encore en cours
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
    if (secondes === null) return;
    let ok = false;
    try {
      ok = await deps.autorise();
    } catch {
      ok = false;
    }
    if (!ok || ma !== generation) return;
    const nouveau = await deps.planifier(secondes, fin ?? undefined).catch(() => null);
    if (!nouveau) return;
    if (ma !== generation) {
      await deps.annuler(nouveau).catch(() => {});
      return;
    }
    id = nouveau;
  };

  return {
    /** fin du repos (ms) ou null : repos saute, termine ou absent */
    changerFin(nouvelle: number | null | undefined): Promise<void> {
      const f = typeof nouvelle === 'number' ? nouvelle : null;
      if (f === fin && (id || f === null)) return Promise.resolve();
      fin = f;
      return programmer();
    },
    /** filet de securite : si la programmation du debut du repos a echoue, on retente */
    arrierePlan(): Promise<void> {
      return id ? Promise.resolve() : programmer();
    },
    /** app au premier plan : la notification reste programmee (masquee si l'app est ouverte a ce moment) */
    premierPlan(): Promise<void> {
      return Promise.resolve();
    },
    /** ecran de seance ferme */
    terminer(): Promise<void> {
      fin = null;
      return annulerEnCours();
    },
    /** pour les tests */
    idProgramme: () => id,
  };
}

/** App ouverte : la fin du repos se voit et s'entend a l'ecran, la notification ne s'affiche pas */
export function estRappelReposMasque(type: unknown, etatApp: string): boolean {
  return type === TYPE_FIN_REPOS && etatApp === 'active';
}

/* eslint-disable @typescript-eslint/no-require-imports */
/** Le rappel de fin de repos est permis : autorisation donnée, notifications et « Repos terminé » actifs */
export async function rappelReposAutorise(): Promise<boolean> {
  const Notif = require('expo-notifications');
  let perm = await Notif.getPermissionsAsync();
  // 26 octobre 2026 : jamais demande ? on demande une fois, au premier repos (l'utilisateur comprend pourquoi)
  if (perm?.status === 'undetermined' && perm?.canAskAgain !== false) {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const deja = await AsyncStorage.getItem(CLE_DEMANDE).catch(() => null);
    if (!deja) {
      await AsyncStorage.setItem(CLE_DEMANDE, '1').catch(() => {});
      perm = await Notif.requestPermissionsAsync().catch(() => perm);
    }
  }
  if (perm?.status !== 'granted') return false;
  const { notificationService } = require('@/lib/notificationService');
  const reglages = await notificationService.loadSettings();
  if (reglages?.enabled === false) return false;
  const { timerNotifications } = require('@/lib/timerNotifications');
  const minuteur = await timerNotifications.loadSettings();
  return minuteur?.restFinished !== false;
}

/** 25 octobre 2026 : le rappel programmé par un appui dans la Dynamic Island (ios/YoroiWidgets/Partage/SeanceIle.swift) */
export const ID_RAPPEL_ILE = 'yoroi.seance.ile.repos';
/** 26 octobre 2026 : le rappel de fin de repos de l'ecran de seance */
export const ID_RAPPEL_REPOS = 'yoroi.seance.repos';

/** Seance terminee ou abandonnee : plus aucun rappel de repos */
export async function retirerRappelsRepos(): Promise<void> {
  // 31 octobre 2026 : ni l'alarme de fin de repos (lib/v2/seances/alarmeRepos.ts)
  await retirerToutesAlarmesRepos().catch(() => {});
  try {
    const Notif = require('expo-notifications');
    await Notif.cancelScheduledNotificationAsync(ID_RAPPEL_REPOS).catch(() => {});
    await Notif.cancelScheduledNotificationAsync(ID_RAPPEL_ILE).catch(() => {});
  } catch {
    // rien de programme
  }
}

/** De retour dans l'app, le compte à rebours reprend à l'écran : le rappel de la Dynamic Island n'a plus lieu d'être */
export async function retirerRappelIle(): Promise<void> {
  try {
    const Notif = require('expo-notifications');
    await Notif.cancelScheduledNotificationAsync(ID_RAPPEL_ILE);
  } catch {
    // rien de programme
  }
}

/** « Repos terminé » (Pendant la séance) n'est pas coupé : l'alarme le respecte comme la notification */
async function finReposVoulue(): Promise<boolean> {
  try {
    const { timerNotifications } = require('@/lib/timerNotifications');
    const minuteur = await timerNotifications.loadSettings();
    return minuteur?.restFinished !== false;
  } catch {
    return true;
  }
}

/** Son du minuteur YOROI (wizz) pour la notification, comme les autres minuteurs ; 'default' si indisponible */
function sonFinRepos(): string {
  try {
    return (require('@/lib/timerNotifications') as typeof import('@/lib/timerNotifications')).timerSound();
  } catch {
    return 'default';
  }
}

/**
 * La requete exacte passee a expo-notifications pour la fin du repos (testee, __tests__/unit/contenuNotificationSur.test.ts).
 * Identifiant fixe : un nouveau repos remplace l'ancien, et la fin de seance le retire.
 */
export function requeteFinRepos(o: { titre: unknown; corps: unknown; secondes: number; sonnerie: boolean; son: unknown; os: string; typeIntervalle?: unknown }) {
  const secondes = Math.max(1, Math.round(Number(o.secondes) || 1));
  return {
    identifier: ID_RAPPEL_REPOS,
    content: contenuNotificationSur(
      {
        title: o.titre,
        body: o.corps,
        sound: o.sonnerie ? o.son : 'default',
        data: { type: TYPE_FIN_REPOS },
        ...(o.sonnerie ? { interruptionLevel: 'timeSensitive' } : {}),
      },
      o.os,
    ),
    trigger: { type: typeof o.typeIntervalle === 'string' ? o.typeIntervalle : 'timeInterval', seconds: secondes },
  };
}

function depsApp(titre: () => string, corps: () => string = () => ''): DepsRappelRepos {
  return {
    maintenant: () => Date.now(),
    // 31 octobre 2026 : l'autorisation est verifiee dans planifier, par voie (alarme, puis notification)
    autorise: async () => true,
    planifier: async (secondes, finMs) => {
      // 31 octobre 2026 : d'abord l'alarme du systeme (AlarmKit, iOS 26), qui sonne comme le minuteur d'Apple
      if (await finReposVoulue()) {
        const fin = typeof finMs === 'number' ? finMs : Date.now() + secondes * 1000;
        const alarme = await programmerAlarmeRepos(fin, titre(), corps());
        if (alarme) return alarme;
      }
      if (!(await rappelReposAutorise())) return null;
      const Notif = require('expo-notifications');
      // Sonnerie de fin de repos allumee, sans alarme possible : son du minuteur et niveau urgent (time sensitive)
      const sonnerie = await chargerSonnerieRepos();
      // 1er novembre 2026 : types stricts pour le systeme (plantage _CFAssertMismatchedTypeID en Debug)
      return Notif.scheduleNotificationAsync(requeteFinRepos({ titre: titre(), corps: corps(), secondes, sonnerie, son: sonnerie ? sonFinRepos() : 'default', os: Platform.OS, typeIntervalle: Notif.SchedulableTriggerInputTypes?.TIME_INTERVAL }));
    },
    annuler: async (id) => {
      if (estIdAlarme(id)) {
        await annulerAlarmeRepos(id);
        return;
      }
      const Notif = require('expo-notifications');
      await Notif.cancelScheduledNotificationAsync(id);
    },
  };
}
/* eslint-enable @typescript-eslint/no-require-imports */

/** Branche le rappel de fin de repos sur l'écran de séance : `finMs` est la fin du repos en cours (ou null) */
export function useRappelFinRepos(finMs: number | null | undefined, titre: string, corps = ''): void {
  const rappel = useRef<ReturnType<typeof creerRappelRepos> | null>(null);
  const titreRef = useRef(titre);
  titreRef.current = titre;
  // 30 octobre 2026 : la suite (« Ensuite : Développé couché, série 2 ») sous « Repos terminé »
  const corpsRef = useRef(corps);
  corpsRef.current = corps;
  if (!rappel.current) rappel.current = creerRappelRepos(depsApp(() => titreRef.current, () => corpsRef.current));

  useEffect(() => {
    const r = rappel.current!;
    const sub = AppState.addEventListener('change', (etat) => {
      if (etat === 'background') void r.arrierePlan();
      else if (etat === 'active') {
        void r.premierPlan();
        void retirerRappelIle();
      }
    });
    // 26 octobre 2026 : seance reduite (ecran ferme, seance toujours en cours) : le rappel reste programme.
    // Il est retire quand la seance se termine ou est abandonnee (clearDraft, lib/v2/seance/model.ts).
    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    void rappel.current!.changerFin(finMs ?? null);
  }, [finMs]);

  // 31 octobre 2026 : app ouverte a la fin du repos, l'ecran sonne deja (RestBar) : l'alarme du systeme est
  // retiree 1,5 s avant, pour ne pas sonner deux fois. Telephone verrouille, ce minuteur JS ne tourne pas :
  // l'alarme sonne.
  useEffect(() => {
    const d = delaiRetraitPremierPlan(finMs, Date.now());
    if (d === null) return;
    const t = setTimeout(() => {
      if (AppState.currentState === 'active' && estIdAlarme(rappel.current?.idProgramme())) void retirerAlarmeRepos();
    }, d);
    return () => clearTimeout(t);
  }, [finMs]);
}
