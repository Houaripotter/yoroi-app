/**
 * Bibliotheque des cartes (31 octobre 2026, Houari : « je veux plein de cartes qu'ils peuvent partager »).
 * Logique pure : ton mois et ton annee (moments 'mois' et 'annee'), tes objectifs du moment (semaine, annee, poids),
 * tes compteurs (seances depuis le debut, heures, kilometres, tonnes et rounds de l'annee) et le rangement
 * des exploits par rubrique. Tout vient de tes vraies seances et de tes vraies pesees : un total a 0 ne donne
 * aucun chiffre, une rubrique sans donnee reste vide. Teste dans __tests__/unit/cartesBibliotheque.test.ts.
 */
import type { Training } from '@/lib/database';
import { getSportCategory } from '@/lib/sports';
import { durationOf, tonnage as tonnageDe } from '@/lib/v2/trainingWeek';
import { familleDe, MOINS, nombre } from './chiffres';
import { estCombat, legendeRythme, lundiIso, nomSport, objectifAnnee, recordsDe, roundsDe, serieSemaines, trier } from './exploits';
import type { CarteData, CoteExploit, DonneesPeriode, Exploit } from './types';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const MOIS = [traduire('janvier'), traduire('février'), traduire('mars'), traduire('avril'), traduire('mai'), traduire('juin'), traduire('juillet'), traduire('août'), traduire('septembre'), traduire('octobre'), traduire('novembre'), traduire('décembre')];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

const jourDe = (t: Training) => String(t.date ?? '').slice(0, 10);
const premierSport = (t: Training) => String(t.sport ?? '').split(',')[0].trim();

