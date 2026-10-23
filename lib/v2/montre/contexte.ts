/**
 * Contexte envoye a l'Apple Watch (contrat de synchro v1, brief montre du 13 octobre 2026).
 * Fonction pure : tout vient des sources uniques v2 lues par sources.ts, aucun chiffre invente.
 *  - poids : meme ligne directrice et meme torii que la carte Poids de l'accueil (lib/v2/pesee/usePlanPoids.ts,
 *    sans rien garder), statut et phrase de lib/v2/pesee/ligneDirectrice.ts, arrivee de lib/v2/pesee/estimation.ts ;
 *  - semaine : la semaine calendaire du lundi a aujourd'hui (lib/v2/trainingWeek.ts) ;
 *  - eau : le total du jour et l'objectif de lib/v2/accueil/hydration.ts, un verre de 250 ml.
 * Teste dans __tests__/unit/montreContexte.test.ts.
 */
import type { DayWeight } from '@/lib/v2/weightStats';
import type { MemoTorii } from '@/lib/v2/pesee/ligneDirectrice';
import { isoDuTemps, jourDe, medianeA, phraseStatut, statutLigne } from '@/lib/v2/pesee/ligneDirectrice';
import { toriiDuJour } from '@/lib/v2/pesee/arrivee';
import { estimerArrivee } from '@/lib/v2/pesee/estimation';

export const VERSION_CONTRAT = 1;
export const VERRE_ML = 250;

export type StatutMontre = 'allure' | 'dessus' | 'vite' | 'aucun';
export type PointMontre = { d: string; kg: number };
export type PeriodeLongue = '90j' | '6m' | 'tout';
export type ChronoMontre = { id: string; nom: string; rounds: number; roundS: number; reposS: number; prepaS: number; alerteS: number };

export type ContexteMontre = {
  v: 1;
  genere: string;
  profil: { prenom: string; unite: 'kg' | 'lb'; sports: { id: string; nom: string }[] };
  poids: {
    dernier: { kg: number; date: string } | null;
    rythmeAujourdhui: number | null;
    ecart: number | null;
    statut: StatutMontre;
    phrase: string | null;
    arrivee: { du: string; au: string } | null;
    cap: number | null;
    serie30: PointMontre[];
    ligne30: PointMontre[];
    /**
     * Champs facultatifs ajoutes le 13 octobre (widgets, contrat toujours v1, la montre les ignore) :
     * moins de 2 pesees sur 30 jours, la periode la plus courte qui en a au moins 2 (90 jours, 6 mois, tout),
     * au plus 60 points ; absents quand serie30 suffit ou qu'aucune periode n'a 2 pesees.
     */
    serieLongue?: PointMontre[];
    periode?: PeriodeLongue;
    /**
     * Champ facultatif (courbe-pred, contrat toujours v1, ignore par la montre d'aujourd'hui) : la date du torii,
     * la ou finit ligne30 prolongee, au milieu de la fenetre arrivee. Absent sans torii ou cap atteint.
     */
    torii?: string;
    /** jours entiers depuis ta derniere pesee (0 aujourd'hui), null sans pesee */
    joursDepuis?: number | null;
  };
  semaine: { objectif: number | null; faites: number; jours: boolean[]; lundi: string };
  eau: { ml: number; objectif: number | null; verre: number };
  chronos: ChronoMontre[];
  combat: { date: string; categorieKg: number | null; ecartKg: number | null } | null;
};

export type ProfilPlan = {
  name?: string | null;
  start_date?: string | null;
  start_weight?: number | null;
  height_cm?: number | null;
  weight_goal?: string | null;
  target_weight?: number | null;
};

