/**
 * Cadrage de la courbe du poids (courbe v2, 16 octobre, Houari : « en 1 an, 6 mois, tu as l'impression que c'est
 * depuis 1 semaine, le suivi c'est moche »). SOURCE UNIQUE pour la carte Poids de l'accueil et le detail du poids.
 *
 * Pourquoi « Mon plan » etait la plus belle vue : son axe du temps part du debut de ton objectif et finit au torii,
 * l'echelle tient ta ligne et ton cap, rien n'est vide. Les vues 1 M a 1 A, elles, prenaient tout ce qui tombait
 * dans la periode : une ou deux vieilles pesees isolees (import, essai) tiraient l'axe des mois en arriere et tes
 * vraies pesees s'ecrasaient au bord droit ; et rien ne disait que la periode depassait ton historique.
 *
 * Regles :
 *  - la fenetre part de la date la plus tardive entre le debut de la periode et le debut de ton suivi ;
 *  - le debut de ton suivi, c'est le debut de ton objectif (date choisie, sinon creation de l'objectif), sauf si
 *    tu as un vrai historique avant lui dans la periode (au moins 4 pesees sur 14 jours) : on le garde alors, et la
 *    ligne directrice part du milieu de la courbe avec « Début, 87 kg » ;
 *  - sans objectif : 1 a 3 pesees isolees au debut, separees du reste par un grand trou, ne tirent plus l'axe ;
 *  - si ton objectif commence juste avant ta premiere pesee, l'axe part de lui (la ligne part du bord gauche) ;
 *  - quand la periode demandee depasse ce qui est montre : « depuis le 3 oct. » au lieu d'un grand vide.
 * La periode se compte depuis ta derniere pesee (comme filterPeriod), jamais dans le futur.
 */
import { jourCourt, jourDe, medianeA, statutLigne, type Ligne } from './ligneDirectrice';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

/** meme valeur que PERIODE_PLAN (components/yoroi/v2/charts/PeriodSwitch.tsx), sans dependre d'un composant */
export const PERIODE_PLAN_CADRAGE = -1;
const DAY = 86400000;
/** un vrai historique avant le debut de l'objectif : au moins 4 pesees sur au moins 14 jours */
export const HISTORIQUE_MIN_PESEES = 4;
export const HISTORIQUE_MIN_JOURS = 14;
/** marge avant de dire « depuis le » (quelques jours sans pesee au debut de la periode ne comptent pas) */
export const MARGE_MENTION_JOURS = 3;

export type Cadrage<T> = {
  /** les pesees montrees */
  points: T[];
  /** debut de l'axe du temps (AAAA-MM-JJ), null sans pesee */
  debut: string | null;
  /** « depuis le 3 oct. » quand la periode demandee depasse ce qui est montre, sinon null */
  mention: string | null;
};

