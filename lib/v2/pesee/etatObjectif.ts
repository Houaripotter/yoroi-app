/**
 * Ton objectif de poids : SOURCE UNIQUE des chiffres et des phrases (audit du poids, 18 octobre 2026).
 *
 * Houari voyait trois « depuis ton début » differents pour la meme pesee (−3,7 kg sur l'accueil, 3,4 kg perdus sur
 * la barre, −1,1 kg dans le detail). Cause : trois debuts differents (la premiere pesee de la periode, le poids de
 * depart du profil, la tendance lissee). Ici, un seul debut et un seul calcul, que l'accueil, le detail du poids et
 * la feuille « Ton objectif » lisent tels quels :
 *  - debut : la date et le poids du debut de ton objectif (profil, start_date et start_weight, choisis par toi) ;
 *  - actuel : ta derniere pesee (jamais dans le futur) ;
 *  - variation, fait, reste, part du chemin : debut, actuel et cap, rien d'autre ;
 *  - rythme prevu : ta ligne directrice, du debut a ton cap a ta date du cap (torii) ;
 *  - allure : la ou ta ligne te place le jour de ta derniere pesee, l'ecart et le message ;
 *  - projection a ton rythme reel (lib/v2/pesee/predictions.ts, la meme que la page Prédictions) : ton poids dans
 *    1 mois, la date ou tu passes ton cap et l'avance (ou le retard) en jours sur ta date du cap, tous tires de la
 *    MEME trajectoire : impossible d'annoncer une avance avec un poids dans 1 mois incoherent.
 * Aucun arrondi ici : les chiffres restent bruts, les textes arrondissent une seule fois, a l'affichage.
 * Fonctions pures, testees (__tests__/unit/etatObjectif.test.ts).
 *
 * 18 octobre 2026, calcul du poids d'apres les etudes (_propositions/calcul_poids_etudes_2026-10-18.md) :
 *  - tendance : ce que pese ton corps sans l'eau du jour (filtre de Kalman, lib/v2/pesee/tendance.ts), a cote de ta
 *    derniere pesee, et l'ecart entre les deux en mots (« une partie est sans doute de l'eau ») ;
 *  - rythme : ta pente des 4 dernieres semaines (la meme que ta projection), en kg et en % de ton poids par semaine,
 *    compare aux reperes des etudes : perte 0,5 a 1 % par semaine (Helms 2014, Garthe 2011), prise 0,25 a 0,5 %
 *    (Iraki 2019). Au-dessus, un message bienveillant ; au debut d'une perte, il dit que c'est surtout de l'eau ;
 *  - « ralentis un peu » seulement si ton rythme depasse vraiment ces reperes (avant : des que tu etais sous ta ligne,
 *    meme a un rythme sain) ;
 *  - donnees : pas assez de pesees, la raison en mots (texteManque) au lieu d'une projection fausse ;
 *  - projection : la fourchette de date (le plus tot, le plus tard) en plus de la date centrale.
 */
import type { Ligne, PhraseStatut, Statut } from './ligneDirectrice';
import { ecartJours, jourCourt, medianeA, phraseStatut, statutLigne } from './ligneDirectrice';
import type { Manque } from './predictions';
import { prevoir, texteManque, verifierDonnees } from './predictions';
import { PERTE_MAX, PERTE_MIN, PRISE_MAX, PRISE_MIN, fourchetteDates } from './estimation';
import { tendanceActuelle } from './tendance';

export type SensObjectif = 'perte' | 'prise' | 'maintien';
type Pesee = { date: string; value: number };
const ISO = /^\d{4}-\d{2}-\d{2}/;

export type ProjectionObjectif = {
  /** ton poids dans 1 mois a ton rythme reel */
  dansUnMois: { date: string; poids: number } | null;
  /** la date ou tu passes ton cap a ton rythme reel (null : pas vers ton cap, ou a plus d'un an) */
  arrivee: string | null;
  /** jours d'avance sur ta date du cap (negatif : de retard), null sans les deux dates */
  avanceJours: number | null;
  /** ton rythme reel va-t-il vers ton cap */
  versCap: boolean;
  sens: 'baisse' | 'hausse' | 'stable';
  /** ta trajectoire a ton rythme, jour par jour depuis aujourd'hui (pour la courbe) */
  points: { date: string; value: number }[];
  /** la fourchette de ta date de passage (le plus tot, le plus tard), null si l'un des bords sort de l'annee */
  arriveeTot: string | null;
  arriveeTard: string | null;
};

