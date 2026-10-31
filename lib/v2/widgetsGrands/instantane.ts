/**
 * Grands widgets iPad et Mac (31 octobre 2026, maquettes _propositions/widgets_grands_2026-10-31) : l'instantane
 * dedie aux 8 widgets grand et tres grand (Ma semaine, Mon corps, Ma forme du jour, Mon dojo, Ma prochaine seance,
 * Mes records, Mon mois, Muscles de la semaine).
 *
 * Fonction pure : tout vient des sources uniques de l'app, lues par sources.ts. Une donnee absente reste absente
 * (champ omis ou null), le widget affiche alors un etat vide propre, jamais un chiffre invente.
 * Les poids et les kilos restent en kg (le widget convertit en livres si unite vaut « lb »).
 * Les textes deja traduits par l'app (nom du sport, de l'exercice, du programme, du rang, du cardio) passent tels quels ;
 * les libelles fixes sont ecrits par le widget.
 *
 * Contrat JSON v1, ecrit dans l'App Group (fichier FICHIER_GRANDS) par synchro.ts, lu par
 * ios/YoroiWidgets/Grands/ModeleGrands.swift. Teste dans __tests__/unit/widgetsGrands.test.ts.
 */
import type { Training } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import { durationOf, exercisesOf, mondayOf, tonnage, workSetsOf } from '@/lib/v2/trainingWeek';
import { familyOf, firstSport, parseRounds } from '@/lib/v2/seances/sessionData';
import { muscleOf, MUSCLE_ORDER } from '@/lib/v2/progres/strength';
import type { MuscleName } from '@/lib/v2/progres/strength';
import { computeRecords, recordShortTitle } from '@/lib/v2/seances/records';
import type { RecordKind } from '@/lib/v2/seances/records';
import { infoCardio, libelleCardio } from '@/lib/v2/seances/cardioJour';
import type { ChoixCardio } from '@/lib/v2/seances/cardioJour';
import { proposer, seancesDeLExo } from '@/lib/v2/programmes/progression';
import type { ExoProgramme } from '@/lib/v2/programmes/types';
import { traduire } from '@/lib/i18n/tr';

