/**
 * Rappels de discipline (14 octobre 2026) : logique pure, testee (__tests__/unit/rappelsDiscipline.test.ts).
 *
 * Les choix de l'utilisateur (seance, pesee, eau, bilan du dimanche) sont proposes a l'ecran 7 de l'onboarding,
 * dans « Nouveautes de la 3.0 » et dans Reglages, Rappels. Rien n'est active par defaut.
 * Pas de nouveau stockage : chaque choix est ecrit dans le service qui existait deja (lib/v2/notifications/rappels.ts) :
 *  - seance : notificationService, bloc training (data.type 'training') ;
 *  - pesee : le rappel doux de lib/v2/pesee/rappelHabitude.ts (jamais si la pesee du jour est notee) ;
 *  - eau : notificationService, bloc hydration ;
 *  - bilan : lib/weeklyRecapNotification.ts (dimanche 19 h).
 * Jours : 0 = lundi a 6 = dimanche ici (comme l'onboarding) ; Date.getDay() (0 = dimanche) dans les services.
 */

import { traduire } from '@/lib/i18n/tr';
export type FrequencePesee = 'chaque_jour' | 'trois' | 'une';

export type ChoixRappels = {
  seance: {
    actif: boolean;
    /** 0 = lundi a 6 = dimanche */
    jours: number[];
    /** HH:MM */
    heure: string;
    /** jours pas encore touches : a l'onboarding, ce sont les jours d'entrainement choisis plus loin (ecran Rythme) */
    joursAuto: boolean;
  };
  pesee: { actif: boolean; frequence: FrequencePesee };
  eau: { actif: boolean };
  bilan: { actif: boolean };
};

export const JOURS_SEANCE_DEFAUT = [0, 2, 4];
export const HEURE_SEANCE_DEFAUT = '18:00';

export const CHOIX_RAPPELS_VIDE: ChoixRappels = {
  seance: { actif: false, jours: JOURS_SEANCE_DEFAUT, heure: HEURE_SEANCE_DEFAUT, joursAuto: true },
  pesee: { actif: false, frequence: 'chaque_jour' },
  eau: { actif: false },
  bilan: { actif: false },
};

/** Jours de pesee (0 = lundi) de chaque frequence */
export const JOURS_PESEE: Record<FrequencePesee, number[]> = {
  chaque_jour: [0, 1, 2, 3, 4, 5, 6],
  trois: [0, 2, 4],
  une: [0],
};

export const FREQUENCE_LABEL: Record<FrequencePesee, string> = {
  chaque_jour: traduire('Chaque matin'),
  trois: traduire('3 fois par semaine'),
  une: traduire('Le lundi'),
};

/** Jour 0 = lundi vers Date.getDay() (0 = dimanche), et retour */
export const lundiVersJs = (j: number) => (j + 1) % 7;
export const jsVersLundi = (j: number) => (j + 6) % 7;

const valides = (l: unknown): number[] =>
  Array.isArray(l) ? [...new Set(l.filter((j): j is number => Number.isInteger(j) && j >= 0 && j <= 6))].sort((a, b) => a - b) : [];

/** Frequence la plus proche d'une liste de jours de pesee (0 = lundi) */
export function frequenceDe(jours: number[] | undefined | null): FrequencePesee {
  const l = valides(jours);
  if (l.length === 0 || l.length >= 5) return 'chaque_jour';
  if (l.length === 1) return 'une';
  return 'trois';
}

export const auMoinsUnRappel = (c: ChoixRappels) => c.seance.actif || c.pesee.actif || c.eau.actif || c.bilan.actif;

/** Jours de seance retenus : les jours d'entrainement quand rien n'a ete touche, sinon le choix, jamais vide */
export function joursSeanceRetenus(c: ChoixRappels, joursEntrainement?: number[] | null): number[] {
  const auto = valides(joursEntrainement);
  if (c.seance.joursAuto && auto.length) return auto;
  const l = valides(c.seance.jours);
  return l.length ? l : JOURS_SEANCE_DEFAUT;
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const heureValide = (h: string | null | undefined, repli = HEURE_SEANCE_DEFAUT) => (h && HHMM.test(h) ? h : repli);

// ── Planification des seances ──────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');
export const isoDe = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Lundi (00:00) de la semaine de d */
export function lundiDe(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - jsVersLundi(d.getDay()));
}

/** Rappels de seance programmes d'avance : deux semaines, reprogrammes au lancement, au retour dans l'app et apres chaque seance */
export const HORIZON_JOURS = 14;

export type ContexteSeance = {
  /** jours de rappel, comme Date.getDay() (0 = dimanche) */
  jours: number[];
  /** HH:MM */
  heure: string;
  /** dates (AAAA-MM-JJ ou ISO) des seances deja notees */
  faites: string[];
  /** objectif de seances de la semaine (0 ou null : pas d'objectif) */
  objectifSemaine?: number | null;
  now: Date;
  horizon?: number;
};

