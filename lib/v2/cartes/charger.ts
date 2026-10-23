/**
 * Cartes a partager : lecture des vraies donnees pour un moment (seance, pesee, semaine).
 * Rien n'est estime : un champ absent reste a 0 ou null et son bloc disparait de la carte.
 */
import { getProfile, getTrainingById, getTrainings, getWeights } from '@/lib/database';
import type { Training, Weight } from '@/lib/database';
import { getSportCategory, getSportName } from '@/lib/sports';
import { getArmureState } from '@/lib/v2/armure';
import { getEspace, objectifVise } from '@/lib/v2/espace';
import { departDuChemin } from '@/lib/v2/accueil/projection';
import { getSeanceResult } from '@/lib/v2/seance/save';
import { dedupeTrainings } from '@/lib/v2/seances/dedupe';
import { durationOf, setsCount, tonnage } from '@/lib/v2/trainingWeek';
import { logger } from '@/lib/security/logger';
import { carteBilan } from '@/lib/v2/bilan/charger';
import { familleDe, nombre } from './chiffres';
import { cleMoment, isoJour, lundiDe, raisonPesee } from './moments';
import { bilanAnnee, bilanMois, cleExploit, exploitsPesee, exploitsSeance } from './exploits';
import type { CarteData, Exploit, RecordCarte } from './types';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const JOURS = [traduire('Dimanche'), traduire('Lundi'), traduire('Mardi'), traduire('Mercredi'), traduire('Jeudi'), traduire('Vendredi'), traduire('Samedi')];
const MOIS = [traduire('janvier'), traduire('février'), traduire('mars'), traduire('avril'), traduire('mai'), traduire('juin'), traduire('juillet'), traduire('août'), traduire('septembre'), traduire('octobre'), traduire('novembre'), traduire('décembre')];

function dateDe(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
}

/** « Mardi 14 octobre » */
export function dateLongue(iso: string): string {
  const d = dateDe(iso);
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

/** « Du 6 au 12 octobre » */
export function plageSemaine(lundi: string): string {
  const a = dateDe(lundi);
  const b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 6, 12);
  if (a.getMonth() === b.getMonth()) return traduire("Du {0} au {1} {2}", a.getDate(), b.getDate(), MOIS[b.getMonth()]);
  return traduire("Du {0} {1} au {2} {3}", a.getDate(), MOIS[a.getMonth()], b.getDate(), MOIS[b.getMonth()]);
}

async function serieSemaines(): Promise<number> {
  try {
    return (await getArmureState()).weekStreak ?? 0;
  } catch {
    return 0;
  }
}

function zonesDe(t: Training): number[] | null {
  if (!t.workout_details_json) return null;
  try {
    const d = JSON.parse(t.workout_details_json) as { heartRateZones?: { durationSeconds?: number }[] };
    const z = d.heartRateZones;
    if (!Array.isArray(z) || z.length !== 5) return null;
    return z.map((x) => Math.max(0, Number(x?.durationSeconds) || 0));
  } catch {
    return null;
  }
}

/** Le club de la seance, ou null : son nom et son logo tels qu'enregistres */
function clubDe(t: Training): CarteData['club'] {
  const x = t as Training & { club_name?: string | null; club_logo?: string | null };
  const nom = (x.club_name ?? '').trim();
  return nom ? { nom, logo: x.club_logo || null } : null;
}

function nomSport(sport: string): string {
  return String(sport)
    .split(',')
    .map((s) => getSportName(s.trim()))
    .filter(Boolean)
    .join(traduire(' et '));
}

/** Donnees d'une seance enregistree */
export async function chargerSeance(id: number): Promise<CarteData | null> {
  const t = await getTrainingById(id);
  if (!t) return null;
  const first = String(t.sport).split(',')[0].trim();
  const records: RecordCarte[] = [];
  try {
    const r = await getSeanceResult(id);
    for (const x of r?.records ?? []) {
      records.push({ nom: x.name, texte: traduirePluriel(x.reps, x.reps > 1, "{0} kg pour {1} répétition", "{0} kg pour {1} répétitions", nombre(x.weight, 1), x.reps), poids: x.weight, reps: x.reps });
    }
  } catch {
    // pas de record connu
  }
  // modele Record (17 octobre 2026) : l'ancien record de chaque exercice, lu dans ton historique (seulement s'il y a un record)
  if (records.length) {
    try {
      const anciens = exploitsSeance(await toutesSeances(), id, { parSemaine: 0 }).filter((e) => e.type === 'record_charge' && e.avant);
      for (const r of records) {
        const e = anciens.find((x) => x.accroche.trim().toLowerCase() === r.nom.trim().toLowerCase());
        const v = e?.avant ? Number(e.avant.value.replace(/\s/g, '').replace(',', '.')) : NaN;
        if (Number.isFinite(v) && v > 0) r.avant = v;
      }
    } catch {
      // l'ancien record reste inconnu : la carte ne le montre pas
    }
  }
  return {
    moment: 'seance',
    titre: nomSport(t.sport) || traduire('Ma séance'),
    sousTitre: dateLongue(t.date),
    sport: first,
    famille: familleDe(getSportCategory(first), first),
    club: clubDe(t),
    seance: {
      dureeMin: durationOf(t),
      rounds: t.rounds ?? (Array.isArray(t.combat_rounds) ? t.combat_rounds.length : 0),
      series: setsCount(t),
      tonnage: tonnage(t),
      distanceKm: t.distance ?? 0,
      fcMoy: t.heart_rate ?? 0,
      fcMax: t.max_heart_rate ?? 0,
      calories: t.calories ?? 0,
      zones: zonesDe(t),
      records,
    },
    serieSemaines: await serieSemaines(),
    cle: cleMoment('seance', id),
  };
}

