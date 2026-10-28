/**
 * Previsions de poids (page « Prédictions », carte « Où tu en seras » de l'accueil).
 * Fonctions pures, testees (__tests__/unit/predictions.test.ts). Tout part de tes vraies pesees :
 *  - assez de pesees : au moins 5 pesees etalees sur 14 jours, la derniere il y a 14 jours au plus ;
 *  - ton rythme actuel : une regression robuste (Theil-Sen, la mediane des pentes entre deux pesees) sur tes
 *    4 dernieres semaines, qui ne se laisse pas tirer par une pesee bizarre (sel, eau, balance). 18 octobre 2026
 *    (calcul du poids d'apres les etudes) : 4 semaines au lieu de 6, la fenetre de 2 a 4 semaines des applis de
 *    reference (MacroFactor) : assez longue pour noyer l'eau, assez courte pour suivre un changement de rythme ;
 *  - le meme modele que l'onboarding et le torii (lib/v2/pesee/estimation.ts) vers ton cap : jamais plus vite que
 *    1 % du poids par semaine en perte (0,5 % en prise), et la perte ralentit dans le dernier tiers. Arrive a ton
 *    cap, on suppose que tu le tiens ;
 *  - une fourchette honnete : l'incertitude de ton rythme et de ton niveau du jour, qui s'elargit avec le temps ;
 *  - en suivant ta ligne : ta ligne directrice (medianeA), celle de la courbe, qui finit pile au torii.
 * Aucune promesse de sante : une estimation a partir de tes pesees.
 */
import type { DayWeight } from '@/lib/v2/weightStats';
import type { Ligne } from './ligneDirectrice';
import { ecartJours, isoDuTemps, jourCourt, jourDe, medianeA } from './ligneDirectrice';
import { PERTE_MAX, PRISE_MAX } from './estimation';
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';

export const MIN_PESEES = 5;
export const MIN_JOURS = 14;
/** fenetre de la regression : 4 semaines au plus (6 avant le 18 octobre 2026) */
export const FENETRE_JOURS = 28;
/** derniere pesee trop ancienne : ton rythme ne dit plus rien d'aujourd'hui */
export const MAX_ANCIENNETE = 14;
/** au-dela d'un an, pas de date annoncee */
export const HORIZON_MAX = 365;
/** fourchette a 90 % */
const Z = 1.645;
/** la balance a sa propre precision : jamais moins de 150 g de bruit */
const BRUIT_MIN = 0.15;
/** ton rythme peut changer : au moins 20 % de ton rythme, ou 70 g par semaine, d'incertitude */
const DERIVE_PART = 0.2;
const DERIVE_MIN = 0.07;
/** et chaque semaine ajoute un peu d'incertitude (vacances, saison, competition) */
const ELARGIT_SEMAINE = 0.05;
const DERNIER_TIERS = 1 / 3;
const FREIN_ARRIVEE = 0.6;
const DAY = 86400000;

export type Ajustement = {
  /** pente robuste, en kg par semaine (negative : tu descends) */
  kgSemaine: number;
  /** ton niveau du jour selon la droite, en kg */
  niveau: number;
  /** bruit de tes pesees autour de la droite (ecart type robuste), en kg */
  bruit: number;
  /** marge sur ton rythme, en kg par semaine (90 %) */
  margeRythme: number;
  /** marge sur ton niveau du jour, en kg (90 %) */
  margeNiveau: number;
  n: number;
  /** jours couverts par les pesees retenues */
  jours: number;
  debut: string;
  fin: string;
};

export type Manque = {
  ok: false;
  raison: 'aucune' | 'peu' | 'court' | 'ancien';
  /** pesees retenues (4 dernieres semaines) */
  pesees: number;
  jours: number;
  /** ce qu'il te manque */
  manquePesees: number;
  manqueJours: number;
};