const jours = (a: string, b: string) => Math.round((jourDe(b) - jourDe(a)) / DAY);
const moinsJours = (iso: string, n: number) => {
  const d = new Date(jourDe(iso) - n * DAY);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** 1 a 3 pesees isolees au debut (trou de plus de 21 jours ou d'un quart de la periode) : on coupe avant le trou */
export function couperIsolees<T extends { date: string }>(pts: T[], periode: number): T[] {
  if (pts.length < 3) return pts;
  const seuil = Math.max(21, periode * 0.25);
  let cut = 0;
  for (let k = 1; k <= Math.min(3, pts.length - 2); k++) {
    if (jours(pts[k - 1].date.slice(0, 10), pts[k].date.slice(0, 10)) > seuil) cut = k;
  }
  return cut ? pts.slice(cut) : pts;
}

/**
 * Les pesees et l'axe du temps d'une periode (en jours) ou de « Mon plan ».
 * series : tes pesees, une par jour, dans l'ordre ; debutObjectif : le debut de ton objectif (ligne.depart.date).
 */
export function cadrerPeriode<T extends { date: string }>(series: T[], periode: number, debutObjectif: string | null | undefined, today?: string): Cadrage<T> {
  const all = today ? series.filter((p) => p.date.slice(0, 10) <= today) : series;
  if (!all.length) return { points: [], debut: null, mention: null };
  const derniere = all[all.length - 1].date.slice(0, 10);
  const dObj = debutObjectif && /^\d{4}-\d{2}-\d{2}/.test(debutObjectif) && debutObjectif.slice(0, 10) <= derniere ? debutObjectif.slice(0, 10) : null;

  if (periode === PERIODE_PLAN_CADRAGE) {
    if (!dObj) {
      // pas de plan : les 3 derniers mois
      return cadrerPeriode(all, 90, null);
    }
    const s = all.filter((p) => p.date.slice(0, 10) >= dObj);
    const points = s.length ? s : all.slice(-1);
    return { points, debut: dObj < points[0].date.slice(0, 10) ? dObj : points[0].date.slice(0, 10), mention: null };
  }

  const limite = periode > 0 ? moinsJours(derniere, periode) : '0000-00-00';
  let win = all.filter((p) => p.date.slice(0, 10) >= limite);
  if (!win.length) win = all.slice(-1);

  if (dObj && dObj > win[0].date.slice(0, 10)) {
    const avant = win.filter((p) => p.date.slice(0, 10) < dObj);
    const apres = win.filter((p) => p.date.slice(0, 10) >= dObj);
    const vrai = avant.length >= HISTORIQUE_MIN_PESEES && jours(avant[0].date.slice(0, 10), avant[avant.length - 1].date.slice(0, 10)) >= HISTORIQUE_MIN_JOURS;
    if (!vrai && apres.length) win = apres;
  } else if (!dObj) {
    win = couperIsolees(win, periode);
  }

  const premiere = win[0].date.slice(0, 10);
  // l'objectif commence juste avant ta premiere pesee montree (et dans la periode) : l'axe part de lui
  const debut = dObj && dObj < premiere && dObj >= limite ? dObj : premiere;
  const mention = periode > 0 && jours(limite, debut) > MARGE_MENTION_JOURS ? traduire("depuis le {0}", jourCourt(debut)) : null;
  return { points: win, debut, mention };
}

/** « en 3 mois », « depuis le 3 oct. », « depuis ton début » : l'ecart de la periode, dit juste */
export function texteDePeriode(periode: number, mention: string | null, plan = traduire('depuis ton début')): string {
  if (periode === PERIODE_PLAN_CADRAGE) return plan;
  if (mention) return mention;
  const t: Record<number, string> = { 30: traduire('en 1 mois'), 90: traduire('en 3 mois'), 180: traduire('en 6 mois'), 365: traduire('en 1 an') };
  return t[periode] ?? traduire('sur la période');
}

/**
 * L'echelle verticale de la courbe du poids (courbe v2), avant la place du torii et des etiquettes :
 *  - tes pesees (deja attenuees pour les isolees) ;
 *  - ta ligne visible et sa bande « ton allure » (bornes plus la tolerance), sinon ses bornes au debut ;
 *  - le cap seulement s'il compte a l'ecran : torii dans la fenetre, « Mon plan », pas de ligne, ou ligne trop
 *    courte pour etre tracee (la ligne « Cap » est alors le seul repere) ;
 *  - une marge : 12 % de la hauteur, au moins 0,6 kg de chaque cote.
 */
export function echelleCourbe(a: {
  valeurs: number[];
  cap: number | null;
  ligne: boolean;
  toriiDansFenetre: boolean;
  plan: boolean;
  bande: { haut: number; bas: number }[];
  bornesDebut?: { haut: number; bas: number } | null;
  tolerance: number;
}): { lo: number; hi: number; capDansEchelle: boolean } {
  let lo = Math.min(...a.valeurs);
  let hi = Math.max(...a.valeurs);
  const capOn = a.cap != null && a.cap > 0;
  const tracee = a.bande.length > 1;
  const capDansEchelle = capOn && (!a.ligne || a.toriiDansFenetre || a.plan || !tracee);
  if (capDansEchelle) {
    lo = Math.min(lo, (a.cap as number) - 0.3);
    hi = Math.max(hi, (a.cap as number) + 0.3);
  }
  if (a.ligne && tracee) {
    a.bande.forEach((p) => {
      hi = Math.max(hi, p.haut + a.tolerance);
      lo = Math.min(lo, p.bas - a.tolerance);
    });
  } else if (a.ligne && a.bornesDebut) {
    hi = Math.max(hi, a.bornesDebut.haut);
    lo = Math.min(lo, a.bornesDebut.bas);
  }
  if (capDansEchelle) hi += 0.5;
  const padv = Math.max(0.6, (hi - lo) * 0.12);
  return { lo: lo - padv, hi: hi + padv, capDansEchelle };
}

/** Les morceaux de la ligne « Ton allure », pour la colorer (16 octobre, Houari : « mets des choses en couleur ») */
export type PartiesAllure = {
  /** « Ton allure aujourd’hui », « Ton allure le 12 oct. », « Ton allure ce jour-là » (encre secondaire) */
  debut: string;
  /** « 80,4 kg » : la valeur de ta ligne directrice ce jour-la (dans le vert de la ligne) */
  valeur: string;
  /** le ton du statut du jour : vert dans l'allure, bleu au-dessus (ou en dessous en prise), orange trop vite */
  ton: 'vert' | 'bleu' | 'orange' | 'gris';
};

const kgUn = (v: number) => (Math.round(v * 10) / 10).toFixed(1).replace('.', DECIMAL);

/**
 * Courbe v2 (Houari, 16 octobre : « la bulle ton allure gâche la vue ») : l'allure ne se pose plus sur la courbe,
 * elle s'ecrit en petit sous « Tu es 2,3 kg au-dessus de ton rythme prévu ». Meme valeur que le point vert de la
 * courbe (medianeA a la date de la pesee). Perte et prise seulement (en maintien, la phrase dit deja ta zone) ;
 * null avant le debut de ton plan. passe : la pesee touchee au doigt.
 */
export function partiesAllure(l: Ligne | null | undefined, torii: string | null | undefined, iso: string | null | undefined, poids: number, today: string, passe = false): PartiesAllure | null {
  if (!l || !iso || (l.mode !== 'perte' && l.mode !== 'prise')) return null;
  const d = iso.slice(0, 10);
  const st = statutLigne(l, d, poids, torii ?? null);
  if (st.id === 'avant') return null;
  const m = medianeA(l, torii ?? null, d);
  if (m == null || !isFinite(m)) return null;
  const quand = passe ? traduire('ce jour-là') : d === today ? traduire('aujourd’hui') : traduire("le {0}", jourCourt(d));
  // 16 octobre (Houari) : plus d'ecart « toi +0,3 kg », la phrase de statut au dessus le dit deja
  return { debut: traduire("Ton allure {0}", quand), valeur: `${kgUn(m)} kg`, ton: st.ton };
}

/** La meme ligne en texte simple (lecteur d'ecran, tests) : « Ton allure aujourd’hui : 80,4 kg » */
export function texteAllure(l: Ligne | null | undefined, torii: string | null | undefined, iso: string | null | undefined, poids: number, today: string, passe = false): string | null {
  const p = partiesAllure(l, torii, iso, poids, today, passe);
  return p ? `${p.debut} : ${p.valeur}` : null;
}