type Contexte = { depart: number | null; objectif: number | null; sens: 'perte' | 'prise' | null; pesees: Weight[] };

async function contextePoids(): Promise<Contexte> {
  const [profile, espace, ws] = await Promise.all([getProfile().catch(() => null), getEspace().catch(() => null), getWeights().catch(() => [] as Weight[])]);
  const pesees = (ws ?? []).filter((w) => w.weight > 0).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id ?? 0) - (b.id ?? 0)));
  const depart = departDuChemin(profile, pesees.map((w) => ({ date: w.date, value: w.weight })));
  const tg = Number(profile?.target_weight);
  const obj = espace?.objectifs ?? [];
  const sens = obj.includes('lose') ? 'perte' : obj.includes('gain') ? 'prise' : null;
  return { depart, objectif: tg > 0 ? tg : null, sens, pesees };
}

function carteDePesee(ctx: Contexte, idx: number, serie: number): CarteData {
  const w = ctx.pesees[idx];
  const historique = ctx.pesees.slice(0, idx).map((x) => x.weight);
  const raison = raisonPesee({ poids: w.weight, historique, depart: ctx.depart, objectif: ctx.objectif, sens: ctx.sens });
  return {
    moment: 'pesee',
    titre: raison?.texte ?? traduire('Ma pesée'),
    sousTitre: dateLongue(w.date),
    pesee: { poids: w.weight, precedent: historique.length ? historique[historique.length - 1] : null, depart: ctx.depart, objectif: ctx.objectif, raison },
    serieSemaines: serie,
    cle: cleMoment('pesee', w.date.slice(0, 10)),
  };
}

/** Donnees d'une pesee : par id, par date, ou la plus recente */
export async function chargerPesee(opts: { id?: number; date?: string } = {}): Promise<CarteData | null> {
  const ctx = await contextePoids();
  if (!ctx.pesees.length) return null;
  let idx = ctx.pesees.length - 1;
  if (opts.id) idx = ctx.pesees.findIndex((w) => w.id === opts.id);
  else if (opts.date) {
    const d = opts.date.slice(0, 10);
    for (let i = ctx.pesees.length - 1; i >= 0; i--) if (ctx.pesees[i].date.slice(0, 10) === d) { idx = i; break; }
  }
  if (idx < 0) return null;
  return carteDePesee(ctx, idx, await serieSemaines());
}

/** Donnees du bilan d'une semaine (lundi en AAAA-MM-JJ) */
export async function chargerSemaine(lundi: string, deja?: { trainings?: Training[]; ctx?: Contexte; serie?: number }): Promise<CarteData | null> {
  const fin = isoJour(new Date(dateDe(lundi).getFullYear(), dateDe(lundi).getMonth(), dateDe(lundi).getDate() + 6, 12));
  const all = deja?.trainings ?? dedupeTrainings((await getTrainings(400).catch(() => [])) ?? []);
  const list = all.filter((t) => {
    const d = t.date.slice(0, 10);
    return d >= lundi && d <= fin;
  });
  if (!list.length) return null;
  const jours = [false, false, false, false, false, false, false];
  const parJour: NonNullable<CarteData['semaine']>['parJour'] = jours.map(() => ({ sports: [], club: null }));
  const sports = new Map<string, number>();
  let minutes = 0;
  for (const t of [...list].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))) {
    const dow = (dateDe(t.date).getDay() + 6) % 7;
    jours[dow] = true;
    minutes += durationOf(t);
    const n = nomSport(t.sport) || traduire('Séance');
    sports.set(n, (sports.get(n) ?? 0) + 1);
    const j = parJour![dow];
    if (!j.sports.includes(n)) j.sports.push(n);
    if (!j.club) j.club = clubDe(t);
  }
  const ctx = deja?.ctx ?? (await contextePoids());
  const semaine = ctx.pesees.filter((w) => w.date.slice(0, 10) >= lundi && w.date.slice(0, 10) <= fin);
  const avant = ctx.pesees.filter((w) => w.date.slice(0, 10) < lundi);
  const poidsFin = semaine.length ? semaine[semaine.length - 1].weight : null;
  const poidsEcart = poidsFin !== null && avant.length ? poidsFin - avant[avant.length - 1].weight : null;
  let objectif = 0;
  try {
    objectif = objectifVise(await getEspace());
  } catch {
    objectif = 0;
  }
  return {
    moment: 'semaine',
    titre: traduire('Ma semaine'),
    sousTitre: plageSemaine(lundi),
    semaine: {
      debut: lundi,
      jours,
      seances: list.length,
      minutes,
      sports: [...sports.entries()].map(([nom, n]) => ({ nom, n })).sort((a, b) => b.n - a.n),
      poidsFin,
      poidsEcart,
      objectif,
      parJour,
    },
    serieSemaines: deja?.serie ?? (await serieSemaines()),
    cle: cleMoment('semaine', lundi),
  };
}

