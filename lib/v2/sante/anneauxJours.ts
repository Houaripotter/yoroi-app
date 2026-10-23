/**
 * Anneaux jour par jour (19 octobre 2026), a la facon d'Apple Forme. Houari : une rangee de 7 petits anneaux
 * (lundi a dimanche) dans la carte « Aujourd'hui », toucher un jour montre ses donnees, toucher le gros anneau
 * ouvre l'historique (app/sante/anneaux.tsx).
 *
 * Memes regles que l'anneau du jour (lib/v2/accueil/enPlus.ts, santeDuJour et activiteAvecSeances) :
 *   pas et calories actives : Apple Sante ou Health Connect ;
 *   minutes d'exercice : la plus grande valeur entre Sante et tes seances notees dans YOROI ce jour-la
 *   (sur Android, les minutes de Health Connect viennent seulement de ses seances, lib/healthConnect.android.ts) ;
 *   objectifs : ceux de l'app (repere 8 000 pas, tes objectifs Exercice et Calories de l'ecran Sante).
 * Rien d'invente : un jour sans donnee vaut null (« Pas de donnée »), jamais 0.
 * Dates : toujours le jour LOCAL (AAAA-MM-JJ), calculs a midi pour ne jamais glisser au changement d'heure.
 *
 * Cache : l'historique lu dans Sante est garde 10 minutes en memoire (un toucher ne relit jamais Sante) ;
 * les series deja lues par l'accueil y sont retenues et priment (elles portent la valeur des anneaux du jour).
 * Aucun import React Native ici : tout se teste avec jest.
 */
import type { Training } from '@/lib/database';
import { activiteAvecSeances, objectifMesure, santeDuJour } from '@/lib/v2/accueil/enPlus';
import type { MesureSanteJour, ObjectifsSante } from '@/lib/v2/accueil/enPlus';

export type Point = { date: string; value: number };
export type SeriesJour = Partial<Record<string, Point[] | null | undefined>>;

/** Les trois anneaux, de l'exterieur vers l'interieur (meme ordre que ORDRE_ACTIVITE) */
export const CLES_ANNEAUX = ['pas', 'exercice', 'energie-active'] as const;
export type CleAnneau = (typeof CLES_ANNEAUX)[number];

