/**
 * Sources du paywall : une liste FERMEE. Chaque blocage Premium dit d'ou il vient, le mur (PremiumGate)
 * et le paywall parlent de CE contenu, et la mesure sait quel mur fait passer a Premium.
 *  - SourcePremium : un contenu bloque (mur PremiumGate ou blocage ponctuel), avec son libelle,
 *    sa phrase, sa couleur d'accent du theme et son icone. Le compteur est un vrai nombre passe
 *    par l'appelant (photos deja prises, competitions a venir...), jamais invente.
 *  - SourceHorsMur : les entrees du paywall qui ne sont pas un contenu bloque.
 * Pour ouvrir le paywall : ouvrirPaywall(source, compteur). Pas d'achat direct depuis un mur
 * (decision de Houari) : on passe toujours par le paywall, pour garder l'etape paywall_view.
 */
import { router } from 'expo-router';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import type { YoroiColors } from '@/components/yoroi/tokens';
import { murPremiumEvent } from '@/lib/v2/premium/events';

export type SourcePremium =
  | 'prevision_poids'
  | 'periode_longue'
  | 'sante_annee'
  | 'photos_limite'
  | 'competitions_limite'
  | 'videos'
  | 'progression_mouvements'
  | 'signes_vitaux'
  | 'bilan_pdf'
  | 'partenaire_pdf'
  | 'objectifs_dates'
  | 'scenes'
  | 'personnages'
  | 'logos'
  | 'seche'
  | 'plan_nutrition'
  | 'bilan_annuel'
  | 'analyse_combat'
  | 'temps_tatami'
  | 'rounds'
  | 'radar'
  | 'competiteur'
  | 'camp_competition'
  | 'matrice_adversaires'
  | 'partenaires'
  | 'plan_de_match'
  | 'drills';

export type SourceHorsMur = 'onboarding' | 'reglages' | 'fin_premium' | 'notification' | 'dojo' | 'periode';

/** Toute source du paywall ; 'app' quand rien n'est precise */
export type SourcePaywall = SourcePremium | SourceHorsMur | 'app';

/** Couleur d'accent, toujours lue dans le theme (clair et sombre) */
export type AccentSource = 'indigo' | 'or' | 'mousse' | 'rouge';

export type InfoSource = {
  /** libelle court, titre du mur et de l'apercu du paywall */
  libelle: string;
  /** phrase qui parle de CE contenu ; le compteur (si l'appelant en a un) la rend concrete */
  phrase: (compteur?: number | null) => string;
  accent: AccentSource;
  icone: IconName;
  /** l'apercu du paywall peut montrer ta courbe de poids voilee */
  courbe?: boolean;
};

const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
const compte = (n?: number | null): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

