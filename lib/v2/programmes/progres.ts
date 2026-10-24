/**
 * Tes progres dans le programme (24 octobre 2026). Donnees pures, testees dans __tests__/unit/programmes.test.ts.
 * Pour chaque exercice du programme : ta charge de travail a la premiere seance depuis le debut du programme
 * et a la derniere. Et ta regularite sur les semaines terminees.
 */
import { chargeDeTravail, seancesDeLExo } from './progression';
import type { Programme } from './types';
import type { ProgrammeActif } from './suivi';

type TrainingLu = Parameters<typeof seancesDeLExo>[0][number];

export type ProgresExo = { nom: string; debutKg: number; actuelKg: number; gainPct: number; seances: number };

export function progresDesCharges(p: Programme, trainings: TrainingLu[], debut: string): ProgresExo[] {
  const depuis = trainings.filter((t) => t.date.slice(0, 10) >= debut);
  const vus = new Set<string>();
  const out: ProgresExo[] = [];
  for (const j of p.jours)
    for (const e of j.exos) {
      if (e.poidsDuCorps || vus.has(e.nom)) continue;
      vus.add(e.nom);
      const toutes = seancesDeLExo(depuis, e.nom, 1000);
      if (toutes.length < 2) continue;
      const actuelKg = chargeDeTravail(toutes[0]);
      const debutKg = chargeDeTravail(toutes[toutes.length - 1]);
      if (!(debutKg > 0) || !(actuelKg > 0)) continue;
      out.push({ nom: e.nom, debutKg, actuelKg, gainPct: Math.round(((actuelKg - debutKg) / debutKg) * 100), seances: toutes.length });
    }
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