export const LETTRES_JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const NOMS_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_COURT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const p2 = (n: number) => String(n).padStart(2, '0');
const maj = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Jour local AAAA-MM-JJ d'un instant (jamais toISOString, qui donne le jour UTC) */
export function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/** Le jour a midi (heure locale) : ajouter des jours ne glisse jamais au changement d'heure */
function midi(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T12:00:00`);
}

export function ajouterJours(iso: string, n: number): string {
  const d = midi(iso);
  d.setDate(d.getDate() + n);
  return isoLocal(d);
}

/** Le lundi de la semaine d'un jour (semaine du lundi au dimanche) */
export function lundiDe(iso: string): string {
  const d = midi(iso);
  return ajouterJours(iso, -((d.getDay() + 6) % 7));
}

/** Les 7 jours de la semaine d'un jour, du lundi au dimanche */
export function semaineDe(iso: string): string[] {
  const l = lundiDe(iso);
  return Array.from({ length: 7 }, (_, i) => ajouterJours(l, i));
}

/** Nombre de jours de a vers b (b - a), en jours entiers */
export function ecartJours(a: string, b: string): number {
  return Math.round((midi(b).getTime() - midi(a).getTime()) / 86400000);
}

/* ============ Libelles ============ */

/** « Aujourd’hui », « Hier », sinon « Mercredi 15 oct. » */
export function titreJour(iso: string, aujourdhui: string): string {
  if (iso === aujourdhui) return 'Aujourd’hui';
  if (iso === ajouterJours(aujourdhui, -1)) return 'Hier';
  const d = midi(iso);
  return `${maj(NOMS_JOURS[d.getDay()])} ${d.getDate()} ${MOIS_COURT[d.getMonth()]}`;
}

/** « Mercredi 15 octobre » (l'annee seulement si ce n'est pas celle d'aujourd'hui) */
export function jourLong(iso: string, aujourdhui?: string): string {
  const d = midi(iso);
  const annee = aujourdhui && aujourdhui.slice(0, 4) !== iso.slice(0, 4) ? ` ${d.getFullYear()}` : '';
  return `${maj(NOMS_JOURS[d.getDay()])} ${d.getDate()} ${MOIS[d.getMonth()]}${annee}`;
}

/** Le nom du jour seul, pour l'accessibilite : « lundi 13 octobre » */
export function jourA11y(iso: string): string {
  const d = midi(iso);
  return `${NOMS_JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

/** « 15 sept. au 19 oct. » */
export function libellePeriode(debut: string, fin: string): string {
  const a = midi(debut);
  const b = midi(fin);
  const annee = a.getFullYear() !== b.getFullYear() ? ` ${a.getFullYear()}` : '';
  return `${a.getDate()} ${MOIS_COURT[a.getMonth()]}${annee} au ${b.getDate()} ${MOIS_COURT[b.getMonth()]}`;
}

/* ============ Les donnees d'un jour ============ */

/**
 * Les mesures de Sante d'un jour donne, avec tes seances YOROI pour l'exercice. Pour aujourd'hui, exactement la
 * tuile du jour (une mesure de la nuit peut venir d'hier, signalee). Pour un autre jour : seulement les mesures
 * datees de ce jour-la.
 */
export function mesuresDuJour(series: SeriesJour | null | undefined, trainings: Training[] | null | undefined, iso: string, aujourdhui: string): MesureSanteJour[] {
  const base = santeDuJour(series, iso).filter((m) => iso === aujourdhui || !m.hier);
  return activiteAvecSeances(base, trainings, iso);
}

export type AnneauxJour = {
  date: string;
  /** null : pas de donnee ce jour-la (jamais un 0 invente) */
  pas: number | null;
  exercice: number | null;
  kcal: number | null;
  /** jour a venir (dans la semaine en cours) */
  futur: boolean;
};

export function anneauxDesMesures(mesures: MesureSanteJour[], iso: string, aujourdhui: string): AnneauxJour {
  const v = (cle: string) => {
    const m = mesures.find((x) => x.cle === cle);
    return m && Number.isFinite(m.valeur) && m.valeur > 0 ? m.valeur : null;
  };
  return { date: iso, pas: v('pas'), exercice: v('exercice'), kcal: v('energie-active'), futur: iso > aujourdhui };
}

export function anneauxDuJour(series: SeriesJour | null | undefined, trainings: Training[] | null | undefined, iso: string, aujourdhui: string): AnneauxJour {
  if (iso > aujourdhui) return { date: iso, pas: null, exercice: null, kcal: null, futur: true };
  return anneauxDesMesures(mesuresDuJour(series, trainings, iso, aujourdhui), iso, aujourdhui);
}

export function aUneDonnee(a: AnneauxJour | null | undefined): boolean {
  return !!a && (a.pas !== null || a.exercice !== null || a.kcal !== null);
}

/** Les 7 jours de la semaine d'un jour (lundi a dimanche) ; aujourdhuiMesures remplace le calcul pour aujourd'hui */
export function semaineAnneaux(series: SeriesJour | null | undefined, trainings: Training[] | null | undefined, aujourdhui: string, aujourdhuiMesures?: MesureSanteJour[] | null): AnneauxJour[] {
  return semaineDe(aujourdhui).map((iso) => (iso === aujourdhui && aujourdhuiMesures ? anneauxDesMesures(aujourdhuiMesures, iso, aujourdhui) : anneauxDuJour(series, trainings, iso, aujourdhui)));
}

/** Les cibles des trois anneaux : objectifs de l'app (repere 8 000 pas, 30 min, 500 kcal par defaut) */
export function ciblesAnneaux(o: ObjectifsSante | null | undefined): { pas: number | null; exercice: number | null; kcal: number | null } {
  return {
    pas: objectifMesure('pas', o)?.cible ?? null,
    exercice: objectifMesure('exercice', o)?.cible ?? null,
    kcal: objectifMesure('energie-active', o)?.cible ?? null,
  };
}

/** La part de chaque anneau (pas, exercice, calories), de 0 a 2 tours ; 0 sans donnee ou sans objectif */
export function partsAnneaux(a: AnneauxJour | null | undefined, o: ObjectifsSante | null | undefined): [number, number, number] {
  const c = ciblesAnneaux(o);
  const p = (v: number | null | undefined, cible: number | null) => (a && v !== null && v !== undefined && cible && cible > 0 ? Math.max(0, Math.min(2, v / cible)) : 0);
  return [p(a?.pas, c.pas), p(a?.exercice, c.exercice), p(a?.kcal, c.kcal)];
}

/** Valeur exacte d'une serie pour un jour (null si rien ce jour-la) */
export function valeurDuJour(serie: Point[] | null | undefined, iso: string): number | null {
  const x = (serie ?? []).find((p) => p && (p.date ?? '').slice(0, 10) === iso && Number.isFinite(p.value) && p.value > 0);
  return x ? x.value : null;
}

/** La nuit notee pour un jour (datee du matin du reveil), null sinon */
export function nuitDuJour<T extends { date: string; duration: number }>(nuits: T[] | null | undefined, iso: string): T | null {
  return (nuits ?? []).find((n) => (n?.date ?? '').slice(0, 10) === iso && Number.isFinite(n.duration) && n.duration > 0) ?? null;
}

/** L'eau d'un jour passe, depuis l'historique de l'eau ; null si rien n'est note */
export function eauDuJour(historique: { date: string; amount: number; goal?: number }[] | null | undefined, iso: string): { amount: number; goal: number | null } | null {
  const x = (historique ?? []).find((h) => {
    const d = String(h?.date ?? '');
    // ancien format possible : Date.toDateString() ; on compare alors le jour local
    const jour = /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : Number.isFinite(new Date(d).getTime()) ? isoLocal(new Date(d)) : '';
    return jour === iso;
  });
  if (!x || !(Number(x.amount) > 0)) return null;
  const a = Number(x.amount);
  // litres ou millilitres selon les versions
  const amount = a >= 20 ? a / 1000 : a;
  const g = Number(x.goal);
  return { amount, goal: Number.isFinite(g) && g > 0 ? (g >= 20 ? g / 1000 : g) : null };
}

/* ============ Calendrier de l'historique ============ */

export type PageCalendrier = { debut: string; fin: string; jours: string[] };

/**
 * Pages de l'historique, de la plus recente (0) a la plus ancienne : chaque page fait 5 semaines entieres
 * (lundi a dimanche), la premiere finit le dimanche de la semaine en cours (les jours a venir y sont grises).
 */
export function pagesCalendrier(aujourdhui: string, nombre: number, semaines = 5): PageCalendrier[] {
  const dernierLundi = lundiDe(aujourdhui);
  const out: PageCalendrier[] = [];
  for (let p = 0; p < nombre; p++) {
    const debut = ajouterJours(dernierLundi, -7 * (semaines * (p + 1) - 1));
    const jours = Array.from({ length: semaines * 7 }, (_, i) => ajouterJours(debut, i));
    out.push({ debut, fin: jours[jours.length - 1], jours });
  }
  return out;
}

/** La page qui contient un jour (0 = la plus recente) */
export function pageDuJour(aujourdhui: string, iso: string, semaines = 5): number {
  const semainesAvant = Math.floor(ecartJours(lundiDe(iso), lundiDe(aujourdhui)) / 7);
  return Math.max(0, Math.floor(semainesAvant / semaines));
}

/** Combien de jours d'historique lire pour afficher n pages (et la suivante, prete pour le balayage) */
export function joursPourPages(n: number, semaines = 5): number {
  return Math.min(365, (n + 1) * semaines * 7);
}

/* ============ Cache des lectures ============ */

export const DUREE_CACHE_MS = 10 * 60 * 1000;

type Entree = { t: number; jours: number; series: SeriesJour };
const cache = new Map<string, Entree>();
const enCours = new Map<string, { jours: number; p: Promise<SeriesJour> }>();
let seriesAccueil: SeriesJour | null = null;

/** Les series que l'accueil vient de lire (30 jours, valeur des anneaux du jour comprise) : rien a relire */
export function retenirSeriesAccueil(series: SeriesJour | null | undefined): void {
  if (series) seriesAccueil = series;
}

export function seriesDeLAccueil(): SeriesJour | null {
  return seriesAccueil;
}

/** Vide le cache (tirer pour actualiser, tests) */
export function viderCacheAnneaux(toutEffacer = false): void {
  cache.clear();
  enCours.clear();
  if (toutEffacer) seriesAccueil = null;
}

/**
 * Fusion jour par jour des trois series des anneaux : la plus recente prime (l'accueil, aligne sur le resume
 * d'activite de la montre), l'historique comble les autres jours. Les autres mesures viennent de la plus recente.
 */
export function fusionnerSeries(historique: SeriesJour | null | undefined, recente: SeriesJour | null | undefined): SeriesJour {
  const out: SeriesJour = { ...(historique ?? {}), ...(recente ?? {}) };
  for (const cle of CLES_ANNEAUX) {
    const map = new Map<string, Point>();
    (historique?.[cle] ?? []).forEach((p) => p && map.set(p.date, p));
    (recente?.[cle] ?? []).forEach((p) => p && map.set(p.date, p));
    out[cle] = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
  return out;
}

/**
 * L'historique des trois anneaux sur n jours, lu une seule fois : une lecture deja faite (meme source, au moins
 * autant de jours, moins de 10 minutes) est rendue telle quelle ; deux demandes simultanees partagent la meme lecture.
 * lire(cle, jours) : la lecture reelle (lib/v2/sante/data.ts, loadSeries), injectee pour les tests.
 */
export async function lireAnneauxCache(opts: { jours: number; source: string; lire: (cle: CleAnneau, jours: number) => Promise<Point[]>; maintenant?: number }): Promise<SeriesJour> {
  const jours = Math.max(1, Math.min(365, Math.round(opts.jours)));
  const t = opts.maintenant ?? Date.now();
  const e = cache.get(opts.source);
  if (e && e.jours >= jours && t - e.t < DUREE_CACHE_MS) return e.series;
  const deja = enCours.get(opts.source);
  if (deja && deja.jours >= jours) return deja.p;
  const p = (async () => {
    const lus = await Promise.all(CLES_ANNEAUX.map((cle) => opts.lire(cle, jours).catch(() => [] as Point[])));
    const series: SeriesJour = {};
    CLES_ANNEAUX.forEach((cle, i) => {
      series[cle] = (lus[i] ?? []).filter((x) => x && x.date && Number.isFinite(x.value) && x.value > 0);
    });
    cache.set(opts.source, { t, jours, series });
    return series;
  })();
  enCours.set(opts.source, { jours, p });
  try {
    return await p;
  } finally {
    if (enCours.get(opts.source)?.p === p) enCours.delete(opts.source);
  }
}