// ============================================
// EXPLOITS
// ============================================

async function parSemaine(): Promise<number> {
  try {
    return objectifVise(await getEspace());
  } catch {
    return 0;
  }
}

async function toutesSeances(): Promise<Training[]> {
  return dedupeTrainings((await getTrainings().catch(() => [])) ?? []);
}

/** « Septembre 2026 » */
function moisLong(mois: string): string {
  const [y, m] = mois.split('-').map(Number);
  const n = MOIS[(m || 1) - 1];
  return `${n.charAt(0).toUpperCase()}${n.slice(1)} ${y}`;
}

export function carteExploit(e: Exploit, source: NonNullable<CarteData['source']>): CarteData {
  const sousTitre = e.type === 'bilan_mois' ? moisLong(e.date.slice(0, 7)) : e.type === 'bilan_annee' ? e.date.slice(0, 4) : dateLongue(e.date);
  return {
    moment: 'exploit',
    titre: e.surtitre,
    sousTitre,
    exploit: e,
    source,
    cle: cleExploit(e, { id: source.type === 'seance' ? source.ref : undefined, date: source.ref }),
  };
}

/** Les exploits d'une seance (records, techniques, compteur, paliers, objectifs, cumuls) */
export async function chargerExploitsSeance(id: number, deja?: { trainings?: Training[]; parSemaine?: number }): Promise<CarteData[]> {
  const list = deja?.trainings ?? (await toutesSeances());
  const w = deja?.parSemaine ?? (await parSemaine());
  const t = list.find((x) => x.id === id);
  const sport = t ? String(t.sport).split(',')[0].trim() : null;
  return exploitsSeance(list, id, { parSemaine: w }).map((e) => ({ ...carteExploit(e, { type: 'seance', ref: String(id) }), sport, famille: sport ? familleDe(getSportCategory(sport), sport) : undefined, club: t ? clubDe(t) : null }));
}

/** Les exploits d'une pesee (objectif atteint, palier, plus bas, poids perdu) */
export async function chargerExploitsPesee(date?: string, deja?: { ctx?: Contexte }): Promise<CarteData[]> {
  const ctx = deja?.ctx ?? (await contextePoids());
  if (!ctx.pesees.length) return [];
  let idx = ctx.pesees.length - 1;
  if (date) {
    const d = date.slice(0, 10);
    idx = -1;
    for (let i = ctx.pesees.length - 1; i >= 0; i--) if (ctx.pesees[i].date.slice(0, 10) === d) { idx = i; break; }
  }
  if (idx < 0) return [];
  const pesees = ctx.pesees.map((w) => ({ date: w.date.slice(0, 10), poids: w.weight }));
  return exploitsPesee({ pesees, idx, depart: ctx.depart, objectif: ctx.objectif, sens: ctx.sens }).map((e) => carteExploit(e, { type: 'pesee', ref: pesees[idx].date }));
}

export async function chargerBilanMois(mois: string, deja?: { trainings?: Training[]; parSemaine?: number }): Promise<CarteData | null> {
  const list = deja?.trainings ?? (await toutesSeances());
  const e = bilanMois(list, mois, { parSemaine: deja?.parSemaine ?? (await parSemaine()) });
  return e ? carteExploit(e, { type: 'mois', ref: mois }) : null;
}

export async function chargerBilanAnnee(annee: string, deja?: { trainings?: Training[]; parSemaine?: number }): Promise<CarteData | null> {
  const list = deja?.trainings ?? (await toutesSeances());
  const e = bilanAnnee(list, annee, { parSemaine: deja?.parSemaine ?? (await parSemaine()), jusqua: isoJour(new Date()) });
  return e ? carteExploit(e, { type: 'annee', ref: annee }) : null;
}

