/**
 * Les actions de « Tes prochaines séances » (1er novembre 2026) : choisir A et B ou toujours la même, ajouter un
 * exercice suggéré, échanger deux séances de la semaine. Chaque écriture passe par les fonctions qui existent déjà
 * (monProgramme.ts, suivi.ts) et par leurs files d'attente : rien n'est perdu, rien n'est écrasé.
 *
 * Un programme du catalogue n'a pas de place pour ton choix : il devient d'abord ton programme à toi, exactement
 * comme « Garder comme mon programme » (suivi.ts, garderCommeMonProgramme) : même début, mêmes séances faites,
 * mêmes charges. L'écran le dit avant.
 */
import { traduire } from '@/lib/i18n/tr';
import { nomDuProgramme } from './heroJour';
import { programmeParId } from './catalogue';
import { estProgrammePerso } from './registrePerso';
import { CLE_PROGRAMMES_PERSO, avecExo, chargerProgrammesPerso, exoDepuisNom, idDuJourPerso, idVariantePerso, modifierProgrammePerso } from './monProgramme';
import type { ProgrammePerso, SeancePerso } from './monProgramme';
import { modifierBrique } from './briques';
import { seancesSansVersionB } from './alternance';
import type { Alternance } from './alternance';
import { genererVarianteB } from './varianteB';
import { enFileProgramme, garderCommeMonProgramme, chargerProgrammeActif, lancerMixtePonctuel, peutGarder, seanceDuPlanLe } from './suivi';
import { lundiIso, refDuJour } from './semaineLibre';
import type { CaseSemaine } from './semaineLibre';
import type { MachinePerso } from '@/lib/v2/seances/machinesPerso';
import { indexJour } from './coach';

export type Contexte = { ecartes?: Iterable<string>; perso?: readonly MachinePerso[] };

/** Ton programme en cours, à toi : le tien, ou celui du catalogue gardé comme le tien. null : impossible */
async function programmeAToi(): Promise<ProgrammePerso | null> {
  const a = await chargerProgrammeActif();
  if (!a) return null;
  if (estProgrammePerso(a.id)) return (await chargerProgrammesPerso()).find((x) => x.id === a.id) ?? null;
  const p = programmeParId(a.id);
  if (!p || !peutGarder(a, p)) return null;
  const g = await garderCommeMonProgramme(nomDuProgramme(traduire(p.titre)), a.duree ?? null);
  if (!g) return null;
  return (await chargerProgrammesPerso()).find((x) => x.id === g.id) ?? null;
}

/** Ton choix appliqué à ton programme (calcul pur) : les versions B qui manquent sont préparées */
export function avecAlternance(pp: ProgrammePerso, choix: Alternance, ctx: Contexte = {}, aujourdhui = new Date()): ProgrammePerso {
  if (choix === 'meme') {
    const { ab: _ab, ...reste } = pp;
    return { ...reste, alternance: 'meme' };
  }
  // ta semaine B à toi qui alterne déjà : elle reste la tienne
  if (pp.ab && pp.semaineB) return { ...pp, alternance: 'ab' };
  const ecartes = Array.from(ctx.ecartes ?? []);
  const nouvelles = seancesSansVersionB(pp).map((s) => genererVarianteB(s, { ecartes, perso: ctx.perso }));
  return {
    ...pp,
    alternance: 'ab',
    depuis: pp.depuis ?? lundiIso(aujourdhui),
    ...(nouvelles.length || pp.variantesB ? { variantesB: [...(pp.variantesB ?? []), ...nouvelles] } : {}),
  };
}

/** « Tes séances » : alterner A et B, ou toujours la même. Renvoie l'id de ton programme (il peut changer : catalogue) */
export async function choisirAlternance(choix: Alternance, ctx: Contexte = {}): Promise<string | null> {
  const pp = await programmeAToi();
  if (!pp) return null;
  const r = await enFileProgramme(CLE_PROGRAMMES_PERSO, () => modifierProgrammePerso(pp.id, (x) => avecAlternance(x, choix, ctx)));
  return r ? r.id : null;
}

