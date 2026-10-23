/**
 * Date d'arrivee a ton cap : SOURCE UNIQUE (17 octobre, Houari : « trois dates d'arrivée différentes pour le même
 * profil »). Avant, le torii de la carte Poids, le bilan et la carte « ton plan » du paywall faisaient chacun leur
 * calcul (tendance lissee, regression robuste, estimation depuis le poids du jour) et annoncaient trois dates.
 * Maintenant il n'y a que deux notions, chacune calculee a un seul endroit :
 *  - le torii (dateDuTorii, toriiDuJour) : la date du cap de ton plan. C'est elle que montrent la courbe, la montre,
 *    le bilan et tout ecran qui annonce « Arrivée prévue » ;
 *  - ta prevision a ton rythme actuel (dateAuRythme) : la date ou tu touches ton cap si tu continues comme ces
 *    4 dernieres semaines (lib/v2/pesee/predictions.ts, la page Prédictions). Elle s'affiche toujours avec un
 *    libelle qui le dit (« À ton rythme actuel »). C'est aussi elle qui deplace le torii (au moins 7 jours d'ecart).
 * Fonctions pures, testees (__tests__/unit/arriveeUnique.test.ts). Aucune date inventee : tout vient de tes pesees
 * et de ton profil ; sans donnees fiables, null.
 */
import { IMC_BAS, imcDe } from './estimation';
import { prevoir } from './predictions';
import type { DecisionTorii, Ligne, MemoTorii, ModeLigne } from './ligneDirectrice';
import { arriveeReelle, cleDuPlan, creerLigne, dateArriveePlan, decisionTorii, departDuPlan, jourLong, modeDuPlan, toriiDeRepli } from './ligneDirectrice';

export type ProfilPlan = { start_date?: string | null; start_weight?: number | null; height_cm?: number | null; weight_goal?: string | null };
type Pesee = { date: string; value: number };

const tailleOk = (h?: number | null) => (h != null && Number.isFinite(h) && h >= 120 && h <= 230 ? h : null);

/**
 * Ta date d'arrivee a ton rythme actuel : le meme calcul que la page Prédictions (prevoir, regression robuste sur
 * tes 4 dernieres semaines). null sans cap, cap sous un IMC de 18,5, pesees insuffisantes, rythme qui ne va pas
 * vers ton cap, cap deja atteint ou a plus d'un an.
 */
export function dateAuRythme(series: Pesee[], cap: number | null, today: string, heightCm?: number | null): string | null {
  if (cap == null || !(cap > 0)) return null;
  const h = tailleOk(heightCm);
  if (h && imcDe(cap, h) < IMC_BAS) return null;
  const p = prevoir({ series, today, cap });
  return p.ok && p.arrivee ? p.arrivee.date : null;
}

export type ToriiDuJour = {
  /** ligne a dessiner (null : pas de plan, ou perte et prise sans torii) */
  ligne: Ligne | null;
  /** le plan, meme quand sa ligne n'est pas dessinee (perte ou prise sans torii) */
  plan: Ligne | null;
  /** debut et sens du plan, meme sans ligne (ton objectif, ce qui est fait du chemin) */
  depart: { date: string; poids: number } | null;
  mode: ModeLigne | null;
  /** date du torii (AAAA-MM-JJ), jamais dans le passe sauf cap atteint ; null sinon */
  torii: string | null;
  /** cap atteint : le torii est ta vraie date d'arrivee */
  atteint: boolean;
  /** date d'arrivee prevue au debut du plan (peut etre passee) */
  datePlan: string | null;
  /** ta prevision a ton rythme actuel (dateAuRythme) */
  auRythme: string | null;
  /** la decision du jour (memo a garder, fenetre), null sans plan */
  decision: DecisionTorii | null;
};

const VIDE: ToriiDuJour = { ligne: null, plan: null, depart: null, mode: null, torii: null, atteint: false, datePlan: null, auRythme: null, decision: null };

/**
 * Le torii du jour, le meme pour la courbe (usePlanPoids), le bilan, la montre et le paywall.
 * Plan : debut du profil (sinon ta premiere pesee), sens, cap. Torii : la date memorisee, deplacee par ta prevision
 * a ton rythme actuel quand elle s'en eloigne d'au moins 7 jours, jamais dans le passe (decisionTorii), sinon la
 * date de repli du rythme sain (toriiDeRepli).
 */
export function toriiDuJour(args: { profil: ProfilPlan | null | undefined; series: Pesee[]; cap: number | null; today: string; memo: MemoTorii | null; heightCm?: number | null }): ToriiDuJour {
  const { profil, series, cap, today } = args;
  if (cap == null || !(cap > 0) || !series.length) return VIDE;
  const h = tailleOk(args.heightCm !== undefined ? args.heightCm : profil?.height_cm ?? null);
  const depart = departDuPlan(profil, series, today) ?? { date: series[0].date.slice(0, 10), poids: series[0].value };
  const mode = modeDuPlan({ depart: depart.poids, cap, weightGoal: profil?.weight_goal ?? null });
  const ligne = creerLigne(depart, cap, mode);
  if (!ligne) return { ...VIDE, depart, mode };
  const datePlan = dateArriveePlan(ligne, { heightCm: h });
  const auRythme = dateAuRythme(series, cap, today, h);
  const decision = decisionTorii(args.memo, { cle: cleDuPlan(ligne), date: datePlan, debut: ligne.depart.date }, auRythme, today, arriveeReelle(ligne, series));
  let torii = decision?.date ?? null;
  if (!torii) torii = toriiDeRepli(ligne, datePlan, series[series.length - 1].value, today, h);
  const sansTorii = (ligne.mode === 'perte' || ligne.mode === 'prise') && !torii;
  return { ligne: sansTorii ? null : ligne, plan: ligne, depart, mode, torii, atteint: !!decision?.atteint, datePlan, auRythme, decision };
}

/**
 * Ce qu'annonce un ecran « Arrivée prévue » quand un plan existe : la date du torii, en toutes lettres
 * (« le 22 novembre »). null sans torii a venir (cap atteint, maintien, pas de date fiable).
 */
export function arriveePrevueTexte(t: Pick<ToriiDuJour, 'torii' | 'atteint'>, today: string): string | null {
  if (!t.torii || t.atteint || t.torii.slice(0, 10) <= today) return null;
  return `le ${jourLong(t.torii, today)}`;
}

const kgCourt = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toFixed(1).replace('.', ','));

/**
 * La mini carte de Progres (« Ton arrivée prévue ») : ton cap et la date du torii, « 80 kg vers le 10 novembre ».
 * null sans torii a venir (cap atteint, maintien, pas de date fiable).
 */
export function ligneArriveeCap(t: Pick<ToriiDuJour, 'torii' | 'atteint'>, cap: number | null, today: string): string | null {
  if (cap == null || !(cap > 0) || !t.torii || t.atteint || t.torii.slice(0, 10) <= today) return null;
  return `${kgCourt(cap)} kg vers le ${jourLong(t.torii, today)}`;
}
