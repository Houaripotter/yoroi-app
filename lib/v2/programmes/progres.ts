/**
 * Tes progres dans le programme (24 octobre 2026). Donnees pures, testees dans __tests__/unit/programmes.test.ts.
 * Pour chaque exercice de ta semaine de programme : ta charge de travail a la premiere seance depuis le debut du
 * programme et a la derniere. Et ta regularite sur les semaines terminees.
 */
import { chargeDeTravail, seancesDeLExo } from './progression';
import { cleCase } from './perso';
import { jourDeRef, jourDuProgramme } from './semaineLibre';
import type { JourProgramme, Programme } from './types';
import type { ProgrammeActif } from './suivi';

type TrainingLu = Parameters<typeof seancesDeLExo>[0][number];

export type ProgresExo = { nom: string; debutKg: number; actuelKg: number; gainPct: number; seances: number };

/**
 * 30 octobre 2026 (semaine libre) : les séances de ta semaine de programme. Celles du programme, celles d'un autre
 * programme posées dans ta semaine (« @programme/séance », semaineLibre.ts) et celles que tu as faites depuis le
 * début. La même séance n'est comptée qu'une fois.
 */
function seancesDeTaSemaine(p: Programme, a?: Pick<ProgrammeActif, 'debut' | 'faits' | 'semaine'> | null): JourProgramme[] {
  const out: JourProgramme[] = [...p.jours];
  const ids = new Set(out.map((j) => j.id));
  const ajoute = (j: JourProgramme | null) => {
    if (j && !ids.has(j.id)) {
      ids.add(j.id);
      out.push(j);
    }
  };
  if (a?.semaine) for (const c of [...(Array.isArray(a.semaine.a) ? a.semaine.a : []), ...(Array.isArray(a.semaine.b) ? a.semaine.b : [])]) ajoute(jourDeRef(c, p.id));
  if (a && Array.isArray(a.faits)) for (const f of a.faits) if (f && typeof f.jourId === 'string' && typeof f.date === 'string' && f.date >= a.debut) ajoute(jourDuProgramme(p, f.jourId));
  return out;
}

/**
 * Pour chaque exercice de musculation de ta semaine de programme, par nom (comme la progression des charges,
 * progression.ts) : ta charge de travail à la première séance depuis le début du programme et à la dernière.
 * `a` (le programme en cours) : sans lui, seuls les exercices du programme comptent, comme avant le 30 octobre 2026.
 * Tes exercices changés à la main (perso.ts) comptent sous leur nouveau nom.
 */
export function progresDesCharges(
  p: Programme,
  trainings: TrainingLu[],
  debut: string,
  a?: Pick<ProgrammeActif, 'debut' | 'faits' | 'semaine' | 'remplacements'> | null,
): ProgresExo[] {
  const depuis = trainings.filter((t) => typeof t?.date === 'string' && t.date.slice(0, 10) >= debut);
  const plier = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const r = a?.remplacements && typeof a.remplacements === 'object' ? a.remplacements : null;
  const vus = new Set<string>();
  const out: ProgresExo[] = [];
  for (const j of seancesDeTaSemaine(p, a ? { ...a, debut } : null))
    j.exos.forEach((e, i) => {
      const perso = r ? r[cleCase(j.id, i)] : undefined;
      const nom = typeof perso === 'string' && perso.trim() ? perso.trim() : e.nom;
      // au poids du corps, la progression passe par les répétitions (un exercice changé à la main peut se charger)
      if ((e.poidsDuCorps && nom === e.nom) || vus.has(plier(nom))) return;
      vus.add(plier(nom));
      const toutes = seancesDeLExo(depuis, nom, 1000);
      if (toutes.length < 2) return;
      const actuelKg = chargeDeTravail(toutes[0]);
      const debutKg = chargeDeTravail(toutes[toutes.length - 1]);
      if (!(debutKg > 0) || !(actuelKg > 0)) return;
      out.push({ nom, debutKg, actuelKg, gainPct: Math.round(((actuelKg - debutKg) / debutKg) * 100), seances: toutes.length });
    });
  return out.sort((a, b) => b.gainPct - a.gainPct);
}