/**
 * Dates des rappels de seance, calcul pur :
 *  - seulement tes jours, a ton heure, jamais dans le passe ;
 *  - pas de rappel un jour ou ta seance est deja notee ;
 *  - objectif de la semaine deja atteint : plus de rappel jusqu'a lundi.
 */
export function datesRappelSeance(ctx: ContexteSeance): Date[] {
  const m = HHMM.exec(ctx.heure);
  if (!m) return [];
  const h = Number(m[1]);
  const min = Number(m[2]);
  const jours = new Set(valides(ctx.jours));
  if (!jours.size) return [];
  const faites = new Set(ctx.faites.map((x) => String(x ?? '').slice(0, 10)).filter(Boolean));
  const lundi = lundiDe(ctx.now);
  const lundiIso = isoDe(lundi);
  const dimancheIso = isoDe(new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + 6));
  const faitesSemaine = [...faites].filter((x) => x >= lundiIso && x <= dimancheIso).length;
  const objectif = ctx.objectifSemaine && ctx.objectifSemaine > 0 ? ctx.objectifSemaine : 0;
  const atteint = objectif > 0 && faitesSemaine >= objectif;
  const out: Date[] = [];
  const n = ctx.horizon ?? HORIZON_JOURS;
  for (let k = 0; k < n; k++) {
    const date = new Date(ctx.now.getFullYear(), ctx.now.getMonth(), ctx.now.getDate() + k, h, min, 0, 0);
    if (date.getTime() <= ctx.now.getTime() + 60000) continue;
    if (!jours.has(date.getDay())) continue;
    const iso = isoDe(date);
    if (faites.has(iso)) continue;
    if (atteint && iso <= dimancheIso) continue;
    out.push(date);
  }
  return out;
}

// ── Textes : varies, motivants, jamais culpabilisants, aucun chiffre de sante ──

const NB = ' ';

export const MESSAGES_SEANCE: { title: string; body: string }[] = [
  { title: traduire('C’est ton jour'), body: traduire('Ta séance t’attend. La régularité fait le résultat.') },
  { title: 'On y va' + NB + '?', body: traduire('Même courte, une séance compte. Tu tiens ton rythme.') },
  { title: traduire('Ton créneau'), body: traduire('Tu avais prévu de t’entraîner aujourd’hui. YOROI t’attend pour la noter.') },
  { title: traduire('Un pas de plus'), body: traduire('Chaque séance construit la suivante. À toi de jouer.') },
  { title: traduire('Discipline'), body: traduire('Pas besoin d’être parfait, juste d’être là. Bonne séance.') },
  { title: traduire('L’heure du dojo'), body: traduire('Ton corps est prêt. Une séance de plus sur ton chemin.') },
];

export const MESSAGES_PESEE: string[] = [
  traduire('Ta pesée du jour t’attend, 10 secondes suffisent.'),
  traduire('Un passage sur la balance, et ta tendance reste juste.'),
  traduire('Pesée du matin : un geste simple pour suivre ton cap.'),
  traduire('Ta courbe se construit jour après jour. Note ta pesée quand tu veux.'),
];

/** Message du jour : il change d'un jour a l'autre, toujours le meme pour une date donnee */
export function indexDuJour(d: Date, n: number): number {
  const jour = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
  return ((jour % n) + n) % n;
}

export const messageSeance = (d: Date) => MESSAGES_SEANCE[indexDuJour(d, MESSAGES_SEANCE.length)];
export const messagePesee = (d: Date) => MESSAGES_PESEE[indexDuJour(d, MESSAGES_PESEE.length)];

/** Les reglages lus dans les services, vers le choix affiche (tout eteint sans autorisation du systeme) */
export function choixDepuisServices(e: {
  autorise: boolean;
  training: { enabled: boolean; time: string; days: number[] } | null;
  hydratation: boolean;
  pesee: { actif: boolean; joursJs?: number[] } | null;
  bilan: boolean;
}): ChoixRappels {
  const t = e.training;
  const joursSeance = t ? valides(t.days).map(jsVersLundi).sort((a, b) => a - b) : [];
  return {
    seance: {
      actif: e.autorise && !!t?.enabled,
      jours: joursSeance.length ? joursSeance : JOURS_SEANCE_DEFAUT,
      heure: heureValide(t?.time),
      joursAuto: false,
    },
    pesee: { actif: e.autorise && !!e.pesee?.actif, frequence: frequenceDe((e.pesee?.joursJs ?? []).map(jsVersLundi)) },
    eau: { actif: e.autorise && e.hydratation },
    bilan: { actif: e.autorise && e.bilan },
  };
}
