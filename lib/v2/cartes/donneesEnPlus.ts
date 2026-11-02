/**
 * Donnees en plus pour les cartes a partager (2 novembre 2026) : des chiffres que l'app enregistre deja mais
 * qui n'arrivaient pas jusqu'aux cartes. Chaque champ est facultatif : il n'est rempli que si la donnee existe
 * vraiment, sinon il reste absent. Rien n'est estime, rien n'est invente.
 *  - ceinture et degres de JJB : tes pratiques (lib/v2/profil/pratiques.ts) ;
 *  - serie de jours en cours, plus longues series de jours et de semaines : l'armure (lib/v2/armure.ts) ;
 *  - zone 2 du cardio : FC moyenne mesuree et zone 2 (lib/v2/seances/zone2.ts, Karvonen) ;
 *  - muscles travailles : series validees de la seance (lib/v2/seances/musclesExercices.ts) ;
 *  - kilos souleves de la semaine : charge x repetitions (lib/v2/trainingWeek.ts, libelle kilosSouleves.ts) ;
 *  - trace GPS, temps au kilometre et denivele : seulement s'ils viennent d'une montre ou de Sante ;
 *  - kcal : coupees pour l'instant (kcalPourCarte), leur source n'etant pas enregistree.
 * Les fonctions pures sont testees dans __tests__/unit/cartesDonneesEnPlus.test.ts.
 */
import type { Training } from '@/lib/database';
import type { Pratique } from '@/lib/v2/profil/pratiques';
import { verdictFc } from '@/lib/v2/seances/zone2';
import { musclesSeance } from '@/lib/v2/seances/musclesExercices';
import { tonnage } from '@/lib/v2/trainingWeek';
import type { CarteData, DonneesSeance } from './types';

// ============================================
// CEINTURE DE JJB
// ============================================

/** Ta ceinture de JJB et ses degres, ou null si tu n'as pas de pratique de JJB avec une ceinture */
export function ceintureJjbDe(pratiques: readonly Pratique[] | null | undefined): NonNullable<CarteData['ceintureJjb']> | null {
  const list = (pratiques ?? []).filter((p) => p && p.sport === 'jjb' && !!p.ceinture);
  // la principale d'abord si elle est de JJB, sinon la premiere pratique de JJB qui a une ceinture
  const p = list.find((x) => x.principale) ?? list[0];
  if (!p?.ceinture) return null;
  const d = Number(p.degres);
  return { ceinture: p.ceinture, degres: Number.isFinite(d) && d > 0 ? Math.round(d) : 0 };
}

// ============================================
// SERIE (ARMURE)
// ============================================

/** Ce qu'il faut de l'etat de l'armure */
export type EtatSerie = { bestStreak?: number; serie?: { jours?: number; record?: number } | null };

/** La serie lue dans l'armure : chaque chiffre seulement s'il est connu ; null si aucun ne l'est */
export function serieDe(etat: EtatSerie | null | undefined): NonNullable<CarteData['serie']> | null {
  if (!etat) return null;
  const ok = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  const out: NonNullable<CarteData['serie']> = {};
  if (etat.serie && ok(etat.serie.jours)) out.jours = Math.round(etat.serie.jours);
  if (etat.serie && ok(etat.serie.record)) out.recordJours = Math.round(etat.serie.record);
  if (ok(etat.bestStreak)) out.recordSemaines = Math.round(etat.bestStreak);
  return Object.keys(out).length ? out : null;
}

// ============================================
// ZONE 2 DU CARDIO
// ============================================

/** Vrai si la FC moyenne mesuree tombe dans la zone 2, faux si elle en sort ; undefined sans FC ou sans zone */
export function enZone2De(fcMoy: number | null | undefined, zone: { min: number; max: number } | null | undefined): boolean | undefined {
  if (typeof fcMoy !== 'number' || !(fcMoy >= 40 && fcMoy <= 230)) return undefined;
  if (!zone || !(zone.max > zone.min)) return undefined;
  return verdictFc(fcMoy, zone) === 'dedans';
}