/** La séance de ton programme qui porte cet id : un jour de ta semaine (A ou B), ou une version B */
function placeDe(pp: ProgrammePerso, jourId: string): { variante: string } | { brique: string } | null {
  for (const v of pp.variantesB ?? []) if (v.brique && idVariantePerso(pp.id, v.brique) === jourId) return { variante: v.brique };
  for (const b of [false, true]) {
    const l = (b ? pp.semaineB : pp.semaine) ?? [];
    for (let d = 0; d < 7; d++) if (l[d] && idDuJourPerso(pp, d, b) === jourId && l[d]!.brique) return { brique: l[d]!.brique! };
  }
  return null;
}

/** Ajoute l'exercice à la séance (calcul pur) : sa brique (tous les jours qui la portent) ou sa version B */
export function avecExerciceAjoute(pp: ProgrammePerso, jourId: string, nom: string, muscle: string, date?: string): ProgrammePerso | null {
  let place = placeDe(pp, jourId);
  // un programme du catalogue gardé à l'instant : la séance de ce jour de la semaine
  if (!place && date) {
    const d = indexJour(new Date(`${date}T12:00:00`));
    const s = pp.semaine[d];
    if (s?.brique) place = { brique: s.brique };
  }
  if (!place) return null;
  const exo = exoDepuisNom(nom, muscle);
  if ('variante' in place) {
    const k = place.variante;
    return { ...pp, variantesB: (pp.variantesB ?? []).map((v) => (v.brique === k ? avecExo(v, exo) : v)) };
  }
  return modifierBrique(pp, place.brique, (s: SeancePerso) => avecExo(s, exo));
}

/** « Ajouter » d'une suggestion : l'exercice entre dans la séance, pour la suite (rien n'est forcé ailleurs) */
export async function ajouterExerciceSuggere(jourId: string, date: string, nom: string, muscle: string): Promise<boolean> {
  const pp = await programmeAToi();
  if (!pp) return false;
  const r = await enFileProgramme(CLE_PROGRAMMES_PERSO, () => modifierProgrammePerso(pp.id, (x) => avecExerciceAjoute(x, jourId, nom, muscle, date)));
  return !!r;
}

/**
 * Échanger deux séances de la semaine en cours (calcul pur) : les cases de la semaine, ces deux jours inversés.
 * null : une date hors de cette semaine, ou rien à échanger.
 */
export function semaineEchangee(cases: readonly CaseSemaine[], d1: number, d2: number): CaseSemaine[] | null {
  if (d1 === d2 || d1 < 0 || d2 < 0 || d1 > 6 || d2 > 6 || cases.length !== 7) return null;
  const out = cases.map((c) => (c ? { ...c } : null));
  [out[d1], out[d2]] = [out[d2], out[d1]];
  return out;
}

/**
 * « Échanger » : pour cette semaine seulement, deux jours échangent leur séance (une semaine mixte ponctuelle
 * jusqu'à dimanche, mixte.ts ; « Annuler » la retire). Ta semaine habituelle ne change pas.
 */
export async function echangerCetteSemaine(date1: string, date2: string, aujourdhui = new Date()): Promise<boolean> {
  const a = await chargerProgrammeActif();
  const p = a && programmeParId(a.id);
  if (!a || !p) return false;
  const lundi = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate() - indexJour(aujourdhui), 12);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dates = Array.from({ length: 7 }, (_, k) => new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + k, 12));
  const k1 = dates.findIndex((d) => iso(d) === date1);
  const k2 = dates.findIndex((d) => iso(d) === date2);
  if (k1 < 0 || k2 < 0) return false;
  const cases: CaseSemaine[] = dates.map((d) => {
    const j = seanceDuPlanLe(a, p, d);
    return j ? refDuJour(p, j) : null;
  });
  const s = semaineEchangee(cases, k1, k2);
  if (!s) return false;
  const r = await lancerMixtePonctuel(traduire('Séances échangées'), { a: s }, iso(dates[6]), aujourdhui);
  return !!r;
}
