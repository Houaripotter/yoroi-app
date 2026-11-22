/**
 * onboarding-neuf/compteurs.ts
 *
 * Les chiffres et les exemples de la pluie (FiltrePluie.tsx), calcules a l'execution depuis les vraies listes de
 * l'app, jamais ecrits a la main (comme counts.ts d'INRO). Le rapport du Studio (contentReport.generated.ts) est une
 * photo datee : il n'est pas utilise ici.
 */

import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { COMBAT_SPORTS, MUSCLES, SPORTS, getSportName } from '@/lib/sports';
import { PROGRAMMES } from '@/lib/v2/programmes/catalogue';
import { MODES } from '@/lib/v2/carnet/chrono';
import { CITATIONS } from '@/lib/v2/accueil/citations';
import { SCENES } from '@/components/yoroi/v2/espace/assets';
import { MONDE_PERSONNAGES } from '@/lib/v2/dojo/personnages';
import { TAMPONS } from '@/components/yoroi/v2/tampons/table';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { traduire } from '@/lib/i18n/tr';

/** Les familles de la pluie et de la carte */
export type Famille = 'exercice' | 'sport' | 'combat' | 'programme' | 'chrono' | 'suivi' | 'citation' | 'scene' | 'personnage' | 'tampon' | 'muscle';

/** Ce que YOROI suit vraiment, chacun a son ecran (app/measurements, sleep, fasting, hydration, photos) */
function suivis(): string[] {
  return [traduire('Pesée'), traduire('Mensurations'), traduire('Sommeil'), traduire('Jeûne'), traduire('Hydratation'), traduire('Photos de progression')];
}

/** Les marques ne sont pas citees dans l'onboarding */
const MARQUES = /matrix|crossfit|hyrox|zumba|rpm|body ?pump|les mills|technogym|life ?fitness|hammer/i;

function exercicesExemples(): string[] {
  const voulus = ['Tractions', 'Squat Barre Libre', 'Hip Thrust Barre', 'Squat Bulgare', 'Développé Couché (Barre)', 'Soulevé de Terre'];
  const noms = new Set(EXERCISE_LIBRARY.map((e) => e.name));
  const trouves = voulus.filter((n) => noms.has(n));
  const autres = EXERCISE_LIBRARY.filter((e) => e.category === 'musculation' && !MARQUES.test(e.name) && !trouves.includes(e.name)).map((e) => e.name);
  // des noms courts : chacun tient sur la petite etiquette du sticker
  return [...trouves, ...autres].filter((n) => n.length <= 18).slice(0, 8);
}

function sportsExemples(ids: string[]): string[] {
  return ids.filter((id) => SPORTS.some((s) => s.id === id)).map((id) => getSportName(id) ?? id).filter((n) => !MARQUES.test(n));
}

export type FamilleContenu = {
  id: Famille;
  /** le nombre, calcule depuis la liste */
  n: number;
  /** l'etiquette de la tuile et de la carte (pluriel) */
  label: string;
  /** l'etiquette en capitales sur les stickers qui tombent */
  famille: string;
  sticker: NomSticker;
  /** quelques vrais elements de la liste, pour la pluie et les cartes */
  exemples: string[];
  /** la couleur de la famille (petite etiquette) */
  couleur: string;
};

/** Toutes les familles, avec leurs vrais chiffres. Une famille vide ne s'affiche pas. */
export function familles(): FamilleContenu[] {
  const liste: FamilleContenu[] = [
    { id: 'exercice', n: EXERCISE_LIBRARY.length, label: traduire('exercices'), famille: traduire('EXERCICE'), sticker: 'musculation', exemples: exercicesExemples(), couleur: '#23358F' },
    { id: 'sport', n: SPORTS.filter((s) => !MARQUES.test(s.name)).length, label: traduire('sports'), famille: traduire('SPORT'), sticker: 'mes_sports', exemples: sportsExemples(['running', 'jjb', 'boxe', 'mma', 'yoga', 'natation', 'velo']), couleur: '#1C6B45' },
    { id: 'combat', n: COMBAT_SPORTS.length, label: traduire('sports de combat'), famille: traduire('COMBAT'), sticker: 'gants', exemples: sportsExemples(['jjb', 'boxe', 'mma', 'judo', 'muay_thai', 'lutte']), couleur: '#B0282E' },
    { id: 'programme', n: PROGRAMMES.length, label: traduire('programmes'), famille: traduire('PROGRAMME'), sticker: 'objectifs', exemples: PROGRAMMES.map((p) => traduire(p.titre)).filter((n) => !MARQUES.test(n)).slice(0, 6), couleur: '#8A3F78' },
    { id: 'chrono', n: MODES.length, label: traduire('chronos'), famille: traduire('CHRONO'), sticker: 'chrono', exemples: MODES.map((m) => m.short), couleur: '#A57A1C' },
    { id: 'suivi', n: suivis().length, label: traduire('suivis'), famille: traduire('SUIVI'), sticker: 'balance', exemples: suivis(), couleur: '#3557D9' },
    { id: 'citation', n: CITATIONS.length, label: traduire('citations'), famille: traduire('CITATION'), sticker: 'citation', exemples: CITATIONS.slice(0, 4).map((c) => traduire(c)), couleur: '#646985' },
    { id: 'scene', n: SCENES.length, label: traduire('scènes'), famille: traduire('SCÈNE'), sticker: 'torii', exemples: SCENES.slice(0, 4).map((s) => traduire(s.nom)), couleur: '#C59D45' },
    { id: 'personnage', n: MONDE_PERSONNAGES.length, label: traduire('personnages'), famille: traduire('PERSONNAGE'), sticker: 'kabuto', exemples: MONDE_PERSONNAGES.slice(0, 4).map((p) => traduire(p.name)), couleur: '#A8832F' },
    { id: 'tampon', n: Object.keys(TAMPONS).length, label: traduire('tampons'), famille: traduire('TAMPON'), sticker: 'records', exemples: [traduire('Records')], couleur: '#B0282E' },
    { id: 'muscle', n: MUSCLES.length, label: traduire('muscles'), famille: traduire('MUSCLE'), sticker: 'muscle', exemples: MUSCLES.slice(0, 4).map((m) => traduire(m.name)), couleur: '#1C6B45' },
  ];
  return liste.filter((f) => f.n > 0);
}

/** Le total de la pluie : tout ce que contient YOROI, sans compter deux fois les sports de combat */
export function total(liste: FamilleContenu[]): number {
  return liste.filter((f) => f.id !== 'combat').reduce((s, f) => s + f.n, 0);
}

/**
 * La famille sur laquelle on plonge, selon ce que tu as repondu : le combat si c'est ton objectif ou ton premier sport,
 * sinon les exercices.
 */
export function famillePlongee(objectifs: string[], sports: string[]): 'combat' | 'exercice' {
  if (objectifs.includes('combat')) return 'combat';
  const premier = sports[0];
  if (premier && COMBAT_SPORTS.some((s) => s.id === premier)) return 'combat';
  return 'exercice';
}

/** « 1040 » s'ecrit « 1 040 » : un grand nombre colle se lit mal */
export function nombre(n: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale).format(n).replace(/[   ]/g, ' ');
  } catch {
    return String(n);
  }
}