// ============================================
// MUSCLES TRAVAILLES
// ============================================

/** Zones et series par groupe (muscles principaux) d'une seance ; null sans exercice reconnu */
export function musclesDeSeance(t: Training | null | undefined): DonneesSeance['muscles'] {
  if (!t) return null;
  let b: ReturnType<typeof musclesSeance>;
  try {
    b = musclesSeance(t);
  } catch {
    return null;
  }
  if (!b.avecExercices) return null;
  const groupes = b.loads.filter((l) => l.sets > 0).map((l) => ({ nom: l.name, series: l.sets }));
  if (!groupes.length) return null;
  return { zones: [...b.zones], groupes };
}

// ============================================
// KILOS DE LA SEMAINE
// ============================================

/** Kilos souleves sur une liste de seances, 0 sans charge */
export function kilosDe(list: readonly Training[]): number {
  return list.reduce((s, t) => s + tonnage(t), 0);
}

// ============================================
// GPS ET DENIVELE : SEULEMENT D'UNE MONTRE OU DE SANTE
// ============================================

/** Sources rangees en base pour une seance mesuree par un appareil (lib/v2/seances/weekCompare.ts, montre YOROI) */
const SOURCES_APPAREIL = new Set(['apple', 'apple_health', 'apple_watch', 'healthkit', 'health_connect', 'iphone', 'strava', 'garmin', 'polar', 'whoop', 'suunto', 'coros', 'wahoo', 'samsung', 'fitbit', 'withings', 'yoroi_montre']);

/** Vrai si la seance vient d'une montre ou de Sante (identifiant Sante, ou source d'un appareil) */
export function vientDUnAppareil(t: Pick<Training, 'healthkit_uuid' | 'source'> | null | undefined): boolean {
  if (!t) return false;
  if (t.healthkit_uuid && String(t.healthkit_uuid).trim()) return true;
  return SOURCES_APPAREIL.has(String(t.source ?? '').trim().toLowerCase());
}

/** Retire la trace GPS, les temps au kilometre et le denivele d'une seance qui ne vient pas d'un appareil */
export function gpsSiAppareil<T extends Pick<DonneesSeance, 'trace' | 'splits' | 'deniveleM'>>(v: T, t: Pick<Training, 'healthkit_uuid' | 'source'>): T {
  if (vientDUnAppareil(t)) return v;
  return { ...v, trace: null, splits: null, deniveleM: 0 };
}

// ============================================
// KCAL : COUPEES TANT QUE LEUR SOURCE N'EST PAS CONNUE
// ============================================

/**
 * Les kcal a montrer sur une carte de partage. 2 novembre 2026, valide par Houari : aucune pour l'instant.
 * Pourquoi : la base ne garde pas d'ou viennent les kcal d'une seance. La source de la seance (source, healthkit_uuid)
 * ne suffit pas : l'ecran de saisie cardio (app/seance/cardio.tsx) permet de changer les kcal de n'importe quelle
 * seance, meme importee de Sante, et la seance garde sa source d'origine. On ne peut donc pas distinguer des kcal
 * mesurees par une montre ou Sante de kcal tapees a la main.
 * Pour les remettre : enregistrer la source des kcal (par exemple une colonne calories_source : montre, sante ou
 * saisie, remplie a l'import Sante et par la montre YOROI, passee a saisie quand tu les changes a la main), puis
 * renvoyer ici t.calories seulement si cette source est une montre ou Sante. Les kcal restent partout ailleurs
 * dans l'app (historique, detail de seance, base) : seules les cartes ne les recoivent plus.
 */
export function kcalPourCarte(_t: Pick<Training, 'calories' | 'source' | 'healthkit_uuid'>): number | undefined {
  return undefined;
}
