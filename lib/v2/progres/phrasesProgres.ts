/**
 * Progres, maquette C « Themes en onglets » (28 octobre 2026) : les phrases du haut de l'onglet.
 *  - « Ta semaine en une phrase » et « Ta petite victoire du jour » (emprunt a la maquette A) ;
 *  - la phrase de chaque theme (Corps, Force, Cardio, Sante, Photos).
 * Regle d'or : jamais une phrase sans un chiffre reel derriere. Chaque phrase est construite UNIQUEMENT a partir de
 * chiffres que l'app calcule deja (tendance et rythme du poids, paliers du chemin vers le torii, tour de taille,
 * records de lib/v2/seances/records, regularite de lib/v2/progres/year, forme du jour, seances du mois, photos).
 * Sans donnee, la fonction rend null et la carte ne s'affiche pas. Fonctions pures, testees
 * (__tests__/unit/phrasesProgres.test.ts).
 *
 * Phrase de la semaine : au plus deux morceaux, pris dans cet ordre, les premiers presents gagnent :
 *  1. ton jalon : torii atteint, sinon le nombre de paliers franchis (au moins un, objectif de perte ou de prise) ;
 *  2. ta tendance : son rythme par semaine (au moins 4 pesees sur 28 jours), ou « stable » sous 30 g par semaine ;
 *  3. ta regularite : au moins 2 semaines d'affilee avec une seance, sinon tes seances de la semaine.
 * Victoire du jour : un seul fait, jamais deja dit dans la phrase de la semaine, dans cet ordre :
 *  1. un record battu ces 7 derniers jours ; 2. ton tour de taille, au moins 1 cm de moins depuis ta premiere mesure ;
 *  3. ce que tu as fait depuis ton debut, au moins 0,5 kg dans le sens de ton objectif ; 4. ta regularite ;
 *  5. tes seances de la semaine. Rien de tout ca : pas de victoire (la ligne disparait).
 */
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';

/** sous ce rythme (kg par semaine), ta tendance est dite stable (meme seuil que la vue d'ensemble) */
export const SEUIL_STABLE_KG_SEMAINE = 0.03;
/** un record compte comme victoire du jour s'il date de 7 jours au plus */
export const JOURS_RECORD_RECENT = 7;
/** tour de taille : au moins 1 cm de moins pour une victoire, 0,5 cm pour la phrase du corps */
export const CM_VICTOIRE = 1;
export const CM_PHRASE = 0.5;
/** depuis ton debut : au moins 0,5 kg dans le sens de ton objectif */
export const KG_VICTOIRE_DEBUT = 0.5;
/** regularite : au moins 2 semaines d'affilee */
export const SEMAINES_REGULIER = 2;

export type SensObjectif = 'perte' | 'prise' | 'maintien';

export type FaitsProgres = {
  poids?: {
    /** kg par semaine (weeklyRate), null sous 4 pesees sur 28 jours */
    rythme: number | null;
    /** sens de ton objectif, null sans objectif */
    sens: SensObjectif | null;
    /** torii atteint */
    atteint: boolean;
    /** paliers franchis sur 4 (la part du chemin, comme la barre de l'accueil) */
    paliers: number;
    /** ton poids actuel moins ton debut (kg), null sans debut */
    depuisDebut: number | null;
  } | null;
  /** tour de taille : derniere mesure moins la premiere (cm), et « depuis le 12 avril » */
  taille?: { ecart: number; texteDepuis: string } | null;
  /** le record le plus recent battu (titre et valeur deja formates) */
  record?: { titre: string; valeur: string; date: string } | null;
  /** semaines d'affilee avec au moins une seance (weekStreaks.current) */
  semaines?: number;
  /** seances de la semaine en cours */
  seancesSemaine?: number;
  /** aujourd'hui, AAAA-MM-JJ */
  today: string;
};

export type Phrase = { texte: string; /** le chiffre mis en couleur dans le texte (present tel quel), sinon null */ chiffre: string | null };
export type CleMorceau = 'jalon' | 'tendance' | 'regularite' | 'seances';
export type Victoire = { texte: string; source: 'record' | 'taille' | 'debut' | 'regularite' | 'seances' };

const un = (v: number, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace('.', DECIMAL);
/** 80 plutot que 80,0, une decimale sinon */
const court = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : un(v));

/** 210 g, 1,2 kg : le rythme par semaine en mots courts (meme arrondi que la carte Ton poids) */
export function grammes(kg: number): string {
  const g = Math.round((Math.abs(kg) * 1000) / 10) * 10;
  return g >= 1000 ? `${un(g / 1000)} kg` : `${g} g`;
}