function dateDe(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function plusJours(jour: string, n: number): string {
  const d = dateDe(jour);
  d.setDate(d.getDate() + n);
  return iso(d);
}

/** Premier et dernier jour d'un mois (AAAA-MM) ou d'une annee (AAAA) */
export function bornesPeriode(type: 'mois' | 'annee', ref: string): { debut: string; fin: string } {
  if (type === 'annee') return { debut: `${ref}-01-01`, fin: `${ref}-12-31` };
  const [y, m] = ref.split('-').map(Number);
  const dernier = new Date(y, m, 0, 12).getDate();
  return { debut: `${ref}-01`, fin: `${ref}-${pad(dernier)}` };
}

/** La periode d'avant : le mois d'avant, l'annee d'avant */
export function periodePrecedente(type: 'mois' | 'annee', ref: string): string {
  if (type === 'annee') return String(Number(ref) - 1);
  const [y, m] = ref.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`;
}

/** « Octobre 2026 » */
export function moisLong(ref: string): string {
  const [y, m] = ref.split('-').map(Number);
  const n = MOIS[(m || 1) - 1];
  return `${n.charAt(0).toUpperCase()}${n.slice(1)} ${y}`;
}

/**
 * Ton mois ou ton annee jusqu'a aujourd'hui. null si la periode n'a aucune seance (ou n'a pas commence).
 * Semaines a l'objectif (mois) : chaque semaine dont le lundi est dans le mois, comptee quand elle est finie
 * ou deja tenue ; la semaine en cours pas encore tenue ne te met jamais en retard.
 */
export function donneesPeriode(trainings: Training[], type: 'mois' | 'annee', ref: string, opts: { parSemaine: number; aujourdhui: string }): DonneesPeriode | null {
  const b = bornesPeriode(type, ref);
  const auj = opts.aujourdhui.slice(0, 10);
  if (auj < b.debut) return null;
  const fin = auj < b.fin ? auj : b.fin;
  const tries = trier(trainings);
  const list = tries.filter((t) => jourDe(t) >= b.debut && jourDe(t) <= fin);
  if (!list.length) return null;
  const parSport = new Map<string, number>();
  for (const t of list) {
    const n = nomSport(t.sport) || traduire('Séance');
    parSport.set(n, (parSport.get(n) ?? 0) + 1);
  }
  const w = Math.max(0, Math.round(opts.parSemaine || 0));
  const parLundi = new Map<string, number>();
  for (const t of tries) {
    const l = lundiIso(jourDe(t));
    parLundi.set(l, (parLundi.get(l) ?? 0) + 1);
  }
  let tenues = 0;
  let comptees = 0;
  if (w > 0) {
    for (let l = lundiIso(b.debut); l <= fin; l = plusJours(l, 7)) {
      if (l < b.debut) continue;
      const tenue = (parLundi.get(l) ?? 0) >= w;
      const finie = plusJours(l, 6) < auj;
      if (finie || tenue) {
        comptees += 1;
        if (tenue) tenues += 1;
      }
    }
  }
  const oa = type === 'annee' && w > 0 ? objectifAnnee(tries, w, fin) : null;
  const prec = bornesPeriode(type, periodePrecedente(type, ref));
  // 2 novembre 2026 : records de l'annee, chaque seance comparee a toutes celles d'avant (meme regle que les cartes de record)
  const records = type === 'annee' ? recordsAnnee(tries, list) : 0;
  return {
    type,
    ref,
    debut: b.debut,
    fin,
    enCours: auj < b.fin,
    seances: list.length,
    minutes: list.reduce((s, t) => s + durationOf(t), 0),
    joursActifs: new Set(list.map(jourDe)).size,
    sports: [...parSport.entries()].map(([nom, n]) => ({ nom, n })).sort((a, c) => c.n - a.n),
    distanceKm: list.reduce((s, t) => s + (t.distance && t.distance > 0 && !estCombat(premierSport(t)) ? t.distance : 0), 0),
    tonnage: list.reduce((s, t) => s + tonnageDe(t), 0),
    rounds: list.reduce((s, t) => s + roundsDe(t), 0),
    parSemaine: w,
    semainesTenues: tenues,
    semainesComptees: comptees,
    objectifAnnee: oa ? { fait: oa.fait, total: oa.total, attendu: oa.fait < oa.total && auj < b.fin ? oa.attendu : undefined } : null,
    precedent: tries.filter((t) => jourDe(t) >= prec.debut && jourDe(t) <= prec.fin).length,
    ...(records > 0 ? { records } : {}),
  };
}

/**
 * Nombre de records battus par les seances `periode` (triees), chacune comparee a toutes les seances d'avant
 * dans `tries` : charge (trois au plus par seance), distance, allure, rounds. Il faut un ancien record pour en battre un.
 */
export function recordsAnnee(tries: Training[], periode: Training[]): number {
  let n = 0;
  for (const t of periode) {
    const i = tries.indexOf(t);
    if (i < 0) continue;
    n += recordsDe(t, tries.slice(0, i)).length;
  }
  return n;
}

/** Le sport le plus pratique de la periode (son id), pour la famille, la photo et le sticker de la carte */
function sportPrincipal(list: Training[]): string | null {
  const n = new Map<string, number>();
  for (const t of list) {
    const s = premierSport(t);
    if (s) n.set(s, (n.get(s) ?? 0) + 1);
  }
  return [...n.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/**
 * La carte de ton mois ou de ton annee. `grille` : tes 12 dernieres semaines (lues dans l'historique) ;
 * la serie de semaines a l'objectif est calculee a la fin de la periode (ou a la semaine d'avant si la semaine
 * en cours n'est pas encore tenue).
 */
export function cartePeriode(trainings: Training[], type: 'mois' | 'annee', ref: string, opts: { parSemaine: number; aujourdhui: string; grille?: boolean[][] | null }): CarteData | null {
  const p = donneesPeriode(trainings, type, ref, opts);
  if (!p) return null;
  const tries = trier(trainings);
  const list = tries.filter((t) => jourDe(t) >= p.debut && jourDe(t) <= p.fin);
  const sport = sportPrincipal(list);
  let serie = 0;
  if (p.parSemaine > 0) {
    const l = lundiIso(p.fin);
    serie = serieSemaines(tries, l, p.parSemaine) || serieSemaines(tries, plusJours(l, -7), p.parSemaine);
  }
  return {
    moment: type,
    titre: type === 'mois' ? traduire('Mon mois') : traduire('Mon année'),
    sousTitre: type === 'mois' ? moisLong(ref) : p.enCours ? traduire('{0}, jusqu’ici', ref) : ref,
    sport,
    famille: sport ? familleDe(getSportCategory(sport), sport) : 'autre',
    periode: p,
    serieSemaines: serie,
    grille: opts.grille ?? null,
    dateIso: p.fin,
    cle: `${type}:${ref}`,
  };
}

// ============================================
// OBJECTIFS DU MOMENT
// ============================================

export type PoidsObjectif = { poids: number; depart: number | null; objectif: number | null };

function kgSigne(d: number): string {
  return `${d > 0 ? '+' : d < 0 ? MOINS : ''}${nombre(Math.abs(d), 1)}`;
}

/**
 * Tes objectifs aujourd'hui, chacun seulement s'il existe et qu'il y a deja un pas de fait :
 * - la semaine (seances faites sur seances visees), des la premiere seance de la semaine ;
 * - l'annee (seances faites sur seances visees au rythme choisi), des la premiere seance de l'annee ;
 * - le poids (part du chemin entre ton depart et ton objectif), des que tu t'en es rapproche.
 */
export function objectifsDuMoment(trainings: Training[], opts: { parSemaine: number; aujourdhui: string; poids?: PoidsObjectif | null }): Exploit[] {
  const out: Exploit[] = [];
  const auj = opts.aujourdhui.slice(0, 10);
  const tries = trier(trainings).filter((t) => jourDe(t) <= auj);
  const w = Math.max(0, Math.round(opts.parSemaine || 0));
  if (w > 0) {
    const lundi = lundiIso(auj);
    const n = tries.filter((t) => jourDe(t) >= lundi).length;
    if (n > 0) {
      const serie = serieSemaines(tries, lundi, w);
      const cotes: CoteExploit[] = [];
      if (serie >= 2) cotes.push({ label: traduire('semaines d’affilée'), value: String(serie) });
      out.push({
        type: 'semaine_objectif',
        date: auj,
        surtitre: traduire('Objectif de la semaine'),
        hero: { value: `${n}/${w}`, unit: '' },
        accroche: n >= w ? traduire('Toutes mes séances prévues sont faites') : traduirePluriel(w - n, w - n > 1, 'Encore {0} séance cette semaine', 'Encore {0} séances cette semaine', w - n),
        barre: { fait: Math.min(n, w), total: w, legende: traduire('{0} sur {1} séances', n, w) },
        cotes,
        priorite: 1,
      });
    }
    const oa = objectifAnnee(tries, w, auj);
    if (oa && oa.fait > 0) {
      const pct = Math.min(100, Math.round((oa.fait / oa.total) * 100));
      const cotes: CoteExploit[] = [{ label: traduire('de l’objectif'), value: String(pct), unit: '%' }];
      if (oa.fait < oa.total) cotes.push({ label: traduire('séances à faire'), value: String(oa.total - oa.fait) });
      out.push({
        type: 'annee_progression',
        date: auj,
        surtitre: traduire('Objectif {0}', auj.slice(0, 4)),
        hero: { value: String(oa.fait), unit: traduire('sur {0}', oa.total) },
        accroche: traduire('{0} séances par semaine, toute l’année', w),
        detail: legendeRythme(oa),
        barre: { fait: oa.fait, total: oa.total, attendu: oa.attendu, legende: legendeRythme(oa) },
        cotes,
        priorite: 2,
      });
    }
  }
  const p = opts.poids;
  if (p && p.poids > 0 && p.depart && p.depart > 0 && p.objectif && p.objectif > 0 && Math.abs(p.depart - p.objectif) >= 0.1) {
    const perte = p.objectif < p.depart;
    const span = Math.abs(p.depart - p.objectif);
    const fait = perte ? p.depart - p.poids : p.poids - p.depart;
    if (fait >= 0.1) {
      const pct = Math.max(0, Math.min(100, Math.round((fait / span) * 100)));
      const reste = Math.max(0, perte ? p.poids - p.objectif : p.objectif - p.poids);
      const ecart = p.poids - p.depart;
      const cotes: CoteExploit[] = [{ label: perte ? traduire('perdus depuis le départ') : traduire('pris depuis le départ'), value: kgSigne(ecart), unit: 'kg' }];
      if (reste >= 0.1) cotes.push({ label: traduire('avant l’objectif'), value: nombre(reste, 1), unit: 'kg' });
      cotes.push({ label: traduire('aujourd’hui'), value: nombre(p.poids, 1), unit: 'kg', poids: true });
      const hero = { value: String(pct), unit: '%' };
      const accroche = pct >= 100 ? traduire('Objectif atteint') : traduire('du chemin vers mon objectif');
      out.push({
        type: 'chemin_poids',
        date: auj,
        surtitre: traduire('Objectif de poids'),
        hero,
        accroche,
        detail: traduire('Objectif : {0} kg, parti de {1} kg', nombre(p.objectif, 1), nombre(p.depart, 1)),
        detailPoids: true,
        barre: { fait: pct, total: 100, legende: accroche },
        cotes,
        // le chiffre est deja un pourcentage : avec le masquage, il reste et les poids absolus partent
        masque: { ecart: { hero, accroche }, pourcentage: { hero, accroche } },
        priorite: 3,
      });
    }
  }
  return out;
}

// ============================================
// COMPTEURS
// ============================================

function heures(min: number): string {
  return nombre(min / 60, min >= 6000 ? 0 : 1);
}

/** « depuis mars 2025 » */
function depuisMois(jour: string): string {
  const d = dateDe(jour);
  return traduire('depuis {0} {1}', MOIS[d.getMonth()], d.getFullYear());
}

/**
 * Tes compteurs : les seances depuis le debut, puis les heures, les kilometres, les tonnes et les rounds de l'annee.
 * Un compteur a 0 n'existe pas.
 */
export function compteursDuMoment(trainings: Training[], aujourdhui: string): Exploit[] {
  const auj = aujourdhui.slice(0, 10);
  const an = auj.slice(0, 4);
  const tries = trier(trainings).filter((t) => jourDe(t) <= auj);
  if (!tries.length) return [];
  const out: Exploit[] = [];
  const minTotal = tries.reduce((s, t) => s + durationOf(t), 0);
  const cotesTotal: CoteExploit[] = [];
  if (minTotal >= 60) cotesTotal.push({ label: traduire('d’entraînement'), value: heures(minTotal), unit: 'h' });
  cotesTotal.push({ label: tries.length > 1 ? traduire('jours actifs') : traduire('jour actif'), value: nombre(new Set(tries.map(jourDe)).size, 0) });
  out.push({ type: 'cumul_seances', date: auj, surtitre: traduire('Depuis le début'), hero: { value: nombre(tries.length, 0), unit: tries.length > 1 ? traduire('séances') : traduire('séance') }, accroche: depuisMois(jourDe(tries[0])), cotes: cotesTotal, priorite: 1 });
  const annee = tries.filter((t) => jourDe(t).slice(0, 4) === an);
  if (!annee.length) return out;
  const nAn = { label: annee.length > 1 ? traduire('séances') : traduire('séance'), value: nombre(annee.length, 0) };
  const min = annee.reduce((s, t) => s + durationOf(t), 0);
  if (min >= 60) out.push({ type: 'cumul_heures', date: auj, surtitre: traduire('En {0}', an), hero: { value: heures(min), unit: traduire('heures') }, accroche: traduire('d’entraînement cette année'), cotes: [nAn], priorite: 2 });
  const km = annee.reduce((s, t) => s + (t.distance && t.distance > 0 && !estCombat(premierSport(t)) ? t.distance : 0), 0);
  if (km >= 1) out.push({ type: 'cumul_km', date: auj, surtitre: traduire('En {0}', an), hero: { value: nombre(km, km >= 100 ? 0 : 1), unit: 'km' }, accroche: traduire('parcourus cette année'), priorite: 3 });
  const kg = annee.reduce((s, t) => s + tonnageDe(t), 0);
  if (kg >= 1000) out.push({ type: 'cumul_tonnage', date: auj, surtitre: traduire('En {0}', an), hero: { value: nombre(kg / 1000, kg >= 100000 ? 0 : 1), unit: 'tonnes' }, accroche: traduire('soulevées cette année'), priorite: 4 });
  const rounds = annee.reduce((s, t) => s + roundsDe(t), 0);
  if (rounds > 0) out.push({ type: 'cumul_rounds', date: auj, surtitre: traduire('En {0}', an), hero: { value: nombre(rounds, 0), unit: rounds > 1 ? 'rounds' : 'round' }, accroche: traduire('sur le tapis ou sur le ring cette année'), priorite: 5 });
  return out;
}

// ============================================
// RANGEMENT DES EXPLOITS PAR RUBRIQUE
// ============================================

export type RubriqueExploit = 'records' | 'objectifs' | 'compteurs' | 'poids' | null;

/** La rubrique d'un exploit de ton historique ; null pour les bilans (remplaces par Mon mois et Mon annee) */
export function rubriqueDe(e: Exploit): RubriqueExploit {
  if (e.type.startsWith('record_') || e.type === 'techniques') return 'records';
  if (e.type === 'semaine_objectif' || e.type === 'serie_semaines' || e.type === 'annee_palier' || e.type === 'annee_atteinte' || e.type === 'annee_progression') return 'objectifs';
  if (e.type === 'palier_total' || e.type === 'palier_mois' || e.type.startsWith('cumul_') || e.type === 'compteur') return 'compteurs';
  if (e.type === 'poids_perdu' || e.type === 'plus_bas' || e.type === 'palier_poids' || e.type === 'objectif_poids' || e.type === 'chemin_poids') return 'poids';
  return null;
}

/** Les cartes d'exploits rangees par rubrique, dans l'ordre recu (les plus recentes d'abord) */
export function rangerExploits(cartes: CarteData[]): Record<Exclude<RubriqueExploit, null>, CarteData[]> {
  const out: Record<Exclude<RubriqueExploit, null>, CarteData[]> = { records: [], objectifs: [], compteurs: [], poids: [] };
  for (const c of cartes) {
    const r = c.exploit ? rubriqueDe(c.exploit) : null;
    if (r) out[r].push(c);
  }
  return out;
}

/** Une carte d'objectif ou de compteur du moment, a ouvrir dans l'atelier (src=objectif|compteur, cle=...) */
export function carteDuMoment(e: Exploit, src: 'objectif' | 'compteur', extra: Partial<CarteData> = {}): CarteData {
  return {
    moment: 'exploit',
    titre: e.surtitre,
    sousTitre: src === 'objectif' && e.type === 'semaine_objectif' ? traduire('Cette semaine') : src === 'objectif' && e.type === 'chemin_poids' ? traduire('Aujourd’hui') : e.surtitre,
    exploit: e,
    source: { type: src, ref: e.date },
    dateIso: e.date,
    cle: `${src}:${e.type}`,
    ...extra,
  };
}
