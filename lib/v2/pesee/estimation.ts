/**
 * Estimation honnete de l'arrivee au poids vise (vague 28). UN SEUL calcul pour l'onboarding (Ton cap, Ton plan,
 * la demonstration), la ligne « A ce rythme » de l'accueil et de Progres (lib/v2/accueil/projection.ts)
 * et l'ecran Previsions. Toujours une fourchette, jamais une date unique.
 *
 * Bases verifiees (liens dans app/scientific-sources.tsx) :
 *  - perte : 0,5 a 1 % du poids du corps par semaine pour garder le muscle (Helms, Aragon et Fitschen, 2014) ;
 *    le CDC parle d'une perte graduelle d'environ 1 a 2 livres par semaine (0,5 a 0,9 kg) ;
 *  - prise de muscle : environ 0,25 a 0,5 % du poids par semaine, plus prudent quand on est deja avance
 *    (Iraki et al., 2019) ;
 *  - le poids repond lentement et la perte ralentit avec le temps (Hall et al., 2011, le modele du NIH Body Weight Planner) ;
 *  - IMC : sous 18,5, insuffisance ponderale (reperes du CDC).
 *
 * Modele volontairement simple et prudent (ce sont des choix de YOROI, pas des chiffres tires des etudes) :
 *  - le rythme est un pourcentage du poids du moment : il baisse avec le poids ;
 *  - sur le dernier tiers du chemin, il ralentit encore, jusqu'a 60 % du rythme a l'arrivee ;
 *  - en prise, au-dela de 5 % de poids pris, le rythme baisse d'un quart (le muscle vient de plus en plus lentement) ;
 *  - les seances ne changent que le haut de la fourchette, et peu : c'est l'alimentation qui compte le plus ;
 *  - au-dela d'un an, ou avec un IMC vise sous 18,5 ou au-dessus de 32 en prise, aucune date : un cap intermediaire ;
 *  - vague 29, recomposition (perdre du poids et prendre du muscle en meme temps) : une baisse lente,
 *    0,25 a 0,5 % du poids par semaine, la moitie du rythme de perte (choix prudent de YOROI).
 */

/** Perte : 0,5 a 1 % du poids par semaine (Helms et al. 2014) */
export const PERTE_MIN = 0.005;
export const PERTE_MAX = 0.01;
/** Prise : 0,25 a 0,5 % du poids par semaine (Iraki et al. 2019) */
export const PRISE_MIN = 0.0025;
export const PRISE_MAX = 0.005;
/** Recomposition : 0,25 a 0,5 % du poids par semaine (choix de YOROI, moitie du rythme de perte) */
export const RECOMPO_MIN = 0.0025;
export const RECOMPO_MAX = 0.005;
export const IMC_BAS = 18.5;
/** au-dela, en prise, pas de date : du muscle en si grande quantite se construit sur des annees */
export const IMC_HAUT_PRISE = 32;
/** au-dela d'un an au rythme lent, pas de date */
export const SEMAINES_MAX = 52;

const DERNIER_TIERS = 1 / 3;
const FREIN_ARRIVEE = 0.6;
const PRISE_SEUIL = 0.05;
const PRISE_FREIN = 0.75;
const LIMITE_SIMULATION = 520;

export type Fourchette = {
  losing: boolean;
  /** vague 29 : baisse lente de recomposition */
  recompo?: boolean;
  /** pourcentages du poids par semaine retenus (bas et haut) */
  pctMin: number;
  pctMax: number;
  /** semaines, rythme rapide puis rythme lent */
  weeksMin: number;
  weeksMax: number;
  /** AAAA-MM-JJ */
  earliest: string;
  latest: string;
};

export type Estimation =
  | { kind: 'deja' }
  | ({ kind: 'ok' } & Fourchette)
  /** IMC vise sous 18,5 : cap propose (null si ton poids d'aujourd'hui est deja tout pres) */
  | { kind: 'imc_bas'; bmi: number; cap: number | null; capRange: Fourchette | null }
  /** prise vers un IMC au-dessus de 32 */
  | { kind: 'imc_haut'; bmi: number; cap: number | null; capRange: Fourchette | null }
  /** plus d'un an au rythme lent */
  | { kind: 'trop_loin'; weeksMax: number; cap: number; capRange: Fourchette | null };