/**
 * Ton rythme reel (la pente de ta projection, 4 dernieres semaines) compare aux reperes des etudes.
 * zone : 'doux' sous le repere, 'conseille' dedans, 'rapide' au-dessus, 'stable' (moins de 100 g par semaine),
 * 'inverse' (tu t'eloignes de ton cap).
 */
export type RythmeReel = {
  kgSemaine: number;
  /** part de ton poids par semaine, positive (0,012 : 1,2 %) */
  partSemaine: number;
  zone: 'doux' | 'conseille' | 'rapide' | 'stable' | 'inverse';
  /** le repere de ton sens, en part du poids par semaine */
  repere: { min: number; max: number } | null;
  /** debut de ton objectif il y a moins de 3 semaines : la perte du debut est surtout de l'eau et du glycogene */
  debutRecent: boolean;
};

export type EtatObjectif = {
  /** debut de ton objectif (date et poids) */
  debut: { date: string; poids: number } | null;
  /** ta derniere pesee */
  actuel: { date: string; poids: number } | null;
  cap: number | null;
  /** ta date du cap (le torii) */
  dateCap: string | null;
  /** la date du cap a ete choisie par toi */
  dateCapChoisie: boolean;
  sens: SensObjectif | null;
  atteint: boolean;
  /** actuel moins debut (negatif : tu as perdu) */
  variation: number | null;
  /** chemin fait vers ton cap (perte : debut moins actuel ; prise : actuel moins debut) */
  fait: number | null;
  /** ce qu'il reste jusqu'a ton cap, positif (0 si atteint) */
  reste: number | null;
  /** part du chemin, de 0 a 1 */
  part: number | null;
  /** ton allure : la ou ta ligne te place le jour de ta derniere pesee */
  allure: number | null;
  /** actuel moins allure */
  ecartAllure: number | null;
  statut: Statut | null;
  /** la phrase de statut, coherente avec ta projection */
  phrase: PhraseStatut | null;
  projection: ProjectionObjectif | null;
  /** ta tendance a ta derniere pesee (sans l'eau du jour), null sous 3 pesees */
  tendance: { date: string; poids: number } | null;
  /** ta derniere pesee moins ta tendance (positif : au-dessus) */
  ecartTendance: number | null;
  /** ton rythme reel compare aux reperes, null sans assez de pesees */
  rythme: RythmeReel | null;
  /** pas assez de pesees pour une projection : ce qu'il manque (null : assez) */
  manque: Manque | null;
};

/** Jours depuis ton debut sous lesquels une perte rapide est surtout de l'eau et du glycogene */
export const JOURS_DEBUT_RECENT = 21;
/** Ecart entre ta pesee et ta tendance a partir duquel on en parle, en kg */
export const ECART_EAU_KG = 0.6;

/** « 3,4 » : une decimale, virgule */
export function kg1(v: number): string {
  return (Math.round(Math.abs(v) * 10) / 10).toFixed(1).replace('.', ',');
}
/** « 85 » ou « 85,5 » */
export function kgCourt(v: number): string {
  const a = Math.abs(v);
  return Math.abs(a - Math.round(a)) < 0.05 ? String(Math.round(a)) : kg1(a);
}
/** « 11 semaines », « 5 jours », « 1 jour » */
export function duree(jours: number): string {
  const j = Math.abs(jours);
  if (j >= 14) return `${Math.round(j / 7)} semaines`;
  return `${j} jour${j > 1 ? 's' : ''}`;
}

/** Le sens de ton objectif : ta ligne, sinon la place du cap par rapport a ton debut */
export function sensDe(ligne: Ligne | null, cap: number | null, debut: number | null): SensObjectif | null {
  if (ligne) return ligne.mode === 'perte' || ligne.mode === 'prise' ? ligne.mode : 'maintien';
  if (cap == null || debut == null) return null;
  if (Math.abs(cap - debut) < 0.2) return 'maintien';
  return cap < debut ? 'perte' : 'prise';
}