export const SOURCES: Record<SourcePremium, InfoSource> = {
  prevision_poids: { libelle: 'Prévisions de poids', phrase: () => 'Tes prévisions de poids sur 3 mois sont prêtes.', accent: 'indigo', icone: 'target', courbe: true },
  periode_longue: { libelle: 'Tes courbes longues', phrase: (n) => (compte(n) ? `Tes ${pluriel(n, 'pesée', 'pesées')} sur 6 mois, 1 an et tout ton historique.` : 'Tes courbes sur 6 mois, 1 an et tout ton historique.'), accent: 'indigo', icone: 'calendar', courbe: true },
  sante_annee: { libelle: 'Ta santé sur l’année', phrase: () => 'Ton année de santé, mois par mois, est déjà tracée.', accent: 'indigo', icone: 'pulse' },
  photos_limite: { libelle: 'Photos de progression', phrase: (n) => (compte(n) ? `Déjà ${pluriel(n, 'photo', 'photos')} dans ton coffre. Continue sans limite.` : 'Ajoute autant de photos de progression que tu veux.'), accent: 'or', icone: 'image' },
  competitions_limite: { libelle: 'Compétitions à venir', phrase: (n) => (compte(n) ? `${pluriel(n, 'compétition', 'compétitions')} à venir. Ajoute toutes les suivantes.` : 'Ajoute toutes tes compétitions à venir, sans limite.'), accent: 'rouge', icone: 'trophy' },
  videos: { libelle: 'Tes vidéos', phrase: () => 'Tes vidéos de technique, rangées dans ton carnet.', accent: 'indigo', icone: 'camera' },
  progression_mouvements: { libelle: 'Progression des mouvements', phrase: () => 'Ta progression sur les gros mouvements, séance après séance.', accent: 'mousse', icone: 'dumbbell' },
  signes_vitaux: { libelle: 'Signes vitaux de la nuit', phrase: () => 'Ta fréquence cardiaque, ta respiration et ton oxygène pendant la nuit.', accent: 'rouge', icone: 'heart' },
  bilan_pdf: { libelle: 'Bilan en PDF', phrase: () => 'Ton bilan complet en PDF, prêt à envoyer à ton coach.', accent: 'indigo', icone: 'doc' },
  partenaire_pdf: { libelle: 'Fiche partenaire en PDF', phrase: () => 'La fiche complète de ce partenaire, en PDF.', accent: 'indigo', icone: 'doc' },
  objectifs_dates: { libelle: 'Objectifs datés', phrase: () => 'Un compte à rebours jusqu’à chacun de tes buts.', accent: 'mousse', icone: 'target' },
  scenes: { libelle: 'Toutes les scènes', phrase: () => 'Toutes les scènes du monde samouraï, sans attendre.', accent: 'or', icone: 'image' },
  personnages: { libelle: 'Tous les personnages', phrase: () => 'Tous les personnages du monde samouraï, sans attendre.', accent: 'or', icone: 'user' },
  logos: { libelle: 'Tous les logos', phrase: () => 'Choisis l’icône de ton app parmi tous les logos.', accent: 'or', icone: 'spark' },
  seche: { libelle: 'Coupe de poids', phrase: () => 'Ta coupe planifiée jour par jour jusqu’à la pesée.', accent: 'rouge', icone: 'scale' },
  plan_nutrition: { libelle: 'Plan nutritionnel', phrase: () => 'Tes calories et tes macros du jour, calculées pour toi.', accent: 'mousse', icone: 'flame' },
  bilan_annuel: { libelle: 'Bilan de l’année', phrase: (n) => (compte(n) ? `Ton année en ${pluriel(n, 'séance', 'séances')}, résumée en quelques écrans.` : 'Ton année résumée en quelques écrans.'), accent: 'or', icone: 'star' },
  analyse_combat: { libelle: 'Analyse de combat', phrase: (n) => (compte(n) ? `Tes ${pluriel(n, 'round', 'rounds')} analysés : victoires, partenaires, soumissions.` : 'Tes rounds analysés : victoires, partenaires, soumissions.'), accent: 'rouge', icone: 'swords' },
  temps_tatami: { libelle: 'Temps sur le tatami', phrase: () => 'Ton temps total sur le tatami, vers les 1 000 heures.', accent: 'indigo', icone: 'timer' },
  rounds: { libelle: 'Analyse des rounds', phrase: (n) => (compte(n) ? `Tes ${pluriel(n, 'débrief', 'débriefs')} de rounds réunis et lus pour toi.` : 'Tous tes débriefs de rounds réunis et lus pour toi.'), accent: 'rouge', icone: 'swords' },
  radar: { libelle: 'Radar performance', phrase: () => 'Force, cardio, souplesse, mental et technique sur un seul radar.', accent: 'indigo', icone: 'target' },
  competiteur: { libelle: 'Espace compétiteur', phrase: () => 'Ta prochaine compétition, ton palmarès et tes outils réunis.', accent: 'rouge', icone: 'trophy' },
  camp_competition: { libelle: 'Camp de compétition', phrase: () => 'Ton camp calé sur ta compétition, semaine par semaine.', accent: 'rouge', icone: 'calendar' },
  matrice_adversaires: { libelle: 'Matrice des confrontations', phrase: () => 'Tes confrontations sur une seule grille, face à chaque style.', accent: 'indigo', icone: 'grid' },
  partenaires: { libelle: 'Classement des partenaires', phrase: (n) => (compte(n) ? `Tes ${pluriel(n, 'partenaire', 'partenaires')} classés, round après round.` : 'Tes partenaires classés, round après round.'), accent: 'indigo', icone: 'user' },
  plan_de_match: { libelle: 'Plan de jeu', phrase: () => 'Ton plan tiré de tes débriefs : ce qui marche, ce qui bloque.', accent: 'mousse', icone: 'quote' },
  drills: { libelle: 'Compteur de drills', phrase: () => 'Tes répétitions comptées par technique, vers les 1 000.', accent: 'mousse', icone: 'dumbbell' },
};

const HORS_MUR: SourceHorsMur[] = ['onboarding', 'reglages', 'fin_premium', 'notification', 'dojo', 'periode'];

export function estSourcePremium(s: unknown): s is SourcePremium {
  return typeof s === 'string' && Object.prototype.hasOwnProperty.call(SOURCES, s);
}

/** Lit la source passee au paywall (parametre de route), 'app' si elle est absente ou inconnue */
export function lireSourcePaywall(brut: string | string[] | undefined): SourcePaywall {
  const s = Array.isArray(brut) ? brut[0] : brut;
  if (estSourcePremium(s)) return s;
  if (typeof s === 'string' && (HORS_MUR as string[]).includes(s)) return s as SourceHorsMur;
  return 'app';
}

/** Lit le compteur passe au paywall, null s'il n'est pas un entier positif */
export function lireCompteur(brut: string | string[] | undefined): number | null {
  const s = Array.isArray(brut) ? brut[0] : brut;
  const n = s ? Number(s) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Encre et fond de l'accent d'une source, pris dans le theme courant (le mode sombre suit) */
export function couleursSource(c: YoroiColors, accent: AccentSource): { encre: string; fond: string } {
  if (accent === 'or') return { encre: c.goldDeep, fond: c.goldTint };
  if (accent === 'mousse') return { encre: c.successText, fond: c.successTint };
  if (accent === 'rouge') return { encre: c.danger, fond: c.dangerTint };
  return { encre: c.indigo, fond: c.indigoTint };
}

/** Ouvre le paywall avec sa source (et le compteur reel de l'appelant, s'il en a un) */
export function ouvrirPaywall(source: SourcePaywall, compteur?: number | null): void {
  const params: Record<string, string> = { source };
  if (typeof compteur === 'number' && Number.isInteger(compteur) && compteur > 0) params.n = String(compteur);
  router.push({ pathname: '/paywall', params } as never);
}

/** Mesure du mur Premium : 'premium_gate_hit' a l'affichage, 'premium_gate_cta' au bouton */
export function noterMurPremium(source: SourcePremium, quoi: 'premium_gate_hit' | 'premium_gate_cta' = 'premium_gate_hit', compteur?: number | null): void {
  murPremiumEvent(quoi, { source, compteur: compteur ?? null });
}

/** Une couleur du theme (#RRGGBB) avec une transparence : sert aux degrades vers le fond, qui suivent le mode sombre */
export function couleurA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return alpha <= 0 ? 'transparent' : hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
