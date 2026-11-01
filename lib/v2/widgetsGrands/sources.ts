/**
 * Lecture des sources uniques de l'app pour les grands widgets (instantane.ts fait le calcul).
 * Chaque lecture est protegee : une source illisible donne une valeur vide, jamais un chiffre invente.
 * Reutilise la lecture de la montre (lib/v2/montre/sources.ts et contexte.ts, en lecture seule) pour le poids,
 * l'eau et l'objectif de la semaine : memes chiffres que l'Accueil, la montre et les autres widgets.
 */
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { MUSCLES } from '@/lib/sports';
import { getEspace } from '@/lib/v2/espace';
import { dedupeTrainings } from '@/lib/v2/seances/dedupe';
import { localISO } from '@/lib/v2/accueil/hydration';
import { coeurAuRepos, REPERE_PAS } from '@/lib/v2/accueil/enPlus';
import { safeComputeForme } from '@/lib/v2/accueil/forme';
import { construireContexte } from '@/lib/v2/montre/contexte';
import { lireSourcesContexte } from '@/lib/v2/montre/sources';
import { RANKS, getArmureState, getXpHistory } from '@/lib/v2/armure';
import { aUnPersonnage } from '@/lib/v2/dojo/personnages';
import { messageCoach } from '@/lib/v2/programmes/coach';
import { nomDuProgramme } from '@/lib/v2/programmes/heroJour';
import { dureeEstimee } from '@/lib/v2/programmes/express';
import { caseCochee, choixDuJour, estJourMuscu } from '@/lib/v2/programmes/finSeance';
import { modulesActifs } from '@/lib/v2/programmes/modules';
import { chargerProgrammeActif, joursDuProgramme, planEffectif, prochainJour, seancesAuxDates, semaineEffective } from '@/lib/v2/programmes/suivi';
import { cardioPrevu } from '@/lib/v2/seances/cardioJour';
import { getRingGoals, getSanteSource, loadAllSeries, loadRings } from '@/lib/v2/sante/data';
import { readinessFromForme } from '@/lib/v2/sante/score';
import { demoActive } from '@/lib/v2/demo/garde';
import { traduire } from '@/lib/i18n/tr';
import { avecVersion } from '@/lib/v2/programmes/alternance';
import type { DojoSource, PlanSource, SanteSource, SourcesGrands } from './instantane';

async function sur<T>(p: () => Promise<T>, repli: T): Promise<T> {
  try {
    return await p();
  } catch {
    return repli;
  }
}

const p2 = (n: number) => String(n).padStart(2, '0');
const isoDe = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

/** Les 7 jours de la semaine en cours, du lundi au dimanche, a midi */
function joursDeLaSemaine(today: string): Date[] {
  const d = new Date(`${today}T12:00:00`);
  const lundi = new Date(d);
  lundi.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + i, 12));
}

/**
 * Ta prochaine seance du programme suivi (la meme que la carte du jour du Coach), avec le cardio de fin de seance
 * reellement choisi pour ce jour (memes regles que ajoutsDuJour de lib/v2/programmes/heroJour.ts). null sans programme.
 */
async function lirePlan(today: string, femme: boolean): Promise<PlanSource | null> {
  const actif = await chargerProgrammeActif();
  if (!actif) return null;
  const suite = prochainJour(actif);
  if (!suite) return null;
  const { programme: p, jour } = suite;
  // 1er novembre 2026, soir : la vraie version du jour, « Push B », quand tes séances alternent
  const titre = avecVersion(traduire(jour.titre), jour);
  const m = messageCoach({ programme: p, actif, jours: joursDuProgramme(actif, p), prochaineSeance: titre, femme, fixe: !!planEffectif(actif, p) });
  const genre: PlanSource['genre'] = jour.cardio ? 'cardio' : jour.rounds ? 'rounds' : 'muscu';
  let minutes = p.dureeMin;
  if (jour.cardio) minutes = jour.cardio.minutes;
  else if (jour.rounds) minutes = Math.round((jour.rounds.nombre * jour.rounds.dureeSec + Math.max(0, jour.rounds.nombre - 1) * jour.rounds.reposSec) / 60);
  else if (jour.exos.length) minutes = dureeEstimee(jour.exos) || p.dureeMin;
  let cardio: PlanSource['cardio'] = null;
  if (estJourMuscu(jour) && !jour.cardio && modulesActifs(actif).includes('cardio') && caseCochee(choixDuJour(actif.fin, jour.id), 'cardio')) {
    cardio = cardioPrevu(actif.id, jour.id, actif.fin?.minutes ?? 30);
  }
  // la semaine : jour par jour seulement quand le programme a une vraie semaine (ta semaine, A et B) ;
  // sinon seule la seance du jour est connue a coup sur
  const dates = joursDeLaSemaine(today);
  let semaine: (string | null)[] = dates.map(() => null);
  if (semaineEffective(actif, p)) {
    semaine = seancesAuxDates(actif, dates).map((x) => (x ? avecVersion(traduire(x.jour.titre), x.jour) : null));
  } else if (m.seanceDuJour) {
    semaine = dates.map((d) => (isoDe(d) === today ? titre : null));
  }
  const faits: Record<string, string> = {};
  for (const f of actif.faits ?? []) {
    const j = p.jours.find((x) => x.id === f.jourId);
    if (j && f.date) faits[String(f.date).slice(0, 10)] = avecVersion(traduire(j.titre), j);
  }
  const derniers = (actif.faits ?? []).filter((f) => f.jourId === jour.id && typeof f.trainingId === 'number').sort((a, b) => (a.date < b.date ? 1 : -1));
  return {
    titre,
    programme: nomDuProgramme(traduire(p.titre)),
    jourId: jour.id,
    aujourdhui: m.seanceDuJour,
    genre,
    minutes: Math.max(0, Math.round(minutes || 0)),
    muscles: jour.muscles.map((id) => MUSCLES.find((x) => x.id === id)?.name).filter((n): n is string => !!n).map((n) => traduire(n)),
    exos: jour.exos,
    cardio,
    semaine,
    faits,
    derniereId: derniers[0]?.trainingId ?? null,
  };
}