/** Retrouve un exploit par sa source et sa cle (atelier de la carte) */
export async function chargerExploit(src: string, ref: string, cle: string): Promise<CarteData | null> {
  let list: CarteData[] = [];
  if (src === 'seance') list = await chargerExploitsSeance(Number(ref));
  else if (src === 'pesee') list = await chargerExploitsPesee(ref);
  else if (src === 'mois') list = [await chargerBilanMois(ref)].filter((x): x is CarteData => !!x);
  else if (src === 'annee') list = [await chargerBilanAnnee(ref)].filter((x): x is CarteData => !!x);
  // page de bilan : ref « corps:AAAA-MM-JJ » ou « seance:ID »
  else if (src === 'bilan') list = [await carteBilan(ref)].filter((x): x is CarteData => !!x);
  return list.find((c) => c.cle === cle) ?? list[0] ?? null;
}

export type ListeCartes = { seances: CarteData[]; pesees: CarteData[]; semaines: CarteData[]; exploits?: CarteData[] };

/**
 * Tes exploits pour « Mes cartes » : records, paliers, objectifs et techniques de tes 40 dernieres seances
 * (le compteur et l'objectif de l'annee de la derniere seance seulement), tes bilans des trois derniers mois,
 * de l'annee en cours et de l'annee passee, et ce que montrent tes dernieres pesees.
 */
export async function chargerExploits(): Promise<CarteData[]> {
  const out: CarteData[] = [];
  const vus = new Set<string>();
  const add = (c: CarteData | null) => {
    if (c && !vus.has(c.cle)) {
      vus.add(c.cle);
      out.push(c);
    }
  };
  try {
    const trainings = await toutesSeances();
    const w = await parSemaine();
    const recents = [...trainings].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id ?? 0) - (a.id ?? 0))).slice(0, 40);
    recents.forEach((t, i) => {
      if (!t.id) return;
      for (const c of exploitsSeance(trainings, t.id, { parSemaine: w })) {
        if (i > 0 && (c.type === 'compteur' || c.type === 'annee_progression')) continue;
        add(carteExploit(c, { type: 'seance', ref: String(t.id) }));
      }
    });
    const now = new Date();
    for (let k = 0; k < 3; k++) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 15, 12);
      add(await chargerBilanMois(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, { trainings, parSemaine: w }));
    }
    add(await chargerBilanAnnee(String(now.getFullYear()), { trainings, parSemaine: w }));
    add(await chargerBilanAnnee(String(now.getFullYear() - 1), { trainings, parSemaine: w }));
    const ctx = await contextePoids();
    for (let i = ctx.pesees.length - 1, n = 0; i >= 0 && n < 8; i--, n++) {
      for (const c of await chargerExploitsPesee(ctx.pesees[i].date, { ctx })) add(c);
    }
  } catch (e) {
    logger.warn('[cartes] exploits', e);
  }
  return out.sort((a, b) => ((a.exploit?.date ?? '') < (b.exploit?.date ?? '') ? 1 : (a.exploit?.date ?? '') > (b.exploit?.date ?? '') ? -1 : (a.exploit?.priorite ?? 0) - (b.exploit?.priorite ?? 0)));
}

/** Pour l'ecran « Mes cartes » : tes dernieres seances, tes pesees qui montrent un progres, tes dernieres semaines */
export async function chargerListe(): Promise<ListeCartes> {
  const out: ListeCartes = { seances: [], pesees: [], semaines: [] };
  try {
    const trainings = dedupeTrainings((await getTrainings(400).catch(() => [])) ?? []).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id ?? 0) - (a.id ?? 0)));
    const serie = await serieSemaines();
    for (const t of trainings.slice(0, 12)) {
      if (!t.id) continue;
      const c = await chargerSeance(t.id).catch(() => null);
      if (c) out.seances.push(c);
    }
    const ctx = await contextePoids();
    for (let i = ctx.pesees.length - 1; i >= 0 && out.pesees.length < 8; i--) {
      const c = carteDePesee(ctx, i, serie);
      if (c.pesee?.raison) out.pesees.push(c);
    }
    const lundis: string[] = [];
    const now = new Date();
    for (let k = 0; k < 8; k++) lundis.push(lundiDe(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7 * k, 12)));
    for (const l of lundis) {
      const c = await chargerSemaine(l, { trainings, ctx, serie }).catch(() => null);
      if (c) out.semaines.push(c);
    }
    out.exploits = await chargerExploits();
  } catch (e) {
    logger.warn('[cartes] liste', e);
  }
  return out;
}