const median = (v: number[]) => {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function plusJours(iso: string, n: number): string {
  return isoDuTemps(jourDe(iso) + n * DAY);
}

/** meme jour du mois, n mois plus tard (le 31 devient le dernier jour du mois) */
export function plusMois(iso: string, n: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const cible = new Date(y, m - 1 + n, 1, 12);
  const fin = new Date(cible.getFullYear(), cible.getMonth() + 1, 0, 12).getDate();
  cible.setDate(Math.min(d, fin));
  return isoDuTemps(cible.getTime());
}

/** si tu te peses peu (une fois par semaine), la fenetre s'elargit jusqu'a 6 semaines */
export const FENETRE_MAX_JOURS = 42;

/**
 * Les pesees retenues : jusqu'a aujourd'hui, sur les 4 semaines qui finissent a ta derniere pesee ; 6 semaines si
 * ces 4 semaines ne suffisent pas (moins de 5 pesees ou moins de 14 jours couverts).
 */
export function peseesRetenues(series: { date: string; value: number }[], today: string) {
  const ok = series.filter((p) => p && p.value > 0 && p.date.slice(0, 10) <= today);
  if (!ok.length) return [];
  const fin = ok[ok.length - 1].date.slice(0, 10);
  const dans = (n: number) => ok.filter((p) => ecartJours(p.date.slice(0, 10), fin) < n).map((p) => ({ date: p.date.slice(0, 10), value: p.value }));
  const r = dans(FENETRE_JOURS);
  if (r.length >= MIN_PESEES && ecartJours(r[0].date, fin) >= MIN_JOURS) return r;
  return dans(FENETRE_MAX_JOURS);
}

/** Assez de pesees pour une prevision ? Sinon, ce qu'il manque */
export function verifierDonnees(series: { date: string; value: number }[], today: string): Manque | null {
  const r = peseesRetenues(series, today);
  if (!r.length) return { ok: false, raison: 'aucune', pesees: 0, jours: 0, manquePesees: MIN_PESEES, manqueJours: MIN_JOURS };
  const jours = ecartJours(r[0].date, r[r.length - 1].date);
  const base = { ok: false as const, pesees: r.length, jours, manquePesees: Math.max(0, MIN_PESEES - r.length), manqueJours: Math.max(0, MIN_JOURS - jours) };
  if (ecartJours(r[r.length - 1].date, today) > MAX_ANCIENNETE) return { ...base, raison: 'ancien' };
  if (r.length < MIN_PESEES) return { ...base, raison: 'peu' };
  if (jours < MIN_JOURS) return { ...base, raison: 'court' };
  return null;
}

/** Regression robuste de Theil-Sen sur tes pesees retenues, x en jours depuis aujourd'hui */
export function ajuster(series: { date: string; value: number }[], today: string): Ajustement | null {
  if (verifierDonnees(series, today)) return null;
  const r = peseesRetenues(series, today);
  const xs = r.map((p) => ecartJours(today, p.date));
  const ys = r.map((p) => p.value);
  const n = r.length;
  const pentes: number[] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (xs[j] !== xs[i]) pentes.push((ys[j] - ys[i]) / (xs[j] - xs[i]));
  if (!pentes.length) return null;
  const b = median(pentes);
  const a = median(ys.map((y, i) => y - b * xs[i]));
  const res = ys.map((y, i) => y - (a + b * xs[i]));
  const mr = median(res);
  const bruit = Math.max(BRUIT_MIN, 1.4826 * median(res.map((e) => Math.abs(e - mr))));
  const xm = xs.reduce((s, x) => s + x, 0) / n;
  const sxx = xs.reduce((s, x) => s + (x - xm) * (x - xm), 0);
  const seB = sxx > 0 ? bruit / Math.sqrt(sxx) : 0;
  const kgSemaine = b * 7;
  const margeRythme = Math.max(Z * seB * 7, DERIVE_PART * Math.abs(kgSemaine), DERIVE_MIN);
  const margeNiveau = Z * bruit * Math.sqrt(1 / n + (sxx > 0 ? (0 - xm) * (0 - xm) / sxx : 0));
  return { kgSemaine, niveau: a, bruit, margeRythme, margeNiveau, n, jours: ecartJours(r[0].date, r[r.length - 1].date), debut: r[0].date, fin: r[r.length - 1].date };
}

/**
 * Trajectoire jour par jour depuis ton niveau du jour a kgSemaine, sur `jours` jours (index 0 : aujourd'hui).
 * Vers ton cap : meme modele que le torii (rythme plafonne, ralenti dans le dernier tiers), puis tu tiens ton cap.
 * Sans cap (ou cap dans l'autre sens) : ton rythme prolonge tel quel.
 */
export function trajectoire(niveau: number, kgSemaine: number, cap: number | null, jours: number): number[] {
  const out = [niveau];
  const vers = cap != null && Math.abs(cap - niveau) >= 0.05 && kgSemaine !== 0 && Math.sign(cap - niveau) === Math.sign(kgSemaine);
  if (!vers) {
    for (let d = 1; d <= jours; d++) out.push(niveau + (kgSemaine * d) / 7);
    return out;
  }
  const c = cap as number;
  const losing = c < niveau;
  const gap = Math.abs(c - niveau);
  const pct = Math.min(Math.abs(kgSemaine) / niveau, losing ? PERTE_MAX : PRISE_MAX);
  let cur = niveau;
  for (let d = 1; d <= jours; d++) {
    const left = Math.abs(c - cur) / gap;
    const frein = left < DERNIER_TIERS ? FREIN_ARRIVEE + (1 - FREIN_ARRIVEE) * (left / DERNIER_TIERS) : 1;
    const step = (cur * pct * frein) / 7;
    cur = step >= Math.abs(c - cur) ? c : cur + (losing ? -step : step);
    out.push(cur);
  }
  return out;
}

/** Premier jour (depuis aujourd'hui) ou la trajectoire touche le cap, ou null */
function jourDuCap(traj: number[], cap: number, niveau: number): number | null {
  const losing = cap < niveau;
  for (let d = 0; d < traj.length; d++) if (losing ? traj[d] <= cap + 0.05 : traj[d] >= cap - 0.05) return d;
  return null;
}

export type Point = { date: string; jours: number; valeur: number; bas: number; haut: number; ligne: number | null };

export type Prevision = {
  ok: true;
  ajustement: Ajustement;
  today: string;
  cap: number | null;
  /** ta ligne directrice et son torii (la date ou elle touche ton cap) */
  torii: string | null;
  /** courbe du futur, jour par jour, jusqu'a `fin` */
  courbe: Point[];
  /** les dates de la liste : 1 et 2 semaines, 1, 2 et 3 mois, puis le torii */
  dates: (Point & { id: string; label: string })[];
  /** date ou tu touches ton cap a ton rythme actuel, avec sa fourchette ; null si pas de cap, deja atteint, ou trop loin */
  arrivee: { date: string; tot: string | null; tard: string | null } | null;
  /** ecart en jours entre ton arrivee a ton rythme et ton torii (positif : apres le torii) */
  ecartTorii: number | null;
  /** deja a ton cap (a 200 g pres) */
  auCap: boolean;
  /** sens de ton rythme */
  sens: 'baisse' | 'hausse' | 'stable';
  /** ton rythme va-t-il vers ton cap */
  versCap: boolean;
};

const HORIZONS: { id: string; label: string; jours?: number; mois?: number }[] = [
  { id: '1s', label: traduire('Dans 1 semaine'), jours: 7 },
  { id: '2s', label: traduire('Dans 2 semaines'), jours: 14 },
  { id: '1m', label: traduire('Dans 1 mois'), mois: 1 },
  { id: '2m', label: traduire('Dans 2 mois'), mois: 2 },
  { id: '3m', label: traduire('Dans 3 mois'), mois: 3 },
];

/**
 * Ta prevision complete, ou ce qu'il manque.
 * ligne et torii : ceux de la courbe (usePlanPoids), pour que la page dise la meme chose qu'elle.
 */
export function prevoir(args: { series: { date: string; value: number }[]; today: string; cap: number | null; ligne?: Ligne | null; torii?: string | null; atteint?: boolean }): Prevision | Manque {
  const { today } = args;
  const manque = verifierDonnees(args.series, today);
  if (manque) return manque;
  const aj = ajuster(args.series, today) as Ajustement;
  const cap = args.cap != null && args.cap > 0 ? args.cap : null;
  const ligne = args.ligne ?? null;
  const torii = args.torii && args.torii > today && !args.atteint ? args.torii.slice(0, 10) : null;
  const auCap = cap != null && (Math.abs(aj.niveau - cap) <= 0.2 || !!args.atteint);
  const sens: Prevision['sens'] = Math.abs(aj.kgSemaine) < 0.1 ? 'stable' : aj.kgSemaine < 0 ? 'baisse' : 'hausse';
  const versCap = cap != null && !auCap && sens !== 'stable' && Math.sign(cap - aj.niveau) === Math.sign(aj.kgSemaine);
  const capTraj = auCap ? null : cap;

  // jusqu'ou dessiner : 3 mois, ou le torii s'il est plus loin (6 mois au plus)
  const fin3 = plusMois(today, 3);
  let fin = fin3;
  if (torii && torii > fin && ecartJours(today, torii) <= 183) fin = torii;
  const nJours = Math.max(ecartJours(today, fin), 7);
  // pour la date d'arrivee, on regarde jusqu'a un an
  const nSim = Math.max(nJours, HORIZON_MAX);
  const v = aj.kgSemaine;
  let dv = aj.margeRythme;
  // 18 octobre 2026 : vers ton cap, ton rythme est plafonne a 1 % par semaine (0,5 % en prise) ; la marge suit ce
  // rythme plafonne, en proportion. Avant, a 1,2 % par semaine, les deux bords etaient plafonnes au meme rythme et
  // la fourchette de date se refermait sur un seul jour, ce qui faisait croire a une certitude
  let vLent = v - dv;
  let vVite = v + dv;
  if (capTraj != null && versCap && v !== 0) {
    const plafond = aj.niveau * (capTraj < aj.niveau ? PERTE_MAX : PRISE_MAX);
    if (Math.abs(v) > plafond) {
      const rel = Math.min(0.9, dv / Math.abs(v));
      const vc = Math.sign(v) * plafond;
      dv = Math.abs(vc) * rel;
      vLent = vc - dv;
      vVite = vc + dv;
    }
  }
  const centre = trajectoire(aj.niveau, v, capTraj, nSim);
  const lent = trajectoire(aj.niveau, vLent, capTraj, nSim);
  const vite = trajectoire(aj.niveau, vVite, capTraj, nSim);
  // l'ecart des deux rythmes extremes au rythme central, garde au plus large atteint : arrives au cap, les trois
  // trajectoires se rejoignent, mais l'incertitude, elle, ne se referme pas
  const sousC: number[] = [];
  const surC: number[] = [];
  for (let d = 0, mBas = 0, mHaut = 0; d <= nSim; d++) {
    mBas = Math.max(mBas, centre[d] - Math.min(lent[d], vite[d]));
    mHaut = Math.max(mHaut, Math.max(lent[d], vite[d]) - centre[d]);
    sousC.push(mBas);
    surC.push(mHaut);
  }
  const point = (d: number): Point => {
    const date = plusJours(today, d);
    const marge = aj.margeNiveau + ELARGIT_SEMAINE * (d / 7);
    return { date, jours: d, valeur: centre[d], bas: centre[d] - sousC[d] - marge, haut: centre[d] + surC[d] + marge, ligne: ligne ? medianeA(ligne, args.torii ?? null, date) : null };
  };
  const courbe: Point[] = [];
  for (let d = 0; d <= nJours; d++) courbe.push(point(d));

  const dates: Prevision['dates'] = HORIZONS.map((h) => {
    const date = h.jours != null ? plusJours(today, h.jours) : plusMois(today, h.mois as number);
    return { ...point(ecartJours(today, date)), id: h.id, label: h.label };
  });
  if (torii && ecartJours(today, torii) <= nSim) {
    const p = point(ecartJours(today, torii));
    dates.push({ ...p, id: 'torii', label: traduire("Au torii, le {0}", jourCourt(torii)) });
    dates.sort((a, b) => a.jours - b.jours);
  }

  let arrivee: Prevision['arrivee'] = null;
  if (cap != null && versCap) {
    const d = jourDuCap(centre, cap, aj.niveau);
    if (d != null && d > 0) {
      // les deux bords de ton rythme : le plus rapide vers ton cap et le plus lent
      const bas = vite.map((x, i) => Math.min(x, lent[i]));
      const haut = vite.map((x, i) => Math.max(x, lent[i]));
      const perte = cap < aj.niveau;
      const dTot = jourDuCap(perte ? bas : haut, cap, aj.niveau);
      const dTard = jourDuCap(perte ? haut : bas, cap, aj.niveau);
      arrivee = { date: plusJours(today, d), tot: dTot != null ? plusJours(today, dTot) : null, tard: dTard != null ? plusJours(today, dTard) : null };
    }
  }
  const ecartTorii = arrivee && torii ? ecartJours(torii, arrivee.date) : null;
  return { ok: true, ajustement: aj, today, cap, torii, courbe, dates, arrivee, ecartTorii, auCap, sens, versCap };
}

// ===== Textes =====

export type Unite = 'kg' | 'lb';
export const LB = 2.20462;
export const versUnite = (kg: number, u: Unite) => (u === 'lb' ? kg * LB : kg);
/** « 80,4 kg », « 177,2 lb » */
export function poidsTexte(kg: number, u: Unite, unite = true): string {
  const v = Math.round(versUnite(kg, u) * 10) / 10;
  return `${v.toFixed(1).replace('.', DECIMAL)}${unite ? ` ${u}` : ''}`;
}
const rond = (kg: number, u: Unite) => {
  const v = versUnite(kg, u);
  return Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toFixed(1).replace('.', DECIMAL);
};

/** Le palier entier suivant dans ton sens (sans cap) : 81,4 kg en baisse donne 81 kg */
function palier(niveau: number, sens: 'baisse' | 'hausse', u: Unite): number {
  const v = versUnite(niveau, u);
  const p = sens === 'baisse' ? Math.floor(v - 0.05) : Math.ceil(v + 0.05);
  return u === 'lb' ? p / LB : p;
}

/** un point final, sans doubler celui de « nov. » */
const fin = (t: string) => (t.endsWith('.') ? t : `${t}.`);

/**
 * La phrase simple sous le titre. debut : le libelle de la prevision (« À ton rythme actuel » dans le bilan,
 * pour qu'on ne la confonde pas avec la date du torii).
 */
export function phrasePrevision(p: Prevision, u: Unite, debut?: string): string {
  const t = phraseBrute(p, u);
  const pre = traduire('À ce rythme');
  return fin(debut && t.startsWith(pre) ? debut + t.slice(pre.length) : t);
}

function phraseBrute(p: Prevision, u: Unite): string {
  const mois = p.dates.find((d) => d.id === '1m');
  const dansUnMois = mois ? poidsTexte(mois.valeur, u) : '';
  if (p.auCap && p.cap != null) return traduire("Tu es à ton cap. Si tu le tiens, tu restes autour de {0} {1}", rond(p.cap, u), u);
  if (p.cap != null && p.versCap) {
    const sous = p.cap < p.ajustement.niveau ? traduire('tu passes sous') : traduire('tu dépasses');
    if (p.arrivee) return traduire("À ce rythme, {0} {1} {2} vers le {3}", sous, rond(p.cap, u), u, jourCourt(p.arrivee.date));
    return traduire("À ce rythme, ton cap est encore à plus d’un an. Dans un mois : environ {0}", dansUnMois);
  }
  if (p.sens === 'stable') return traduire("Ton poids est stable : autour de {0} dans un mois", dansUnMois);
  if (p.cap != null && !p.versCap) return traduire("À ce rythme, tu t’éloignes de ton cap : environ {0} dans un mois", dansUnMois);
  // sans cap : le prochain palier entier
  const cible = palier(p.ajustement.niveau, p.sens, u);
  const d = p.courbe.findIndex((q) => (p.sens === 'baisse' ? q.valeur <= cible : q.valeur >= cible));
  if (d > 0) return p.sens === 'baisse' ? traduire("À ce rythme, tu passes sous {0} {1} vers le {2}", rond(cible, u), u, jourCourt(p.courbe[d].date)) : traduire("À ce rythme, tu passes au-dessus de {0} {1} vers le {2}", rond(cible, u), u, jourCourt(p.courbe[d].date));
  return traduire("À ce rythme : environ {0} dans un mois", dansUnMois);
}

/** Ton arrivee comparee au torii, en mots (null sans les deux) */
export function phraseTorii(p: Prevision): string | null {
  if (p.ecartTorii == null || !p.torii) return null;
  const e = p.ecartTorii;
  if (Math.abs(e) <= 3) return fin(traduire("Pile à la date de ton torii, le {0}", jourCourt(p.torii)));
  const j = Math.abs(e);
  const duree = j >= 14 ? traduire("{0} semaines", Math.round(j / 7)) : traduire("{0} jours", j);
  return e < 0 ? traduire("{0} avant ton torii ({1}).", duree, jourCourt(p.torii)) : traduire("{0} après ton torii ({1}).", duree, jourCourt(p.torii));
}

/** Version courte pour la carte de l'accueil : « sous 80 kg vers le 10 déc. » ou « 79,6 kg dans 1 mois » */
export function resumeCourt(p: Prevision, u: Unite = 'kg'): string {
  if (p.cap != null && p.versCap && p.arrivee) return p.cap < p.ajustement.niveau ? traduire("Sous {0} {1} vers le {2}", rond(p.cap, u), u, jourCourt(p.arrivee.date)) : traduire("Au dessus de {0} {1} vers le {2}", rond(p.cap, u), u, jourCourt(p.arrivee.date));
  const mois = p.dates.find((d) => d.id === '1m');
  return mois ? traduire("{0} dans 1 mois", poidsTexte(mois.valeur, u)) : '';
}

/** Ce qu'il manque, en mots */
export function texteManque(m: Manque): { titre: string; texte: string } {
  if (m.raison === 'aucune') return { titre: traduire('Pas encore de pesée'), texte: traduire("Pour prévoir ta courbe, il faut au moins {0} pesées étalées sur {1} jours. Monte sur la balance le matin, à jeun.", MIN_PESEES, MIN_JOURS) };
  if (m.raison === 'ancien') return { titre: traduire('Ta dernière pesée date un peu'), texte: traduire("Ta dernière pesée a plus de {0} jours. Monte sur la balance quelques matins de suite et ta prévision revient.", MAX_ANCIENNETE) };
  if (m.raison === 'peu') {
    const n = m.manquePesees;
    return { titre: traduire('Encore quelques pesées'), texte: traduirePluriel(n, n > 1, "Il te manque {0} pesée : il en faut au moins {1} sur {2} jours pour une prévision honnête.", "Il te manque {0} pesées : il en faut au moins {1} sur {2} jours pour une prévision honnête.", n, MIN_PESEES, MIN_JOURS) };
  }
  const j = m.manqueJours;
  return { titre: traduire('Encore quelques jours'), texte: `${traduirePluriel(m.jours, m.jours > 1, "Tes pesées couvrent {0} jour.", "Tes pesées couvrent {0} jours.", m.jours)} ${traduirePluriel(j, j > 1, "Encore {0} jour de pesées et ta prévision s’affiche.", "Encore {0} jours de pesées et ta prévision s’affiche.", j)}` };
}

/**
 * Carte « Où tu en seras » de l'accueil : ton poids dans 1 mois a ton rythme, et ton arrivee comparee au torii
 * (« pile à la date de ton torii », « 6 jours avant ton torii »), sinon ta date de passage du cap.
 */
export function resumeCarte(p: Prevision, u: Unite = 'kg'): { valeur: string; note: string | null } {
  const mois = p.dates.find((d) => d.id === '1m');
  const valeur = mois ? traduire("{0} dans 1 mois", poidsTexte(mois.valeur, u)) : resumeCourt(p, u);
  let note: string | null = null;
  if (p.ecartTorii != null && p.torii) {
    const j = Math.abs(p.ecartTorii);
    note = j <= 3 ? traduire('tu arrives pile au torii') : p.ecartTorii < 0 ? traduire("tu arrives {0} avant le torii", j >= 14 ? traduire("{0} semaines", Math.round(j / 7)) : traduire("{0} jours", j)) : traduire("tu arrives {0} après le torii", j >= 14 ? traduire("{0} semaines", Math.round(j / 7)) : traduire("{0} jours", j));
  } else if (p.cap != null && p.versCap && p.arrivee) note = traduire("tu passes ton cap vers le {0}", jourCourt(p.arrivee.date));
  else if (p.auCap) note = traduire('tu restes à ton cap');
  return { valeur, note };
}