export type SourcesContexte = {
  /** AAAA-MM-JJ, jour local */
  aujourdhui: string;
  /** ISO complet */
  genere: string;
  profil: ProfilPlan | null;
  unite: 'kg' | 'lb';
  sports: { id: string; nom: string }[];
  /** pesees, une par jour, dans l'ordre (toDailySeries) */
  series: Pick<DayWeight, 'date' | 'value'>[];
  /** date du torii gardee par la carte Poids (yoroi_torii_v1) */
  memoTorii: MemoTorii | null;
  /** dates (AAAA-MM-JJ ou ISO) des seances, sans doublon */
  seances: string[];
  /** seances visees par semaine, 0 ou null tant que tu ne l'as pas choisi */
  objectifSemaine: number | null;
  eau: { litres: number; objectifLitres: number | null };
  chronos: ChronoMontre[];
  competition: { date: string; categorieKg: number | null } | null;
};

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;
const plusJours = (iso: string, n: number) => isoDuTemps(jourDe(iso) + n * 86400000);
/** au plus max points, repartis sur la periode, la derniere pesee toujours gardee */
export function reduireSerie(points: PointMontre[], max = 60): PointMontre[] {
  if (points.length <= max) return points;
  const out: PointMontre[] = [];
  const pas = (points.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * pas)]);
  return out;
}

/** Moins de 2 pesees sur 30 jours : la periode la plus courte qui en a au moins 2, sinon null */
export function serieLongueDe(series: { d: string; kg: number }[], today: string): { periode: PeriodeLongue; serie: PointMontre[] } | null {
  const essais: [PeriodeLongue, string | null][] = [
    ['90j', plusJours(today, -89)],
    ['6m', plusJours(today, -182)],
    ['tout', null],
  ];
  for (const [periode, debut] of essais) {
    const pts = debut ? series.filter((q) => q.d >= debut) : series;
    if (pts.length >= 2) return { periode, serie: reduireSerie(pts) };
  }
  return null;
}

/** Lundi de la semaine du jour donne (jour local) */
export function lundiDe(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return plusJours(iso.slice(0, 10), -((d.getDay() + 6) % 7));
}

function statutDuTon(ton: 'vert' | 'bleu' | 'orange' | 'gris'): StatutMontre {
  if (ton === 'vert') return 'allure';
  if (ton === 'bleu') return 'dessus';
  if (ton === 'orange') return 'vite';
  return 'aucun';
}

/** Le poids : ta derniere pesee, ton rythme prevu, ton statut et ta date d'arrivee, comme sur l'accueil */
function poidsDe(src: SourcesContexte): ContexteMontre['poids'] {
  const today = src.aujourdhui;
  const series = src.series.filter((p) => p && p.value > 0 && p.date.slice(0, 10) <= today);
  const last = series[series.length - 1] ?? null;
  const p = src.profil ?? {};
  const cap = p.target_weight && p.target_weight > 0 ? p.target_weight : null;
  const h = p.height_cm ?? null;
  const debut30 = plusJours(today, -29);
  const out: ContexteMontre['poids'] = {
    dernier: last ? { kg: r1(last.value), date: last.date.slice(0, 10) } : null,
    rythmeAujourdhui: null,
    ecart: null,
    statut: 'aucun',
    phrase: null,
    arrivee: null,
    cap,
    serie30: series.filter((q) => q.date.slice(0, 10) >= debut30).map((q) => ({ d: q.date.slice(0, 10), kg: r1(q.value) })),
    ligne30: [],
    joursDepuis: last ? Math.max(0, Math.round((jourDe(today) - jourDe(last.date.slice(0, 10))) / 86400000)) : null,
  };
  if (out.serie30.length < 2) {
    const longue = serieLongueDe(series.map((q) => ({ d: q.date.slice(0, 10), kg: r1(q.value) })), today);
    if (longue) {
      out.serieLongue = longue.serie;
      out.periode = longue.periode;
    }
  }
  if (!last || cap == null) return out;

  // meme plan et meme torii que la carte Poids, le bilan et le paywall (lib/v2/pesee/arrivee.ts, source unique)
  const t = toriiDuJour({ profil: p, series, cap, today, memo: src.memoTorii, heightCm: h });
  const ligne = t.ligne;
  const torii = t.torii;
  const atteint = t.atteint;

  if (ligne) {
    const st = statutLigne(ligne, last.date, last.value, torii);
    out.statut = statutDuTon(st.ton);
    const ph = phraseStatut(ligne, last.date, last.value, torii);
    out.phrase = `${ph.avant}${ph.cle}${ph.apres}`.trim() || null;
    const auj = medianeA(ligne, torii, today);
    out.rythmeAujourdhui = auj == null ? null : r1(auj);
    const ceJour = medianeA(ligne, torii, last.date);
    out.ecart = ceJour == null ? null : r2(last.value - ceJour);
    for (let i = 0; i < 30; i++) {
      const d = plusJours(debut30, i);
      const m = medianeA(ligne, torii, d);
      if (m != null) out.ligne30.push({ d, kg: r2(m) });
    }
  }

  // arrivee prevue depuis ton poids du jour (meme estimation que l'onboarding et Ton plan)
  // courbe-pred (Houari : « ce qui est ecrit doit etre coherent avec la ligne ») : la fenetre est centree sur le
  // torii, la ou finit la ligne directrice de la courbe et de ligne30 ; avant, elle venait d'un autre calcul
  // et pouvait ne meme pas contenir la date du torii
  if (!atteint) {
    const e = estimerArrivee({ start: last.value, target: cap, sessions: src.objectifSemaine || null, heightCm: h, today });
    if (e.kind === 'ok') {
      out.arrivee = { du: e.earliest, au: e.latest };
      if (ligne && torii && torii > today) {
        const demi = Math.max(3, Math.round((jourDe(e.latest) - jourDe(e.earliest)) / 86400000 / 2));
        const du = plusJours(torii, -demi);
        out.arrivee = { du: du > today ? du : plusJours(today, 1), au: plusJours(torii, demi) };
      }
    }
    if (ligne && torii && torii > today) out.torii = torii;
  }
  return out;
}

