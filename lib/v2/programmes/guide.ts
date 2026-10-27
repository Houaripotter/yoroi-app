/**
 * Le Guide du coach (27 octobre 2026), « Aide moi à choisir » : sept questions, une par écran (app/coach-depart.tsx).
 *  1. Tu t'es déjà entraîné ?  2. Ton objectif  3. Tes jours  4. Ton temps  5. Où, et ce que tu as
 *  6. Tu as mal quelque part en ce moment ?  7. Un sport à côté.
 * Ici, les deux réponses nouvelles et leur traduction pour les règles qui existent déjà (depart.ts, choix.ts) :
 *  - l'expérience remplace « Depuis quand tu fais de la muscu ? ». « Jamais » : la règle « Je n'y connais rien »
 *    (debuter, choix.ts). « Il y a longtemps » : débutant, sur ton objectif. « Seul, en copiant des vidéos » :
 *    débutant, gestes expliqués (le guide du poids de départ est proposé). « Oui, régulièrement » : intermédiaire.
 *  - la douleur : des zones de blessures.ts, pour ce programme seulement (ProgrammeActif.douleurs, suivi.ts).
 *    Les exercices qui les chargent sont remplacés. Rien n'est écrit dans l'infirmerie, ce n'est pas un diagnostic.
 * Données pures, testées dans __tests__/unit/coachGuide.test.ts.
 */
import type { Region } from './blessures';
import type { ObjectifChoix } from './choix';
import type { AutreSport, ReponsesDepart, TempsSeance } from './depart';
import type { Materiel, Niveau } from './types';

export type Experience = 'jamais' | 'longtemps' | 'videos' | 'regulier';

export const EXPERIENCES: { key: Experience; label: string; sous: string }[] = [
  { key: 'jamais', label: 'Jamais', sous: 'Je pars de zéro' },
  { key: 'longtemps', label: 'Il y a longtemps', sous: 'J’ai arrêté depuis plus d’un an' },
  { key: 'videos', label: 'Seul, en copiant des vidéos', sous: 'Je ne sais pas si je fais bien' },
  { key: 'regulier', label: 'Oui, régulièrement', sous: 'Depuis plus de 6 mois, avec un plan' },
];

export type NiveauGuide = {
  niveau: Niveau;
  /** la règle « Je n'y connais rien » : tout le corps, gestes et charges expliqués */
  debuter: boolean;
  /** les gestes sont expliqués, le guide du poids de départ est proposé */
  gestes: boolean;
};

export function niveauDuGuide(e: Experience | null | undefined): NiveauGuide {
  if (e === 'jamais') return { niveau: 'debutant', debuter: true, gestes: true };
  if (e === 'videos') return { niveau: 'debutant', debuter: false, gestes: true };
  if (e === 'regulier') return { niveau: 'intermediaire', debuter: false, gestes: false };
  // « Il y a longtemps », ou pas encore répondu : on reprend doucement
  return { niveau: 'debutant', debuter: false, gestes: false };
}

/** Les objectifs pour la règle : « Jamais » ajoute debuter, une autre réponse le retire */
export function objectifsDuGuide(objectifs: readonly ObjectifChoix[], e: Experience | null | undefined): ObjectifChoix[] {
  const sans = objectifs.filter((o) => o !== 'debuter');
  return niveauDuGuide(e).debuter ? ['debuter', ...sans] : sans;
}

export function reponsesDuGuide(r: { experience: Experience | null; objectifs: readonly ObjectifChoix[]; jours: number[]; temps?: TempsSeance; lieu: Materiel; sport?: AutreSport }): ReponsesDepart {
  const n = niveauDuGuide(r.experience);
  return { objectifs: objectifsDuGuide(r.objectifs, r.experience), niveau: n.niveau, jours: r.jours, temps: r.temps, sport: r.sport, lieu: r.lieu };
}

/* ---------------------------------- 6. tu as mal quelque part ? ---------------------------------- */

export type Douleur = 'nulle' | 'epaule' | 'genou' | 'dos' | 'poignet' | 'cou' | 'hanche' | 'cheville' | 'ischios' | 'coude';

/** Les grosses cartes, et où mettre le point rouge sur la silhouette (repère 200 × 440, carteMuscles.ts) */
export const DOULEURS_PRINCIPALES: { key: Douleur; label: string; point?: [number, number] }[] = [
  { key: 'nulle', label: 'Nulle part' },
  { key: 'epaule', label: 'L’épaule', point: [50, 98] },
  { key: 'genou', label: 'Le genou', point: [80, 328] },
  { key: 'dos', label: 'Le bas du dos', point: [100, 200] },
  { key: 'poignet', label: 'Le poignet ou la main', point: [26, 262] },
  { key: 'cou', label: 'Le cou', point: [100, 66] },
];

/** « Autre zone » : les autres zones que blessures.ts sait ménager */
export const DOULEURS_AUTRES: { key: Douleur; label: string }[] = [
  { key: 'hanche', label: 'La hanche' },
  { key: 'cheville', label: 'La cheville' },
  { key: 'ischios', label: 'L’arrière de la cuisse' },
  { key: 'coude', label: 'Le coude' },
];

const REGION: Record<Exclude<Douleur, 'nulle'>, Region> = {
  epaule: 'epaule', genou: 'genou', dos: 'dos_bas', poignet: 'poignet', cou: 'cou', hanche: 'hanche', cheville: 'cheville', ischios: 'ischios', coude: 'coude',
};

/** Les zones à ménager (blessures.ts) ; « Nulle part » ou rien : aucune */
export function regionsDuGuide(douleurs: readonly Douleur[]): Region[] {
  const out: Region[] = [];
  for (const d of douleurs) {
    if (d === 'nulle') continue;
    const r = REGION[d];
    if (r && !out.includes(r)) out.push(r);
  }
  return out;
}

/** Toucher une réponse : « Nulle part » efface les zones, une zone efface « Nulle part » ; plusieurs zones possibles */
export function basculerDouleur(liste: readonly Douleur[], d: Douleur): Douleur[] {
  if (d === 'nulle') return liste.includes('nulle') ? [] : ['nulle'];
  const sans = liste.filter((x) => x !== 'nulle');
  return sans.includes(d) ? sans.filter((x) => x !== d) : [...sans, d];
}
