/**
 * Toucher une notification (18 octobre 2026) : où aller, et quand.
 * Avant, le toucher poussait l'écran après une attente fixe de 1,5 s : au démarrage à froid (ou quand iOS avait
 * lancé YOROI en arrière plan pour Apple Santé), la navigation n'était pas encore prête ou la route racine
 * redirigeait encore, et rien ne s'ouvrait. Les notifications Health Connect et la cloche ne portaient même pas
 * d'écran pour « séance terminée ».
 *
 * Maintenant : la cible est mise en attente (une seule, la dernière gagne, jamais deux fois le même toucher),
 * puis OuvertureNotifications.tsx l'ouvre quand la navigation est prête (même règle que les widgets).
 * Séance : sa carte de partage (/carte?moment=seance&id=) ; séance disparue : la liste de tes séances, avec un mot doux.
 * Aucun import React Native ici : tout se teste avec jest (__tests__/unit/notifToucher.test.ts).
 */
import { cheminDirect } from '@/lib/v2/nav/direct';

export type CibleNotif =
  | { type: 'seance'; ref: string }
  | { type: 'seances' }
  | { type: 'route'; href: string };

/** Types de notification de fin de séance (anciens et nouveaux) */
const TYPES_SEANCE = new Set(['workout_complete', 'workout_completed']);
const TYPES_SEANCES = new Set(['workouts_complete']);

export const ROUTE_SEANCES = '/(tabs)/seances';

/**
 * Notifications sans écran dans leurs données (le toucher n'ouvrait rien) : l'écran que leur texte promet.
 * Les rappels de pesée ouvrent la saisie de la pesée (« Ta pesée du jour »), pas la composition corporelle.
 */
const ROUTES_PAR_TYPE: Record<string, string> = {
  weekly_recap: '/(tabs)/progres',
  streak_at_risk: '/seance',
  smart_reminder: '/seance',
  pesee_habitude: '/pesee',
  weighing: '/pesee',
  citation: '/citations',
  coffre_du_jour: '/(tabs)/dojo',
};

/** Écrans de données qui ne sont pas des routes : le Dojo est un onglet */
const ECRANS_ONGLETS: Record<string, string> = { home: '/(tabs)', dojo: '/(tabs)/dojo' };
export const lienCarteSeance = (id: number | string): string => `/carte?moment=seance&id=${id}`;

/**
 * La cible d'une notification. `valide` est la lecture sûre de ses données (validateNotificationData, app/_layout.tsx) :
 * seuls ses champs servent à construire une route.
 */
export function cibleDeNotification(
  data: Record<string, unknown> | null | undefined,
  valide: { workoutId?: string; screen?: string; id?: string },
): CibleNotif | null {
  const type = typeof data?.type === 'string' ? data.type : '';
  if (TYPES_SEANCES.has(type)) return { type: 'seances' };
  if (valide.workoutId) return { type: 'seance', ref: valide.workoutId };
  // fin de séance sans identifiant (anciennes notifications Health Connect) : tes séances
  if (TYPES_SEANCE.has(type)) return { type: 'seances' };
  if (ROUTES_PAR_TYPE[type]) return { type: 'route', href: ROUTES_PAR_TYPE[type] };
  if (valide.screen) {
    const base = ECRANS_ONGLETS[valide.screen] ?? `/${valide.screen}`;
    const href = valide.id ? `${base}?id=${valide.id}` : base;
    return { type: 'route', href: cheminDirect(href) };
  }
  return null;
}

/** La même réponse (même notification, même bouton) n'ouvre qu'un écran : listener et lecture au démarrage peuvent la donner tous les deux */
export function cleReponse(r: { notification?: { request?: { identifier?: string }; date?: number }; actionIdentifier?: string } | null | undefined): string {
  const id = r?.notification?.request?.identifier ?? '';
  const date = r?.notification?.date ?? '';
  return `${id}|${date}|${r?.actionIdentifier ?? ''}`;
}

/** Où ouvrir une séance : l'id YOROI (chiffres) ou l'identifiant Apple Santé / Health Connect d'une ancienne notification */
export async function resoudreSeance(
  ref: string,
  deps: { parId: (id: number) => Promise<unknown | null>; parUuid: (uuid: string) => Promise<number | null> },
): Promise<number | null> {
  if (/^\d{1,12}$/.test(ref)) {
    const id = Number(ref);
    if (!(id > 0)) return null;
    try {
      return (await deps.parId(id)) ? id : null;
    } catch {
      return null;
    }
  }
  try {
    const id = await deps.parUuid(ref);
    return id && id > 0 ? id : null;
  } catch {
    return null;
  }
}

// ─── File d'attente (une cible, la dernière gagne) ───────────────────────────

let enAttente: CibleNotif | null = null;
const traitees = new Set<string>();
const abonnes = new Set<() => void>();

/** Met la cible en attente ; faux si ce toucher a déjà été traité */
export function deposerCible(cible: CibleNotif | null, cle: string): boolean {
  if (!cible) return false;
  if (cle && traitees.has(cle)) return false;
  if (cle) traitees.add(cle);
  enAttente = cible;
  abonnes.forEach((f) => {
    try {
      f();
    } catch {
      // un abonné en erreur ne bloque pas les autres
    }
  });
  return true;
}

export const cibleEnAttente = (): CibleNotif | null => enAttente;

export function prendreCible(): CibleNotif | null {
  const c = enAttente;
  enAttente = null;
  return c;
}

export function surCible(f: () => void): () => void {
  abonnes.add(f);
  return () => {
    abonnes.delete(f);
  };
}

/** Pour les tests */
export function reinitialiserCibles(): void {
  enAttente = null;
  traitees.clear();
  abonnes.clear();
}