export function etatObjectif(a: {
  series: Pesee[];
  cap: number | null;
  /** debut du plan (usePlanPoids().depart), sinon ta ligne, sinon ta premiere pesee */
  depart: { date: string; poids: number } | null;
  ligne: Ligne | null;
  torii: string | null;
  atteint?: boolean;
  choisie?: boolean;
  today: string;
  /** false : pas de projection (carte d'exemple) */
  projection?: boolean;
}): EtatObjectif {
  const { today } = a;
  const pesees = a.series
    .filter((p) => p && p.value > 0 && ISO.test(p.date) && p.date.slice(0, 10) <= today)
    .map((p) => ({ date: p.date.slice(0, 10), value: p.value }))
    .sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
  const last = pesees[pesees.length - 1];
  const actuel = last ? { date: last.date, poids: last.value } : null;
  const cap = a.cap != null && a.cap > 0 ? a.cap : null;
  const debut = a.depart ?? a.ligne?.depart ?? (pesees[0] ? { date: pesees[0].date, poids: pesees[0].value } : null);
  const sens = sensDe(a.ligne, cap, debut?.poids ?? null);
  const dateCap = a.torii && ISO.test(a.torii) ? a.torii.slice(0, 10) : null;
  const t = tendanceActuelle(pesees, today);
  const tendance = t ? { date: t.date, poids: t.poids } : null;
  const ecartTendance = t && actuel ? actuel.poids - t.poids : null;
  const manque = a.projection === false ? null : verifierDonnees(pesees, today);
  const vide: EtatObjectif = { debut, actuel, cap, dateCap, dateCapChoisie: !!a.choisie, sens, atteint: false, variation: null, fait: null, reste: null, part: null, allure: null, ecartAllure: null, statut: null, phrase: null, projection: null, tendance, ecartTendance, rythme: null, manque };
  if (!actuel || !debut) return vide;

  const variation = actuel.poids - debut.poids;
  let fait: number | null = null;
  let reste: number | null = null;
  let part: number | null = null;
  let atteint = !!a.atteint;
  if (cap != null && (sens === 'perte' || sens === 'prise')) {
    const perte = sens === 'perte';
    atteint = atteint || (perte ? actuel.poids <= cap + 0.05 : actuel.poids >= cap - 0.05);
    fait = perte ? debut.poids - actuel.poids : actuel.poids - debut.poids;
    reste = atteint ? 0 : Math.max(0, perte ? actuel.poids - cap : cap - actuel.poids);
    const span = Math.abs(debut.poids - cap);
    part = atteint ? 1 : span < 0.05 ? 0 : Math.max(0, Math.min(1, fait / span));
  }

  const l = a.ligne;
  let allure: number | null = null;
  let statut: Statut | null = null;
  let phrase: PhraseStatut | null = null;
  if (l) {
    statut = statutLigne(l, actuel.date, actuel.poids, dateCap);
    phrase = phraseStatut(l, actuel.date, actuel.poids, dateCap);
    if ((l.mode === 'perte' || l.mode === 'prise') && statut.id !== 'avant') allure = medianeA(l, dateCap, actuel.date);
  }

  let projection: ProjectionObjectif | null = null;
  let rythme: RythmeReel | null = null;
  if (a.projection !== false) {
    const p = prevoir({ series: pesees, today, cap, ligne: l, torii: dateCap, atteint });
    if (p.ok) {
      rythme = rythmeReel(p.ajustement.kgSemaine, p.ajustement.niveau, sens, cap, debut.date, today);
      const m = p.dates.find((d) => d.id === '1m');
      const arrivee = p.arrivee?.date ?? null;
      const fin = arrivee ?? p.courbe[p.courbe.length - 1]?.date;
      projection = {
        dansUnMois: m ? { date: m.date, poids: m.valeur } : null,
        arrivee,
        avanceJours: arrivee && dateCap && !atteint ? ecartJours(arrivee, dateCap) : null,
        versCap: p.versCap,
        sens: p.sens,
        points: p.courbe.filter((q) => !fin || q.date <= fin).map((q) => ({ date: q.date, value: q.valeur })),
        arriveeTot: p.arrivee?.tot ?? null,
        arriveeTard: p.arrivee?.tard ?? null,
      };
    }
  }

  // la phrase de statut ne contredit jamais ta projection : « ralentis un peu » seulement si tu arrives aussi avant
  // ta date du cap ; au-dessus de ta ligne mais en avance a ton rythme, elle le dit
  if (phrase && statut && l && (l.mode === 'perte' || l.mode === 'prise') && projection) {
    const av = projection.avanceJours;
    if (statut.id === 'vite' && (av == null || av < -3)) phrase = { ...phrase, apres: '' };
    if (statut.id === 'lent' && av != null && av > 3) phrase = { ...phrase, apres: `${phrase.apres}, ta tendance rattrape` };
  }
  // 18 octobre (etudes) : « ralentis un peu » seulement si ton rythme reel depasse les reperes (1 % par semaine en
  // perte, 0,5 % en prise) ; plus vite que ta ligne mais a un rythme sain, la phrase le dit ; au debut d'une perte,
  // la baisse rapide est surtout de l'eau : pas de conseil de ralentir
  if (phrase && statut && statut.id === 'vite' && rythme) {
    if (rythme.zone !== 'rapide') phrase = { ...phrase, apres: rythme.zone === 'conseille' ? ', à un rythme sain' : '' };
    else if (rythme.debutRecent && sens === 'perte') phrase = { ...phrase, apres: '' };
  }

  return { ...vide, atteint, variation, fait, reste, part, allure, ecartAllure: allure == null ? null : actuel.poids - allure, statut, phrase, projection, rythme };
}