/** Regularite sur les semaines terminees : seances faites et prevues (null tant qu'aucune semaine n'est finie) */
export function regularite(p: Programme, a: ProgrammeActif, semaineEnCours: number): { faites: number; prevues: number } | null {
  const finies = semaineEnCours - 1;
  if (finies < 1) return null;
  const d = new Date(a.debut + 'T12:00:00');
  const fin = new Date(d.getTime() + finies * 7 * 86400000);
  const p2 = (n: number) => String(n).padStart(2, '0');
  const finIso = `${fin.getFullYear()}-${p2(fin.getMonth() + 1)}-${p2(fin.getDate())}`;
  const faites = a.faits.filter((f) => f.date >= a.debut && f.date < finIso).length;
  return { faites: Math.min(faites, finies * p.joursParSemaine), prevues: finies * p.joursParSemaine };
}

/* ------------------------------------------------------------------------------------------------
 * Ton corps depuis le debut du programme (24 octobre 2026) : poids moyen d'une semaine et tour de taille.
 * Une pesee seule ne veut rien dire (le poids monte le week end, Orsama 2014) : on compare des moyennes sur 7 jours.
 * Le tour de taille montre la graisse du ventre qui part meme quand la balance bouge peu (Ross 2020).
 * ---------------------------------------------------------------------------------------------- */
type PeseeLue = { date: string; weight: number };
type MesureLue = { date: string; waist?: number | null };

export type CorpsDepuis = {
  /** moyenne des pesees de la semaine du depart (7 jours avant au 6e jour du programme) */
  poidsDebut: number | null;
  /** moyenne des pesees des 7 derniers jours */
  poidsActuel: number | null;
  tailleDebut: number | null;
  tailleActuelle: number | null;
};

const jourIso = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const decale = (iso: string, n: number) => jourIso(new Date(new Date(iso + 'T12:00:00').getTime() + n * 86400000));
const moyenne = (l: number[]) => (l.length ? Math.round((l.reduce((s, x) => s + x, 0) / l.length) * 10) / 10 : null);

export function corpsDepuis(debut: string, pesees: PeseeLue[], mesures: MesureLue[], aujourdhui = new Date()): CorpsDepuis {
  const auj = jourIso(aujourdhui);
  const ok = (p: PeseeLue) => typeof p.weight === 'number' && p.weight > 20 && p.weight < 400;
  const dans = (p: PeseeLue, a: string, b: string) => p.date.slice(0, 10) >= a && p.date.slice(0, 10) <= b;
  const assezLong = auj >= decale(debut, 13);
  const poidsDebut = assezLong ? moyenne(pesees.filter((p) => ok(p) && dans(p, decale(debut, -7), decale(debut, 6))).map((p) => p.weight)) : null;
  const poidsActuel = assezLong ? moyenne(pesees.filter((p) => ok(p) && dans(p, decale(auj, -6), auj)).map((p) => p.weight)) : null;

  const tailles = mesures
    .filter((m) => typeof m.waist === 'number' && m.waist! > 30 && m.waist! < 250)
    .map((m) => ({ date: m.date.slice(0, 10), waist: m.waist as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
  // la mesure du depart : la derniere avant le debut (14 jours maximum) ou la premiere depuis
  const avant = tailles.filter((m) => m.date < debut && m.date >= decale(debut, -14)).slice(-1)[0];
  const premiere = avant ?? tailles.find((m) => m.date >= debut);
  const derniere = tailles.slice(-1)[0];
  const ecart = premiere && derniere ? (new Date(derniere.date + 'T12:00:00').getTime() - new Date(premiere.date + 'T12:00:00').getTime()) / 86400000 : 0;
  const tailleOk = !!premiere && !!derniere && ecart >= 7;
  return {
    poidsDebut: poidsDebut && poidsActuel ? poidsDebut : null,
    poidsActuel: poidsDebut && poidsActuel ? poidsActuel : null,
    tailleDebut: tailleOk ? premiere!.waist : null,
    tailleActuelle: tailleOk ? derniere!.waist : null,
  };
}

/**
 * La tuile « Charge » (26 octobre 2026, maquette D) : la moyenne des gains des exercices qui ont au moins
 * deux séances depuis le début du programme (progresDesCharges). null tant qu'aucun exercice n'a de données.
 */
export function gainMoyen(l: readonly Pick<ProgresExo, 'gainPct'>[]): number | null {
  if (!l.length) return null;
  return Math.round(l.reduce((s, x) => s + x.gainPct, 0) / l.length);
}
