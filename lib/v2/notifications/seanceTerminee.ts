/**
 * Notification « séance terminée » (18 octobre 2026) : une seule notification par séance, et seulement pour une séance
 * qui vient de finir. Avant, chaque synchro (observateur Apple Santé, retour au premier plan, synchro complète,
 * Health Connect) pouvait renvoyer « Beau match de foot » pour des séances anciennes ou déjà notifiées :
 * l'anti doublon n'était qu'en mémoire (30 s, perdu à chaque relance de l'app) et les empreintes d'import étaient
 * effacées ou réécrites par d'autres chemins.
 *
 * Règles :
 * 1. seulement une séance terminée il y a moins de FENETRE_RECENTE_MS (jamais lors d'un import d'historique) ;
 * 2. jamais deux fois la même séance : ses clés (identifiant Apple Santé ou Health Connect, heure de début) sont
 *    mémorisées dans AsyncStorage, et survivent aux relances et aux réimports ;
 * 3. plusieurs séances arrivées ensemble (une synchro) : une seule notification groupée ;
 * 4. réglages : notifications coupées ou « Carte à partager » coupée, rien ne part (la séance reste dans le carnet).
 * Les données de la notification portent l'identifiant de la séance : le toucher ouvre sa carte (./toucher.ts).
 * La partie de décision est pure et testée (__tests__/unit/notifSeanceTerminee.test.ts).
 */

export const NOTIFIEES_KEY = '@yoroi_seances_notifiees_v1';
/** Une séance finie depuis plus longtemps n'est plus « qui vient de finir » */
export const FENETRE_RECENTE_MS = 3 * 60 * 60 * 1000;
/** Petite avance tolérée (horloge de la montre un peu en avance) */
const AVANCE_TOLEREE_MS = 10 * 60 * 1000;
/** Les séances arrivées dans ce délai partent dans la même notification */
export const REGROUPEMENT_MS = 4000;
const MAX_MEMOIRE = 600;

export const TYPE_SEANCE = 'workout_complete';
export const TYPE_SEANCES = 'workouts_complete';

export type SeanceTerminee = {
  /** id de la séance dans YOROI (table trainings) */
  trainingId: number;
  /** titre déjà choisi (« Beau match de foot ») */
  titre: string;
  /** début de la séance (ISO) */
  debutIso: string;
  /** fin (ISO), sinon début + durée */
  finIso?: string;
  dureeMin?: number;
  /** identifiant Apple Santé ou Health Connect */
  uuid?: string;
  /** « Apple Watch », « Garmin »... */
  source?: string;
  /** clé du sport (pour l'historique de la cloche) */
  sport?: string;
};

export type ContenuNotif = {
  title: string;
  body: string;
  subtitle?: string;
  categoryIdentifier?: string;
  data: Record<string, string>;
};

const ms = (iso?: string): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
};

/** Fin de la séance en millisecondes (null si illisible) */
export function finSeanceMs(s: Pick<SeanceTerminee, 'debutIso' | 'finIso' | 'dureeMin'>): number | null {
  const fin = ms(s.finIso);
  if (fin !== null) return fin;
  const debut = ms(s.debutIso);
  if (debut === null) return null;
  const d = Number(s.dureeMin);
  return debut + (Number.isFinite(d) && d > 0 ? d : 0) * 60000;
}

/** Les clés d'une séance : son identifiant de source, et son heure de début à la minute (même séance vue par deux chemins) */
export function clesSeance(s: Pick<SeanceTerminee, 'uuid' | 'debutIso'>): string[] {
  const cles: string[] = [];
  if (s.uuid) cles.push(`id:${s.uuid}`);
  const debut = ms(s.debutIso);
  if (debut !== null) cles.push(`debut:${Math.floor(debut / 60000)}`);
  return cles;
}

/** Vrai si la séance vient de finir (moins de `fenetre`) */
export function estRecente(s: Pick<SeanceTerminee, 'debutIso' | 'finIso' | 'dureeMin'>, maintenant: number, fenetre: number = FENETRE_RECENTE_MS): boolean {
  const fin = finSeanceMs(s);
  if (fin === null) return false;
  if (fin > maintenant + AVANCE_TOLEREE_MS) return false;
  return maintenant - fin <= fenetre;
}

/** Les séances à notifier : récentes, bien enregistrées, jamais notifiées, sans doublon entre elles. La plus récente d'abord. */
export function choisirANotifier(seances: SeanceTerminee[], deja: Set<string>, maintenant: number): SeanceTerminee[] {
  const vues = new Set(deja);
  const choisies: SeanceTerminee[] = [];
  const triees = [...seances].sort((a, b) => (finSeanceMs(b) ?? 0) - (finSeanceMs(a) ?? 0));
  for (const s of triees) {
    if (!(Number(s.trainingId) > 0)) continue;
    if (!estRecente(s, maintenant)) continue;
    const cles = clesSeance(s);
    if (!cles.length || cles.some((c) => vues.has(c))) continue;
    cles.forEach((c) => vues.add(c));
    choisies.push(s);
  }
  return choisies;
}