/** Ton rythme compare aux reperes (Helms 2014, Garthe 2011 en perte ; Iraki 2019 en prise) */
export function rythmeReel(kgSemaine: number, niveau: number, sens: SensObjectif | null, cap: number | null, debut: string | null, today: string): RythmeReel {
  const partSemaine = niveau > 0 ? Math.abs(kgSemaine) / niveau : 0;
  const perte = sens === 'perte' || (sens !== 'prise' && kgSemaine < 0);
  const repere = sens === 'maintien' ? null : perte ? { min: PERTE_MIN, max: PERTE_MAX } : { min: PRISE_MIN, max: PRISE_MAX };
  const debutRecent = !!debut && ISO.test(debut) && ecartJours(debut.slice(0, 10), today) < JOURS_DEBUT_RECENT;
  let zone: RythmeReel['zone'];
  if (Math.abs(kgSemaine) < 0.1) zone = 'stable';
  else if ((sens === 'perte' && kgSemaine > 0) || (sens === 'prise' && kgSemaine < 0)) zone = 'inverse';
  else if (!repere) zone = 'conseille';
  else zone = partSemaine > repere.max + 1e-9 ? 'rapide' : partSemaine < repere.min - 1e-9 ? 'doux' : 'conseille';
  void cap;
  return { kgSemaine, partSemaine, zone, repere, debutRecent };
}

// ===== Textes (arrondis ici, une seule fois) =====

/** « −3,4 kg depuis ton début », « stable depuis ton début » */
export function texteDepuisDebut(e: Pick<EtatObjectif, 'variation'>): string | null {
  if (e.variation == null) return null;
  if (Math.abs(e.variation) < 0.05) return 'stable depuis ton début';
  return `${e.variation < 0 ? '−' : '+'}${kg1(e.variation)} kg depuis ton début`;
}

/** « 3,4 kg perdus, plus que 2,4 kg avant ton cap » (prise : « pris ») */
export function texteChemin(e: Pick<EtatObjectif, 'sens' | 'fait' | 'reste' | 'atteint'>): string | null {
  if (e.fait == null || e.reste == null || (e.sens !== 'perte' && e.sens !== 'prise')) return null;
  const perte = e.sens === 'perte';
  if (e.atteint) return Math.abs(e.fait) >= 0.05 ? `Cap atteint, ${kg1(e.fait)} kg ${perte ? 'perdus' : 'pris'}` : 'Cap atteint';
  const debut = Math.abs(e.fait) < 0.05 ? 'Ton chemin commence' : e.fait > 0 ? `${kg1(e.fait)} kg ${perte ? 'perdus' : 'pris'}` : `${kg1(e.fait)} kg ${perte ? 'pris' : 'perdus'} depuis ton début`;
  return `${debut}, plus que ${kg1(e.reste)} kg avant ton cap`;
}

/** « 59 % du chemin » */
export function textePart(e: Pick<EtatObjectif, 'part' | 'atteint'>): string | null {
  if (e.part == null) return null;
  return e.atteint ? 'Cap atteint' : `${Math.round(e.part * 100)} % du chemin`;
}

/**
 * « Où tu en seras » : ton poids dans 1 mois et, de la meme trajectoire, la date ou tu passes ton cap et l'ecart
 * avec ta date du cap. null sans projection.
 */