function jours(a: string, b: string): number {
  return Math.round((Date.parse(`${b.slice(0, 10)}T12:00:00`) - Date.parse(`${a.slice(0, 10)}T12:00:00`)) / 86400000);
}

const majuscule = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

type Morceau = { cle: CleMorceau; texte: string; chiffre: string | null };

function objectifChiffre(f: FaitsProgres): boolean {
  const s = f.poids?.sens;
  return s === 'perte' || s === 'prise';
}

function morceauJalon(f: FaitsProgres): Morceau | null {
  const p = f.poids;
  if (!p || !objectifChiffre(f)) return null;
  if (p.atteint) return { cle: 'jalon', texte: traduire('Tu as passé ton torii.'), chiffre: null };
  const k = Math.max(0, Math.min(3, Math.floor(p.paliers)));
  if (k < 1) return null;
  return { cle: 'jalon', texte: k === 1 ? traduire('Premier palier franchi.') : traduire('{0} paliers sur 4 franchis.', k), chiffre: null };
}

function morceauTendance(f: FaitsProgres): Morceau | null {
  const r = f.poids?.rythme;
  if (r == null || !Number.isFinite(r)) return null;
  if (Math.abs(r) < SEUIL_STABLE_KG_SEMAINE) return { cle: 'tendance', texte: traduire('Ta tendance est stable.'), chiffre: null };
  const g = grammes(r);
  return { cle: 'tendance', texte: r < 0 ? traduire('Ta tendance perd {0} par semaine.', g) : traduire('Ta tendance prend {0} par semaine.', g), chiffre: g };
}

function morceauRegularite(f: FaitsProgres): Morceau | null {
  const n = f.semaines ?? 0;
  if (n >= SEMAINES_REGULIER) return { cle: 'regularite', texte: traduire('{0} semaines d’affilée avec au moins une séance.', n), chiffre: null };
  const s = f.seancesSemaine ?? 0;
  if (s >= 1) return { cle: 'seances', texte: traduirePluriel(s, s > 1, '{0} séance cette semaine.', '{0} séances cette semaine.', s), chiffre: null };
  return null;
}

/** Ta semaine en une phrase : deux morceaux au plus, null sans aucune donnee */
export function phraseSemaine(f: FaitsProgres): (Phrase & { cles: CleMorceau[] }) | null {
  const m = [morceauJalon(f), morceauTendance(f), morceauRegularite(f)].filter((x): x is Morceau => !!x).slice(0, 2);
  if (!m.length) return null;
  return { texte: m.map((x) => x.texte).join(' '), chiffre: m.find((x) => x.chiffre)?.chiffre ?? null, cles: m.map((x) => x.cle) };
}

/** Ta petite victoire du jour : un fait reel, jamais deja dit dans la phrase de la semaine */
export function victoireDuJour(f: FaitsProgres, dejaDit: CleMorceau[] = phraseSemaine(f)?.cles ?? []): Victoire | null {
  const r = f.record;
  if (r) {
    const n = jours(r.date, f.today);
    if (n >= 0 && n <= JOURS_RECORD_RECENT) return { texte: traduire('Nouveau record : {0}, {1}', r.titre, r.valeur), source: 'record' };
  }
  const t = f.taille;
  if (t && t.ecart <= -CM_VICTOIRE) return { texte: traduire('{0} cm de tour de taille en moins', un(Math.abs(t.ecart))), source: 'taille' };
  const p = f.poids;
  if (p && p.depuisDebut != null) {
    const d = p.depuisDebut;
    if (p.sens === 'perte' && d <= -KG_VICTOIRE_DEBUT) return { texte: traduire('{0} kg de moins depuis ton début', court(Math.abs(d))), source: 'debut' };
    if (p.sens === 'prise' && d >= KG_VICTOIRE_DEBUT) return { texte: traduire('{0} kg de plus depuis ton début', court(d)), source: 'debut' };
  }
  const n = f.semaines ?? 0;
  if (n >= SEMAINES_REGULIER && !dejaDit.includes('regularite')) return { texte: traduire('{0} semaines d’affilée à t’entraîner', n), source: 'regularite' };
  const s = f.seancesSemaine ?? 0;
  if (s >= 1 && !dejaDit.includes('seances') && !dejaDit.includes('regularite')) return { texte: traduirePluriel(s, s > 1, '{0} séance cette semaine', '{0} séances cette semaine', s), source: 'seances' };
  return null;
}