/** Le contenu : une séance, sa carte ; plusieurs, une notification groupée qui ouvre tes séances */
export function contenuPour(choisies: SeanceTerminee[]): ContenuNotif | null {
  if (!choisies.length) return null;
  if (choisies.length === 1) {
    const s = choisies[0];
    const lignes: string[] = [];
    if (s.source) lignes.push(`Via ${s.source}`);
    lignes.push('Tape pour partager ta séance !');
    return {
      title: s.titre || 'Belle séance',
      body: lignes.join('\n'),
      subtitle: s.source || undefined,
      categoryIdentifier: TYPE_SEANCE,
      data: {
        type: TYPE_SEANCE,
        workoutId: String(s.trainingId),
        ...(s.sport ? { sport: s.sport } : {}),
      },
    };
  }
  return {
    title: `${choisies.length} séances ajoutées`,
    body: 'Tape pour les voir et choisir celle à partager.',
    data: { type: TYPE_SEANCES, workoutIds: choisies.map((s) => String(s.trainingId)).join(',') },
  };
}

/** La mémoire des séances notifiées, bornée (les plus récentes gardées) */
export function memoriser(avant: string[], nouvelles: string[], max: number = MAX_MEMOIRE): string[] {
  const tout = [...avant.filter((c) => !nouvelles.includes(c)), ...nouvelles];
  return tout.slice(-max);
}

// ─── Envoi (dépendances injectées : testable) ─────────────────────────────────

export type DepsNotifieur = {
  maintenant: () => number;
  lire: (cle: string) => Promise<string | null>;
  ecrire: (cle: string, valeur: string) => Promise<void>;
  /** réglages de notifications : vrai si on peut envoyer */
  autorise: () => Promise<boolean>;
  envoyer: (c: ContenuNotif) => Promise<void>;
  /** minuterie du regroupement (setTimeout par défaut) */
  plusTard?: (f: () => void, delai: number) => unknown;
};

export function creerNotifieur(deps: DepsNotifieur) {
  let file: SeanceTerminee[] = [];
  let minuterie = false;
  let chaine: Promise<void> = Promise.resolve();
  const plusTard = deps.plusTard ?? ((f: () => void, d: number) => setTimeout(f, d));

  const lireMemoire = async (): Promise<string[]> => {
    try {
      const raw = await deps.lire(NOTIFIEES_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map(String) : [];
    } catch {
      return [];
    }
  };

  const traiter = async (): Promise<void> => {
    const lot = file;
    file = [];
    if (!lot.length) return;
    const memoire = await lireMemoire();
    const choisies = choisirANotifier(lot, new Set(memoire), deps.maintenant());
    if (!choisies.length) return;
    // mémorisées avant l'envoi : une erreur ou une synchro concurrente ne renvoie jamais la même séance
    const cles = choisies.flatMap(clesSeance);
    await deps.ecrire(NOTIFIEES_KEY, JSON.stringify(memoriser(memoire, cles))).catch(() => {});
    let ok = false;
    try {
      ok = await deps.autorise();
    } catch {
      ok = false;
    }
    if (!ok) return;
    const contenu = contenuPour(choisies);
    if (contenu) await deps.envoyer(contenu);
  };

  /** Vide la file tout de suite (les envois se suivent, jamais en parallèle) */
  const vider = (): Promise<void> => {
    minuterie = false;
    chaine = chaine.then(traiter).catch(() => {});
    return chaine;
  };

  /** Signale une séance tout juste enregistrée ; l'envoi part après REGROUPEMENT_MS (groupé avec les suivantes) */
  const signaler = (s: SeanceTerminee): void => {
    file.push(s);
    if (minuterie) return;
    minuterie = true;
    plusTard(() => {
      void vider();
    }, REGROUPEMENT_MS);
  };

  return { signaler, vider };
}

// ─── Instance de l'app ─────────────────────────────────────────────────────────

let instance: ReturnType<typeof creerNotifieur> | null = null;

function notifieurApp() {
  if (instance) return instance;
  /* eslint-disable @typescript-eslint/no-require-imports */
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  instance = creerNotifieur({
    maintenant: () => Date.now(),
    lire: (k) => AsyncStorage.getItem(k),
    ecrire: (k, v) => AsyncStorage.setItem(k, v),
    autorise: async () => {
      const { notificationService } = require('@/lib/notificationService');
      const r = await notificationService.loadSettings();
      return r?.enabled !== false && r?.socialCards?.enabled !== false;
    },
    envoyer: async (c) => {
      const Notif = require('expo-notifications');
      const { contenuSansSante } = require('./texte');
      const { saveNotification } = require('@/lib/notificationHistoryService');
      const propre = contenuSansSante({ title: c.title, body: c.body });
      await Notif.scheduleNotificationAsync({
        content: {
          title: propre.title,
          body: propre.body,
          subtitle: c.subtitle,
          categoryIdentifier: c.categoryIdentifier,
          data: c.data,
          sound: 'default',
        },
        trigger: null,
      });
      saveNotification(propre.title, propre.body, c.data.type, c.data).catch(() => {});
    },
  });
  /* eslint-enable @typescript-eslint/no-require-imports */
  return instance;
}

/** À appeler quand une séance importée vient d'être enregistrée (observateur Apple Santé, Health Connect) */
export function signalerSeanceTerminee(s: SeanceTerminee): void {
  try {
    notifieurApp().signaler(s);
  } catch {
    // jamais bloquant pour l'import
  }
}