export function texteProjection(e: Pick<EtatObjectif, 'projection' | 'cap' | 'dateCap' | 'sens' | 'atteint'>): { valeur: string; note: string | null } | null {
  const p = e.projection;
  if (!p) return null;
  const valeur = p.dansUnMois ? `${kgCourt(p.dansUnMois.poids)} kg dans 1 mois` : '';
  if (!valeur) return null;
  if (e.atteint) return { valeur, note: 'tu tiens ton cap' };
  if (e.cap == null || (e.sens !== 'perte' && e.sens !== 'prise')) return { valeur, note: null };
  if (p.sens === 'stable') return { valeur, note: 'ton poids reste stable' };
  if (!p.versCap) return { valeur, note: 'tu t’éloignes de ton cap' };
  if (!p.arrivee) return { valeur, note: 'ton cap est à plus d’un an' };
  const passe = `tu passes ${kgCourt(e.cap)} kg vers le ${jourCourt(p.arrivee)}`;
  const av = p.avanceJours;
  if (av == null || !e.dateCap) return { valeur, note: passe };
  if (Math.abs(av) <= 3) return { valeur, note: `${passe}, pile pour ta date du cap` };
  return { valeur, note: `${passe}, ${duree(av)} ${av > 0 ? 'avant' : 'après'} ta date du cap (${jourCourt(e.dateCap)})` };
}

const pct1 = (x: number) => (Math.round(x * 1000) / 10).toFixed(1).replace('.', ',').replace(',0', '');

/**
 * Ton rythme en mots, bienveillant, sans chiffre invente : « Tu perds environ 0,6 kg par semaine, 0,7 % de ton poids.
 * C'est le rythme conseillé aux sportifs. » null sans assez de pesees.
 */
export function texteRythme(e: Pick<EtatObjectif, 'rythme' | 'sens'>): { ton: 'vert' | 'bleu' | 'orange'; titre: string; texte: string } | null {
  const r = e.rythme;
  if (!r) return null;
  const kg = kg1(r.kgSemaine);
  const p = pct1(r.partSemaine);
  if (r.zone === 'stable') return { ton: e.sens === 'maintien' ? 'vert' : 'bleu', titre: 'Ton poids est stable', texte: 'Moins de 100 g de variation par semaine sur tes 4 dernières semaines.' };
  const baisse = r.kgSemaine < 0;
  const verbe = baisse ? 'Tu perds' : 'Tu prends';
  const titre = `${verbe} environ ${kg} kg par semaine`;
  if (r.zone === 'inverse') return { ton: 'bleu', titre, texte: `${p} % de ton poids par semaine, dans l’autre sens que ton cap. Une semaine ne fait pas une tendance : regarde comment elle évolue.` };
  if (e.sens === 'maintien' || !r.repere) return { ton: 'bleu', titre, texte: `${p} % de ton poids par semaine.` };
  const rep = baisse ? '0,5 à 1 %' : '0,25 à 0,5 %';
  if (r.zone === 'conseille') return { ton: 'vert', titre, texte: `${p} % de ton poids par semaine : ${baisse ? 'le rythme conseillé aux sportifs pour garder leur muscle' : 'le rythme conseillé pour prendre du muscle en limitant le gras'}.` };
  if (r.zone === 'doux') return { ton: 'vert', titre, texte: `${p} % de ton poids par semaine, un rythme doux. Les repères des études sont de ${rep} par semaine.` };
  // rapide
  if (baisse && r.debutRecent) return { ton: 'bleu', titre, texte: `${p} % de ton poids par semaine. Au début, une bonne partie est de l’eau et du glycogène : ce rythme va ralentir tout seul.` };
  if (baisse) return { ton: 'orange', titre, texte: `${p} % de ton poids par semaine, plus que les ${rep} conseillés. Un rythme un peu plus doux protège mieux ton muscle et ton énergie à l’entraînement.` };
  return { ton: 'orange', titre, texte: `${p} % de ton poids par semaine, plus que les ${rep} conseillés. Plus lentement, tu prends plus de muscle et moins de gras.` };
}

/**
 * Ta tendance et ta derniere pesee en mots : « Ta tendance : 87,6 kg » et, quand l'ecart passe 0,6 kg, ce que c'est
 * probablement (de l'eau). null sans tendance.
 */