// ─────────────── la phrase de chaque theme ───────────────

/** Corps : ton jalon (sinon ta tendance), puis ton tour de taille */
export function phraseCorps(f: FaitsProgres): Phrase | null {
  const p = f.poids;
  let a: { texte: string; chiffre: string | null } | null = null;
  const k = p ? Math.max(0, Math.min(3, Math.floor(p.paliers))) : 0;
  if (p && objectifChiffre(f) && p.atteint) a = { texte: traduire('torii atteint'), chiffre: null };
  else if (p && objectifChiffre(f) && k >= 1) a = { texte: traduirePluriel(k, k > 1, '{0} palier sur 4 franchi', '{0} paliers sur 4 franchis', k), chiffre: null };
  else if (p && p.rythme != null && Number.isFinite(p.rythme)) {
    if (Math.abs(p.rythme) < SEUIL_STABLE_KG_SEMAINE) a = { texte: traduire('ta tendance est stable'), chiffre: null };
    else {
      const g = grammes(p.rythme);
      a = { texte: p.rythme < 0 ? traduire('ta tendance perd {0} par semaine', g) : traduire('ta tendance prend {0} par semaine', g), chiffre: g };
    }
  }
  const t = f.taille;
  let b: { texte: string; chiffre: string } | null = null;
  if (t && Math.abs(t.ecart) >= CM_PHRASE) {
    const cm = `${un(Math.abs(t.ecart))} cm`;
    b = { texte: t.ecart < 0 ? traduire('ta taille fond : {0} de moins {1}', cm, t.texteDepuis) : traduire('ton tour de taille : {0} de plus {1}', cm, t.texteDepuis), chiffre: cm };
  }
  if (a && b) return { texte: majuscule(traduire('{0}, et {1}.', a.texte, b.texte)), chiffre: a.chiffre ?? b.chiffre };
  const seul = a ?? b;
  return seul ? { texte: `${majuscule(seul.texte)}.`, chiffre: seul.chiffre } : null;
}

/** Force : ton maximum estime sur ton exercice le plus suivi, puis ce qui stagne */
export function phraseForce(o: { exercice: string; max: string; stagnent: number } | null): Phrase | null {
  if (!o || !o.exercice || !o.max) return null;
  const a = traduire('Ton maximum estimé au {0} : {1}.', o.exercice.toLowerCase(), o.max);
  const b = o.stagnent > 0 ? ` ${traduirePluriel(o.stagnent, o.stagnent > 1, '{0} exercice stagne, une piste t’attend plus bas.', '{0} exercices stagnent, une piste t’attend plus bas.', o.stagnent)}` : '';
  return { texte: `${a}${b}`, chiffre: o.max };
}

/** Cardio : ton temps d'entrainement du mois, tes seances et tes kilometres */
export function phraseCardio(o: { duree: string; seances: number; mois: string; km: number }): Phrase | null {
  if (!(o.seances >= 1)) return null;
  const s = traduirePluriel(o.seances, o.seances > 1, '{0} séance', '{0} séances', o.seances);
  const texte = o.km > 0 ? traduire('{0} d’entraînement en {1} : {2}, {3} km.', o.duree, o.mois, s, un(o.km)) : traduire('{0} d’entraînement en {1}, en {2}.', o.duree, o.mois, s);
  return { texte, chiffre: o.duree };
}

/** Sante : ta forme du jour, sur 100 (meme calcul que l'accueil) */
export function phraseSante(o: { score: number | null; niveau: string | null }): Phrase | null {
  if (o.score == null || !Number.isFinite(o.score)) return null;
  const chiffre = traduire('{0} sur 100', Math.round(o.score));
  return { texte: o.niveau ? traduire('Ta forme du jour : {0}. {1}.', chiffre, o.niveau) : traduire('Ta forme du jour : {0}.', chiffre), chiffre };
}

/** Photos : combien dans ton coffre, depuis quand */
export function phrasePhotos(o: { nombre: number; texteDepuis: string | null }): Phrase | null {
  if (!(o.nombre >= 1)) return null;
  if (o.nombre === 1) return { texte: traduire('Ta première photo est prise. La suivante dans un mois, même cadrage.'), chiffre: null };
  const n = traduire('{0} photos', o.nombre);
  return { texte: o.texteDepuis ? traduire('{0} dans ton coffre, {1}.', n, o.texteDepuis) : traduire('{0} dans ton coffre.', n), chiffre: n };
}