const pad = (n: number) => String(n).padStart(2, '0');
export function isoDe(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function plusJours(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return isoDe(d);
}

/** Rythmes retenus selon le sens et les seances par semaine (null : pas encore choisies, fourchette entiere) */
export function rythmes(losing: boolean, sessions: number | null, recompo = false): { min: number; max: number } {
  const s = sessions ?? 3;
  if (losing && recompo) return { min: RECOMPO_MIN, max: s >= 3 ? RECOMPO_MAX : 0.004 };
  if (losing) return { min: PERTE_MIN, max: s >= 3 ? PERTE_MAX : s === 2 ? 0.009 : 0.008 };
  return { min: PRISE_MIN, max: s >= 3 ? PRISE_MAX : 0.004 };
}

/**
 * Semaines pour aller de start a target a pct du poids par semaine (pct > 0), avec le ralentissement
 * du dernier tiers et, en prise, au-dela de 5 %. Simulation jour par jour.
 */
export function semainesVers(start: number, target: number, pct: number): number {
  const gap = Math.abs(target - start);
  if (gap < 0.05 || pct <= 0) return 0;
  const losing = target < start;
  let cur = start;
  for (let day = 1; day <= LIMITE_SIMULATION * 7; day++) {
    const left = Math.abs(target - cur) / gap;
    const frein = left < DERNIER_TIERS ? FREIN_ARRIVEE + (1 - FREIN_ARRIVEE) * (left / DERNIER_TIERS) : 1;
    const prise = !losing && cur - start > start * PRISE_SEUIL ? PRISE_FREIN : 1;
    const step = (cur * pct * frein * prise) / 7;
    if (step >= Math.abs(target - cur)) return (day - 1 + Math.abs(target - cur) / step) / 7;
    cur += losing ? -step : step;
  }
  return LIMITE_SIMULATION;
}

export function imcDe(weight: number, heightCm: number): number {
  const h = heightCm / 100;
  return weight / (h * h);
}

const demi = (v: number) => Math.round(v * 2) / 2;

function fourchetteDe(start: number, target: number, sessions: number | null, today: string, recompo = false): Fourchette {
  const losing = target < start;
  const r = rythmes(losing, sessions, recompo);
  const weeksMin = semainesVers(start, target, r.max);
  const weeksMax = semainesVers(start, target, r.min);
  return {
    losing,
    ...(losing && recompo ? { recompo: true } : {}),
    pctMin: r.min,
    pctMax: r.max,
    weeksMin,
    weeksMax,
    earliest: plusJours(today, Math.max(7, Math.round(weeksMin * 7))),
    latest: plusJours(today, Math.max(7, Math.round(weeksMax * 7))),
  };
}

/** Estimation de l'onboarding : depart, cap, seances par semaine (null si pas encore choisies), taille si connue */
export function estimerArrivee(args: { start: number; target: number; sessions?: number | null; heightCm?: number | null; today?: string; recompo?: boolean }): Estimation {
  const { start, target } = args;
  const rc = args.recompo === true;
  const sessions = args.sessions ?? null;
  const today = args.today ?? isoDe(new Date());
  const h = args.heightCm && args.heightCm >= 120 && args.heightCm <= 230 ? args.heightCm : null;
  if (Math.abs(target - start) < 0.2) return { kind: 'deja' };
  const losing = target < start;

  if (h) {
    const bmi = imcDe(target, h);
    if (losing && bmi < IMC_BAS) {
      const plancher = Math.ceil(IMC_BAS * (h / 100) ** 2 * 2) / 2;
      // le plancher de l'IMC, ou une premiere etape de 10 % s'il est a plus d'un an
      const etape = demi(start * 0.9);
      const loin = plancher < start - 0.5 && semainesVers(start, plancher, rc ? RECOMPO_MIN : PERTE_MIN) > SEMAINES_MAX;
      const cap = plancher < start - 0.5 ? (loin ? Math.max(etape, plancher) : plancher) : null;
      return { kind: 'imc_bas', bmi, cap, capRange: cap != null ? fourchetteDe(start, cap, sessions, today, rc) : null };
    }
    if (!losing && bmi > IMC_HAUT_PRISE) {
      const plafond = Math.floor(IMC_HAUT_PRISE * (h / 100) ** 2 * 2) / 2;
      const cap = plafond > start + 0.5 ? Math.min(plafond, demi(start * (1 + PRISE_SEUIL))) : null;
      return { kind: 'imc_haut', bmi, cap, capRange: cap != null ? fourchetteDe(start, cap, sessions, today) : null };
    }
  }

  const f = fourchetteDe(start, target, sessions, today, rc);
  if (f.weeksMax > SEMAINES_MAX) {
    // un premier cap atteignable : 10 % du poids en perte (5 % en recomposition), 5 % en prise
    const cap = demi(losing ? start * (rc ? 0.95 : 0.9) : start * (1 + PRISE_SEUIL));
    return { kind: 'trop_loin', weeksMax: f.weeksMax, cap, capRange: fourchetteDe(start, cap, sessions, today, rc) };
  }
  return { kind: 'ok', ...f };
}

/** Rythme moyen retenu pour une projection simple (demonstration de l'onboarding), en kg par semaine */
export function rythmeMoyenKg(start: number, target: number, sessions: number | null = null, recompo = false): number {
  const r = rythmes(target < start, sessions, recompo);
  return (start * (r.min + r.max)) / 2;
}

/**
 * Ta vraie tendance (accueil, Progres, Previsions) : semaines pour atteindre ton objectif a ton rythme actuel,
 * jamais plus vite que le haut de la fourchette conseillee, avec le meme ralentissement pres du but.
 * null si la tendance va dans l'autre sens ou est nulle.
 */
export function semainesAuRythme(current: number, target: number, kgParSemaine: number): number | null {
  const gap = target - current;
  if (Math.abs(gap) < 0.05 || kgParSemaine === 0 || Math.sign(gap) !== Math.sign(kgParSemaine)) return null;
  const losing = gap < 0;
  const pct = Math.min(Math.abs(kgParSemaine) / current, losing ? PERTE_MAX : PRISE_MAX);
  return semainesVers(current, target, pct);
}

// ===== Textes =====

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_COURT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const dateDe = (iso: string) => new Date(`${iso}T12:00:00`);
const jourDe = (d: Date) => (d.getDate() === 1 ? '1er' : String(d.getDate()));
const partDe = (d: Date) => (d.getDate() <= 10 ? 'début' : d.getDate() <= 20 ? 'mi' : 'fin');
const partMois = (d: Date, mois: string[]) => {
  const p = partDe(d);
  return p === 'mi' ? `mi-${mois[d.getMonth()]}` : `${p} ${mois[d.getMonth()]}`;
};

/**
 * « entre le 15 et le 30 décembre », « entre le 20 novembre et le 5 décembre »,
 * ou, quand l'ecart depasse six semaines, « entre mi-janvier et fin mars 2027 ».
 */
export function fourchetteTexte(earliest: string, latest: string, today: string = isoDe(new Date())): string {
  const a = dateDe(earliest);
  const b = dateDe(latest);
  const anA = a.getFullYear();
  const anB = b.getFullYear();
  const anT = Number(today.slice(0, 4));
  const finAn = anB !== anT ? ` ${anB}` : '';
  const debutAn = anA !== anB && anA !== anT ? ` ${anA}` : '';
  const ecart = Math.round((b.getTime() - a.getTime()) / 86400000);
  if (ecart < 4) return `vers le ${jourDe(b)} ${MOIS[b.getMonth()]}${finAn}`;
  if (ecart > 42) {
    const pa = partMois(a, MOIS);
    const pb = partMois(b, MOIS);
    return pa === pb && !debutAn ? `vers ${pb}${finAn}` : `entre ${pa}${debutAn} et ${pb}${finAn}`;
  }
  if (a.getMonth() === b.getMonth() && anA === anB) return `entre le ${jourDe(a)} et le ${jourDe(b)} ${MOIS[b.getMonth()]}${finAn}`;
  return `entre le ${jourDe(a)} ${MOIS[a.getMonth()]}${debutAn} et le ${jourDe(b)} ${MOIS[b.getMonth()]}${finAn}`;
}

/** Version courte pour le bas d'une courbe : « 15 au 30 déc. », « mi-janv. à fin mars » */
export function fourchetteCourte(earliest: string, latest: string): string {
  const a = dateDe(earliest);
  const b = dateDe(latest);
  const ecart = Math.round((b.getTime() - a.getTime()) / 86400000);
  if (ecart < 4) return `${jourDe(b)} ${MOIS_COURT[b.getMonth()]}`;
  if (ecart > 42) return `${partMois(a, MOIS_COURT)} à ${partMois(b, MOIS_COURT)}`;
  if (a.getMonth() === b.getMonth()) return `${jourDe(a)} au ${jourDe(b)} ${MOIS_COURT[b.getMonth()]}`;
  return `${jourDe(a)} ${MOIS_COURT[a.getMonth()]} au ${jourDe(b)} ${MOIS_COURT[b.getMonth()]}`;
}

/**
 * Vague 50 (Houari : « Fin, c'est moche ») : de vraies dates, toujours. « du 28 janv. au 15 mai », « du 15 au 30 déc. »,
 * « le 18 oct. ». L'annee s'ajoute seulement si la date tombe plus d'un an apres aujourd'hui.
 */
export function fourchetteDates(earliest: string, latest: string, today: string = isoDe(new Date())): string {
  const a = dateDe(earliest);
  const b = dateDe(latest);
  const t = dateDe(today);
  const an = (d: Date) => (d.getTime() - t.getTime() > 330 * 86400000 ? ` ${d.getFullYear()}` : '');
  const ecart = Math.round((b.getTime() - a.getTime()) / 86400000);
  if (ecart < 4) return `le ${jourDe(b)} ${MOIS_COURT[b.getMonth()]}${an(b)}`;
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `du ${jourDe(a)} au ${jourDe(b)} ${MOIS_COURT[b.getMonth()]}${an(b)}`;
  return `du ${jourDe(a)} ${MOIS_COURT[a.getMonth()]}${an(a)} au ${jourDe(b)} ${MOIS_COURT[b.getMonth()]}${an(b)}`;
}

const pctTexte = (p: number) => String(Math.round(p * 10000) / 100).replace('.', ',');

/** « 0,5 à 1 % de ton poids par semaine » */
export function rythmeTexte(f: Pick<Fourchette, 'pctMin' | 'pctMax'>): string {
  return `${pctTexte(f.pctMin)} à ${pctTexte(f.pctMax)} % de ton poids par semaine`;
}

/** Pourquoi ce rythme, en une phrase */
export function pourquoiTexte(f: Pick<Fourchette, 'losing' | 'pctMin' | 'pctMax' | 'recompo'>): string {
  if (f.losing && f.recompo) return `Calculé à ${rythmeTexte(f)}, une baisse lente qui laisse au muscle le temps de se construire.`;
  return f.losing
    ? `Calculé à ${rythmeTexte(f)}, le rythme conseillé aux sportifs pour garder leur muscle, en ralentissant près du but.`
    : `Calculé à ${rythmeTexte(f)}, une prise lente qui limite le gras, de plus en plus lente avec le temps.`;
}

/** Le role des seances, en une phrase simple et honnete */
export function seancesTexte(sessions: number | null): string {
  if (!sessions) return 'Tes séances aident, mais c’est surtout ton alimentation qui fait la différence.';
  const s = `${sessions} ${sessions > 1 ? 'séances' : 'séance'}`;
  return sessions >= 3
    ? `Avec ${s} par semaine, tu mets le rythme de ton côté, mais c’est surtout ton alimentation qui fait la différence.`
    : `Avec ${s} par semaine, la fourchette est un peu plus prudente. Tes séances aident, mais c’est surtout ton alimentation qui fait la différence.`;
}

export const PAS_UNE_PROMESSE = 'Une estimation, pas une promesse.';

const kgTexte = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',');