export function texteTendance(e: Pick<EtatObjectif, 'tendance' | 'ecartTendance'>): { valeur: string; note: string | null } | null {
  if (!e.tendance) return null;
  const valeur = `Ta tendance : ${kg1(e.tendance.poids)} kg`;
  const d = e.ecartTendance;
  if (d == null || Math.abs(d) < ECART_EAU_KG) return { valeur, note: 'ta dernière pesée est dans ta tendance' };
  if (Math.abs(d) >= 2) return { valeur, note: `ta dernière pesée est ${kg1(d)} kg ${d > 0 ? 'au-dessus' : 'en dessous'} : vérifie ta balance ou ta saisie` };
  return d > 0
    ? { valeur, note: `ta dernière pesée est ${kg1(d)} kg au-dessus : sans doute de l’eau (sel, glucides, entraînement, cycle), elle repart en général en quelques jours` }
    : { valeur, note: `ta dernière pesée est ${kg1(d)} kg en dessous : une partie est sans doute de l’eau, elle peut revenir` };
}

/** Pas assez de pesees : le titre et la phrase (null quand il y en a assez) */
export function texteDonnees(e: Pick<EtatObjectif, 'manque'>): { titre: string; texte: string } | null {
  return e.manque ? texteManque(e.manque) : null;
}

/** « du 2 au 20 nov. » : la fourchette de ta date de passage, null sans les deux bords */
export function texteFourchette(e: Pick<EtatObjectif, 'projection'>, today: string): string | null {
  const p = e.projection;
  if (!p || !p.arriveeTot || !p.arriveeTard || !p.arrivee) return null;
  const [a, b] = p.arriveeTot <= p.arriveeTard ? [p.arriveeTot, p.arriveeTard] : [p.arriveeTard, p.arriveeTot];
  if (ecartJours(a, b) < 4) return null;
  return fourchetteDates(a, b, today);
}

/** « le 23 sept., 90,8 kg » */
export function texteDebut(e: Pick<EtatObjectif, 'debut'>): string | null {
  return e.debut ? `le ${jourCourt(e.debut.date)}, ${kg1(e.debut.poids)} kg` : null;
}

/** « 85 kg, perte de 5,8 kg », « 80 kg, prise de masse de 3 kg », « 75 kg, maintien » */
export function texteObjectif(e: Pick<EtatObjectif, 'cap' | 'debut' | 'sens'>): string | null {
  if (e.cap == null) return null;
  if (!e.debut || e.sens === 'maintien' || e.sens == null) return `${kgCourt(e.cap)} kg${e.sens === 'maintien' ? ', maintien' : ''}`;
  const d = Math.abs(e.cap - e.debut.poids);
  return `${kgCourt(e.cap)} kg, ${e.sens === 'perte' ? 'perte' : 'prise de masse'} de ${kgCourt(d)} kg`;
}

/** « le 8 févr. » */
export function texteDateCap(e: Pick<EtatObjectif, 'dateCap'>): string | null {
  return e.dateCap ? `le ${jourCourt(e.dateCap)}` : null;
}

// ===== Garde-fous des changements (feuille « Ton objectif ») =====

export const POIDS_MIN = 20;
export const POIDS_MAX = 400;

/** null si le debut est valable, sinon la raison en mots */
export function validerDebut(date: string, poids: number | null, today: string): string | null {
  if (!ISO.test(date)) return 'Choisis une date de début.';
  if (date.slice(0, 10) > today) return 'Ton début ne peut pas être dans le futur.';
  if (poids != null && !(poids >= POIDS_MIN && poids <= POIDS_MAX)) return `Indique un poids entre ${POIDS_MIN} et ${POIDS_MAX} kg.`;
  return null;
}

/** null si l'objectif est valable (different de ton poids actuel, dans les reperes), sinon la raison */
export function validerObjectif(poids: number, actuel: number | null): string | null {
  if (!(poids >= POIDS_MIN && poids <= POIDS_MAX)) return `Indique un poids entre ${POIDS_MIN} et ${POIDS_MAX} kg.`;
  if (actuel != null && Math.abs(poids - actuel) < 0.2) return 'Ton objectif doit être différent de ton poids actuel.';
  return null;
}

/** null si la date du cap est apres aujourd'hui, sinon la raison */
export function validerDateCap(date: string, today: string): string | null {
  if (!ISO.test(date)) return 'Choisis une date.';
  if (date.slice(0, 10) <= today) return 'Ta date du cap doit être après aujourd’hui.';
  return null;
}

/** Le sens a garder dans le profil (weight_goal) pour un objectif : perte sous ton debut, prise au-dessus */
export function sensPourObjectif(cap: number, debut: number | null): 'lose' | 'gain' | 'maintain' {
  if (debut == null || Math.abs(cap - debut) < 0.2) return 'maintain';
  return cap < debut ? 'lose' : 'gain';
}