export const VERSION_GRANDS = 1;
/** Fichier de l'App Group group.com.houari.yoroi (le meme nom cote Swift) */
export const FICHIER_GRANDS = 'yoroi_widgets_grands_v1.json';
/** Repere des muscles de la semaine : 10 series par groupe (le trait de la maquette) */
export const REPERE_SERIES = 10;
const VERRE_L = 0.25;

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;
const ok = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const okPos = (v: unknown): v is number => ok(v) && v > 0;
const jourMs = (iso: string) => Date.parse(`${iso.slice(0, 10)}T12:00:00`);
const ecartJours = (a: string, b: string) => Math.round((jourMs(b) - jourMs(a)) / 86400000);
const p2 = (n: number) => String(n).padStart(2, '0');
function plusJours(iso: string, n: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
const dateDe = (t: Training) => String(t?.date ?? '').slice(0, 10);

// ─── Stickers (memes regles que stickerDuSport de components/yoroi/v2/seances/MonthMarks.tsx) ─────────────────

/** Nom du sticker d'un sport, tel qu'il existe dans ios/YoroiWidgets/Grands/Grands.xcassets (prefixe yg_s_) */
export function stickerSport(sport?: string | null, dehors?: boolean | null): string {
  const id = String(sport ?? '').split(',')[0].trim().toLowerCase();
  if (/jjb|bjj|jiu|grappling|judo|lutte|wrestling|sambo|luta/.test(id)) return 'jjb';
  if (/boxe|box|mma|kick|muay|karate|taekwondo|savate|striking/.test(id)) return 'gants';
  if (/muscu|fitness|crossfit|halt|force|powerlifting|street/.test(id)) return 'musculation';
  if (/run|course|trail|jogging|marche/.test(id)) return 'course';
  if (/foot|soccer|futsal/.test(id)) return 'sport_football';
  if (/velo|cycl|bike/.test(id)) return 'sport_velo';
  if (/nata|swim|nage/.test(id)) return 'sport_nage';
  if (dehors) return 'montagne_drapeau';
  const f = familyOf(sport ?? undefined);
  if (f === 'combat_sol') return 'jjb';
  if (f === 'combat_pied') return 'gants';
  if (f === 'cardio') return 'course';
  if (f === 'muscu') return 'musculation';
  return 'activite';
}

/** Les calques rouges de la carte des muscles (yg_m_...) pour chacun des 6 groupes de l'app */
export const CALQUES_MUSCLES: Record<MuscleName, string[]> = {
  Pectoraux: ['face_pectoraux'],
  Dos: ['dos_dos', 'dos_trapezes', 'face_trapezes'],
  'Épaules': ['face_epaules', 'dos_epaules'],
  Bras: ['face_bras', 'dos_bras', 'face_avantbras', 'dos_avantbras'],
  Jambes: ['face_quadriceps', 'dos_ischios', 'dos_fessiers', 'face_mollets', 'dos_mollets'],
  Abdos: ['face_abdos'],
};

// ─── Sources ─────────────────────────────────────────────────────────────────────────────────────────────────

export type PointPoids = { date: string; value: number; trend?: number };

export type PoidsContexte = {
  dernier: { kg: number; date: string } | null;
  cap: number | null;
  arrivee: { du: string; au: string } | null;
  torii?: string;
};

export type ProfilGrands = { start_date?: string | null; start_weight?: number | null; target_weight?: number | null } | null;

export type DojoSource = {
  rang: string;
  rangIndex: number;
  rangs: { nom: string; piece?: string | null }[];
  xp: number;
  suivant: string | null;
  xpSuivant: number | null;
  part: number | null;
  serieJours: number | null;
  semainesTenues: number | null;
  coffre: { etat: 'verrouille' | 'pret' | 'ouvert'; grand: boolean; grandDans: number } | null;
  xpSemaine: number | null;
  personnage: boolean;
};

export type PlanSource = {
  titre: string;
  programme: string;
  jourId: string;
  aujourdhui: boolean;
  /** jour de musculation, de cardio ou de rounds */
  genre: 'muscu' | 'cardio' | 'rounds';
  minutes: number;
  muscles: string[];
  exos: ExoProgramme[];
  /** le cardio ajoute en fin de seance, tel que choisi pour ce jour (lib/v2/seances/cardioJour.ts), null sinon */
  cardio: ChoixCardio | null;
  /** titre de la seance prevue chaque jour de la semaine (0 = lundi), null un jour de repos */
  semaine: (string | null)[];
  /** titre du jour du programme fait a cette date */
  faits: Record<string, string>;
  /** id de la derniere seance enregistree pour ce jour du programme */
  derniereId: number | null;
};

export type SanteSource = {
  pas: number | null;
  pasObjectif: number;
  exercice: number | null;
  exerciceObjectif: number;
  kcal: number | null;
  kcalObjectif: number;
  sommeil: { minutes: number; coucher: string | null; lever: string | null } | null;
  sommeilObjectifMin: number | null;
  recup: { score: number; titre: string; conseil: string } | null;
  fcRepos: { bpm: number; moyenne: number | null } | null;
  seances7: number | null;
};

export type SourcesGrands = {
  aujourdhui: string;
  genere: string;
  unite: 'kg' | 'lb';
  trainings: Training[];
  series: PointPoids[];
  poids: PoidsContexte | null;
  profil: ProfilGrands;
  objectifSemaine: number | null;
  eau: { litres: number; objectifLitres: number | null };
  dojo: DojoSource | null;
  plan: PlanSource | null;
  sante: SanteSource | null;
};

// ─── Contrat ─────────────────────────────────────────────────────────────────────────────────────────────────

export type JourSemaineGrands = {
  date: string;
  /** 0 = lundi */
  index: number;
  fait: boolean;
  aujourdhui: boolean;
  futur: boolean;
  sticker?: string;
  nom?: string;
  minutes?: number;
  /** seance prevue par ton programme (jour pas encore fait) */
  prevu?: string;
};

export type InstantaneGrands = {
  v: 1;
  genere: string;
  jour: string;
  unite: 'kg' | 'lb';
  semaine: {
    lundi: string;
    jours: JourSemaineGrands[];
    faites: number;
    objectif: number | null;
    minutes: number;
    kilosKg: number;
    series: number;
    rounds: number;
    /** semaines d'affilee avec ton objectif tenu (Dojo) */
    serieSemaines: number | null;
    minutesParJour: { index: number; minutes: number }[];
    kilosParSeance: { nom: string; kg: number }[];
    /** la seance de combat qui a fait le plus de rounds */
    combat: { nom: string; date: string; minutes: number } | null;
  };
  corps: {
    dernierKg: number;
    derniereDate: string;
    departKg: number | null;
    departDate: string | null;
    objectifKg: number | null;
    /** de 0 (depart) a 1 (objectif atteint), null sans objectif */
    part: number | null;
    /** 25, 50 et 75 % du chemin, puis l'objectif */
    paliers: { kg: number; franchi: boolean }[];
    tendance7: number | null;
    /** ecart entre la premiere et la derniere pesee des 90 derniers jours */
    ecart90: number | null;
    pesees: number;
    /** pesees des 90 derniers jours : d = jours depuis le debut de la fenetre (0 a 89) */
    points: { d: number; kg: number; t: number }[];
    debutFenetre: string;
    /** date d'arrivee prevue (milieu de la fenetre, ou le torii), null si rien d'honnete a dire */
    arrivee: string | null;
  } | null;
  forme: {
    pas: number | null;
    pasObjectif: number;
    exercice: number | null;
    exerciceObjectif: number;
    kcal: number | null;
    kcalObjectif: number;
    sommeil: { minutes: number; coucher: string | null; lever: string | null } | null;
    sommeilObjectifMin: number | null;
    recup: { score: number; titre: string; conseil: string } | null;
    fcRepos: { bpm: number; moyenne: number | null } | null;
    seances7: number | null;
    hier: { nom: string; minutes: number } | null;
  } | null;
  eau: { litres: number; objectif: number | null; verres: number; verresObjectif: number | null };
  dojo: {
    rang: string;
    rangIndex: number;
    rangs: string[];
    xp: number;
    suivant: string | null;
    xpSuivant: number | null;
    xpRestant: number | null;
    part: number | null;
    serieJours: number | null;
    semainesTenues: number | null;
    coffre: { etat: 'verrouille' | 'pret' | 'ouvert'; grand: boolean; grandDans: number } | null;
    recompense: { piece: string; rang: string } | null;
    xpSemaine: number | null;
    recordsMois: number;
    personnage: boolean;
  } | null;
  seance: {
    titre: string;
    programme: string;
    aujourdhui: boolean;
    genre: 'muscu' | 'cardio' | 'rounds';
    minutes: number;
    muscles: string[];
    exos: { nom: string; series: number; repsMin: number; repsMax: number; secondes: boolean; chargeKg: number | null; monte: boolean }[];
    /** le cardio vraiment choisi pour ce jour : type de lib/v2/seances/cardioJour.ts, duree, phrase deja traduite */
    cardio: { type: string; minutes: number; texte: string; sticker: string } | null;
    derniere: { date: string; minutes: number; kilosKg: number } | null;
    /** series prevues par groupe de muscles */
    seriesParGroupe: { nom: string; series: number }[];
  } | null;
  records: {
    titre: string;
    kind: RecordKind;
    valeur: number;
    avant: number | null;
    date: string;
    sticker: string;
    /** pour la force : la serie qui a donne le record */
    serie: { kg: number; reps: number } | null;
  }[];
  mois: {
    annee: number;
    mois: number;
    /** jour de la semaine du 1er (0 = lundi) */
    premier: number;
    jours: number;
    aujourdhui: number;
    /** stickers des seances de chaque jour (cle : numero du jour), deux au plus */
    calendrier: Record<string, string[]>;
    seances: number;
    joursActifs: number;
    minutes: number;
    sports: { sticker: string; nom: string; seances: number }[];
    distanceKm: number;
    kilosKg: number;
    rounds: number;
    /** seances de plus (ou de moins) que le mois d'avant, jusqu'au meme jour */
    ecartMoisPrecedent: number | null;
  };
  muscles: {
    groupes: { nom: string; series: number; calques: string[] }[];
    total: number;
    seances: number;
    parSeance: { nom: string; date: string; series: number }[];
  };
};

// ─── Calculs ─────────────────────────────────────────────────────────────────────────────────────────────────

function nomSeance(t: Training, plan: PlanSource | null): string {
  const d = dateDe(t);
  if (plan && plan.faits[d] && familyOf(t.sport) === 'muscu') return plan.faits[d];
  return getSportName(firstSport(t.sport)) || firstSport(t.sport);
}

function roundsDe(t: Training): number {
  const n = parseRounds(t).length || Number(t.rounds) || 0;
  return Math.max(0, Math.round(n));
}

function seriesDe(t: Training): number {
  return exercisesOf(t).reduce((s, e) => s + workSetsOf(e).length, 0);
}

function semaineDe(src: SourcesGrands): InstantaneGrands['semaine'] {
  const today = src.aujourdhui;
  const lundi = mondayOf(today);
  const semaine = src.trainings.filter((t) => dateDe(t) >= lundi && dateDe(t) <= today);
  const jours: JourSemaineGrands[] = [];
  for (let i = 0; i < 7; i++) {
    const date = plusJours(lundi, i);
    const ceJour = semaine.filter((t) => dateDe(t) === date);
    const j: JourSemaineGrands = { date, index: i, fait: ceJour.length > 0, aujourdhui: date === today, futur: date > today };
    if (ceJour.length) {
      j.sticker = stickerSport(ceJour[0].sport, !!ceJour[0].is_outdoor);
      j.nom = nomSeance(ceJour[0], src.plan);
      const m = ceJour.reduce((s, t) => s + durationOf(t), 0);
      if (m > 0) j.minutes = Math.round(m);
    } else if (date >= today && src.plan?.semaine[i]) {
      j.prevu = src.plan.semaine[i] as string;
      // le sticker seulement pour la seance du jour, dont on connait le genre ; les autres jours, le titre suffit
      if (date === today && src.plan.aujourdhui) j.sticker = src.plan.genre === 'cardio' ? 'course' : src.plan.genre === 'rounds' ? 'gants' : 'musculation';
    }
    jours.push(j);
  }
  let combat: InstantaneGrands['semaine']['combat'] = null;
  let roundsMax = 0;
  for (const t of semaine) {
    const r = roundsDe(t);
    if (r > roundsMax) {
      roundsMax = r;
      combat = { nom: getSportName(firstSport(t.sport)) || firstSport(t.sport), date: dateDe(t), minutes: Math.round(durationOf(t)) };
    }
  }
  return {
    lundi,
    jours,
    faites: semaine.length,
    objectif: okPos(src.objectifSemaine) ? Math.round(src.objectifSemaine) : null,
    minutes: Math.round(semaine.reduce((s, t) => s + durationOf(t), 0)),
    kilosKg: Math.round(semaine.reduce((s, t) => s + tonnage(t), 0)),
    series: semaine.reduce((s, t) => s + seriesDe(t), 0),
    rounds: semaine.reduce((s, t) => s + roundsDe(t), 0),
    serieSemaines: ok(src.dojo?.semainesTenues) ? src.dojo!.semainesTenues : null,
    minutesParJour: jours.filter((j) => j.fait && (j.minutes ?? 0) > 0).map((j) => ({ index: j.index, minutes: j.minutes as number })),
    kilosParSeance: semaine
      .filter((t) => tonnage(t) > 0)
      .sort((a, b) => (dateDe(a) < dateDe(b) ? -1 : 1))
      .slice(-4)
      .map((t) => ({ nom: nomSeance(t, src.plan), kg: Math.round(tonnage(t)) })),
    combat: roundsMax > 0 ? combat : null,
  };
}

function corpsDe(src: SourcesGrands): InstantaneGrands['corps'] {
  const today = src.aujourdhui;
  const series = src.series.filter((p) => p && okPos(p.value) && p.date.slice(0, 10) <= today);
  const last = series[series.length - 1];
  if (!last) return null;
  const p = src.profil ?? {};
  const departKg = okPos(p.start_weight) ? p.start_weight : series[0].value;
  const departDate = (p.start_date && String(p.start_date).slice(0, 10)) || series[0].date.slice(0, 10);
  const cap = okPos(src.poids?.cap) ? src.poids!.cap : okPos(p.target_weight) ? p.target_weight : null;
  let part: number | null = null;
  const paliers: { kg: number; franchi: boolean }[] = [];
  if (cap != null && Math.abs(departKg - cap) >= 0.5) {
    const sens = cap < departKg ? 1 : -1;
    part = Math.max(0, Math.min(1, ((departKg - last.value) * sens) / Math.abs(departKg - cap)));
    for (const f of [0.25, 0.5, 0.75, 1]) {
      const kg = r1(departKg + (cap - departKg) * f);
      paliers.push({ kg, franchi: (departKg - last.value) * sens >= (departKg - kg) * sens - 1e-9 });
    }
  }
  const trendDe = (q: PointPoids) => (ok(q.trend) ? q.trend : q.value);
  const avant7 = [...series].reverse().find((q) => ecartJours(q.date, last.date) >= 7);
  const tendance7 = avant7 && ecartJours(avant7.date, last.date) <= 14 ? r1(trendDe(last) - trendDe(avant7)) : null;
  const debutFenetre = plusJours(today, -89);
  const fen = series.filter((q) => q.date.slice(0, 10) >= debutFenetre);
  let points = fen.map((q) => ({ d: ecartJours(debutFenetre, q.date), kg: r1(q.value), t: r2(trendDe(q)) }));
  if (points.length > 60) {
    const pas = (points.length - 1) / 59;
    points = Array.from({ length: 60 }, (_, i) => points[Math.round(i * pas)]);
  }
  let arrivee: string | null = null;
  if (src.poids?.torii && src.poids.torii > today) arrivee = src.poids.torii;
  else if (src.poids?.arrivee) {
    const m = (jourMs(src.poids.arrivee.du) + jourMs(src.poids.arrivee.au)) / 2;
    const d = new Date(m);
    arrivee = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  }
  return {
    dernierKg: r1(last.value),
    derniereDate: last.date.slice(0, 10),
    departKg: r1(departKg),
    departDate,
    objectifKg: cap != null ? r1(cap) : null,
    part: part == null ? null : r2(part),
    paliers,
    tendance7,
    ecart90: fen.length >= 2 ? r1(fen[fen.length - 1].value - fen[0].value) : null,
    pesees: series.length,
    points,
    debutFenetre,
    arrivee: cap != null ? arrivee : null,
  };
}

function formeDe(src: SourcesGrands): InstantaneGrands['forme'] {
  const s = src.sante;
  const today = src.aujourdhui;
  const avant = src.trainings.filter((t) => dateDe(t) < today).sort((a, b) => (dateDe(a) < dateDe(b) ? 1 : -1))[0];
  const hier = avant && ecartJours(dateDe(avant), today) === 1 ? { nom: nomSeance(avant, src.plan), minutes: Math.round(durationOf(avant)) } : null;
  if (!s) return null;
  const pos = (v: number | null) => (okPos(v) ? Math.round(v) : null);
  const forme = {
    pas: pos(s.pas),
    pasObjectif: okPos(s.pasObjectif) ? Math.round(s.pasObjectif) : 8000,
    exercice: ok(s.exercice) && s.exercice >= 0 ? Math.round(s.exercice) : null,
    exerciceObjectif: okPos(s.exerciceObjectif) ? Math.round(s.exerciceObjectif) : 30,
    kcal: pos(s.kcal),
    kcalObjectif: okPos(s.kcalObjectif) ? Math.round(s.kcalObjectif) : 500,
    sommeil: s.sommeil && okPos(s.sommeil.minutes) ? { minutes: Math.round(s.sommeil.minutes), coucher: s.sommeil.coucher || null, lever: s.sommeil.lever || null } : null,
    sommeilObjectifMin: okPos(s.sommeilObjectifMin) ? Math.round(s.sommeilObjectifMin) : null,
    recup: s.recup && ok(s.recup.score) ? { score: Math.max(0, Math.min(100, Math.round(s.recup.score))), titre: s.recup.titre, conseil: s.recup.conseil } : null,
    fcRepos: s.fcRepos && okPos(s.fcRepos.bpm) ? { bpm: Math.round(s.fcRepos.bpm), moyenne: okPos(s.fcRepos.moyenne) ? Math.round(s.fcRepos.moyenne) : null } : null,
    seances7: ok(s.seances7) ? s.seances7 : null,
    hier,
  };
  const vide = forme.pas == null && forme.exercice == null && forme.kcal == null && !forme.sommeil && !forme.recup && !forme.fcRepos;
  return vide ? null : forme;
}

function recordsDe(trainings: Training[]): { liste: InstantaneGrands['records']; mois: (mois: string) => number } {
  let res: ReturnType<typeof computeRecords> | null = null;
  try {
    res = computeRecords(trainings);
  } catch {
    res = null;
  }
  const recent = (res?.recent ?? []).filter((r) => !r.line.minor);
  const stk: Record<RecordKind, string> = { force: 'record_force', reps: 'record', distance: 'record_endurance', allure: 'record', rounds: 'record_combat', duree: 'record_endurance' };
  const liste = recent.slice(0, 4).map(({ line, point }) => {
    const plusBas = line.kind === 'allure';
    // le point vient de line.history (meme objet) : la meilleure marque d'avant est le record battu
    const idx = line.history.indexOf(point);
    const precedents = (idx > 0 ? line.history.slice(0, idx) : []).map((h) => h.value).filter(ok);
    const avant = precedents.length ? (plusBas ? Math.min(...precedents) : Math.max(...precedents)) : null;
    const estDernier = line.date === point.date && Math.abs(line.best - point.value) < 1e-9;
    const serie = line.kind === 'force' && estDernier && line.bestSet ? { kg: r1(line.bestSet.weight), reps: Math.round(line.bestSet.reps) } : null;
    return {
      titre: recordShortTitle(line),
      kind: line.kind,
      valeur: r1(point.value),
      avant: avant == null ? null : r1(avant),
      date: point.date.slice(0, 10),
      sticker: stk[line.kind] ?? 'record',
      serie,
    };
  });
  return { liste, mois: (m: string) => recent.filter((r) => r.point.date.slice(0, 7) === m).length };
}

function moisDe(src: SourcesGrands): InstantaneGrands['mois'] {
  const today = src.aujourdhui;
  const [a, m, j] = today.split('-').map(Number);
  const cle = today.slice(0, 7);
  const premierJour = new Date(a, m - 1, 1, 12);
  const jours = new Date(a, m, 0, 12).getDate();
  const ceMois = src.trainings.filter((t) => dateDe(t).slice(0, 7) === cle && dateDe(t) <= today);
  const calendrier: Record<string, string[]> = {};
  const parSticker = new Map<string, { n: number; sports: Map<string, number> }>();
  for (const t of [...ceMois].sort((x, y) => (dateDe(x) < dateDe(y) ? -1 : 1))) {
    const d = String(Number(dateDe(t).slice(8, 10)));
    const s = stickerSport(t.sport, !!t.is_outdoor);
    const l = (calendrier[d] = calendrier[d] ?? []);
    if (l.length < 2 && !l.includes(s)) l.push(s);
    const e = parSticker.get(s) ?? { n: 0, sports: new Map<string, number>() };
    e.n += 1;
    const id = firstSport(t.sport);
    e.sports.set(id, (e.sports.get(id) ?? 0) + 1);
    parSticker.set(s, e);
  }
  const sports = [...parSticker.entries()]
    .sort((x, y) => y[1].n - x[1].n)
    .slice(0, 3)
    .map(([sticker, e]) => {
      const id = [...e.sports.entries()].sort((x, y) => y[1] - x[1])[0][0];
      return { sticker, nom: getSportName(id) || id, seances: e.n };
    });
  // le mois d'avant, jusqu'au meme jour (ou a son dernier jour)
  const avant = new Date(a, m - 2, 1, 12);
  const finAvant = Math.min(j, new Date(a, m - 1, 0, 12).getDate());
  const cleAvant = `${avant.getFullYear()}-${p2(avant.getMonth() + 1)}`;
  const nAvant = src.trainings.filter((t) => dateDe(t).slice(0, 7) === cleAvant && Number(dateDe(t).slice(8, 10)) <= finAvant).length;
  const toutAvant = src.trainings.some((t) => dateDe(t) < `${cle}-01`);
  return {
    annee: a,
    mois: m,
    premier: (premierJour.getDay() + 6) % 7,
    jours,
    aujourdhui: j,
    calendrier,
    seances: ceMois.length,
    joursActifs: Object.keys(calendrier).length,
    minutes: Math.round(ceMois.reduce((s, t) => s + durationOf(t), 0)),
    sports,
    distanceKm: r1(ceMois.reduce((s, t) => s + (okPos(t.distance) ? t.distance : 0), 0)),
    kilosKg: Math.round(ceMois.reduce((s, t) => s + tonnage(t), 0)),
    rounds: ceMois.reduce((s, t) => s + roundsDe(t), 0),
    ecartMoisPrecedent: toutAvant ? ceMois.length - nAvant : null,
  };
}

/** Series de travail de la semaine par groupe, exercice par exercice (muscleOf, workSetsOf : le cardio ne compte pas) */
function musclesDe(src: SourcesGrands): InstantaneGrands['muscles'] {
  const today = src.aujourdhui;
  const lundi = mondayOf(today);
  const sets: Record<string, number> = {};
  const parSeance: InstantaneGrands['muscles']['parSeance'] = [];
  for (const t of src.trainings.filter((x) => dateDe(x) >= lundi && dateDe(x) <= today).sort((x, y) => (dateDe(x) < dateDe(y) ? -1 : 1))) {
    let n = 0;
    for (const e of exercisesOf(t)) {
      const s = workSetsOf(e).length;
      if (s === 0) continue;
      const m = muscleOf({ name: String(e.name ?? ''), muscle_group: e.muscle_group });
      if (!m) continue;
      sets[m] = (sets[m] ?? 0) + s;
      n += s;
    }
    if (n > 0) parSeance.push({ nom: nomSeance(t, src.plan), date: dateDe(t), series: n });
  }
  const groupes = MUSCLE_ORDER.map((nom) => ({ nom: traduire(nom), series: sets[nom] ?? 0, calques: CALQUES_MUSCLES[nom] }));
  groupes.sort((x, y) => y.series - x.series);
  return { groupes, total: groupes.reduce((s, g) => s + g.series, 0), seances: parSeance.length, parSeance };
}

function seanceDe(src: SourcesGrands): InstantaneGrands['seance'] {
  const p = src.plan;
  if (!p) return null;
  const exos = p.exos
    .filter((e) => !okPos(e.minutes))
    .map((e) => {
      let chargeKg: number | null = null;
      let monte = false;
      if (!e.poidsDuCorps && !e.secondes) {
        try {
          const prop = proposer(e, seancesDeLExo(src.trainings, e.nom, 2));
          const w = prop.series[0]?.weight ?? 0;
          if (w > 0) chargeKg = r2(w);
          monte = prop.raison === 'monte';
        } catch {
          chargeKg = null;
        }
      }
      return { nom: traduire(e.nom), series: e.series, repsMin: e.repsMin, repsMax: e.repsMax, secondes: !!e.secondes, chargeKg, monte };
    });
  const brique = p.exos.find((e) => okPos(e.minutes));
  const choix = p.cardio ?? null;
  const cardio = choix && okPos(choix.minutes)
    ? { type: String(choix.type), minutes: Math.round(choix.minutes), texte: libelleCardio(choix.type, choix.minutes), sticker: infoCardio(choix.type).sticker }
    : brique
      ? { type: 'autre', minutes: Math.round(brique.minutes as number), texte: traduire(brique.nom), sticker: 'cardio_zone2' }
      : null;
  const der = p.derniereId != null ? src.trainings.find((t) => t.id === p.derniereId) : undefined;
  const parGroupe = new Map<string, number>();
  for (const e of p.exos) {
    if (okPos(e.minutes)) continue;
    const m = muscleOf({ name: e.nom, muscle_group: e.muscle });
    if (m) parGroupe.set(m, (parGroupe.get(m) ?? 0) + Math.max(0, e.series));
  }
  return {
    titre: p.titre,
    programme: p.programme,
    aujourdhui: p.aujourdhui,
    genre: p.genre,
    minutes: Math.max(0, Math.round(p.minutes || 0)),
    muscles: p.muscles.slice(0, 6),
    exos,
    cardio,
    derniere: der ? { date: dateDe(der), minutes: Math.round(durationOf(der)), kilosKg: Math.round(tonnage(der)) } : null,
    seriesParGroupe: [...parGroupe.entries()].sort((x, y) => y[1] - x[1]).map(([nom, series]) => ({ nom: traduire(nom), series })),
  };
}

function dojoDe(src: SourcesGrands, recordsMois: number): InstantaneGrands['dojo'] {
  const d = src.dojo;
  if (!d) return null;
  const prochain = d.rangs[d.rangIndex + 1];
  return {
    rang: d.rang,
    rangIndex: d.rangIndex,
    rangs: d.rangs.map((r) => r.nom),
    xp: Math.max(0, Math.round(d.xp)),
    suivant: d.suivant,
    xpSuivant: okPos(d.xpSuivant) ? Math.round(d.xpSuivant) : null,
    xpRestant: okPos(d.xpSuivant) ? Math.max(0, Math.round(d.xpSuivant - d.xp)) : null,
    part: ok(d.part) ? r2(Math.max(0, Math.min(1, d.part))) : null,
    serieJours: ok(d.serieJours) ? d.serieJours : null,
    semainesTenues: ok(d.semainesTenues) ? d.semainesTenues : null,
    coffre: d.coffre,
    recompense: prochain?.piece ? { piece: prochain.piece, rang: prochain.nom } : null,
    xpSemaine: ok(d.xpSemaine) ? Math.round(d.xpSemaine) : null,
    recordsMois,
    personnage: d.personnage,
  };
}

/** L'instantane des grands widgets, pret a ecrire (JSON.stringify) */
export function construireInstantaneGrands(src: SourcesGrands): InstantaneGrands {
  const rec = recordsDe(src.trainings);
  const obj = src.eau.objectifLitres;
  const litres = ok(src.eau.litres) ? Math.max(0, src.eau.litres) : 0;
  return {
    v: VERSION_GRANDS,
    genere: src.genere,
    jour: src.aujourdhui,
    unite: src.unite,
    semaine: semaineDe(src),
    corps: corpsDe(src),
    forme: formeDe(src),
    eau: {
      litres: r2(litres),
      objectif: okPos(obj) ? r2(obj) : null,
      verres: Math.round(litres / VERRE_L),
      verresObjectif: okPos(obj) ? Math.round(obj / VERRE_L) : null,
    },
    dojo: dojoDe(src, rec.mois(src.aujourdhui.slice(0, 7))),
    seance: seanceDe(src),
    records: rec.liste,
    mois: moisDe(src),
    muscles: musclesDe(src),
  };
}