/** Titre et texte quand aucune date n'est annoncee (sans jugement, sans conseil medical) */
export function sansDateTexte(e: Estimation, target: number, today: string = isoDe(new Date())): { titre: string; texte: string; cap: number | null } | null {
  if (e.kind === 'imc_bas') {
    return {
      titre: e.cap != null ? `Visons d’abord ${kgTexte(e.cap)} kg` : 'Pas de date pour ce cap',
      texte: e.cap != null && e.capRange
        ? `À ${kgTexte(target)} kg, ton IMC passerait sous 18,5, sous les repères de santé habituels. On préfère ne pas te donner de date. Un premier cap à ${kgTexte(e.cap)} kg serait atteignable ${fourchetteTexte(e.capRange.earliest, e.capRange.latest, today)}.`
        : `À ${kgTexte(target)} kg, ton IMC passerait sous 18,5, sous les repères de santé habituels. On préfère ne pas te donner de date pour descendre plus bas.`,
      cap: e.cap,
    };
  }
  if (e.kind === 'imc_haut') {
    return {
      titre: e.cap != null ? `Visons d’abord ${kgTexte(e.cap)} kg` : 'Pas de date pour ce cap',
      texte: e.cap != null && e.capRange
        ? `Prendre autant de muscle se construit sur des années, et une date serait de la fiction. Un premier cap à ${kgTexte(e.cap)} kg serait atteignable ${fourchetteTexte(e.capRange.earliest, e.capRange.latest, today)}.`
        : 'Prendre autant de muscle se construit sur des années, et une date serait de la fiction.',
      cap: e.cap,
    };
  }
  if (e.kind === 'trop_loin') {
    return {
      titre: `Visons d’abord ${kgTexte(e.cap)} kg`,
      texte: `Ton cap demande plus d’un an à un rythme qui garde ton muscle. Une étape à la fois : ${kgTexte(e.cap)} kg serait atteignable ${e.capRange ? fourchetteTexte(e.capRange.earliest, e.capRange.latest, today) : 'dans quelques mois'}.`,
      cap: e.cap,
    };
  }
  return null;
}