/** Ton rang, ton XP, ta serie, ton coffre (comme le Dojo), et l'XP gagnee depuis lundi */
async function lireDojo(today: string, personnage: string | null | undefined): Promise<DojoSource | null> {
  const a = await getArmureState();
  if (!a || !a.rank) return null;
  const lundi = isoDe(joursDeLaSemaine(today)[0]);
  const histo = await sur(() => getXpHistory(), []);
  const xpSemaine = histo.length ? histo.filter((e) => String(e.date).slice(0, 10) >= lundi && String(e.date).slice(0, 10) <= today).reduce((s, e) => s + (Number(e.amount) || 0), 0) : null;
  const suivant = a.nextStep ?? null;
  return {
    rang: a.rankTitle ?? a.rank.name,
    rangIndex: Math.max(0, Math.min(RANKS.length - 1, a.rank.index)),
    rangs: RANKS.map((r) => ({ nom: r.name, piece: r.piece ?? null })),
    xp: Math.max(0, Math.round(a.xp)),
    suivant: suivant ? suivant.name : null,
    xpSuivant: suivant ? suivant.minXp : null,
    part: typeof a.rankProgress === 'number' ? a.rankProgress : null,
    serieJours: a.serie ? a.serie.jours : null,
    semainesTenues: typeof a.weekStreak === 'number' ? a.weekStreak : null,
    coffre: a.coffre ? { etat: a.coffre.etat, grand: !!a.coffre.grand, grandDans: Math.max(0, Math.round(a.coffre.grandDans ?? 0)) } : null,
    xpSemaine,
    personnage: !!personnage && aUnPersonnage(personnage),
  };
}

// Sante est lue au plus toutes les 10 minutes (HealthKit), sauf au retour au premier plan
const SANTE_MS = 10 * 60 * 1000;
let santeCache: { at: number; jour: string; v: SanteSource | null } | null = null;

/** Tes anneaux, ton sommeil, ta recuperation et ta FC au repos, comme l'ecran Sante ; null si Sante ne donne rien */
async function lireSante(today: string, forcer: boolean): Promise<SanteSource | null> {
  if (!forcer && santeCache && santeCache.jour === today && Date.now() - santeCache.at < SANTE_MS) return santeCache.v;
  const source = await getSanteSource();
  const demo = await sur(() => demoActive(), false);
  const isLive = source.mode === 'live' && !demo;
  const series = await loadAllSeries(30, isLive);
  const [rings, goals, forme] = await Promise.all([
    sur(() => loadRings(isLive, series), null),
    sur(() => getRingGoals(), { move: 500, exercise: 30, stand: 12 }),
    sur(() => safeComputeForme({ series }), null),
  ]);
  const pas = series.pas?.find((x) => x.date === today)?.value ?? null;
  let recup: SanteSource['recup'] = null;
  try {
    const r = readinessFromForme(forme, series);
    if (r && typeof r.score === 'number') recup = { score: r.score, titre: r.title, conseil: r.advice };
  } catch {
    recup = null;
  }
  const nuit = forme?.lastNight ?? null;
  const fc = coeurAuRepos(series['fc-repos'], today);
  const v: SanteSource = {
    pas,
    pasObjectif: REPERE_PAS,
    exercice: rings?.exercise ?? null,
    exerciceObjectif: goals.exercise,
    kcal: rings?.move ?? null,
    kcalObjectif: goals.move,
    sommeil: nuit && nuit.duration > 0 ? { minutes: nuit.duration, coucher: nuit.bedTime || null, lever: nuit.wakeTime || null } : null,
    sommeilObjectifMin: forme?.sleepGoal ?? null,
    recup,
    fcRepos: fc ? { bpm: fc.bpm, moyenne: fc.moyenne } : null,
    seances7: forme ? forme.sessions7 : null,
  };
  santeCache = { at: Date.now(), jour: today, v };
  return v;
}

export async function lireSourcesGrands(opts: { forcerSante?: boolean } = {}): Promise<SourcesGrands> {
  const today = localISO();
  const [ctxSrc, trainings, espace] = await Promise.all([
    lireSourcesContexte(),
    sur(() => getTrainings().then((l) => dedupeTrainings(l ?? [])), [] as Training[]),
    sur(() => getEspace(), null),
  ]);
  const poids = sur(async () => construireContexte(ctxSrc).poids, null);
  const femme = (ctxSrc.profil as { avatar_gender?: string | null } | null)?.avatar_gender === 'femme';
  const [p, plan, dojo, sante] = await Promise.all([
    poids,
    sur(() => lirePlan(today, femme), null),
    sur(() => lireDojo(today, espace?.personnage), null),
    sur(() => lireSante(today, !!opts.forcerSante), null),
  ]);
  return {
    aujourdhui: today,
    genere: new Date().toISOString(),
    unite: ctxSrc.unite,
    trainings,
    series: ctxSrc.series as SourcesGrands['series'],
    poids: p ? { dernier: p.dernier, cap: p.cap, arrivee: p.arrivee, torii: p.torii } : null,
    profil: ctxSrc.profil,
    objectifSemaine: ctxSrc.objectifSemaine,
    eau: ctxSrc.eau,
    dojo,
    plan,
    sante,
  };
}