/** Le JSON du contrat v1, pret a envoyer (JSON.stringify) */
export function construireContexte(src: SourcesContexte): ContexteMontre {
  const today = src.aujourdhui;
  const lundi = lundiDe(today);
  const jours = Array.from({ length: 7 }, () => false);
  let faites = 0;
  for (const s of src.seances) {
    const d = String(s ?? '').slice(0, 10);
    if (!d || d < lundi || d > today) continue;
    faites++;
    const i = Math.round((jourDe(d) - jourDe(lundi)) / 86400000);
    if (i >= 0 && i < 7) jours[i] = true;
  }
  const poids = poidsDe(src);
  const comp = src.competition && src.competition.date.slice(0, 10) >= today ? src.competition : null;
  const prenom = String(src.profil?.name ?? '').trim().split(/\s+/)[0] ?? '';
  const obj = src.eau.objectifLitres;
  return {
    v: 1,
    genere: src.genere,
    profil: { prenom, unite: src.unite, sports: src.sports },
    poids,
    semaine: { objectif: src.objectifSemaine && src.objectifSemaine > 0 ? src.objectifSemaine : null, faites, jours, lundi },
    eau: { ml: Math.max(0, Math.round(src.eau.litres * 1000)), objectif: obj && obj > 0 ? Math.round(obj * 1000) : null, verre: VERRE_ML },
    chronos: src.chronos,
    combat: comp
      ? {
          date: comp.date.slice(0, 10),
          categorieKg: comp.categorieKg,
          ecartKg: comp.categorieKg != null && poids.dernier ? r1(poids.dernier.kg - comp.categorieKg) : null,
        }
      : null,
  };
}

/** Lit le poids limite d'une categorie (« -77 kg », « 70,3 kg ») ; null si rien de lisible */
export function kgDeCategorie(poidsMax: number | null | undefined, categorie: string | null | undefined): number | null {
  if (typeof poidsMax === 'number' && poidsMax > 20 && poidsMax < 400) return poidsMax;
  const m = /(\d{2,3}(?:[.,]\d+)?)\s*kg/i.exec(String(categorie ?? ''));
  if (!m) return null;
  const v = Number(m[1].replace(',', '.'));
  return v > 20 && v < 400 ? v : null;
}
