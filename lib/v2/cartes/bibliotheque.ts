/**
 * Bibliotheque des cartes (31 octobre 2026) : la lecture des vraies donnees pour l'ecran « Mes cartes ».
 * Rubriques : dernieres seances, records, objectifs, semaines, mois, annees, compteurs, pesees.
 * Les calculs sont dans lib/v2/cartes/periode.ts (logique pure, testee) ; ici on lit la base et on range.
 * Une rubrique sans donnee reste vide : l'ecran le dit en une phrase, rien n'est invente.
 */
import { logger } from '@/lib/security/logger';
import { avecProfil, carteDePesee, chargerExploits, chargerSeance, chargerSemaine, contextePoids, dateLongue, grilleSemaines, parSemaine, serieSemaines, toutesSeances } from './charger';
import { isoJour, lundiDe } from './moments';
import { bornesPeriode, carteDuMoment, cartePeriode, compteursDuMoment, objectifsDuMoment, rangerExploits } from './periode';
import { lundiIso } from './exploits';
import type { CarteData } from './types';
import type { Training } from '@/lib/database';

export type Bibliotheque = {
  seances: CarteData[];
  records: CarteData[];
  objectifs: CarteData[];
  semaines: CarteData[];
  mois: CarteData[];
  annees: CarteData[];
  compteurs: CarteData[];
  pesees: CarteData[];
};

export const BIBLIOTHEQUE_VIDE: Bibliotheque = { seances: [], records: [], objectifs: [], semaines: [], mois: [], annees: [], compteurs: [], pesees: [] };

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function plusRecentesDabord(list: Training[]): Training[] {
  return [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id ?? 0) - (a.id ?? 0)));
}

/** Tes objectifs du moment (semaine, annee, poids), prets pour l'atelier */
async function objectifsMaintenant(trainings: Training[], w: number, auj: string, serie: number): Promise<CarteData[]> {
  const ctx = await contextePoids().catch(() => null);
  const der = ctx?.pesees.length ? ctx.pesees[ctx.pesees.length - 1] : null;
  const poids = der ? { poids: der.weight, depart: ctx!.depart, objectif: ctx!.objectif } : null;
  const grille = trainings.length ? grilleSemaines(trainings.map((t) => t.date), auj) : null;
  return objectifsDuMoment(trainings, { parSemaine: w, aujourdhui: auj, poids }).map((e) => carteDuMoment(e, 'objectif', { serieSemaines: e.type === 'semaine_objectif' ? serie : 0, grille: e.type === 'semaine_objectif' ? grille : null }));
}

function compteursMaintenant(trainings: Training[], auj: string): CarteData[] {
  return compteursDuMoment(trainings, auj).map((e) => carteDuMoment(e, 'compteur', { sousTitre: dateLongue(auj) }));
}

/** Ton mois (AAAA-MM) ou ton annee (AAAA), pour l'atelier ; null sans seance */
export async function chargerPeriode(type: 'mois' | 'annee', ref: string): Promise<CarteData | null> {
  if (type === 'mois' ? !/^\d{4}-\d{2}$/.test(ref) : !/^\d{4}$/.test(ref)) return null;
  const trainings = await toutesSeances();
  const auj = isoJour(new Date());
  const w = await parSemaine();
  const { fin } = bornesPeriode(type, ref);
  const jour = fin < auj ? fin : auj;
  // 2 novembre 2026 : ta ceinture de JJB et ta serie en plus, s'ils existent
  return avecProfil(cartePeriode(trainings, type, ref, { parSemaine: w, aujourdhui: auj, grille: trainings.length ? grilleSemaines(trainings.map((t) => t.date), jour) : null }));
}

/** Un objectif ou un compteur du moment, retrouve par sa cle (« objectif:semaine_objectif ») */
export async function chargerDuMoment(src: 'objectif' | 'compteur', cle: string): Promise<CarteData | null> {
  const trainings = await toutesSeances();
  const auj = isoJour(new Date());
  const list = src === 'objectif' ? await objectifsMaintenant(trainings, await parSemaine(), auj, await serieSemaines()) : compteursMaintenant(trainings, auj);
  return avecProfil(list.find((c) => c.cle === cle) ?? list[0] ?? null);
}

/** Toute la bibliotheque, rubrique par rubrique */
export async function chargerBibliotheque(): Promise<Bibliotheque> {
  const out: Bibliotheque = { seances: [], records: [], objectifs: [], semaines: [], mois: [], annees: [], compteurs: [], pesees: [] };
  try {
    const trainings = await toutesSeances();
    const recentes = plusRecentesDabord(trainings);
    const w = await parSemaine();
    const serie = await serieSemaines();
    const now = new Date();
    const auj = isoJour(now);
    const dates = trainings.map((t) => t.date);

    for (const t of recentes.slice(0, 8)) {
      if (!t.id) continue;
      const c = await chargerSeance(t.id).catch(() => null);
      if (c) out.seances.push(c);
    }

    const ranges = rangerExploits(await chargerExploits());
    out.records = ranges.records.slice(0, 12);

    // objectifs : ceux du moment d'abord, puis ceux tenus dans ton historique (sans doubler la semaine en cours)
    const lundi = lundiIso(auj);
    const maintenant = await objectifsMaintenant(trainings, w, auj, serie);
    const histo = ranges.objectifs.filter((c) => c.exploit?.type !== 'annee_progression' && !((c.exploit?.type === 'semaine_objectif' || c.exploit?.type === 'serie_semaines') && (c.exploit?.date ?? '') >= lundi));
    out.objectifs = [...maintenant, ...histo].slice(0, 10);

    const ctx = await contextePoids();
    for (let k = 0; k < 8 && out.semaines.length < 6; k++) {
      const c = await chargerSemaine(lundiDe(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7 * k, 12)), { trainings, ctx, serie }).catch(() => null);
      if (c) out.semaines.push(c);
    }

    for (let k = 0; k < 12 && out.mois.length < 4; k++) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 15, 12);
      const ref = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      const finMois = isoJour(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12));
      const c = cartePeriode(trainings, 'mois', ref, { parSemaine: w, aujourdhui: auj, grille: grilleSemaines(dates, finMois < auj ? finMois : auj) });
      if (c) out.mois.push(c);
    }
    for (const an of [now.getFullYear(), now.getFullYear() - 1]) {
      const c = cartePeriode(trainings, 'annee', String(an), { parSemaine: w, aujourdhui: auj, grille: grilleSemaines(dates, an === now.getFullYear() ? auj : `${an}-12-31`) });
      if (c) out.annees.push(c);
    }

    out.compteurs = [...compteursMaintenant(trainings, auj), ...ranges.compteurs.filter((c) => c.exploit?.type !== 'compteur')].slice(0, 10);

    for (let i = ctx.pesees.length - 1; i >= 0 && out.pesees.length < 6; i--) {
      const c = carteDePesee(ctx, i, serie);
      if (c.pesee?.raison) out.pesees.push(c);
    }
    out.pesees.push(...ranges.poids.slice(0, 6));
  } catch (e) {
    logger.warn('[cartes] bibliotheque', e);
  }
  return out;
}
